---
title: API
description: Every export of @sweberdev/witness.
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
| `detectImageFormat(bytes)` | `png`, `jpeg`, `webp` or `null` |
| `buildXmp(marking, existing?)` | The XMP packet |

### Text

| Function | |
|---|---|
| `watermarkText(text, { generator, createdAt, id })` | Appends the invisible watermark, replacing an existing one |
| `watermarkSuffix(mark)` | Only the invisible characters, for streams |
| `readTextWatermark(text)` | `{ generator, createdAt, id, raw }` or `null` |
| `hasTextWatermark(text)`, `stripTextWatermark(text)` | |

### Disclosure state

`createDisclosure({ id, kind, version, locale, storage, onEvent, now })` returns `needsAcknowledgement()`, `acknowledgedAt()`, `markShown()`, `acknowledge()`, `reset()` and `subscribe(listener)`. `memoryStorage()` gives an in-memory store.

### Wording

`getMessages(locale, override?)`, `disclosureText(kind, locale, override?)`, `resolveLocale(tags)`, `registerLocale(code, messages)`, `registeredLocales()`, `format(template, values)`, `BUILT_IN_LOCALES`, `DISCLOSURE_KINDS`.

## `@sweberdev/witness/elements`

Registers `<witness-notice>` and `<witness-label>`. `@sweberdev/witness/elements/define` exports the classes and `defineWitnessElements()` without registering.

## `@sweberdev/witness/ai-sdk`

`witnessMiddleware(options)`, `witnessImageMiddleware(options)`, `witnessProviderMetadata(marking)`. See [Vercel AI SDK](../guides/ai-sdk.md).

## `@sweberdev/witness/styles.css`

Styles for `labelHtml` output and the React components.
