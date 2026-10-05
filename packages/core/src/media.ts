/**
 * Machine-readable AI marking for audio and video: the same XMP packet as for images, with the
 * IPTC Digital Source Type, written where the XMP specification puts it for each container.
 *
 * - MP3: an ID3v2 `PRIV` frame with the owner `XMP`.
 * - WAV: a RIFF `_PMX` chunk.
 * - MP4, MOV and M4A: a top-level `uuid` box with the XMP UUID, appended at the end of the file
 *   so no sample offsets move.
 *
 * The audio and video data is not touched. Files that carry a C2PA manifest are left unchanged
 * by default, as for images.
 */

import {
  buildXmp,
  detectImageFormat,
  type ImageFormat,
  type ImageMarkingInfo,
  type MarkImageOptions,
  markImage,
  readImageMarking,
  WITNESS_NS,
  xmpProperty,
} from "./image.js";
import { createMarking, isAiSourceType, parseSourceType } from "./marking.js";
import type { Marking, MarkingInput } from "./types.js";

export type MediaFormat = "mp3" | "wav" | "mp4";

export type MarkMediaOptions = MarkImageOptions;

export interface MarkMediaResult {
  bytes: Uint8Array;
  status: "marked" | "skipped-c2pa" | "unsupported";
  format: MediaFormat | null;
}

export interface MediaMarkingInfo extends Omit<ImageMarkingInfo, "format"> {
  format: MediaFormat | null;
}

export interface MarkFileResult {
  bytes: Uint8Array;
  status: "marked" | "skipped-c2pa" | "unsupported";
  format: ImageFormat | MediaFormat | null;
}

export interface MarkingInfo extends Omit<ImageMarkingInfo, "format"> {
  format: ImageFormat | MediaFormat | null;
}

const XMP_UUID = hex("be7acfcb97a942e89c71999491e3afac");
const C2PA_UUID = hex("d8fec3d61b0e483c92975828877ec481");

/** Detects MP3, WAV or an ISO media file (MP4, MOV, M4A) from the first bytes. */
export function detectMediaFormat(bytes: Uint8Array): MediaFormat | null {
  if (bytes.length >= 10 && ascii(bytes, 0, 3) === "ID3") return "mp3";
  if (isMpegAudioFrame(bytes, 0)) return "mp3";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") {
    return "wav";
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") return "mp4";
  return null;
}

/** Writes the marking as XMP into an MP3, WAV, MP4, MOV or M4A file. */
export function markMedia(
  bytes: Uint8Array,
  input: Marking | MarkingInput = {},
  options: MarkMediaOptions = {},
): MarkMediaResult {
  const format = detectMediaFormat(bytes);
  if (!format) return { bytes, status: "unsupported", format };
  const parsed = parse(bytes, format);
  if (!parsed) return { bytes, status: "unsupported", format };
  if (options.c2pa !== "overwrite" && parsed.c2pa) {
    return { bytes, status: "skipped-c2pa", format };
  }
  const marking =
    "sourceType" in input && "humanReviewed" in input ? (input as Marking) : createMarking(input);
  const xmp = buildXmp(marking, parsed.xmp);
  const out =
    format === "mp3"
      ? writeMp3(bytes, xmp)
      : format === "wav"
        ? writeWav(bytes, xmp)
        : writeMp4(bytes, xmp);
  if (!out) return { bytes, status: "unsupported", format };
  return { bytes: out, status: "marked", format };
}

/** Reads the AI marking of an audio or video file, whoever wrote it. */
export function readMediaMarking(bytes: Uint8Array): MediaMarkingInfo {
  const format = detectMediaFormat(bytes);
  const parsed = format ? parse(bytes, format) : null;
  if (!format || !parsed) {
    return { format, xmp: null, aiGenerated: false, witness: false, c2pa: false };
  }
  return describe(format, parsed.xmp, parsed.c2pa);
}

/** Marks an image, audio or video file, whichever it is. */
export function markFile(
  bytes: Uint8Array,
  input: Marking | MarkingInput = {},
  options: MarkMediaOptions = {},
): MarkFileResult {
  if (detectImageFormat(bytes)) return markImage(bytes, input, options);
  return markMedia(bytes, input, options);
}

/** Reads the AI marking of an image, audio or video file. */
export function readMarking(bytes: Uint8Array): MarkingInfo {
  if (detectImageFormat(bytes)) return readImageMarking(bytes);
  return readMediaMarking(bytes);
}

function describe(format: MediaFormat, xmp: string | null, c2pa: boolean): MediaMarkingInfo {
  const sourceType = xmp
    ? parseSourceType(xmpProperty(xmp, "Iptc4xmpExt:DigitalSourceType"))
    : undefined;
  const generator = xmp
    ? (xmpProperty(xmp, "Iptc4xmpExt:AISystemUsed") ?? xmpProperty(xmp, "xmp:CreatorTool"))
    : undefined;
  const info: MediaMarkingInfo = {
    format,
    xmp,
    aiGenerated: isAiSourceType(sourceType),
    witness: xmp?.includes(WITNESS_NS) ?? false,
    c2pa,
  };
  if (sourceType) info.sourceType = sourceType;
  if (generator) info.generator = generator;
  return info;
}

interface Parsed {
  xmp: string | null;
  c2pa: boolean;
}

/** Null when the file is truncated or uses a variant Witness does not write. */
function parse(bytes: Uint8Array, format: MediaFormat): Parsed | null {
  if (format === "mp3") {
    const tag = readId3(bytes);
    if (tag === "unsupported") return null;
    if (!tag) return { xmp: null, c2pa: false };
    const xmpFrame = tag.frames.find((f) => f.id === "PRIV" && isXmpPriv(bytes, f));
    return {
      xmp: xmpFrame ? decode(bytes.subarray(xmpFrame.dataStart + 4, xmpFrame.end)) : null,
      c2pa: tag.frames.some(
        (f) =>
          f.id === "GEOB" &&
          ascii(bytes, f.dataStart, Math.min(64, f.end - f.dataStart))
            .toLowerCase()
            .includes("c2pa"),
      ),
    };
  }
  if (format === "wav") {
    const chunks = riffChunks(bytes);
    if (!chunks) return null;
    const xmp = chunks.find((c) => c.fourcc === "_PMX");
    return {
      xmp: xmp ? decode(bytes.subarray(xmp.dataStart, xmp.dataEnd)) : null,
      c2pa: chunks.some((c) => c.fourcc === "C2PA"),
    };
  }
  const boxes = mp4Boxes(bytes);
  if (!boxes) return null;
  const xmp = boxes.find((b) => isUuidBox(bytes, b, XMP_UUID));
  return {
    xmp: xmp ? decode(bytes.subarray(xmp.dataStart + 16, xmp.end)) : null,
    c2pa: boxes.some((b) => isUuidBox(bytes, b, C2PA_UUID)),
  };
}

// ---------------------------------------------------------------------------- MP3 (ID3v2)

interface Id3Frame {
  id: string;
  start: number;
  dataStart: number;
  end: number;
}

interface Id3Tag {
  version: 3 | 4;
  /** Bytes of the whole tag, header included. */
  length: number;
  frames: Id3Frame[];
}

/** Null when there is no tag; `unsupported` for ID3v2.2, unsynchronised tags or footers. */
function readId3(bytes: Uint8Array): Id3Tag | null | "unsupported" {
  if (ascii(bytes, 0, 3) !== "ID3") return null;
  const version = bytes[3];
  const flags = bytes[5] ?? 0;
  if (version !== 3 && version !== 4) return "unsupported";
  if (flags & 0x80 || flags & 0x10) return "unsupported";
  const length = 10 + syncsafe(bytes, 6);
  if (length > bytes.length) return "unsupported";
  let offset = 10;
  if (flags & 0x40) {
    offset += version === 4 ? syncsafe(bytes, 10) : 4 + readU32BE(bytes, 10);
  }
  const frames: Id3Frame[] = [];
  while (offset + 10 <= length) {
    const id = ascii(bytes, offset, 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break; // padding
    const size = version === 4 ? syncsafe(bytes, offset + 4) : readU32BE(bytes, offset + 4);
    const end = offset + 10 + size;
    if (end > length) return "unsupported";
    frames.push({ id, start: offset, dataStart: offset + 10, end });
    offset = end;
  }
  return { version, length, frames };
}

function isXmpPriv(bytes: Uint8Array, frame: Id3Frame): boolean {
  return ascii(bytes, frame.dataStart, 4) === "XMP\0";
}

function writeMp3(bytes: Uint8Array, xmp: string): Uint8Array | null {
  const tag = readId3(bytes);
  if (tag === "unsupported") return null;
  const version = tag ? tag.version : 4;
  const kept = tag
    ? tag.frames
        .filter((f) => !(f.id === "PRIV" && isXmpPriv(bytes, f)))
        .map((f) => bytes.subarray(f.start, f.end))
    : [];
  const data = concat(latin1("XMP\0"), utf8(xmp));
  const frame = new Uint8Array(10 + data.length);
  frame.set(latin1("PRIV"), 0);
  if (version === 4) writeSyncsafe(frame, 4, data.length);
  else writeU32BE(frame, 4, data.length);
  frame.set(data, 10);
  // Zero padding ends the frame list; some readers warn without it.
  const body = concat(...kept, frame, new Uint8Array(64));
  const header = new Uint8Array(10);
  header.set(latin1("ID3"), 0);
  header[3] = version;
  writeSyncsafe(header, 6, body.length);
  return concat(header, body, bytes.subarray(tag ? tag.length : 0));
}

function isMpegAudioFrame(bytes: Uint8Array, offset: number): boolean {
  const b1 = bytes[offset + 1] ?? 0;
  // Frame sync, a valid MPEG version and layer (ADTS AAC has layer 0 and is not MP3).
  return (
    bytes[offset] === 0xff && (b1 & 0xe0) === 0xe0 && (b1 & 0x18) !== 0x08 && (b1 & 0x06) !== 0
  );
}

function syncsafe(b: Uint8Array, o: number): number {
  return (
    (((b[o] ?? 0) & 0x7f) << 21) |
    (((b[o + 1] ?? 0) & 0x7f) << 14) |
    (((b[o + 2] ?? 0) & 0x7f) << 7) |
    ((b[o + 3] ?? 0) & 0x7f)
  );
}

function writeSyncsafe(b: Uint8Array, o: number, v: number): void {
  b[o] = (v >>> 21) & 0x7f;
  b[o + 1] = (v >>> 14) & 0x7f;
  b[o + 2] = (v >>> 7) & 0x7f;
  b[o + 3] = v & 0x7f;
}

// ---------------------------------------------------------------------------- WAV (RIFF)

interface RiffChunk {
  fourcc: string;
  start: number;
  dataStart: number;
  dataEnd: number;
  /** Including the pad byte. */
  end: number;
}

function riffChunks(bytes: Uint8Array): RiffChunk[] | null {
  const chunks: RiffChunk[] = [];
  const limit = Math.min(bytes.length, 8 + readU32LE(bytes, 4));
  let offset = 12;
  while (offset + 8 <= limit) {
    const size = readU32LE(bytes, offset + 4);
    const dataEnd = offset + 8 + size;
    if (dataEnd > bytes.length) return null;
    const end = Math.min(dataEnd + (size % 2), bytes.length);
    chunks.push({
      fourcc: ascii(bytes, offset, 4),
      start: offset,
      dataStart: offset + 8,
      dataEnd,
      end,
    });
    offset = end;
  }
  return chunks;
}

function writeWav(bytes: Uint8Array, xmp: string): Uint8Array | null {
  const chunks = riffChunks(bytes);
  if (!chunks) return null;
  const data = utf8(xmp);
  const chunk = new Uint8Array(8 + data.length + (data.length % 2));
  chunk.set(latin1("_PMX"), 0);
  writeU32LE(chunk, 4, data.length);
  chunk.set(data, 8);
  const body = concat(
    ...chunks.filter((c) => c.fourcc !== "_PMX").map((c) => bytes.subarray(c.start, c.end)),
    chunk,
  );
  const out = concat(bytes.subarray(0, 12), body);
  writeU32LE(out, 4, out.length - 8);
  return out;
}

// ---------------------------------------------------------------------------- MP4 (ISO BMFF)

interface Box {
  type: string;
  start: number;
  /** After the size, type and any 64-bit size. */
  dataStart: number;
  end: number;
  /** The box runs to the end of the file (size 0). */
  open: boolean;
}

function mp4Boxes(bytes: Uint8Array): Box[] | null {
  const boxes: Box[] = [];
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const size = readU32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    let header = 8;
    let end: number;
    if (size === 1) {
      if (offset + 16 > bytes.length) return null;
      const high = readU32BE(bytes, offset + 8);
      end = offset + high * 2 ** 32 + readU32BE(bytes, offset + 12);
      header = 16;
    } else if (size === 0) {
      end = bytes.length;
    } else {
      end = offset + size;
    }
    if (end > bytes.length || end < offset + header) return null;
    boxes.push({ type, start: offset, dataStart: offset + header, end, open: size === 0 });
    offset = end;
  }
  return boxes;
}

function isUuidBox(bytes: Uint8Array, box: Box, uuid: Uint8Array): boolean {
  if (box.type !== "uuid" || box.end - box.dataStart < 16) return false;
  for (let i = 0; i < 16; i++) if (bytes[box.dataStart + i] !== uuid[i]) return false;
  return true;
}

/**
 * Appends the XMP box at the end so chunk offsets in `moov` stay valid. An earlier XMP box at
 * the end is replaced; one elsewhere is turned into a `free` box of the same size.
 */
function writeMp4(bytes: Uint8Array, xmp: string): Uint8Array | null {
  const boxes = mp4Boxes(bytes);
  if (!boxes) return null;
  const last = boxes[boxes.length - 1];
  let head = bytes;
  let length = bytes.length;
  if (last && isUuidBox(bytes, last, XMP_UUID)) length = last.start;
  head = bytes.slice(0, length);
  for (const box of boxes) {
    if (box.start < length && isUuidBox(bytes, box, XMP_UUID)) {
      head.set(latin1("free"), box.start + 4);
    }
  }
  const open = boxes.find((b) => b.open && b.start < length);
  if (open) {
    const size = length - open.start;
    if (size > 0xffffffff) return null;
    writeU32BE(head, open.start, size);
  }
  const data = utf8(xmp);
  const box = new Uint8Array(8 + 16 + data.length);
  writeU32BE(box, 0, box.length);
  box.set(latin1("uuid"), 4);
  box.set(XMP_UUID, 8);
  box.set(data, 24);
  return concat(head, box);
}

// ---------------------------------------------------------------------------- shared

function hex(value: string): Uint8Array {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes).replace(/\0+$/, "");
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
