---
title: Introduction
description: What Witness is, which parts of Article 50 of the EU AI Act it helps with, and which it does not.
---

Witness is a small toolkit for the transparency duties in Article 50 of the EU AI Act, which apply since 2 August 2026. It gives web apps the pieces those duties call for: a notice that tells people they are talking to an AI, visible labels for AI-generated content, and machine-readable marks in images and text. It runs in your app; nothing is sent anywhere.

## What you get

- **`<witness-notice>`** and **`<AiNotice>`**: the chatbot notice from Art. 50(1). Shown before the first message, collapsed into a small label once acknowledged, reopenable at any time.
- **`<witness-label>`** and **`<AiLabel>`**: an "AI" badge for generated or edited content, with a details popover that names the AI system, the date and whether a person reviewed it.
- **Image marking**: writes the IPTC Digital Source Type into the XMP metadata of PNG, JPEG and WebP files, without re-encoding the pixels. This is the field Google, Meta, Adobe and most photo tools read.
- **Text marking**: an invisible watermark for AI-generated text, plus schema.org JSON-LD and meta tags for whole pages.
- **Vercel AI SDK middleware**: marks every answer from `generateText` and `streamText` and every image from `generateImage` automatically.
- **Evidence events**: a callback for every notice shown and acknowledged, to keep a record of what people were told.
- Wording in **English, German, French and Italian**, overridable per string. Witness Pro adds all 24 official EU languages.

## What Witness does not do

Be clear with your clients about this, because the obligations are broader than any library:

- Witness does not sign content. The Code of Practice on marking and labelling expects signed, tamper-evident metadata (C2PA) plus an imperceptible watermark for most content. Witness writes unsigned XMP and a text watermark that can be stripped. If your image provider already embeds C2PA Content Credentials, Witness leaves those files untouched.
- Witness does not watermark audio or video, and it does not change model weights or outputs.
- Witness does not decide whether a duty applies to you. Whether you are a provider or a deployer, and whether an exception applies, is a legal question. See [What Article 50 asks](legal/article-50.md).

Witness is a tool for implementing the duties, not a compliance guarantee.

Continue with [Getting started](getting-started.md).
