---
title: API
description: Every export of @sweberdev/witness, and the React package.
---

## `@sweberdev/witness`

### Markings

| Function | |
|---|---|
| `createMarking(input?)` | Applies defaults: `kind` `generated`, source type from the kind, `createdAt` now |
| `markingAttributes(marking)` | `data-ai-generated`, `data-ai-kind`, `data-ai-source-type`, `data-ai-created`, `data-ai-generator`, `data-ai-provider`, `data-ai-reviewed` |
| `markingMetaTags(marking)`, `renderMetaTags(marking)` | `ai-generated`, `ai-source-type`, `ai-generator`, `ai-reviewed` |
| `nextMetadata(marking)` | `{ other }` for Next.js `metadata` |
| `markingJsonLd(marking, extra?)`, `renderJsonLd(marking, extra?)` | schema.org with `digitalSourceType` |
| `labelHtml(html, marking, options?)` | Wraps HTML with attributes and a visible label. `locale`, `messages`, `position`, `tag` |
| `labelText(marking, options?)` | "KI-generiert · Erzeugt mit Claude" |
| `iptcSourceType(type)`, `schemaOrgSourceType(type)`, `parseSourceType(uri)`, `isAiSourceType(type)` | Source type helpers |

`MarkingInput`: `kind` (`generated`, `edited`, `deepfake`), `sourceType`, `generator`, `generatorVersion`, `provider`, `createdAt`, `disclosureUrl`, `humanReviewed`, `description`.

### Images

| Function | |
|---|---|
| `markImage(bytes, marking?, { c2pa })` | Returns `{ bytes, status, format }`; `status` is `marked`, `skipped-c2pa` or `unsupported` |
| `readImageMarking(bytes)` | `{ format, xmp, sourceType, aiGenerated, generator, witness, c2pa }` |
| `markMedia(bytes, marking?, { c2pa })` | The same for MP3, WAV, MP4, MOV and M4A. `format` is `mp3`, `wav` or `mp4` |
| `readMediaMarking(bytes)` | The same shape as `readImageMarking` |
| `markFile(bytes, marking?, { c2pa })` / `readMarking(bytes)` | Detect image, audio or video and call the matching function |
| `detectMediaFormat(bytes)` | `mp3`, `wav`, `mp4` or `null` |
| `readC2pa(bytes)` | What the C2PA manifest of an image, audio or video file says: `{ active, manifests, aiGenerated, aiInHistory, sourceType, generator, verified: false }` or `null`. Not validated |
| `readC2paManifests(bytes)` | The raw structure of the manifest store for validators: per manifest the decoded `claim`, the `claimBytes` that are signed, the `assertions` with the bytes that are hashed, and the `signature` (COSE_Sign1). Since 0.4. Witness Pro's scanner builds its [verification](../pro/scan.md#c2pa-verification) on it |
| `detectImageFormat(bytes)` | `png`, `jpeg`, `webp` or `null` |
| `buildXmp(marking, existing?)` | The XMP packet |

### Text

| Function | |
|---|---|
| `watermarkText(text, { generator, createdAt, id }, { paragraphs })` | Appends the invisible watermark, replacing an existing one; `paragraphs: true` also marks every paragraph |
| `watermarkSuffix(mark)` | Only the invisible characters, for streams |
| `readTextWatermark(text)` | `{ generator, createdAt, id, raw }` or `null` |
| `hasTextWatermark(text)`, `stripTextWatermark(text)` | |

### Disclosure state

`createDisclosure({ id, kind, version, locale, storage, onEvent, now })` returns `needsAcknowledgement()`, `acknowledgedAt()`, `markShown()`, `acknowledge()`, `reset()` and `subscribe(listener)`. `memoryStorage()` gives an in-memory store.

### Wording

`getMessages(locale, override?)`, `disclosureText(kind, locale, override?)`, `resolveLocale(tags)`, `registerLocale(code, messages)`, `registeredLocales()`, `format(template, values)`, `BUILT_IN_LOCALES`, `DISCLOSURE_KINDS`.

### Types

| Type | Used for |
|---|---|
| `Marking`, `MarkingInput`, `MarkingInfo` | The complete marking, what you pass to `createMarking`, and what `readMarking` returns |
| `ContentKind` | `generated`, `edited` or `deepfake` |
| `DisclosureKind` | `ContentKind` plus `chatbot`, `emotion-recognition` and `biometric-categorisation` |
| `DisclosureOptions`, `DisclosureEvent`, `DisclosureStorage` | Arguments and events of `createDisclosure`; `DisclosureStorage` is `getItem`, `setItem`, `removeItem` |
| `LabelHtmlOptions` | Options of `labelHtml` and `labelText` |
| `MarkImageOptions`, `MarkMediaOptions` | `{ c2pa: "skip" | "overwrite" }` |
| `MarkImageResult`, `MarkMediaResult`, `MarkFileResult` | `{ bytes, status, format }` |
| `ImageMarkingInfo`, `MediaMarkingInfo` | What `readImageMarking` and `readMediaMarking` return |
| `C2paInfo`, `C2paManifestInfo`, `C2paAction` | What `readC2pa` returns |
| `C2paManifestRecord`, `C2paAssertionRecord` | The raw structure `readC2paManifests` returns |
| `LocaleMessages`, `DisclosureText`, `UiText`, `LocaleOverride` | Wording: the full set of texts per language and a partial override |

`@sweberdev/witness` also exports `decodeCbor`, `parseManifestStore`, `escapeHtml` and `generatorName`. They are helpers shared with the Pro packages and are not covered by [semantic versioning](stability.md).

## `@sweberdev/witness/elements`

Registers `<witness-notice>`, `<witness-label>` and `<witness-player>` (see [Labels](../guides/labels.md) and [Audio and video](../guides/audio-video.md)). `@sweberdev/witness/elements/define` exports the classes and `defineWitnessElements()` without registering.

## `@sweberdev/witness/ai-sdk`

`witnessMiddleware(options)`, `witnessImageMiddleware(options)`, `witnessProviderMetadata(marking)`. See [Vercel AI SDK](../guides/ai-sdk.md).

## `@sweberdev/witness/styles.css`

Styles for `labelHtml` output and the React components.

## `@sweberdev/witness-react`

| Export | |
|---|---|
| `AiNotice`, `AiNoticeProps` | The chatbot notice |
| `AiLabel`, `AiLabelProps` | A badge with a details panel; `variant` `inline` or `overlay` |
| `AiContent`, `AiContentProps` | Wraps content with the `data-ai-*` attributes and a label |
| `AiPlayer`, `AiPlayerProps` | Wraps an `<audio>` or `<video>` with a label that stays visible; `media` `video` or `audio` |
| `WitnessProvider`, `WitnessProviderProps`, `useWitnessMessages` | Default locale and wording overrides for the components below it |
| `useAiDisclosure`, `UseAiDisclosureResult` | The disclosure state as a hook |

Props and examples: [React](../guides/react.md).
