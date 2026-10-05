// @vitest-environment node
import { generateImage, generateText, streamText, wrapImageModel, wrapLanguageModel } from "ai";
import { convertArrayToReadableStream, MockImageModelV4, MockLanguageModelV4 } from "ai/test";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { witnessImageMiddleware, witnessMiddleware } from "../src/ai-sdk.js";
import { readImageMarking, readTextWatermark, stripTextWatermark } from "../src/index.js";

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
const finishReason = { unified: "stop" as const, raw: "stop" };

describe("witnessMiddleware", () => {
  it("watermarks generateText output and adds provider metadata", async () => {
    const onMarked = vi.fn();
    const model = wrapLanguageModel({
      model: new MockLanguageModelV4({
        provider: "mock",
        modelId: "chat-1",
        doGenerate: {
          content: [{ type: "text", text: "Hallo Seya." }],
          finishReason,
          usage,
          warnings: [],
        },
      }),
      middleware: witnessMiddleware({ id: () => "log-42", onMarked }),
    });
    const result = await generateText({ model, prompt: "Hi" });
    expect(stripTextWatermark(result.text)).toBe("Hallo Seya.");
    expect(readTextWatermark(result.text)).toMatchObject({
      generator: "mock/chat-1",
      id: "log-42",
    });
    expect(result.providerMetadata?.witness).toMatchObject({
      aiGenerated: true,
      generator: "mock/chat-1",
    });
    expect(onMarked).toHaveBeenCalledTimes(1);
  });

  it("watermarks every text part of a stream at its end", async () => {
    const model = wrapLanguageModel({
      model: new MockLanguageModelV4({
        provider: "mock",
        modelId: "chat-1",
        doStream: {
          stream: convertArrayToReadableStream([
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "Grüezi " },
            { type: "text-delta", id: "t1", delta: "mitenand" },
            { type: "text-end", id: "t1" },
            { type: "finish", finishReason, usage },
          ]),
        },
      }),
      middleware: witnessMiddleware({ generator: "Support-Bot" }),
    });
    const result = streamText({ model, prompt: "Hi" });
    const text = await result.text;
    expect(stripTextWatermark(text)).toBe("Grüezi mitenand");
    expect(readTextWatermark(text)?.generator).toBe("Support-Bot");
    expect((await result.providerMetadata)?.witness).toMatchObject({ generator: "Support-Bot" });
  });

  it("can skip the watermark and keep only metadata", async () => {
    const model = wrapLanguageModel({
      model: new MockLanguageModelV4({
        doGenerate: {
          content: [{ type: "text", text: "Plain" }],
          finishReason,
          usage,
          warnings: [],
        },
      }),
      middleware: witnessMiddleware({ watermark: false }),
    });
    const result = await generateText({ model, prompt: "Hi" });
    expect(result.text).toBe("Plain");
    expect(result.providerMetadata?.witness).toMatchObject({ aiGenerated: true });
  });
});

describe("witnessImageMiddleware", () => {
  it("writes XMP into base64 images from generateImage", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } })
      .png()
      .toBuffer();
    const model = wrapImageModel({
      model: new MockImageModelV4({
        provider: "mock",
        modelId: "img-1",
        doGenerate: async () => ({
          images: [png.toString("base64")],
          warnings: [],
          response: { timestamp: new Date(), modelId: "img-1", headers: undefined },
        }),
      }),
      middleware: witnessImageMiddleware({ provider: "Beispiel AG" }),
    });
    const { image } = await generateImage({ model, prompt: "a lake" });
    expect(readImageMarking(image.uint8Array)).toMatchObject({
      aiGenerated: true,
      generator: "mock/img-1",
      witness: true,
    });
  });

  it("warns instead of failing on unsupported formats", async () => {
    const model = wrapImageModel({
      model: new MockImageModelV4({
        doGenerate: async () => ({
          images: [new TextEncoder().encode("GIF89a.......")],
          warnings: [],
          response: { timestamp: new Date(), modelId: "img-1", headers: undefined },
        }),
      }),
      middleware: witnessImageMiddleware(),
    });
    const result = await generateImage({ model, prompt: "a lake" });
    expect(result.warnings.some((w) => JSON.stringify(w).includes("not supported"))).toBe(true);
  });
});
