/**
 * Machine-readable AI marking for images: an XMP packet with the IPTC Digital Source Type,
 * written into PNG, JPEG and WebP files without re-encoding the pixels.
 *
 * This is unsigned metadata. It is what IPTC, Google and most photo tools read today, but it
 * is not a C2PA manifest and is easy to strip. Files that already carry a C2PA manifest are
 * left untouched by default, because rewriting them would break the manifest's hash binding.
 */

import { inflateZlib } from "./inflate.js";
import {
  createMarking,
  generatorName,
  iptcSourceType,
  isAiSourceType,
  parseSourceType,
} from "./marking.js";
import type { Marking, MarkingInput, SourceType } from "./types.js";

export type ImageFormat = "png" | "jpeg" | "webp";

export interface MarkImageOptions {
  /**
   * What to do with files that already carry a C2PA manifest. `skip` (default) returns them
   * unchanged; `overwrite` writes the XMP anyway and breaks the manifest's hash binding.
   */
  c2pa?: "skip" | "overwrite";
}

export interface MarkImageResult {
  bytes: Uint8Array;
  status: "marked" | "skipped-c2pa" | "unsupported";
  format: ImageFormat | null;
}

export interface ImageMarkingInfo {
  format: ImageFormat | null;
  /** The XMP packet, if any. */
  xmp: string | null;
  /** IPTC Digital Source Type from the XMP. */
  sourceType?: SourceType;
  /** The source type says the image was made or changed by a trained AI model. */
  aiGenerated: boolean;
  /** `Iptc4xmpExt:AISystemUsed` or `xmp:CreatorTool`. */
  generator?: string;
  /** Written by Witness. */
  witness: boolean;
  /** A C2PA manifest is embedded. Witness does not verify it. */
  c2pa: boolean;
}

const XMP_NS = "http://ns.adobe.com/xap/1.0/\0";
/** @internal */
export const WITNESS_NS = "https://packages.sweber.dev/witness/ns/1.0/";

/** Detects PNG, JPEG or WebP from the first bytes. */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  return null;
}

/** Writes the marking as XMP into a PNG, JPEG or WebP file. */
export function markImage(
  bytes: Uint8Array,
  input: Marking | MarkingInput = {},
  options: MarkImageOptions = {},
): MarkImageResult {
  const format = detectImageFormat(bytes);
  if (!format) return { bytes, status: "unsupported", format };
  if (options.c2pa !== "overwrite" && hasC2pa(bytes, format)) {
    return { bytes, status: "skipped-c2pa", format };
  }
  const marking =
    "sourceType" in input && "humanReviewed" in input ? (input as Marking) : createMarking(input);
  const existing = readXmp(bytes, format);
  const xmp = buildXmp(marking, existing);
  const out =
    format === "png"
      ? writePng(bytes, xmp)
      : format === "jpeg"
        ? writeJpeg(bytes, xmp)
        : writeWebp(bytes, xmp);
  return { bytes: out, status: "marked", format };
}

/** Reads the AI marking of an image, whoever wrote it. */
export function readImageMarking(bytes: Uint8Array): ImageMarkingInfo {
  const format = detectImageFormat(bytes);
  if (!format) return { format, xmp: null, aiGenerated: false, witness: false, c2pa: false };
  const xmp = readXmp(bytes, format);
  const sourceType = xmp
    ? parseSourceType(xmpProperty(xmp, "Iptc4xmpExt:DigitalSourceType"))
    : undefined;
  const generator = xmp
    ? (xmpProperty(xmp, "Iptc4xmpExt:AISystemUsed") ?? xmpProperty(xmp, "xmp:CreatorTool"))
    : undefined;
  const info: ImageMarkingInfo = {
    format,
    xmp,
    aiGenerated: isAiSourceType(sourceType),
    witness: xmp?.includes(WITNESS_NS) ?? false,
    c2pa: hasC2pa(bytes, format),
  };
  if (sourceType) info.sourceType = sourceType;
  if (generator) info.generator = generator;
  return info;
}

/** The XMP packet Witness writes, merged into an existing packet if there is one. */
export function buildXmp(marking: Marking, existing?: string | null): string {
  const description = buildDescription(marking);
  if (existing?.includes("</rdf:RDF>")) {
    // Drop the description an earlier run wrote, in its self-closing or its paired form.
    const cleaned = existing
      .replace(/<rdf:Description\b[^>]*witness:marker="1"[^>]*\/>\s*/g, "")
      .replace(
        /<rdf:Description\b[^>]*witness:marker="1"[^>]*>[\s\S]*?<\/rdf:Description>\s*/g,
        "",
      );
    // Our description declares its own namespaces, so it can sit next to any other.
    return cleaned.replace("</rdf:RDF>", `${description}\n</rdf:RDF>`);
  }
  return [
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    description,
    "</rdf:RDF>",
    "</x:xmpmeta>",
    '<?xpacket end="w"?>',
  ].join("\n");
}

function buildDescription(m: Marking): string {
  const attributes: Array<[string, string]> = [
    ["rdf:about", ""],
    ["xmlns:Iptc4xmpExt", "http://iptc.org/std/Iptc4xmpExt/2008-02-29/"],
    ["xmlns:xmp", "http://ns.adobe.com/xap/1.0/"],
    ["xmlns:dc", "http://purl.org/dc/elements/1.1/"],
    ["xmlns:witness", WITNESS_NS],
    ["witness:marker", "1"],
    ["witness:kind", m.kind],
    ["Iptc4xmpExt:DigitalSourceType", iptcSourceType(m.sourceType)],
    ["xmp:CreateDate", m.createdAt],
  ];
  if (m.generator) {
    attributes.push(["Iptc4xmpExt:AISystemUsed", m.generator]);
    attributes.push(["xmp:CreatorTool", generatorName(m)]);
  }
  if (m.generatorVersion) attributes.push(["Iptc4xmpExt:AISystemVersionUsed", m.generatorVersion]);
  if (m.provider) attributes.push(["witness:provider", m.provider]);
  if (m.disclosureUrl) attributes.push(["witness:disclosureUrl", m.disclosureUrl]);
  if (m.humanReviewed) attributes.push(["witness:humanReviewed", "True"]);
  const attrs = attributes.map(([name, value]) => `\n  ${name}="${escapeXml(value)}"`).join("");
  const description = m.description
    ? `\n  <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(m.description)}</rdf:li></rdf:Alt></dc:description>\n`
    : "";
  return description
    ? `<rdf:Description${attrs}>${description}</rdf:Description>`
    : `<rdf:Description${attrs}/>`;
}

/** Reads a simple property in attribute or element form. @internal */
export function xmpProperty(xmp: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const attribute = new RegExp(`${escaped}="([^"]*)"`).exec(xmp);
  if (attribute?.[1] !== undefined) return unescapeXml(attribute[1]);
  const element = new RegExp(
    `<${escaped}(?:\\s+rdf:resource="([^"]*)")?\\s*(?:/>|>([\\s\\S]*?)</${escaped}>)`,
  ).exec(xmp);
  if (!element) return undefined;
  if (element[1] !== undefined) return unescapeXml(element[1]);
  const inner = element[2] ?? "";
  const li = /<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/.exec(inner);
  const value = (li ? li[1] : inner)?.trim();
  return value ? unescapeXml(value) : undefined;
}

// ---------------------------------------------------------------------------- PNG

function writePng(bytes: Uint8Array, xmp: string): Uint8Array {
  const chunks = pngChunks(bytes).filter((chunk) => !isPngXmp(bytes, chunk));
  const itxt = pngChunk(
    "iTXt",
    concat(latin1("XML:com.adobe.xmp"), new Uint8Array([0, 0, 0, 0, 0]), utf8(xmp)),
  );
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  for (const chunk of chunks) {
    parts.push(bytes.subarray(chunk.offset, chunk.end));
    if (chunk.type === "IHDR") parts.push(itxt);
  }
  return concat(...parts);
}

interface PngChunk {
  type: string;
  offset: number;
  dataStart: number;
  dataEnd: number;
  end: number;
}

function pngChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readU32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const end = dataEnd + 4;
    if (end > bytes.length) throw new Error("Witness: truncated PNG chunk");
    chunks.push({ type, offset, dataStart, dataEnd, end });
    offset = end;
    if (type === "IEND") break;
  }
  return chunks;
}

/** XMP lives in iTXt per the XMP spec; libvips and some other tools write zTXt instead. */
function isPngXmp(bytes: Uint8Array, chunk: PngChunk): boolean {
  return (
    (chunk.type === "iTXt" || chunk.type === "zTXt") &&
    ascii(bytes, chunk.dataStart, 18) === "XML:com.adobe.xmp\0"
  );
}

function readPngXmp(bytes: Uint8Array): string | null {
  for (const chunk of pngChunks(bytes)) {
    if (!isPngXmp(bytes, chunk)) continue;
    let p = chunk.dataStart + 18;
    let compressed: boolean;
    if (chunk.type === "zTXt") {
      compressed = true;
      p += 1; // compression method
    } else {
      compressed = bytes[p] === 1;
      p += 2;
      while (p < chunk.dataEnd && bytes[p] !== 0) p++; // language tag
      p++;
      while (p < chunk.dataEnd && bytes[p] !== 0) p++; // translated keyword
      p++;
    }
    const data = bytes.subarray(p, chunk.dataEnd);
    try {
      return new TextDecoder().decode(compressed ? inflateZlib(data) : data);
    } catch {
      return null;
    }
  }
  return null;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeU32BE(out, 0, data.length);
  out.set(latin1(type), 4);
  out.set(data, 8);
  writeU32BE(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

// ---------------------------------------------------------------------------- JPEG

interface JpegSegment {
  marker: number;
  offset: number;
  dataStart: number;
  end: number;
}

function jpegSegments(bytes: Uint8Array): { segments: JpegSegment[]; scanStart: number } {
  const segments: JpegSegment[] = [];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Witness: invalid JPEG marker");
    let markerOffset = offset;
    while (bytes[markerOffset + 1] === 0xff) markerOffset++; // fill bytes
    const marker = bytes[markerOffset + 1] ?? 0;
    if (marker === 0xda || marker === 0xd9) return { segments, scanStart: offset };
    const length = readU16BE(bytes, markerOffset + 2);
    const end = markerOffset + 2 + length;
    if (end > bytes.length) throw new Error("Witness: truncated JPEG segment");
    segments.push({ marker, offset, dataStart: markerOffset + 4, end });
    offset = end;
  }
  return { segments, scanStart: offset };
}

function isJpegXmp(bytes: Uint8Array, segment: JpegSegment): boolean {
  return segment.marker === 0xe1 && ascii(bytes, segment.dataStart, XMP_NS.length) === XMP_NS;
}

function writeJpeg(bytes: Uint8Array, xmp: string): Uint8Array {
  const { segments, scanStart } = jpegSegments(bytes);
  const payload = concat(latin1(XMP_NS), utf8(xmp));
  if (payload.length + 2 > 0xffff) throw new Error("Witness: XMP packet too large for JPEG");
  const app1 = new Uint8Array(4 + payload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1[2] = ((payload.length + 2) >> 8) & 0xff;
  app1[3] = (payload.length + 2) & 0xff;
  app1.set(payload, 4);

  const kept = segments.filter((segment) => !isJpegXmp(bytes, segment));
  // Keep JFIF (APP0) and Exif (APP1) first, as readers expect them there.
  let insertAt = 0;
  while (insertAt < kept.length) {
    const segment = kept[insertAt];
    if (!segment) break;
    const isJfif = segment.marker === 0xe0;
    const isExif = segment.marker === 0xe1 && ascii(bytes, segment.dataStart, 4) === "Exif";
    if (!isJfif && !isExif) break;
    insertAt++;
  }
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  kept.forEach((segment, index) => {
    if (index === insertAt) parts.push(app1);
    parts.push(bytes.subarray(segment.offset, segment.end));
  });
  if (insertAt >= kept.length) parts.push(app1);
  parts.push(bytes.subarray(scanStart));
  return concat(...parts);
}

function readJpegXmp(bytes: Uint8Array): string | null {
  for (const segment of jpegSegments(bytes).segments) {
    if (isJpegXmp(bytes, segment)) {
      return new TextDecoder().decode(
        bytes.subarray(segment.dataStart + XMP_NS.length, segment.end),
      );
    }
  }
  return null;
}

// ---------------------------------------------------------------------------- WebP

interface RiffChunk {
  fourcc: string;
  offset: number;
  dataStart: number;
  size: number;
  end: number;
}

function webpChunks(bytes: Uint8Array): RiffChunk[] {
  const chunks: RiffChunk[] = [];
  const riffEnd = Math.min(bytes.length, 8 + readU32LE(bytes, 4));
  let offset = 12;
  while (offset + 8 <= riffEnd) {
    const fourcc = ascii(bytes, offset, 4);
    const size = readU32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    const end = dataStart + size + (size % 2);
    if (dataStart + size > bytes.length) throw new Error("Witness: truncated WebP chunk");
    chunks.push({ fourcc, offset, dataStart, size, end: Math.min(end, bytes.length) });
    offset = end;
  }
  return chunks;
}

function writeWebp(bytes: Uint8Array, xmp: string): Uint8Array {
  const chunks = webpChunks(bytes).filter((chunk) => chunk.fourcc !== "XMP ");
  const first = chunks[0];
  if (!first) throw new Error("Witness: empty WebP file");
  const parts: Uint8Array[] = [];
  if (first.fourcc === "VP8X") {
    const vp8x = bytes.slice(first.offset, first.end);
    vp8x[8] = (vp8x[8] ?? 0) | 0x04; // XMP flag
    parts.push(vp8x);
    for (const chunk of chunks.slice(1)) parts.push(bytes.subarray(chunk.offset, chunk.end));
  } else {
    const { width, height, alpha } = webpCanvas(bytes, first);
    const data = new Uint8Array(10);
    data[0] = 0x04 | (alpha ? 0x10 : 0);
    writeU24LE(data, 4, width - 1);
    writeU24LE(data, 7, height - 1);
    parts.push(riffChunk("VP8X", data));
    for (const chunk of chunks) parts.push(bytes.subarray(chunk.offset, chunk.end));
  }
  parts.push(riffChunk("XMP ", utf8(xmp)));
  const body = concat(...parts);
  const out = new Uint8Array(12 + body.length);
  out.set(latin1("RIFF"), 0);
  writeU32LE(out, 4, 4 + body.length);
  out.set(latin1("WEBP"), 8);
  out.set(body, 12);
  return out;
}

function webpCanvas(
  bytes: Uint8Array,
  chunk: RiffChunk,
): { width: number; height: number; alpha: boolean } {
  const d = chunk.dataStart;
  if (chunk.fourcc === "VP8 ") {
    if (bytes[d + 3] !== 0x9d || bytes[d + 4] !== 0x01 || bytes[d + 5] !== 0x2a) {
      throw new Error("Witness: invalid VP8 frame");
    }
    return {
      width: readU16LE(bytes, d + 6) & 0x3fff,
      height: readU16LE(bytes, d + 8) & 0x3fff,
      alpha: false,
    };
  }
  if (chunk.fourcc === "VP8L") {
    if (bytes[d] !== 0x2f) throw new Error("Witness: invalid VP8L frame");
    const bits = readU32LE(bytes, d + 1);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
      alpha: ((bits >>> 28) & 1) === 1,
    };
  }
  throw new Error(`Witness: unexpected WebP chunk ${chunk.fourcc}`);
}

function readWebpXmp(bytes: Uint8Array): string | null {
  const chunk = webpChunks(bytes).find((c) => c.fourcc === "XMP ");
  return chunk
    ? new TextDecoder().decode(bytes.subarray(chunk.dataStart, chunk.dataStart + chunk.size))
    : null;
}

function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + (data.length % 2));
  out.set(latin1(fourcc), 0);
  writeU32LE(out, 4, data.length);
  out.set(data, 8);
  return out;
}

// ---------------------------------------------------------------------------- shared

function readXmp(bytes: Uint8Array, format: ImageFormat): string | null {
  if (format === "png") return readPngXmp(bytes);
  if (format === "jpeg") return readJpegXmp(bytes);
  return readWebpXmp(bytes);
}

/** C2PA manifests live in caBX (PNG), APP11 JUMBF (JPEG) or C2PA (WebP) chunks. */
function hasC2pa(bytes: Uint8Array, format: ImageFormat): boolean {
  if (format === "png") return pngChunks(bytes).some((chunk) => chunk.type === "caBX");
  if (format === "webp") return webpChunks(bytes).some((chunk) => chunk.fourcc === "C2PA");
  return jpegSegments(bytes).segments.some(
    (segment) =>
      segment.marker === 0xeb &&
      ascii(bytes, segment.dataStart, Math.min(64, segment.end - segment.dataStart)).includes(
        "c2pa",
      ),
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = offset; i < offset + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i] ?? 0);
  }
  return out;
}

function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function readU16BE(b: Uint8Array, o: number): number {
  return ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
}
function readU16LE(b: Uint8Array, o: number): number {
  return (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
}
function readU32BE(b: Uint8Array, o: number): number {
  return (
    (((b[o] ?? 0) << 24) | ((b[o + 1] ?? 0) << 16) | ((b[o + 2] ?? 0) << 8) | (b[o + 3] ?? 0)) >>> 0
  );
}
function readU32LE(b: Uint8Array, o: number): number {
  return (
    ((b[o] ?? 0) | ((b[o + 1] ?? 0) << 8) | ((b[o + 2] ?? 0) << 16) | ((b[o + 3] ?? 0) << 24)) >>> 0
  );
}
function writeU32BE(b: Uint8Array, o: number, v: number): void {
  b[o] = (v >>> 24) & 0xff;
  b[o + 1] = (v >>> 16) & 0xff;
  b[o + 2] = (v >>> 8) & 0xff;
  b[o + 3] = v & 0xff;
}
function writeU32LE(b: Uint8Array, o: number, v: number): void {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
  b[o + 3] = (v >>> 24) & 0xff;
}
function writeU24LE(b: Uint8Array, o: number, v: number): void {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
}

let crcTable: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
