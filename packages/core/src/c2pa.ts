/**
 * Reads what a C2PA manifest says about a file: who made it, with which tool, and whether
 * its actions declare AI as the digital source type.
 *
 * Witness only reads the manifest. It does not check the signature, the certificate chain or
 * the hash binding, so the result tells you what the file claims, not that the claim is
 * authentic. Use the C2PA tools (c2patool, the c2pa SDKs) when you need validation.
 */

import { detectImageFormat, imageC2paStore } from "./image.js";
import { isAiSourceType, parseSourceType } from "./marking.js";
import { detectMediaFormat, mediaC2paStore } from "./media.js";
import type { SourceType } from "./types.js";

export interface C2paAction {
  /** e.g. `c2pa.created`, `c2pa.edited`. */
  action: string;
  /** The IPTC digital source type URI, as written. */
  digitalSourceType?: string;
  /** The tool that performed the action. */
  softwareAgent?: string;
}

export interface C2paManifestInfo {
  /** The manifest's label, a `urn:c2pa:` or `urn:uuid:` URN. */
  label: string;
  /** The application that wrote the manifest, e.g. `Adobe Firefly 3.0`. */
  claimGenerator?: string;
  title?: string;
  /** The media type the manifest declares, e.g. `image/jpeg`. */
  format?: string;
  actions: C2paAction[];
}

export interface C2paInfo {
  /** The active manifest: the last one in the store. */
  active: C2paManifestInfo;
  /** All manifests in the store, oldest first. */
  manifests: C2paManifestInfo[];
  /** The source type of the active manifest's actions, the most AI-specific one if several. */
  sourceType?: SourceType;
  /** An action of the active manifest declares a trained AI model as the source. */
  aiGenerated: boolean;
  /** The AI system named in those actions, if any. */
  generator?: string;
  /** Any manifest in the store, including those of ingredients, declares AI as the source. */
  aiInHistory: boolean;
  /** Always `false`: Witness reads the manifest but does not verify the signature. */
  verified: false;
}

/** Reads the C2PA manifest store of an image, audio or video file, or returns null. */
export function readC2pa(bytes: Uint8Array): C2paInfo | null {
  const image = detectImageFormat(bytes);
  const media = image ? null : detectMediaFormat(bytes);
  let store: Uint8Array | null = null;
  try {
    if (image) store = imageC2paStore(bytes, image);
    else if (media) store = mediaC2paStore(bytes, media);
  } catch {
    return null;
  }
  return store ? parseManifestStore(store) : null;
}

/** Parses a raw JUMBF manifest store (the `c2pa` superbox). */
export function parseManifestStore(store: Uint8Array): C2paInfo | null {
  let root: Jumbf | undefined;
  try {
    root = readBoxes(store, 0, store.length).find((box) => box.label === "c2pa");
  } catch {
    return null;
  }
  if (!root) return null;
  const manifests = root.children
    .filter((box) => box.type === "jumb")
    .map(readManifest)
    .filter((m): m is C2paManifestInfo => m !== null);
  const active = manifests[manifests.length - 1];
  if (!active) return null;

  const types = active.actions
    .map((a) => parseSourceType(a.digitalSourceType))
    .filter((t): t is SourceType => t !== undefined);
  const sourceType = types.find((t) => isAiSourceType(t)) ?? types[0];
  const aiAction = active.actions.find((a) => isAiSourceType(parseSourceType(a.digitalSourceType)));
  const info: C2paInfo = {
    active,
    manifests,
    aiGenerated: aiAction !== undefined,
    aiInHistory: manifests.some((m) =>
      m.actions.some((a) => isAiSourceType(parseSourceType(a.digitalSourceType))),
    ),
    verified: false,
  };
  if (sourceType) info.sourceType = sourceType;
  const generator = aiAction?.softwareAgent ?? (aiAction ? active.claimGenerator : undefined);
  if (generator) info.generator = generator;
  return info;
}

/** One assertion of a manifest, as stored. */
export interface C2paAssertionRecord {
  /** e.g. `c2pa.hash.data`, `c2pa.actions.v2`, `c2pa.actions__1`. */
  label: string;
  /** The decoded content (CBOR or JSON), if it could be decoded. */
  data?: unknown;
  /** The bytes C2PA hashes for this assertion: the superbox payload, without its header. */
  hashed: Uint8Array;
}

/** One manifest of a store with everything needed to check it. */
export interface C2paManifestRecord {
  label: string;
  /** The decoded claim map. */
  claim: Record<string, unknown>;
  /** The claim as stored, the payload of the claim signature. */
  claimBytes: Uint8Array;
  claimLabel: string;
  assertions: C2paAssertionRecord[];
  /** The COSE_Sign1 structure of the claim signature, if present. */
  signature?: Uint8Array;
}

/**
 * Reads the raw structure of a C2PA manifest store: claims, assertions with the bytes that are
 * hashed, and signatures. This is the input for validation, which Witness itself does not do
 * (see `verified` in {@link C2paInfo}).
 */
export function readC2paManifests(bytes: Uint8Array): C2paManifestRecord[] | null {
  const image = detectImageFormat(bytes);
  const media = image ? null : detectMediaFormat(bytes);
  let store: Uint8Array | null = null;
  try {
    if (image) store = imageC2paStore(bytes, image);
    else if (media) store = mediaC2paStore(bytes, media);
    if (!store) return null;
    const root = readBoxes(store, 0, store.length).find((box) => box.label === "c2pa");
    if (!root) return null;
    return root.children.filter((box) => box.type === "jumb").map(readManifestRecord);
  } catch {
    return null;
  }
}

function readManifestRecord(box: Jumbf): C2paManifestRecord {
  const claimBox = box.children.find(
    (child) => child.label === "c2pa.claim" || child.label === "c2pa.claim.v2",
  );
  const claimContent = claimBox?.children.find((child) => child.type === "cbor");
  const claim = (claimBox ? cborContent(claimBox) : undefined) as
    | Record<string, unknown>
    | undefined;
  if (!claimBox || !claimContent?.data || !claim || typeof claim !== "object") {
    throw new Error("Manifest without a readable claim");
  }
  const assertionsBox = box.children.find((child) => child.label === "c2pa.assertions");
  const assertions: C2paAssertionRecord[] = [];
  for (const assertion of assertionsBox?.children ?? []) {
    if (!assertion.label || !assertion.payload) continue;
    const record: C2paAssertionRecord = { label: assertion.label, hashed: assertion.payload };
    const data = cborContent(assertion);
    if (data !== undefined) record.data = data;
    assertions.push(record);
  }
  const signatureBox = box.children.find((child) => child.label === "c2pa.signature");
  const signature = signatureBox?.children.find((child) => child.type === "cbor")?.data;
  return {
    label: box.label ?? "",
    claim,
    claimBytes: claimContent.data,
    claimLabel: claimBox.label ?? "c2pa.claim",
    assertions,
    ...(signature ? { signature } : {}),
  };
}

function readManifest(box: Jumbf): C2paManifestInfo | null {
  const claimBox = box.children.find(
    (child) => child.label === "c2pa.claim" || child.label === "c2pa.claim.v2",
  );
  const claim = claimBox
    ? (cborContent(claimBox) as Record<string, unknown> | undefined)
    : undefined;
  if (!claim || typeof claim !== "object") return null;
  const info: C2paManifestInfo = { label: box.label ?? "", actions: [] };
  const generator = claimGeneratorName(claim);
  if (generator) info.claimGenerator = generator;
  if (typeof claim["dc:title"] === "string") info.title = claim["dc:title"];
  if (typeof claim["dc:format"] === "string") info.format = claim["dc:format"];

  const assertions = box.children.find((child) => child.label === "c2pa.assertions");
  for (const assertion of assertions?.children ?? []) {
    if (!assertion.label?.startsWith("c2pa.actions")) continue;
    const data = cborContent(assertion) as { actions?: unknown } | undefined;
    if (!data || !Array.isArray(data.actions)) continue;
    for (const raw of data.actions) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      if (typeof entry.action !== "string") continue;
      const action: C2paAction = { action: entry.action };
      if (typeof entry.digitalSourceType === "string") {
        action.digitalSourceType = entry.digitalSourceType;
      }
      const agent = agentName(entry.softwareAgent);
      if (agent) action.softwareAgent = agent;
      info.actions.push(action);
    }
  }
  return info;
}

function claimGeneratorName(claim: Record<string, unknown>): string | undefined {
  const info = claim.claim_generator_info;
  const first = Array.isArray(info) ? info[0] : info;
  return (
    agentName(first) ??
    (typeof claim.claim_generator === "string" ? claim.claim_generator : undefined)
  );
}

function agentName(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const { name, version } = value as { name?: unknown; version?: unknown };
  if (typeof name !== "string") return undefined;
  return typeof version === "string" && version ? `${name} ${version}` : name;
}

// ---------------------------------------------------------------------------- JUMBF

interface Jumbf {
  type: string;
  /** From the description box, for superboxes. */
  label?: string;
  children: Jumbf[];
  /** Content boxes keep their payload. */
  data?: Uint8Array;
  /** Superboxes keep the bytes between their header and their end, which C2PA hashes. */
  payload?: Uint8Array;
}

function readBoxes(bytes: Uint8Array, start: number, end: number): Jumbf[] {
  const boxes: Jumbf[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = readU32(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    let header = 8;
    if (size === 1) {
      size = readU32(bytes, offset + 8) * 2 ** 32 + readU32(bytes, offset + 12);
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    const boxEnd = offset + size;
    if (size < header || boxEnd > end) throw new Error("Malformed JUMBF box");
    if (type === "jumb") {
      const inner = readBoxes(bytes, offset + header, boxEnd);
      const description = inner[0]?.type === "jumd" ? inner[0] : undefined;
      const box: Jumbf = {
        type,
        children: description ? inner.slice(1) : inner,
        payload: bytes.subarray(offset + header, boxEnd),
      };
      const label = description?.data ? describeLabel(description.data) : undefined;
      if (label) box.label = label;
      boxes.push(box);
    } else {
      boxes.push({ type, children: [], data: bytes.subarray(offset + header, boxEnd) });
    }
    offset = boxEnd;
  }
  return boxes;
}

/** The label of a description box: a 16-byte type UUID, toggles, then the label if toggled. */
function describeLabel(data: Uint8Array): string | undefined {
  const toggles = data[16] ?? 0;
  if (!(toggles & 0x02)) return undefined;
  let end = 17;
  while (end < data.length && data[end] !== 0) end++;
  return new TextDecoder().decode(data.subarray(17, end));
}

function cborContent(box: Jumbf): unknown {
  const content = box.children.find((child) => child.type === "cbor" || child.type === "json");
  if (!content?.data) return undefined;
  try {
    if (content.type === "json") return JSON.parse(new TextDecoder().decode(content.data));
    return decodeCbor(content.data);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------- CBOR

/** A small CBOR decoder for the subset C2PA uses. Byte strings stay Uint8Array. */
export function decodeCbor(bytes: Uint8Array): unknown {
  let offset = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const BREAK = Symbol("break");

  const length = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) return view.getUint8(offset++);
    if (info === 25) {
      const v = view.getUint16(offset);
      offset += 2;
      return v;
    }
    if (info === 26) {
      const v = view.getUint32(offset);
      offset += 4;
      return v;
    }
    if (info === 27) {
      const v = view.getUint32(offset) * 2 ** 32 + view.getUint32(offset + 4);
      offset += 8;
      return v;
    }
    if (info === 31) return -1;
    throw new Error("Invalid CBOR length");
  };

  const item = (depth: number): unknown => {
    if (depth > 64) throw new Error("CBOR nested too deeply");
    if (offset >= bytes.length) throw new Error("Truncated CBOR");
    const initial = view.getUint8(offset++);
    const major = initial >> 5;
    const info = initial & 0x1f;
    if (major === 7) {
      if (info === 20) return false;
      if (info === 21) return true;
      if (info === 22 || info === 23) return null;
      if (info === 25) {
        const half = view.getUint16(offset);
        offset += 2;
        return halfToFloat(half);
      }
      if (info === 26) {
        const v = view.getFloat32(offset);
        offset += 4;
        return v;
      }
      if (info === 27) {
        const v = view.getFloat64(offset);
        offset += 8;
        return v;
      }
      if (info === 31) return BREAK;
      if (info === 24) {
        offset++;
        return null;
      }
      return null;
    }
    const n = length(info);
    switch (major) {
      case 0:
        return n;
      case 1:
        return -1 - n;
      case 2:
      case 3: {
        let chunk: Uint8Array;
        if (n === -1) {
          const parts: Uint8Array[] = [];
          for (;;) {
            const part = item(depth + 1);
            if (part === BREAK) break;
            parts.push(
              typeof part === "string" ? new TextEncoder().encode(part) : (part as Uint8Array),
            );
          }
          chunk = join(parts);
        } else {
          if (offset + n > bytes.length) throw new Error("Truncated CBOR");
          chunk = bytes.subarray(offset, offset + n);
          offset += n;
        }
        return major === 3 ? new TextDecoder().decode(chunk) : chunk;
      }
      case 4: {
        const list: unknown[] = [];
        for (let i = 0; n === -1 || i < n; i++) {
          const value = item(depth + 1);
          if (value === BREAK) break;
          list.push(value);
        }
        return list;
      }
      case 5: {
        const map: Record<string, unknown> = {};
        for (let i = 0; n === -1 || i < n; i++) {
          const key = item(depth + 1);
          if (key === BREAK) break;
          map[String(key)] = item(depth + 1);
        }
        return map;
      }
      default:
        // Tag: return the tagged value.
        return item(depth + 1);
    }
  };

  return item(0);
}

function halfToFloat(half: number): number {
  const exponent = (half >> 10) & 0x1f;
  const fraction = half & 0x3ff;
  const sign = half & 0x8000 ? -1 : 1;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function readU32(b: Uint8Array, o: number): number {
  return (
    (((b[o] ?? 0) << 24) | ((b[o + 1] ?? 0) << 16) | ((b[o + 2] ?? 0) << 8) | (b[o + 3] ?? 0)) >>> 0
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = offset; i < offset + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i] ?? 0);
  }
  return out;
}
