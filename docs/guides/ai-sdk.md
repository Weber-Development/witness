---
title: Vercel AI SDK
description: Mark every answer and every generated image automatically with AI SDK middleware.
---

```ts
import { openai } from "@ai-sdk/openai";
import { generateImage, streamText, wrapImageModel, wrapLanguageModel } from "ai";
import { witnessImageMiddleware, witnessMiddleware } from "@sweberdev/witness/ai-sdk";

const model = wrapLanguageModel({
  model: openai("gpt-5"),
  middleware: witnessMiddleware({ provider: "Beispiel AG" }),
});

const result = streamText({ model, prompt });
```

`witnessMiddleware`:

- appends the [text watermark](text.md) to every text part, in `generateText` and at the end of every text part in `streamText`;
- adds `providerMetadata.witness` with `aiGenerated`, `kind`, `sourceType`, `generator` and `createdAt`;
- calls `onMarked` for each marked part, so you can log it.

| Option | Default | |
|---|---|---|
| `specificationVersion` | `v4` | `v4` for `ai` 7, `v3` for `ai` 6, `v2` for `ai` 5 |
| `generator` | `provider/modelId` | String or function of the model |
| `kind` | `generated` | |
| `provider` | none | Your company or product |
| `watermark` | `true` | `false` keeps only the metadata |
| `paragraphs` | `false` | Also mark every paragraph, so a quoted paragraph keeps the mark. In streams the mark goes in at each blank line |
| `id` | none | Function returning a reference written into the watermark |
| `onMarked` | none | Called with `{ type, marking, partId }` |

`witnessImageMiddleware` writes [image XMP](images.md) into every image from `generateImage`, whether the provider returns base64 or bytes. Images with a C2PA manifest are left as they are, and unsupported formats produce a warning on the result instead of an error.

```ts
const imageModel = wrapImageModel({
  model: openai.image("gpt-image-2"),
  middleware: witnessImageMiddleware({ provider: "Beispiel AG" }),
});
const { image } = await generateImage({ model: imageModel, prompt: "Mountain lake at dawn" });
```

The module has no dependency on `ai`; it uses the middleware shapes structurally.

Show the notice in the chat UI as well: the middleware marks content, it does not inform the person in front of the screen. See [Chatbot notice](chatbot-notice.md).
