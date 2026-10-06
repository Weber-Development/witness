---
title: AI register and reports
description: Keep an AI register and turn it into a client report and a public AI page with witness-report.
---

`witness-report` keeps a register of the AI systems on a site and turns it into two documents:

- a **transparency report** for your client (HTML or Markdown) that lists each system, the Article 50 paragraphs it points to and how Witness implements them, with scan results and evidence of shown and acknowledged notices;
- a public **"How we use AI" page**, the natural target for the `href` of notices and labels.

```sh
npx witness-report check
npx witness-report build --scan witness-scan.json --events disclosures.ndjson --out reports/ai-report.html
npx witness-report page --out public/ai.html
```

The [live demo](https://packages.sweber.dev/witness/demo#pro) shows both documents for a made-up client.

## The register

The `register` section of `witness.config.json`:

```json
{
  "register": {
    "organisation": { "name": "Muster Travel AG", "url": "https://muster-travel.example", "contact": "ai@muster-travel.example" },
    "systems": [
      {
        "id": "support-chat",
        "name": "Support assistant",
        "purpose": "Answers questions about bookings and travel documents.",
        "vendor": "Example AI",
        "model": "example-chat-2",
        "role": "provider",
        "uses": ["chatbot", "generated-text"],
        "pages": ["/support"],
        "since": "2026-06-01",
        "measures": ["Notice above the chat", "Answers carry the text watermark"],
        "owner": "Customer service"
      }
    ]
  }
}
```

| Field | Meaning |
|---|---|
| `id` | Stable id. Use the `disclosure-id` of the notice so the events match. |
| `name`, `purpose` | Shown in both documents, in the report language. |
| `vendor`, `model` | Who supplies the model. On the public page only with `--show-vendors`. |
| `role` | `provider` if you build the system and offer it under your name (usual for a chatbot on a model API), `deployer` if you use someone else's system. |
| `uses` | `chatbot`, `generated-text`, `generated-image`, `generated-audio`, `generated-video`, `deepfake`, `public-interest-text`, `emotion-recognition`, `biometric-categorisation`. |
| `humanReview` | A person reviews generated text before publication and holds editorial responsibility. |
| `pages`, `since`, `measures`, `owner` | Optional details for the report. `owner` is never shown on the public page. |

## From uses to duties

| Use | Paragraph |
|---|---|
| `chatbot` | 50(1) |
| generated text, images, audio or video | 50(2), for providers |
| `deepfake` | 50(2) for providers, 50(4) |
| `public-interest-text` | 50(2) for providers, 50(4), marked as exempt with `humanReview` |
| emotion recognition, biometric categorisation | 50(3) |

This mapping is a sorting aid for your documentation, not a legal assessment. A system can have duties the register does not capture, for example under other parts of the AI Act or the GDPR.

## Key dates

Since 0.3 the report lists the dates that matter for the systems in the register, with the days left from the report date:

| Date | What applies | Systems listed |
|---|---|---|
| 2 August 2026 | Article 50 applies | every system with at least one duty |
| 2 December 2026 | End of the grace period for machine-readable marking (Art. 50(2)) | providers of generative systems whose `since` is before 2 August 2026, or who have no `since` |

The dates follow [What Article 50 asks](../legal/article-50.md). Set `since` for each system so the report can tell whether the grace period applies.

## Evidence

Pass the events your site collected (see [Keeping evidence](../guides/evidence.md)) as newline-delimited JSON with `--events`. The report counts shown and acknowledged notices per id and version, with the first and last date. Pass the JSON from [`witness-scan`](scan.md) with `--scan` to add the automated check and its findings.

## CLI

| Option | Meaning |
|---|---|
| `--config <file>` | Register file. Default `witness.config.json`. |
| `--locale <code>` | `en` (default), `de`, `fr` or `it`. |
| `--out <file>` | Output file. `.md` writes Markdown, anything else HTML. Default: standard output. |
| `--scan <file>` | JSON report from `witness-scan` (`build` only). |
| `--events <file>` | Notice events, one JSON object per line (`build` only). |
| `--show-vendors` | List vendor and model on the public page. |
| `--fragment` | Public page without the `<html>` wrapper, for your own layout. |

`witness-report check` validates the register and exits with 1 on problems, so it fits into CI next to the scanner.
