---
title: Getting started
description: Install Witness and add a chatbot notice, a label and image marking in a few minutes.
---

## Install

```sh
pnpm add @sweberdev/witness
# React components
pnpm add @sweberdev/witness-react
```

The core package has no runtime dependencies and works in browsers, Node.js 20+, Deno, Bun and edge runtimes.

## 1. Tell people they are chatting with an AI

```html
<witness-notice locale="de" href="/ki-einsatz"></witness-notice>
<script type="module">
  import "@sweberdev/witness/elements";
</script>
```

Place it at the top of the chat window, before the first message. In React:

```tsx
import { AiNotice } from "@sweberdev/witness-react";
import "@sweberdev/witness/styles.css";

<AiNotice locale="de" href="/ki-einsatz" />;
```

## 2. Label AI-generated content

```html
<figure style="position: relative">
  <img src="/hero.webp" alt="Mountain lake at dawn" />
  <witness-label variant="overlay" generator="gpt-image-2" created="2026-10-05"></witness-label>
</figure>
```

## 3. Mark generated images

```ts
import { markImage } from "@sweberdev/witness";

const { bytes, status } = markImage(png, { generator: "gpt-image-2", provider: "Beispiel AG" });
// status: "marked", "skipped-c2pa" or "unsupported"
```

Or let the AI SDK middleware do it for every image and every answer:

```ts
import { wrapImageModel, wrapLanguageModel } from "ai";
import { witnessImageMiddleware, witnessMiddleware } from "@sweberdev/witness/ai-sdk";

const chat = wrapLanguageModel({ model: openai("gpt-5"), middleware: witnessMiddleware() });
const images = wrapImageModel({ model: openai.image("gpt-image-2"), middleware: witnessImageMiddleware() });
```

## Next

- [What Article 50 asks](legal/article-50.md), with sources
- [Chatbot notice](guides/chatbot-notice.md), [Labels](guides/labels.md), [Images](guides/images.md), [Text](guides/text.md)
