/**
 * The transparency situations Article 50 of the EU AI Act describes.
 *
 * - `chatbot`: a person interacts directly with an AI system (Art. 50(1)).
 * - `generated`: image, audio, video or text produced by an AI system (Art. 50(2) and 50(4)).
 * - `edited`: existing content altered with an AI system (Art. 50(2) and 50(4)).
 * - `deepfake`: generated or manipulated content that resembles real people, objects,
 *   places or events and could falsely appear authentic (Art. 50(4)).
 * - `emotion-recognition` and `biometric-categorisation`: people are exposed to such a
 *   system (Art. 50(3)).
 */
export type DisclosureKind =
  | "chatbot"
  | "generated"
  | "edited"
  | "deepfake"
  | "emotion-recognition"
  | "biometric-categorisation";

export const DISCLOSURE_KINDS: readonly DisclosureKind[] = [
  "chatbot",
  "generated",
  "edited",
  "deepfake",
  "emotion-recognition",
  "biometric-categorisation",
];

/** The kinds that describe a piece of content and can be written into a marking. */
export type ContentKind = "generated" | "edited" | "deepfake";

/**
 * IPTC Digital Source Type values relevant to AI. See
 * https://cv.iptc.org/newscodes/digitalsourcetype/
 */
export type SourceType =
  | "trainedAlgorithmicMedia"
  | "compositeWithTrainedAlgorithmicMedia"
  | "algorithmicallyEnhanced"
  | "algorithmicMedia"
  | "compositeSynthetic";

/** Wording for one disclosure kind in one language. */
export interface DisclosureText {
  /** Two or three words for a badge, e.g. "AI-generated". */
  label: string;
  /** One line for the heading of a notice. */
  title: string;
  /** One or two plain sentences that explain the label. */
  body: string;
}

/** Interface strings shared by the notice and label components. */
export interface UiText {
  /** Button that collapses the chatbot notice. */
  acknowledge: string;
  /** Accessible name of the button that opens label details. */
  details: string;
  /** "Generated with {generator}". `{generator}` is replaced. */
  generatedWith: string;
  /** "Created on {date}". `{date}` is replaced. */
  createdOn: string;
  /** Shown when a person reviewed the content and took editorial responsibility. */
  humanReviewed: string;
  /** Link text to a page with more information. */
  moreInfo: string;
  /** Closes the details popover. */
  close: string;
}

export interface LocaleMessages {
  kinds: Record<DisclosureKind, DisclosureText>;
  ui: UiText;
}

/** A partial override of a locale, e.g. to switch German to the informal "du". */
export interface LocaleOverride {
  kinds?: Partial<Record<DisclosureKind, Partial<DisclosureText>>>;
  ui?: Partial<UiText>;
}

/** What a marking says about a piece of content. Input for {@link createMarking}. */
export interface MarkingInput {
  /** Defaults to `generated`. */
  kind?: ContentKind;
  /** Defaults from `kind`: `trainedAlgorithmicMedia`, or the composite type for `edited`. */
  sourceType?: SourceType;
  /** Name of the AI system or model, e.g. "gpt-image-2" or "Claude". */
  generator?: string;
  /** Version of the AI system, if known. */
  generatorVersion?: string;
  /** Who provides or operates the AI system, e.g. your company. */
  provider?: string;
  /** ISO 8601 timestamp. Defaults to now. */
  createdAt?: string | Date;
  /** A page that explains how and why you use AI. */
  disclosureUrl?: string;
  /** A person reviewed the content and holds editorial responsibility (Art. 50(4), text). */
  humanReviewed?: boolean;
  /** Free text, e.g. "Image generated from the prompt by the newsroom". */
  description?: string;
}

/** A normalised marking with all defaults applied. */
export interface Marking {
  kind: ContentKind;
  sourceType: SourceType;
  generator?: string;
  generatorVersion?: string;
  provider?: string;
  createdAt: string;
  disclosureUrl?: string;
  humanReviewed: boolean;
  description?: string;
}
