---
title: What Article 50 asks
description: The transparency duties of Article 50 of the EU AI Act, who they apply to, the deadlines, and which Witness feature fits each one.
---

This page summarises the law so you can find the right feature. It is not legal advice. Read the [regulation text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) and get advice for your case.

## The five paragraphs

| Paragraph | Who | Duty | Witness |
|---|---|---|---|
| 50(1) | Providers of AI systems that interact directly with people | Design the system so people are told they are interacting with an AI, unless that is obvious from the context | `<witness-notice>`, `<AiNotice>` |
| 50(2) | Providers of AI systems that generate synthetic audio, images, video or text | Mark the outputs in a machine-readable format so they are detectable as artificially generated or manipulated | XMP for images, audio and video, text watermark, AI SDK middleware (partly, see below) |
| 50(3) | Deployers of emotion recognition or biometric categorisation | Inform the people exposed to the system | `kind="emotion-recognition"`, `kind="biometric-categorisation"` |
| 50(4) | Deployers of systems that create deepfakes, or text published to inform the public on matters of public interest | Disclose that the content was artificially generated or manipulated. For text, not needed when a person reviewed it and someone holds editorial responsibility | `<witness-label kind="deepfake">`, `labelHtml`, `humanReviewed` |
| 50(5) | All of the above | Give the information clearly, at the latest at the first interaction or exposure, and accessibly | Notices shown before the first message, labels at the top, screen reader support |

"Provider" is whoever develops the system or has it developed and puts it on the market under their name. "Deployer" is whoever uses it in their own activity. A company that builds a chatbot on top of a model API is usually the provider of that chatbot. The rules also reach companies outside the EU, including in Switzerland, when the output is used in the EU (Art. 2(1)(c)).

## Dates

- **2 August 2026**: Article 50 applies.
- **2 December 2026**: end of the grace period for the machine-readable marking of Art. 50(2) for generative systems that were already on the market before 2 August 2026, under the Digital Omnibus agreement. The other duties got no extra time. ([CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-article50-watermarking-deadline/), [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/))
- Fines for breaching Article 50 go up to EUR 15 million or 3 % of worldwide annual turnover (Art. 99(4)).

## The Code of Practice

The European Commission published a voluntary Code of Practice on marking and labelling AI-generated content on 10 June 2026 ([Jones Day](https://www.jonesday.com/en/insights/2026/06/european-commission-publishes-final-code-of-practice-on-marking-and-labelling-aigenerated-content), [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/24/the-eus-new-ai-labelling-rules-what-every-organisation-needs-to-know-102ne35)). In short:

- Marking should combine at least two layers, typically digitally signed metadata and an imperceptible watermark.
- A common EU icon built around the letters "AI" is foreseen for visible labels; equivalent icons are allowed.
- Labels for published text belong at the top, near the headline. Deepfake video is labelled at the start and repeatedly; audio gets a spoken disclaimer at the beginning.

Witness covers the visible label, unsigned metadata and a text watermark. It does not produce signed C2PA manifests or signal watermarks for images, audio or video; for audio and video it writes XMP metadata. For full 50(2) marking of images, use a generator that embeds C2PA Content Credentials, or add a C2PA signing step; Witness keeps such files intact.

## Sources

- [Regulation (EU) 2024/1689, Article 50](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Hard2bit: AI Act Article 50 explained](https://hard2bit.com/en/blog/ai-act-article-50-ai-transparency-chatbots-deepfakes/)
- [C2PA and the EU AI Act](https://c2paviewer.com/articles/eu-ai-act-content-credentials)
- [IPTC Digital Source Type vocabulary](https://cv.iptc.org/newscodes/digitalsourcetype/)
