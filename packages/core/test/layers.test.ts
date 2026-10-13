// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assessLayers,
  createMarking,
  inspectLayers,
  markFile,
  markingAttributes,
  normaliseMarking,
  parseLayers,
} from "../src/index.js";

function fixture(path: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`./fixtures/${path}`, import.meta.url)));
}

describe("marking schema 2", () => {
  it("adds the schema version and the default layers", () => {
    const marking = createMarking({ generator: "Model" });
    expect(marking.schema).toBe(2);
    expect(marking.layers).toEqual(["visible", "metadata"]);
    const attributes = markingAttributes(marking);
    expect(attributes["data-ai-schema"]).toBe("2");
    expect(attributes["data-ai-layers"]).toBe("visible metadata");
  });

  it("takes layers from the input and drops duplicates and unknown values", () => {
    const marking = createMarking({ layers: ["metadata", "watermark", "metadata"] });
    expect(marking.layers).toEqual(["metadata", "watermark"]);
    expect(parseLayers("visible, credentials nonsense")).toEqual(["visible", "credentials"]);
  });

  it("upgrades a marking object of schema 1", () => {
    const legacy = {
      kind: "generated",
      sourceType: "trainedAlgorithmicMedia",
      createdAt: "2026-01-01T00:00:00.000Z",
      humanReviewed: false,
    } as unknown as Parameters<typeof normaliseMarking>[0];
    const upgraded = normaliseMarking(legacy);
    expect(upgraded.schema).toBe(2);
    expect(upgraded.layers).toEqual(["visible", "metadata"]);
    expect(upgraded.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("assessLayers", () => {
  it("asks for two machine-readable layers for images, audio and video", () => {
    const one = assessLayers("image", ["visible", "metadata"]);
    expect(one).toMatchObject({ required: 2, satisfied: false });
    expect(one.missing).toEqual(["watermark", "credentials"]);
    const two = assessLayers("video", ["metadata", "credentials"]);
    expect(two.satisfied).toBe(true);
    expect(two.present).toEqual(["metadata", "credentials"]);
  });

  it("does not count the visible label as machine-readable", () => {
    expect(assessLayers("audio", ["visible"]).present).toEqual([]);
  });

  it("asks for one layer for text and none for short text", () => {
    expect(assessLayers("text", ["metadata"]).satisfied).toBe(true);
    expect(assessLayers("text", [], { words: 400 }).satisfied).toBe(false);
    const short = assessLayers("text", [], { words: 40 });
    expect(short).toMatchObject({ required: 0, satisfied: true });
    expect(short.notes.join(" ")).toContain("exempt");
  });
});

describe("inspectLayers", () => {
  it("finds the metadata written by Witness", () => {
    const marked = markFile(fixture("tone.wav"), { generator: "Voice" });
    const result = inspectLayers(marked.bytes);
    expect(result).toMatchObject({ contentType: "audio", watermarkChecked: false });
    expect(result.layers).toEqual(["metadata"]);
  });

  it("finds Content Credentials", () => {
    const result = inspectLayers(fixture("c2pa/signed.png"));
    expect(result.contentType).toBe("image");
    expect(result.layers).toContain("credentials");
  });

  it("finds nothing in a plain file", () => {
    expect(inspectLayers(fixture("tone.wav")).layers).toEqual([]);
  });
});
