---
title: Text
description: Invisible text watermark, page metadata and visible labels for AI-generated text.
---

## The invisible watermark

`watermarkText` appends a short payload of Unicode variation selectors to a text. These code points are not rendered, screen readers skip them, and they usually survive copy and paste. The payload carries the AI system, a timestamp and an optional id.

```ts
import { readTextWatermark, stripTextWatermark, watermarkText } from "@sweberdev/witness";

const marked = watermarkText(answer, { generator: "Claude", createdAt: new Date().toISOString(), id: "msg_123" });
readTextWatermark(marked); // { generator: "Claude", createdAt: "…", id: "msg_123", raw: "…" }
stripTextWatermark(marked) === answer; // true
```

### One mark per paragraph

By default the watermark sits at the end of the text, so a single paragraph copied out of a longer answer carries no mark. Pass `{ paragraphs: true }` to also mark the end of every paragraph (text before a blank line):

```ts
const marked = watermarkText(article, { generator: "Claude" }, { paragraphs: true });
```

Each paragraph then reads back on its own. The [AI SDK middleware](ai-sdk.md) has the same `paragraphs` option for `generateText` and `streamText`.

Know its limits: it is lost when text is retyped, paraphrased, or passed through a sanitiser that removes unusual characters. Some search indexes and databases normalise text. It is a cheap second layer for chat answers and generated copy, not a robust watermark. Do not watermark content where hidden characters cause trouble, such as code, URLs, IDs or data that is parsed later. `stripTextWatermark` removes it again.

Emoji also use variation selectors (for example ❤️). Witness only touches its own payload, which starts with a fixed marker.

## Page metadata

For an article or page that is mostly AI-generated, add schema.org JSON-LD with `digitalSourceType`, and optionally meta tags:

```ts
import { markingJsonLd, nextMetadata, renderJsonLd } from "@sweberdev/witness";

// any framework
head.insertAdjacentHTML("beforeend", renderJsonLd({ generator: "Claude" }, { "@type": "Article", headline }));

// Next.js App Router
export const metadata = { title: "…", ...nextMetadata({ generator: "Claude" }) };
```

There is no standard meta tag for AI content yet. Witness writes `ai-generated`, `ai-source-type` and `ai-generator` as a convention; the JSON-LD uses the official schema.org vocabulary.

## Visible label

Text published to inform the public on matters of public interest needs a visible disclosure (Art. 50(4)), unless a person reviewed it and someone holds editorial responsibility. The Code of Practice places the label above the text, near the headline. Use `labelHtml`, `<AiContent>` or `<witness-label>` at the top. Mark reviewed content with `humanReviewed: true`, so the label says so.
