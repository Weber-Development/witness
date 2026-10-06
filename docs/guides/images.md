---
title: Images
description: Write the IPTC Digital Source Type into PNG, JPEG and WebP files, read it back, and how this relates to C2PA.
---

`markImage` writes an XMP packet into an image file. The packet carries:

- `Iptc4xmpExt:DigitalSourceType`: the [IPTC term](https://cv.iptc.org/newscodes/digitalsourcetype/) for how the image was made, e.g. `trainedAlgorithmicMedia` for fully generated images or `compositeWithTrainedAlgorithmicMedia` for edited ones.
- `Iptc4xmpExt:AISystemUsed`, `Iptc4xmpExt:AISystemVersionUsed` and `xmp:CreatorTool`: the AI system.
- `xmp:CreateDate`, and optionally a description, your company and your AI page.

The pixels are not touched. The file is not re-encoded.

```ts
import { markImage, readImageMarking } from "@sweberdev/witness";

const result = markImage(bytes, {
  kind: "generated",
  generator: "gpt-image-2",
  provider: "Beispiel AG",
  disclosureUrl: "https://beispiel.ch/ki",
});

if (result.status === "marked") await save(result.bytes);

readImageMarking(result.bytes);
// { format: "png", aiGenerated: true, sourceType: "trainedAlgorithmicMedia",
//   generator: "gpt-image-2", witness: true, c2pa: false, xmp: "…" }
```

| Format | Where the XMP goes |
|---|---|
| PNG | `iTXt` chunk `XML:com.adobe.xmp` after `IHDR`. Existing `iTXt` or `zTXt` XMP is merged and replaced |
| JPEG | `APP1` segment after JFIF and Exif |
| WebP | `XMP ` chunk; simple files get a `VP8X` header |

Existing XMP from other tools (rights, captions) is kept; Witness adds its own description block and replaces only that on later runs.

## C2PA

C2PA Content Credentials are signed manifests and the format the Code of Practice points to for signed metadata. Many image generators already embed them. Rewriting such a file breaks the manifest's hash binding, so `markImage` returns `status: "skipped-c2pa"` and leaves the bytes untouched. Pass `{ c2pa: "overwrite" }` only if you know you do not need the manifest.

`readImageMarking` reports `c2pa: true` when a manifest is present. Since 0.3 it also reads the manifest: `c2paManifest` tells you which application wrote it, its actions and the IPTC digital source type they declare. A manifest that declares a trained AI model counts as AI marking, so `aiGenerated` is `true` for an image from a generator that embeds Content Credentials, even without XMP.

```ts
import { readC2pa } from "@sweberdev/witness";

readC2pa(bytes);
// { aiGenerated: true, sourceType: "trainedAlgorithmicMedia", generator: "Image Model 3",
//   aiInHistory: true, verified: false,
//   active: { claimGenerator: "Example Generator 1.0", title: "…", actions: [{ action: "c2pa.created", … }] },
//   manifests: [ … ] }
```

`readC2pa` works for every format Witness knows: PNG, JPEG (also stores split over several segments), WebP, MP3, WAV and MP4. `aiGenerated` looks at the active manifest; `aiInHistory` is also true when an earlier manifest, for example of the original before an edit, declares AI.

Witness reads the manifest, it does not validate it: the signature, the certificate chain and the hash binding are not checked, and `verified` is always `false`. Treat the result as what the file claims. For validation use c2patool or a C2PA SDK.

## Limits

XMP metadata is removed by many upload pipelines, messengers and social networks, and anyone can strip it. It is one layer, useful because it is widely read. Pair it with a visible label, and with C2PA or a provider watermark where you need robustness.

## Batch and CI

See [CLI](cli.md) for `witness mark` and `witness inspect`. Witness Pro adds a [scanner](../pro/scan.md) that checks a whole build.
