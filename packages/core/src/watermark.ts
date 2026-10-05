/**
 * An invisible, machine-readable marker for AI-generated text.
 *
 * The payload is written as Unicode variation selectors (U+FE00–U+FE0F and
 * U+E0100–U+E01EF). They are default-ignorable code points: browsers do not render them and
 * screen readers skip them, and they survive copy and paste in most applications. They do
 * not survive sanitisers that strip unusual code points, retyping, or paraphrasing, so treat
 * this as one marking layer next to visible labels and metadata, not as a robust watermark.
 */

const MAGIC = [0x57, 0x31]; // "W1"
const MAX_PAYLOAD = 255;

export interface TextWatermark {
  /** Name of the AI system. */
  generator?: string;
  /** ISO 8601 timestamp. */
  createdAt?: string;
  /** Your own reference, e.g. a message or log id. */
  id?: string;
}

export interface ReadTextWatermark extends TextWatermark {
  /** The raw payload as written. */
  raw: string;
}

/**
 * Appends an invisible watermark to `text`. An existing Witness watermark is replaced. Empty
 * text is returned unchanged.
 */
export function watermarkText(text: string, mark: TextWatermark = {}): string {
  if (text.length === 0) return text;
  return stripTextWatermark(text) + watermarkSuffix(mark);
}

/**
 * Only the invisible characters, for appending to a stream. They attach to whatever character
 * precedes them, so emit them after at least one visible character.
 */
export function watermarkSuffix(mark: TextWatermark = {}): string {
  const payload = encodePayload(mark);
  return [...MAGIC, payload.length, ...payload].map(byteToSelector).join("");
}

/** Reads the first Witness watermark in `text`, or `null`. */
export function readTextWatermark(text: string): ReadTextWatermark | null {
  for (const run of selectorRuns(text)) {
    const found = findInRun(run.bytes);
    if (found) {
      const raw = new TextDecoder().decode(new Uint8Array(found.payload));
      return { ...decodePayload(raw), raw };
    }
  }
  return null;
}

/** True when `text` carries a Witness watermark. */
export function hasTextWatermark(text: string): boolean {
  return readTextWatermark(text) !== null;
}

/**
 * Removes Witness watermarks and leaves all other characters, including the variation
 * selectors that belong to emoji, untouched.
 */
export function stripTextWatermark(text: string): string {
  const chars = [...text];
  const remove = new Set<number>();
  for (const run of selectorRuns(text)) {
    let offset = 0;
    while (offset < run.bytes.length) {
      const found = findInRun(run.bytes.slice(offset));
      if (!found) break;
      const start = offset + found.start;
      const end = offset + found.end;
      for (let i = start; i < end; i++) remove.add(run.start + i);
      offset = end;
    }
  }
  if (remove.size === 0) return text;
  return chars.filter((_, index) => !remove.has(index)).join("");
}

function encodePayload(mark: TextWatermark): number[] {
  const fields: string[] = [];
  if (mark.generator) fields.push(`g=${encodeURIComponent(mark.generator)}`);
  if (mark.createdAt) fields.push(`t=${encodeURIComponent(mark.createdAt)}`);
  if (mark.id) fields.push(`i=${encodeURIComponent(mark.id)}`);
  let bytes = [...new TextEncoder().encode(fields.join(";"))];
  if (bytes.length > MAX_PAYLOAD) {
    // Keep whole fields only, so a truncated payload still parses.
    while (fields.length > 0 && bytes.length > MAX_PAYLOAD) {
      fields.pop();
      bytes = [...new TextEncoder().encode(fields.join(";"))];
    }
  }
  return bytes;
}

function decodePayload(raw: string): TextWatermark {
  const result: TextWatermark = {};
  for (const field of raw.split(";")) {
    const index = field.indexOf("=");
    if (index < 1) continue;
    const key = field.slice(0, index);
    let value: string;
    try {
      value = decodeURIComponent(field.slice(index + 1));
    } catch {
      continue;
    }
    if (key === "g") result.generator = value;
    else if (key === "t") result.createdAt = value;
    else if (key === "i") result.id = value;
  }
  return result;
}

function byteToSelector(byte: number): string {
  return byte < 16
    ? String.fromCodePoint(0xfe00 + byte)
    : String.fromCodePoint(0xe0100 + (byte - 16));
}

function selectorToByte(codePoint: number): number | null {
  if (codePoint >= 0xfe00 && codePoint <= 0xfe0f) return codePoint - 0xfe00;
  if (codePoint >= 0xe0100 && codePoint <= 0xe01ef) return codePoint - 0xe0100 + 16;
  return null;
}

/** Consecutive variation selectors, with their index in code points. */
function selectorRuns(text: string): Array<{ start: number; bytes: number[] }> {
  const runs: Array<{ start: number; bytes: number[] }> = [];
  let current: { start: number; bytes: number[] } | null = null;
  let index = 0;
  for (const char of text) {
    const byte = selectorToByte(char.codePointAt(0) ?? 0);
    if (byte === null) {
      current = null;
    } else {
      if (!current) {
        current = { start: index, bytes: [] };
        runs.push(current);
      }
      current.bytes.push(byte);
    }
    index++;
  }
  return runs;
}

/** Finds MAGIC, length and payload inside a run. Positions are indexes into `bytes`. */
function findInRun(bytes: number[]): { start: number; end: number; payload: number[] } | null {
  for (let i = 0; i + MAGIC.length < bytes.length; i++) {
    if (bytes[i] !== MAGIC[0] || bytes[i + 1] !== MAGIC[1]) continue;
    const length = bytes[i + 2];
    if (length === undefined) continue;
    const start = i + 3;
    const end = start + length;
    if (end > bytes.length) continue;
    return { start: i, end, payload: bytes.slice(start, end) };
  }
  return null;
}
