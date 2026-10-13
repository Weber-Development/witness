---
title: Marking layers
description: Record which techniques mark your AI content and check them against the two-layer expectation of the Code of Practice.
---

The Code of Practice on marking and labelling asks providers to apply **at least two machine-readable techniques** to AI-generated audio, image and video, for example signed metadata plus an imperceptible watermark. For free-form text one technique is enough, and texts under about 150 words (200 tokens) are exempt from watermarking. A visible label is a different duty (Art. 50(4)) and does not count towards the two.

Witness 2.0 lets you write down which layers you apply and checks them against that expectation.

| Layer | What it is | How Witness helps |
|---|---|---|
| `visible` | A label people can see | `<witness-label>`, `labelHtml`, `<AiContent>` |
| `metadata` | XMP / IPTC, `data-ai-*` attributes, JSON-LD | `markFile`, `markingAttributes` |
| `watermark` | A signal in pixels, samples or text | The text watermark. For images and audio use your provider's watermark and add `watermark` yourself |
| `credentials` | A signed C2PA manifest | Reading: `readC2pa`. Signing: [Witness Pro](../pro/sign.md) |

## Record layers on a marking

```ts
import { createMarking, markingAttributes } from "@sweberdev/witness";

const marking = createMarking({
  generator: "image-model",
  layers: ["visible", "metadata", "watermark"],
});
markingAttributes(marking);
// { "data-ai-schema": "2", "data-ai-layers": "visible metadata watermark", ... }
```

Without `layers`, `createMarking` records `visible` and `metadata`, which is what Witness itself applies.

## Check content against the Code

```ts
import { assessLayers } from "@sweberdev/witness";

assessLayers("image", ["visible", "metadata"]);
// { required: 2, present: ["metadata"], satisfied: false, missing: ["watermark", "credentials"], notes: [] }
```

`assessLayers(contentType, layers, { words })` takes `text`, `image`, `audio` or `video`.

## Inspect a file

```ts
import { inspectLayers } from "@sweberdev/witness";

const { contentType, layers } = inspectLayers(bytes);
// layers: ["metadata", "credentials"]
```

`inspectLayers` finds `metadata` (an AI source type in the XMP) and `credentials` (an embedded C2PA manifest). It cannot find a watermark: only the provider's detector can. The same on the command line:

```sh
npx witness layers ./out/*.png --assume watermark --require
```

`--assume watermark` adds the layers you applied but Witness cannot see. With `--require` the command exits 1 when a file has fewer machine-readable layers than the Code asks for, which suits a CI job.

This is a record and a check of what is present, not a conformity assessment. Whether a technique is robust enough is for you and your legal adviser to judge.
