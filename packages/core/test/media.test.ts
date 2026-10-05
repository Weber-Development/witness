// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createMarking,
  detectMediaFormat,
  markFile,
  markMedia,
  readMarking,
  readMediaMarking,
} from "../src/index.js";

const marking = createMarking({
  generator: "voice-model",
  provider: "Beispiel AG",
  createdAt: "2026-10-05T10:00:00.000Z",
});

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
}

const cases = [
  { file: "tone.mp3", format: "mp3" },
  { file: "tone-v23.mp3", format: "mp3" },
  { file: "tone-raw.mp3", format: "mp3" },
  { file: "tone.wav", format: "wav" },
  { file: "tone.m4a", format: "mp4" },
  { file: "clip.mp4", format: "mp4" },
  { file: "clip-faststart.mp4", format: "mp4" },
] as const;

describe("markMedia", () => {
  for (const { file, format } of cases) {
    it(`marks ${file} and reads the marking back`, () => {
      const original = fixture(file);
      expect(detectMediaFormat(original)).toBe(format);
      expect(readMediaMarking(original).aiGenerated).toBe(false);

      const result = markMedia(original, marking);
      expect(result.status).toBe("marked");
      expect(result.format).toBe(format);
      const info = readMediaMarking(result.bytes);
      expect(info).toMatchObject({
        format,
        aiGenerated: true,
        witness: true,
        sourceType: "trainedAlgorithmicMedia",
        generator: "voice-model",
        c2pa: false,
      });

      // Marking twice keeps a single packet.
      const again = markMedia(result.bytes, createMarking({ kind: "edited" }));
      const xmp = readMediaMarking(again.bytes).xmp ?? "";
      expect(xmp.match(/witness:marker/g)).toHaveLength(1);
      expect(readMediaMarking(again.bytes).sourceType).toBe("compositeWithTrainedAlgorithmicMedia");
      expect(again.bytes.length - result.bytes.length).toBeLessThan(200);
    });
  }

  it("keeps existing ID3 frames", () => {
    const marked = markMedia(fixture("tone-v23.mp3"), marking).bytes;
    expect(marked[3]).toBe(3);
    expect(new TextDecoder("latin1").decode(marked.subarray(0, 200))).toContain("TIT2");
  });

  it("keeps the MP4 media data in place", () => {
    const original = fixture("clip.mp4");
    const marked = markMedia(original, marking).bytes;
    expect(marked.subarray(0, original.length)).toEqual(original);
  });

  it("leaves files with a C2PA manifest unchanged", () => {
    const original = fixture("tone.wav");
    const c2pa = new Uint8Array(original.length + 12);
    c2pa.set(original);
    c2pa.set(new TextEncoder().encode("C2PA"), original.length);
    c2pa.set([4, 0, 0, 0, 1, 2, 3, 4], original.length + 4);
    new DataView(c2pa.buffer).setUint32(4, c2pa.length - 8, true);
    expect(readMediaMarking(c2pa).c2pa).toBe(true);
    expect(markMedia(c2pa, marking).status).toBe("skipped-c2pa");
    expect(markMedia(c2pa, marking, { c2pa: "overwrite" }).status).toBe("marked");
  });

  it("rejects other files", () => {
    expect(markMedia(new TextEncoder().encode("hello"), marking).status).toBe("unsupported");
    expect(readMediaMarking(new Uint8Array(4)).format).toBeNull();
  });
});

describe("markFile and readMarking", () => {
  it("handle audio and video", () => {
    const marked = markFile(fixture("tone.wav"), marking);
    expect(marked).toMatchObject({ status: "marked", format: "wav" });
    expect(readMarking(marked.bytes).aiGenerated).toBe(true);
  });
});
