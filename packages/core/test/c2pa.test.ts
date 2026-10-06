// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decodeCbor,
  readC2pa,
  readC2paManifests,
  readImageMarking,
  readMarking,
  readMediaMarking,
} from "../src/index.js";

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`./fixtures/c2pa/${name}`, import.meta.url)));
}

// The fixtures were signed with c2pa-python and a test certificate; the manifest says an
// "Image Model X 3" created the content as trainedAlgorithmicMedia.
describe("readC2pa", () => {
  for (const file of [
    "signed.jpg",
    "signed.png",
    "signed.webp",
    "signed.wav",
    "signed.mp3",
    "signed.mp4",
  ]) {
    it(`reads the manifest of ${file}`, () => {
      const info = readC2pa(fixture(file));
      expect(info).toMatchObject({
        aiGenerated: true,
        aiInHistory: true,
        sourceType: "trainedAlgorithmicMedia",
        generator: "Image Model X 3",
        verified: false,
        active: {
          claimGenerator: "Witness test generator 1.0",
          title: "Generated",
          actions: [{ action: "c2pa.created" }],
        },
      });
      expect(info?.manifests).toHaveLength(1);
      expect(info?.active.label).toMatch(/^urn:c2pa:/);
    });
  }

  it("joins a manifest store split across several JPEG segments", () => {
    const info = readC2pa(fixture("large.jpg"));
    expect(info).toMatchObject({
      aiGenerated: true,
      sourceType: "compositeWithTrainedAlgorithmicMedia",
      generator: "Big generator",
    });
  });

  it("reports AI in the history when the active manifest is a later edit", () => {
    const info = readC2pa(fixture("edited.jpg"));
    expect(info?.manifests.map((m) => m.claimGenerator)).toEqual([
      "Witness test generator 1.0",
      "Photo editor 2",
    ]);
    expect(info).toMatchObject({ aiGenerated: false, aiInHistory: true });
  });

  it("returns null without a manifest or for garbage", () => {
    expect(readC2pa(readFileSync(new URL("./fixtures/tone.wav", import.meta.url)))).toBeNull();
    expect(readC2pa(new Uint8Array([0xff, 0xd8, 0xff, 0xeb, 0, 4, 0x4a, 0x50]))).toBeNull();
  });
});

describe("C2PA in the marking readers", () => {
  it("counts a C2PA AI declaration as AI marking", () => {
    const image = readImageMarking(fixture("signed.png"));
    expect(image).toMatchObject({ c2pa: true, aiGenerated: true, generator: "Image Model X 3" });
    expect(image.c2paManifest?.verified).toBe(false);
    expect(readMediaMarking(fixture("signed.mp4")).aiGenerated).toBe(true);
    expect(readMarking(fixture("signed.mp3")).sourceType).toBe("trainedAlgorithmicMedia");
  });
});

describe("decodeCbor", () => {
  it("decodes the types C2PA uses", () => {
    // {"a": [1, -2, "x", h'0102', true, null, 1.5]}
    const bytes = new Uint8Array([
      0xa1, 0x61, 0x61, 0x87, 0x01, 0x21, 0x61, 0x78, 0x42, 0x01, 0x02, 0xf5, 0xf6, 0xf9, 0x3e,
      0x00,
    ]);
    expect(decodeCbor(bytes)).toEqual({ a: [1, -2, "x", new Uint8Array([1, 2]), true, null, 1.5] });
  });
});

describe("readC2paManifests", () => {
  it("returns claim, hashed assertion bytes and the signature", () => {
    const manifests = readC2paManifests(fixture("signed.jpg"));
    expect(manifests).toHaveLength(1);
    const [manifest] = manifests ?? [];
    expect(manifest?.claimLabel).toMatch(/^c2pa\.claim/);
    expect(manifest?.claimBytes.length).toBeGreaterThan(10);
    expect(manifest?.signature?.length).toBeGreaterThan(100);
    expect(manifest?.assertions.some((a) => a.label === "c2pa.hash.data")).toBe(true);
    expect(manifest?.assertions.every((a) => a.hashed.length > 0)).toBe(true);
  });

  it("returns null without a manifest", () => {
    expect(readC2paManifests(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
