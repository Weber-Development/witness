---
title: Migrating to 2.0
description: What changes from Witness 1.x to 2.0 and how to upgrade.
---

Witness 2.0 follows the final Code of Practice on marking and labelling. The content of markings you already wrote stays readable, and the web components, the CLI and the files Witness writes keep working. There are three breaking changes.

## 1. Node 22 or newer

Node 20 is out of support. The packages declare `"node": ">=22"`. Browsers are not affected.

## 2. Markings carry a schema version and layers

`Marking` has two new required fields: `schema: 2` and `layers`. `createMarking` fills them in, so code that only calls `createMarking(...)` does not change. You are affected if you build `Marking` objects by hand in TypeScript:

```ts
// 1.x
const marking: Marking = { kind: "generated", sourceType: "trainedAlgorithmicMedia", createdAt, humanReviewed: false };

// 2.0
const marking = createMarking({ createdAt }); // or add schema: 2 and layers: ["visible", "metadata"]
```

Functions that take `Marking | MarkingInput` (`markFile`, `markingAttributes`, `labelHtml`, …) still accept an object of the old shape and upgrade it with `normaliseMarking`.

`markingAttributes` and `labelHtml` now also write `data-ai-schema="2"` and `data-ai-layers="…"`. If you match the attributes exactly in a test or a CSS selector, update it; the existing `data-ai-*` attributes are unchanged. The Pro scanner reads both generations.

## 3. Pro packages

The four Pro packages move to 2.0.0 together. Install them with the free package at 2.x. The Pro 1.x line keeps working with Witness 1.x and 2.x.

## What stays

- XMP / IPTC markings in files are unchanged. Files marked with 1.x are read by 2.0 and the other way round.
- The text watermark format, the elements, the React components, the AI SDK middleware and all command line options.
- `data-ai-*` attributes written by 1.x are still found by the scanner.

## New in 2.0

- [Marking layers](guides/layers.md): `layers` on markings, `assessLayers`, `inspectLayers`, `witness layers`.
- [`<witness-credentials>`](guides/credentials.md) and `useContentCredentials` to show Content Credentials in the browser.
