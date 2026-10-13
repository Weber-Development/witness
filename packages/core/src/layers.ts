/**
 * Marking layers. The EU Code of Practice on marking and labelling AI-generated content asks
 * providers to apply at least two machine-readable techniques to audio, image and video (for
 * example signed metadata plus an imperceptible watermark), and one for free-form text. This
 * module records which layers a piece of content carries and reports what is missing.
 *
 * It describes what Witness can see. It is not a conformity check: whether a technique is
 * robust enough is for you and your legal adviser to judge.
 */

import { readC2pa } from "./c2pa.js";
import { readMarking } from "./media.js";

/**
 * - `visible`: a label people can see. Needed for deepfakes (Art. 50(4)), but not machine-readable.
 * - `metadata`: XMP / IPTC, `data-ai-*` attributes or JSON-LD.
 * - `watermark`: an imperceptible signal in the content itself (pixels, samples, text).
 * - `credentials`: a signed C2PA manifest (Content Credentials).
 */
export type MarkingLayer = "visible" | "metadata" | "watermark" | "credentials";

export const MARKING_LAYERS: readonly MarkingLayer[] = [
  "visible",
  "metadata",
  "watermark",
  "credentials",
];

/** The layers a machine can read. `visible` does not count. */
export const MACHINE_READABLE_LAYERS: readonly MarkingLayer[] = [
  "metadata",
  "watermark",
  "credentials",
];

export type LayerContentType = "text" | "image" | "audio" | "video";

export interface LayerAssessment {
  /** How many machine-readable layers the Code of Practice asks for this content type. */
  required: number;
  /** Distinct machine-readable layers present. */
  present: MarkingLayer[];
  /** `present.length >= required`. */
  satisfied: boolean;
  /** Machine-readable layers that are not present yet. */
  missing: MarkingLayer[];
  /** Short English remarks, e.g. that very short texts are exempt. */
  notes: string[];
}

export interface AssessLayersOptions {
  /** Word count of a text. Texts under about 150 words (200 tokens) are exempt. */
  words?: number;
}

/** Text shorter than this many words is exempt from watermarking under the Code. */
export const SHORT_TEXT_WORDS = 150;

/** Normalises and de-duplicates layers, dropping unknown values. */
export function parseLayers(value: string | readonly string[] | null | undefined): MarkingLayer[] {
  if (!value) return [];
  const list = typeof value === "string" ? value.split(/[\s,]+/) : [...value];
  const out: MarkingLayer[] = [];
  for (const item of list) {
    const layer = item.trim().toLowerCase() as MarkingLayer;
    if (MARKING_LAYERS.includes(layer) && !out.includes(layer)) out.push(layer);
  }
  return out;
}

/** Compares the layers present with what the Code of Practice asks for this content type. */
export function assessLayers(
  contentType: LayerContentType,
  layers: readonly MarkingLayer[],
  options: AssessLayersOptions = {},
): LayerAssessment {
  const present = MACHINE_READABLE_LAYERS.filter((layer) => layers.includes(layer));
  const notes: string[] = [];
  let required = contentType === "text" ? 1 : 2;
  if (contentType === "text" && options.words !== undefined && options.words < SHORT_TEXT_WORDS) {
    required = 0;
    notes.push(`Texts under about ${SHORT_TEXT_WORDS} words are exempt from watermarking.`);
  }
  if (contentType === "text") {
    notes.push("Text cannot carry file metadata; one technique is enough.");
  }
  const missing = MACHINE_READABLE_LAYERS.filter((layer) => !present.includes(layer));
  return { required, present, satisfied: present.length >= required, missing, notes };
}

export interface FileLayers {
  contentType: LayerContentType | null;
  /** Layers Witness can detect in the bytes: `metadata` and `credentials`. */
  layers: MarkingLayer[];
  /** A watermark in pixels or samples cannot be detected here; this is always `false`. */
  watermarkChecked: false;
}

const CONTENT_TYPE: Record<string, LayerContentType> = {
  png: "image",
  jpeg: "image",
  webp: "image",
  mp3: "audio",
  wav: "audio",
  mp4: "video",
};

/**
 * Detects the layers of an image, audio or video file: `metadata` when an AI source type is
 * written in the XMP, `credentials` when a C2PA manifest is embedded. Watermarks are not
 * detectable without the provider's detector, so add `watermark` yourself if you applied one.
 */
export function inspectLayers(bytes: Uint8Array): FileLayers {
  const info = readMarking(bytes);
  const layers: MarkingLayer[] = [];
  if (info.xmp && info.aiGenerated) layers.push("metadata");
  if (info.c2pa || readC2pa(bytes)) layers.push("credentials");
  const contentType = info.format ? (CONTENT_TYPE[info.format] ?? null) : null;
  return { contentType, layers, watermarkChecked: false };
}
