# Witness

AI transparency toolkit for Article 50 of the EU AI Act. Witness gives web apps the pieces the transparency duties call for: a chatbot notice, visible "AI" labels, machine-readable marking for images (IPTC Digital Source Type in XMP) and an invisible watermark for text, plus Vercel AI SDK middleware that marks every answer and image automatically. No service, no tracking.

```sh
pnpm add @sweberdev/witness
```

```html
<witness-notice locale="de" href="/ki-einsatz"></witness-notice>
<witness-label kind="generated" generator="gpt-image-2"></witness-label>
<script type="module">
  import "@sweberdev/witness/elements";
</script>
```

```ts
import { wrapLanguageModel } from "ai";
import { witnessMiddleware } from "@sweberdev/witness/ai-sdk";

const model = wrapLanguageModel({ model: openai("gpt-5"), middleware: witnessMiddleware() });
```

| Package | |
|---|---|
| [`@sweberdev/witness`](packages/core) | Notice and label elements, image and text marking, AI SDK middleware, `witness` CLI |
| [`@sweberdev/witness-react`](packages/react) | `<AiNotice>`, `<AiLabel>`, `<AiContent>`, `useAiDisclosure` |

- Chatbot notice for Art. 50(1), shown before the first message and kept as a compact label afterwards
- Labels for generated, edited and deepfake content (Art. 50(4)), with a details popover
- XMP marking for PNG, JPEG and WebP without re-encoding; files with C2PA Content Credentials are left intact
- Invisible text watermark, schema.org JSON-LD and meta tags for AI-generated text
- Evidence events for every notice shown and acknowledged
- English, German, French and Italian; all 24 EU languages in Witness Pro

Witness helps you implement the duties; it is not a compliance guarantee. It does not sign content (C2PA) or watermark audio and video. See [What Article 50 asks](docs/legal/article-50.md).

Docs and live demo: [packages.sweber.dev/witness](https://packages.sweber.dev/witness)

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
```

Releases use Changesets: add a changeset with `pnpm changeset`; merging the "version packages" PR publishes to npm.

## Licence

MIT. Witness Pro (all EU languages, CI scanner, transparency report) is a separate commercial product: [packages.sweber.dev/witness](https://packages.sweber.dev/witness).
