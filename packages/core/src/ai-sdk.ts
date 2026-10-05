/**
 * Middleware for the Vercel AI SDK (`ai` 5, 6 and 7). It marks what a model produces:
 *
 * - `witnessMiddleware` appends the invisible text watermark to every text part, for
 *   `generateText` and `streamText`, and adds `providerMetadata.witness`.
 * - `witnessImageMiddleware` writes XMP with the IPTC Digital Source Type into every image
 *   from `generateImage`.
 *
 * The types are structural, so this module has no dependency on `ai`.
 */

import { type MarkImageOptions, markImage } from "./image.js";
import { createMarking, iptcSourceType } from "./marking.js";
import type { ContentKind, Marking } from "./types.js";
import { watermarkSuffix, watermarkText } from "./watermark.js";

type SpecVersion = "v2" | "v3" | "v4";

interface ModelInfo {
  provider: string;
  modelId: string;
}

export interface WitnessMarkedEvent {
  type: "text" | "image";
  marking: Marking;
  /** For text: the id of the text part in a stream, if any. */
  partId?: string;
  /** For images: what happened to each image. */
  status?: string;
}

export interface WitnessMiddlewareOptions {
  /**
   * The AI SDK middleware specification. `v4` for `ai` 7 (default), `v3` for `ai` 6, `v2`
   * for `ai` 5.
   */
  specificationVersion?: SpecVersion;
  /** Name written into the marking. Default: `provider/modelId` of the wrapped model. */
  generator?: string | ((model: ModelInfo) => string);
  /** Default `generated`. */
  kind?: ContentKind;
  /** Your company or product, written into the marking. */
  provider?: string;
  /** Append the invisible text watermark. Default `true`. */
  watermark?: boolean;
  /** A reference written into the watermark, e.g. a log id. */
  id?: () => string;
  /** Called once per marked text part or image, e.g. to write an audit log entry. */
  onMarked?: (event: WitnessMarkedEvent) => void;
}

interface TextPart {
  type: string;
  text?: string;
}

interface GenerateResult {
  content: TextPart[];
  providerMetadata?: Record<string, unknown>;
}

interface StreamPart {
  type: string;
  id?: string;
  delta?: string;
  providerMetadata?: Record<string, unknown>;
}

interface StreamResult {
  stream: ReadableStream<StreamPart>;
}

/** The `witness` entry added to `providerMetadata`. */
export function witnessProviderMetadata(marking: Marking): Record<string, string | boolean> {
  return {
    aiGenerated: true,
    kind: marking.kind,
    sourceType: iptcSourceType(marking.sourceType),
    createdAt: marking.createdAt,
    ...(marking.generator ? { generator: marking.generator } : {}),
    ...(marking.provider ? { provider: marking.provider } : {}),
  };
}

/** Language model middleware. Pass it to `wrapLanguageModel`. */
export function witnessMiddleware(options: WitnessMiddlewareOptions = {}) {
  const watermark = options.watermark ?? true;

  const markingFor = (model: ModelInfo): Marking =>
    createMarking({
      kind: options.kind ?? "generated",
      generator: generatorFor(options.generator, model),
      ...(options.provider ? { provider: options.provider } : {}),
    });

  const watermarkFor = (marking: Marking) => ({
    ...(marking.generator ? { generator: marking.generator } : {}),
    createdAt: marking.createdAt,
    ...(options.id ? { id: options.id() } : {}),
  });

  return {
    specificationVersion: options.specificationVersion ?? "v4",

    async wrapGenerate<R extends GenerateResult>({
      doGenerate,
      model,
    }: {
      doGenerate: () => PromiseLike<R>;
      model: ModelInfo;
    }): Promise<R> {
      const result = await doGenerate();
      const marking = markingFor(model);
      const content = result.content.map((part) => {
        if (part.type !== "text" || typeof part.text !== "string" || part.text.length === 0) {
          return part;
        }
        options.onMarked?.({ type: "text", marking });
        return watermark
          ? { ...part, text: watermarkText(part.text, watermarkFor(marking)) }
          : part;
      });
      return {
        ...result,
        content,
        providerMetadata: { ...result.providerMetadata, witness: witnessProviderMetadata(marking) },
      };
    },

    async wrapStream<R extends StreamResult>({
      doStream,
      model,
    }: {
      doStream: () => PromiseLike<R>;
      model: ModelInfo;
    }): Promise<R> {
      const result = await doStream();
      const marking = markingFor(model);
      const withText = new Set<string>();
      const transform = new TransformStream<StreamPart, StreamPart>({
        transform(part, controller) {
          const id = part.id ?? "";
          if (
            part.type === "text-delta" &&
            typeof part.delta === "string" &&
            part.delta.length > 0
          ) {
            withText.add(id);
          }
          if (part.type === "text-end" && withText.has(id)) {
            withText.delete(id);
            options.onMarked?.({ type: "text", marking, partId: id });
            if (watermark) {
              controller.enqueue({
                type: "text-delta",
                id,
                delta: watermarkSuffix(watermarkFor(marking)),
              });
            }
          }
          if (part.type === "finish") {
            controller.enqueue({
              ...part,
              providerMetadata: {
                ...part.providerMetadata,
                witness: witnessProviderMetadata(marking),
              },
            });
            return;
          }
          controller.enqueue(part);
        },
      });
      return { ...result, stream: result.stream.pipeThrough(transform) };
    },
  };
}

export interface WitnessImageMiddlewareOptions
  extends Pick<WitnessMiddlewareOptions, "generator" | "kind" | "provider" | "onMarked">,
    MarkImageOptions {
  /** `v4` for `ai` 7 (default), `v3` for `ai` 6. */
  specificationVersion?: "v3" | "v4";
}

interface ImageResult {
  images: string[] | Uint8Array[];
  warnings: unknown[];
}

/** Image model middleware. Pass it to `wrapImageModel`. */
export function witnessImageMiddleware(options: WitnessImageMiddlewareOptions = {}) {
  return {
    specificationVersion: options.specificationVersion ?? "v4",

    async wrapGenerate<R extends ImageResult>({
      doGenerate,
      model,
    }: {
      doGenerate: () => PromiseLike<R>;
      model: ModelInfo;
    }): Promise<R> {
      const result = await doGenerate();
      const marking = createMarking({
        kind: options.kind ?? "generated",
        generator: generatorFor(options.generator, model),
        ...(options.provider ? { provider: options.provider } : {}),
      });
      const warnings = [...result.warnings];
      const markOne = (bytes: Uint8Array): Uint8Array => {
        const marked = markImage(bytes, marking, options.c2pa ? { c2pa: options.c2pa } : {});
        options.onMarked?.({ type: "image", marking, status: marked.status });
        if (marked.status !== "marked") {
          warnings.push({
            type: "other",
            message:
              marked.status === "skipped-c2pa"
                ? "Witness: image already carries a C2PA manifest and was left unchanged."
                : "Witness: image format not supported (PNG, JPEG, WebP); image is not marked.",
          });
        }
        return marked.bytes;
      };
      const images = result.images.map((image: string | Uint8Array) =>
        typeof image === "string" ? toBase64(markOne(fromBase64(image))) : markOne(image),
      ) as R["images"];
      return { ...result, images, warnings };
    },
  };
}

function generatorFor(option: WitnessMiddlewareOptions["generator"], model: ModelInfo): string {
  if (typeof option === "function") return option(model);
  return option ?? `${model.provider}/${model.modelId}`;
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}
