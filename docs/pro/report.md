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

### Import from a spreadsheet

Most teams start with a spreadsheet. Export it as CSV and import it into the register:

```sh
npx witness-report import systems.csv --dry-run
npx witness-report import systems.csv
npx witness-report export --out systems.csv
```

The delimiter (comma, semicolon or tab) is detected, so a German Excel export works as it is. Columns: `id`, `name`, `purpose`, `vendor`, `model`, `role`, `uses`, `humanReview`, `pages`, `since`, `measures`, `owner`; German headings such as `System`, `Zweck`, `Anbieter`, `Modell`, `Rolle`, `Verwendung`, `Seiten`, `Seit`, `Massnahmen` are understood, and `role` accepts `Anbieter` and `Betreiber`. Several values in one cell (uses, pages, measures) are separated by `|` or `;`. A row without an id gets one made from its name.

Systems with an id that is already in the register are replaced, new ones are added and the others stay; `--replace` removes systems that are not in the file. If a row is unusable, the import names its line and writes nothing. The rest of `witness.config.json` is kept. Since 0.4.

### Deadline warnings

`witness-report check` also looks at the key dates that apply to your systems. A date that is closer than 60 days is printed as a warning with the systems it concerns, so a CI job that runs `check` reminds you before the 2 December 2026 marking deadline:

```sh
npx witness-report check --warn-within 90 --fail-within 30
```

`--warn-within <days>` changes the warning window (default 60). `--fail-within <days>` makes `check` exit with an error when the marking deadline is that close, for teams that want the build to stop. Since 0.5.

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

## Legal status

Article 50 and the texts around it are still moving. Witness Pro keeps a changelog of the legal wording and dates it works with, the *legal status*, named by a version such as `2026-10`. The client report says which status it follows, and lists what changed since your register was last reviewed:

```sh
npx witness-report legal            # what changed since the register was last reviewed
npx witness-report legal --accept   # record the current status in the register
```

`--accept` writes `legalStatus` into the register. After that `witness-report check` prints a warning whenever a newer Witness release has a newer status, so a CI job tells you to read the changes. When the law or the Commission's guidance changes in a way that affects the wording or dates Witness uses, a Pro release adds an entry and bumps the status. The entries are a changelog of what Witness does, not legal advice, and a new entry does not tell you what your own duties are.

## Evidence

Pass the events your site collected (see [Keeping evidence](../guides/evidence.md)) as newline-delimited JSON with `--events`. The report counts shown and acknowledged notices per id and version, with the first and last date. Pass the JSON from [`witness-scan`](scan.md) with `--scan` to add the automated check and its findings.

## Finding what the register misses

`witness-scan` records the pages where it found AI use (a chatbot notice, an element marked as AI-generated, an AI image or media file shown) as `aiPages` in its JSON report. Compare them with the pages your register names:

```sh
npx witness-report suggest --scan witness-scan.json
npx witness-report suggest --scan witness-scan.json --write
```

For every page and kind of use that no system names, you get a draft system (`suggested-generated-image` and so on) with the pages filled in. `--write` adds the drafts to the register. Complete the purpose, role and vendor yourself; the drafts are a starting point, not an assessment. `witness-report check --scan witness-scan.json` prints a warning for each uncovered page, so a CI job notices new AI use.

The scan sees what is on the page. It cannot tell that a text was written by a model unless you mark it with `data-ai-generated` or the Witness watermark, so a register can still be incomplete.

## Change log

```sh
npx witness-report history record --note "Added the image generator"
npx witness-report history show
npx witness-report build --history witness.register-history.json --out reports/ai-report.html
```

`history record` compares the register with the state at the last record and writes what was added, removed or changed (with the names of the fields) to `witness.register-history.json`, with your note. Nothing is written when nothing changed. `check --history` warns when the register changed since the last record, and `build --history` adds the log to the client report in the report language. Commit the history file next to the register.

The HTML report has print rules: print it from the browser and choose "Save as PDF" for a document to hand to a client.

## CLI

| Option | Meaning |
|---|---|
| `--config <file>` | Register file. Default `witness.config.json`. |
| `--locale <code>` | `en` (default), `de`, `fr` or `it`. |
| `--out <file>` | Output file. `.md` writes Markdown, anything else HTML. Default: standard output. |
| `--scan <file>` | JSON report from `witness-scan` (`build` only). |
| `--events <file>` | Notice events, one JSON object per line (`build` only). |
| `--history <file>` | Change log file. Default for `history`: `witness.register-history.json`. |
| `--note <text>` | `history record`: a note for the entry. |
| `--write` | `suggest`: add the drafts to the register. |
| `--show-vendors` | List vendor and model on the public page. |
| `--fragment` | Public page without the `<html>` wrapper, for your own layout. |

`witness-report check` validates the register and exits with 1 on problems, so it fits into CI next to the scanner.
