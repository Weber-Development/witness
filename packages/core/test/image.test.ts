// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildXmp,
  createMarking,
  detectImageFormat,
  markImage,
  readImageMarking,
} from "../src/index.js";

const marking = createMarking({
  generator: "gpt-image-2",
  generatorVersion: "2026-09",
  provider: "Beispiel AG",
  createdAt: "2026-10-05T10:00:00.000Z",
  description: "Hero image <generated>",
});

async function source(
  format: "png" | "jpeg" | "webp",
  options: { lossless?: boolean; alpha?: boolean } = {},
) {
  const channels = options.alpha ? 4 : 3;
  const image = sharp({
    create: { width: 33, height: 21, channels, background: { r: 200, g: 40, b: 90, alpha: 0.5 } },
  });
  const out =
    format === "png"
      ? image.png()
      : format === "jpeg"
        ? image.jpeg()
        : image.webp({ lossless: options.lossless ?? false });
  return new Uint8Array(await out.toBuffer());
}

async function pixels(bytes: Uint8Array) {
  return sharp(bytes).raw().toBuffer();
}

const cases = [
  { name: "PNG", format: "png" as const, options: {} },
  { name: "PNG with alpha", format: "png" as const, options: { alpha: true } },
  { name: "JPEG", format: "jpeg" as const, options: {} },
  { name: "WebP lossy", format: "webp" as const, options: {} },
  {
    name: "WebP lossless with alpha",
    format: "webp" as const,
    options: { lossless: true, alpha: true },
  },
];

describe("markImage", () => {
  for (const { name, format, options } of cases) {
    it(`writes XMP that libvips reads back, ${name}`, async () => {
      const original = await source(format, options);
      expect(detectImageFormat(original)).toBe(format);
      const result = markImage(original, marking);
      expect(result.status).toBe("marked");

      const meta = await sharp(result.bytes).metadata();
      expect(meta.format).toBe(format);
      expect(meta.width).toBe(33);
      expect(meta.height).toBe(21);
      const xmp = meta.xmp?.toString("utf8") ?? "";
      expect(xmp).toContain(
        'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"',
      );
      expect(Buffer.compare(await pixels(result.bytes), await pixels(original))).toBe(0);

      const info = readImageMarking(result.bytes);
      expect(info).toMatchObject({
        format,
        aiGenerated: true,
        sourceType: "trainedAlgorithmicMedia",
        generator: "gpt-image-2",
        witness: true,
        c2pa: false,
      });
      expect(info.xmp).toContain("Hero image &lt;generated&gt;");
    });
  }

  it("replaces its own marking instead of stacking", async () => {
    const once = markImage(await source("png"), marking).bytes;
    const twice = markImage(
      markImage(once, createMarking({ kind: "edited", description: "x" })).bytes,
      createMarking({ kind: "edited" }),
    ).bytes;
    const xmp = readImageMarking(twice).xmp ?? "";
    expect(xmp.match(/witness:marker="1"/g)).toHaveLength(1);
    expect(readImageMarking(twice).sourceType).toBe("compositeWithTrainedAlgorithmicMedia");
  });

  it("keeps other XMP properties when merging", async () => {
    const foreign = buildXmp(marking)
      .replace(
        "</rdf:RDF>",
        '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:rights>© Beispiel</dc:rights></rdf:Description></rdf:RDF>',
      )
      .replace(/<rdf:Description\b[^>]*witness:marker="1"[\s\S]*?<\/rdf:Description>/, "");
    const withXmp = new Uint8Array(
      await sharp(await source("jpeg"))
        .withXmp(foreign)
        .jpeg()
        .toBuffer(),
    );
    const marked = markImage(withXmp, marking).bytes;
    const xmp = readImageMarking(marked).xmp ?? "";
    expect(xmp).toContain("© Beispiel");
    expect(xmp).toContain("trainedAlgorithmicMedia");
    expect((await sharp(marked).metadata()).format).toBe("jpeg");
  });

  it("reads a source type written by other tools in element form", async () => {
    const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"><Iptc4xmpExt:DigitalSourceType rdf:resource="http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia"/></rdf:Description></rdf:RDF></x:xmpmeta>`;
    const bytes = new Uint8Array(
      await sharp(await source("png"))
        .withXmp(xmp)
        .png()
        .toBuffer(),
    );
    expect(readImageMarking(bytes)).toMatchObject({
      aiGenerated: true,
      sourceType: "compositeWithTrainedAlgorithmicMedia",
      witness: false,
    });
  });

  it("leaves files with a C2PA manifest alone unless told otherwise", async () => {
    const png = await source("png");
    // Insert an (empty) caBX chunk after IHDR, as C2PA does.
    const ihdrEnd = 8 + 8 + 13 + 4;
    const cabx = new Uint8Array([0, 0, 0, 0, 0x63, 0x61, 0x42, 0x58, 0, 0, 0, 0]);
    const withC2pa = new Uint8Array([
      ...png.subarray(0, ihdrEnd),
      ...cabx,
      ...png.subarray(ihdrEnd),
    ]);
    expect(readImageMarking(withC2pa).c2pa).toBe(true);
    const skipped = markImage(withC2pa, marking);
    expect(skipped.status).toBe("skipped-c2pa");
    expect(skipped.bytes).toBe(withC2pa);
    expect(markImage(withC2pa, marking, { c2pa: "overwrite" }).status).toBe("marked");
  });

  it("reports unsupported formats", () => {
    const gif = new TextEncoder().encode("GIF89a....");
    expect(markImage(gif, marking).status).toBe("unsupported");
    expect(readImageMarking(gif)).toMatchObject({ format: null, aiGenerated: false });
  });

  it("reports unmarked images", async () => {
    expect(readImageMarking(await source("webp"))).toMatchObject({ aiGenerated: false, xmp: null });
  });
});

describe("inflate", () => {
  it("matches node:zlib for stored, fixed and dynamic blocks", async () => {
    const { deflateSync } = await import("node:zlib");
    const { inflateZlib } = await import("../src/inflate.js");
    const samples = [
      new Uint8Array(0),
      new TextEncoder().encode("abc"),
      new TextEncoder().encode("<x:xmpmeta>".repeat(500)),
      new Uint8Array(Array.from({ length: 70000 }, (_, i) => (i * 7919) % 251)),
    ];
    for (const sample of samples) {
      for (const level of [0, 1, 9]) {
        const packed = new Uint8Array(deflateSync(sample, { level }));
        expect(Buffer.compare(Buffer.from(inflateZlib(packed)), Buffer.from(sample))).toBe(0);
      }
    }
    expect(() => inflateZlib(new Uint8Array([1, 2, 3]))).toThrow();
  });

  it("replaces a zTXt XMP chunk written by libvips instead of adding a second one", async () => {
    const png = new Uint8Array(
      await sharp(await source("png"))
        .withXmp(buildXmp(createMarking({ kind: "edited" })))
        .png()
        .toBuffer(),
    );
    const marked = markImage(png, marking).bytes;
    const text = Buffer.from(marked).toString("latin1");
    expect(text.split("XML:com.adobe.xmp").length - 1).toBe(1);
    expect(readImageMarking(marked).sourceType).toBe("trainedAlgorithmicMedia");
  });
});
