# @sweberdev/witness

AI transparency toolkit for Article 50 of the EU AI Act: chatbot notice and AI label custom elements, IPTC/XMP marking for PNG, JPEG and WebP, an invisible text watermark, schema.org metadata, Vercel AI SDK middleware and a CLI. Wording in English, German, French and Italian. No runtime dependencies.

```sh
pnpm add @sweberdev/witness
```

```ts
import { markImage, watermarkText, labelHtml } from "@sweberdev/witness";
import "@sweberdev/witness/elements"; // <witness-notice>, <witness-label>
import { witnessMiddleware, witnessImageMiddleware } from "@sweberdev/witness/ai-sdk";
```

```sh
npx witness mark generated/*.png --out marked --generator "gpt-image-2"
npx witness inspect marked/*.png
```

Witness is a tool for implementing the duties, not a compliance guarantee.

Docs: [packages.sweber.dev/witness/docs](https://packages.sweber.dev/witness/docs) · MIT
