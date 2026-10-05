import { format, getMessages } from "./i18n.js";
import type { ContentKind, LocaleOverride, Marking, MarkingInput, SourceType } from "./types.js";

const IPTC_BASE = "http://cv.iptc.org/newscodes/digitalsourcetype/";

const SCHEMA_ORG: Record<SourceType, string> = {
  trainedAlgorithmicMedia: "https://schema.org/TrainedAlgorithmicMediaDigitalSource",
  compositeWithTrainedAlgorithmicMedia:
    "https://schema.org/CompositeWithTrainedAlgorithmicMediaDigitalSource",
  algorithmicallyEnhanced: "https://schema.org/AlgorithmicallyEnhancedDigitalSource",
  algorithmicMedia: "https://schema.org/AlgorithmicMediaDigitalSource",
  compositeSynthetic: "https://schema.org/CompositeSyntheticDigitalSource",
};

const DEFAULT_SOURCE: Record<ContentKind, SourceType> = {
  generated: "trainedAlgorithmicMedia",
  edited: "compositeWithTrainedAlgorithmicMedia",
  deepfake: "trainedAlgorithmicMedia",
};

/** The IPTC Digital Source Type URI, e.g. for XMP or `data-ai-source-type`. */
export function iptcSourceType(type: SourceType): string {
  return IPTC_BASE + type;
}

/** The schema.org `IPTCDigitalSourceEnumeration` member for JSON-LD. */
export function schemaOrgSourceType(type: SourceType): string {
  return SCHEMA_ORG[type];
}

/** Reads a source type from an IPTC or schema.org URI, or from the bare name. */
export function parseSourceType(value: string | null | undefined): SourceType | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const name = trimmed.startsWith(IPTC_BASE) ? trimmed.slice(IPTC_BASE.length) : trimmed;
  if (name in SCHEMA_ORG) return name as SourceType;
  for (const [type, uri] of Object.entries(SCHEMA_ORG)) {
    if (uri === trimmed) return type as SourceType;
  }
  return undefined;
}

/** True for source types that mean "made or changed by a trained AI model". */
export function isAiSourceType(type: SourceType | undefined): boolean {
  return (
    type === "trainedAlgorithmicMedia" ||
    type === "compositeWithTrainedAlgorithmicMedia" ||
    type === "algorithmicallyEnhanced"
  );
}

/** Applies defaults to a marking. */
export function createMarking(input: MarkingInput = {}): Marking {
  const kind = input.kind ?? "generated";
  const createdAt =
    input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : (input.createdAt ?? new Date().toISOString());
  const marking: Marking = {
    kind,
    sourceType: input.sourceType ?? DEFAULT_SOURCE[kind],
    createdAt,
    humanReviewed: input.humanReviewed ?? false,
  };
  if (input.generator) marking.generator = input.generator;
  if (input.generatorVersion) marking.generatorVersion = input.generatorVersion;
  if (input.provider) marking.provider = input.provider;
  if (input.disclosureUrl) marking.disclosureUrl = input.disclosureUrl;
  if (input.description) marking.description = input.description;
  return marking;
}

/**
 * `data-*` attributes that mark an element's content as AI-generated. Spread them on the
 * element that wraps the content.
 */
export function markingAttributes(input: Marking | MarkingInput): Record<string, string> {
  const m = normalise(input);
  const attributes: Record<string, string> = {
    "data-ai-generated": "true",
    "data-ai-kind": m.kind,
    "data-ai-source-type": iptcSourceType(m.sourceType),
    "data-ai-created": m.createdAt,
  };
  if (m.generator) attributes["data-ai-generator"] = generatorName(m);
  if (m.provider) attributes["data-ai-provider"] = m.provider;
  if (m.humanReviewed) attributes["data-ai-reviewed"] = "true";
  return attributes;
}

/**
 * Page-level `<meta>` tags for a page whose main content is AI-generated. There is no
 * standardised meta tag yet, so these are a convention; pair them with {@link markingJsonLd}.
 */
export function markingMetaTags(
  input: Marking | MarkingInput,
): Array<{ name: string; content: string }> {
  const m = normalise(input);
  const tags = [
    { name: "ai-generated", content: m.kind },
    { name: "ai-source-type", content: iptcSourceType(m.sourceType) },
  ];
  if (m.generator) tags.push({ name: "ai-generator", content: generatorName(m) });
  if (m.humanReviewed) tags.push({ name: "ai-reviewed", content: "true" });
  return tags;
}

/** The meta tags as an HTML string. */
export function renderMetaTags(input: Marking | MarkingInput): string {
  return markingMetaTags(input)
    .map((tag) => `<meta name="${escapeHtml(tag.name)}" content="${escapeHtml(tag.content)}">`)
    .join("\n");
}

/** The meta tags in the shape of Next.js `metadata.other`. */
export function nextMetadata(input: Marking | MarkingInput): { other: Record<string, string> } {
  return {
    other: Object.fromEntries(markingMetaTags(input).map((tag) => [tag.name, tag.content])),
  };
}

/**
 * schema.org JSON-LD for a creative work, with `digitalSourceType` set. Merge `extra` to add
 * your own properties such as `headline` or `@type: "NewsArticle"`.
 */
export function markingJsonLd(
  input: Marking | MarkingInput,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const m = normalise(input);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    digitalSourceType: schemaOrgSourceType(m.sourceType),
    dateCreated: m.createdAt,
  };
  if (m.generator) {
    data.creator = {
      "@type": "SoftwareApplication",
      name: m.generator,
      ...(m.generatorVersion ? { softwareVersion: m.generatorVersion } : {}),
    };
  }
  if (m.provider) data.publisher = { "@type": "Organization", name: m.provider };
  if (m.description) data.description = m.description;
  return { ...data, ...extra };
}

/** The JSON-LD as a `<script type="application/ld+json">` tag. */
export function renderJsonLd(
  input: Marking | MarkingInput,
  extra: Record<string, unknown> = {},
): string {
  const json = JSON.stringify(markingJsonLd(input, extra)).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

export interface LabelHtmlOptions {
  locale?: string | readonly string[];
  messages?: LocaleOverride;
  /** Where the visible label goes. Text should be labelled at the top. Default `top`. */
  position?: "top" | "bottom";
  /** Element that wraps label and content. Default `div`. */
  tag?: "div" | "section" | "article" | "figure" | "aside";
}

/**
 * Wraps server-rendered HTML in an element that carries the marking attributes and a visible
 * label. Works without JavaScript; style it with `@sweberdev/witness/styles.css` or your own
 * CSS for `.witness-label`.
 */
export function labelHtml(
  html: string,
  input: Marking | MarkingInput,
  options: LabelHtmlOptions = {},
): string {
  const m = normalise(input);
  const tag = options.tag ?? "div";
  const attributes = Object.entries(markingAttributes(m))
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");
  const label = renderLabelLine(m, options);
  const body = options.position === "bottom" ? `${html}${label}` : `${label}${html}`;
  return `<${tag} class="witness-content"${attributes}>${body}</${tag}>`;
}

/** One line of visible label text, e.g. "KI-generiert · Erzeugt mit Claude". */
export function labelText(
  input: Marking | MarkingInput,
  options: Pick<LabelHtmlOptions, "locale" | "messages"> = {},
): string {
  const m = normalise(input);
  const messages = getMessages(options.locale, options.messages);
  const parts = [messages.kinds[m.kind].label];
  if (m.generator) {
    parts.push(format(messages.ui.generatedWith, { generator: generatorName(m) }));
  }
  if (m.humanReviewed) parts.push(messages.ui.humanReviewed);
  return parts.join(" · ");
}

function renderLabelLine(m: Marking, options: LabelHtmlOptions): string {
  const messages = getMessages(options.locale, options.messages);
  const text = escapeHtml(labelText(m, options));
  const link = m.disclosureUrl
    ? ` <a class="witness-label__link" href="${escapeHtml(m.disclosureUrl)}">${escapeHtml(messages.ui.moreInfo)}</a>`
    : "";
  return `<p class="witness-label" role="note"><span class="witness-label__icon" aria-hidden="true">AI</span> <span class="witness-label__text">${text}</span>${link}</p>`;
}

/** "Model 1.2" when a version is known. */
export function generatorName(m: Pick<Marking, "generator" | "generatorVersion">): string {
  if (!m.generator) return "";
  return m.generatorVersion ? `${m.generator} ${m.generatorVersion}` : m.generator;
}

function normalise(input: Marking | MarkingInput): Marking {
  return isMarking(input) ? input : createMarking(input);
}

function isMarking(input: Marking | MarkingInput): input is Marking {
  return (
    typeof input.kind === "string" &&
    typeof input.sourceType === "string" &&
    typeof input.createdAt === "string" &&
    typeof input.humanReviewed === "boolean"
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
