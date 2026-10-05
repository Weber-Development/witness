---
title: Scanner
description: Check every build in CI for AI content without a label or marking with witness-scan.
---

`witness-scan` reads a static build (Next.js export, Astro, Hugo, any folder of HTML) and reports gaps in AI transparency. Run it after the build, locally or in CI.

```sh
npx witness-scan out --json witness-scan.json
```

## Rules

| Rule | Default | Finds |
|---|---|---|
| `marked-without-label` | error | An element with `data-ai-generated` without a visible label in it or next to it. |
| `ai-image-unlabelled` | error | An image whose file says it is AI-generated (IPTC source type), shown without a label next to it. |
| `ai-image-unmarked` | error | An image in a folder you declared as AI-generated with neither IPTC marking nor a C2PA manifest. |
| `ai-media-unlabelled` | error | An audio or video file whose metadata says it is AI-generated, played in `<audio>` or `<video>` without a label next to the player. Since 0.2. |
| `ai-media-unmarked` | error | An MP3, WAV, MP4, MOV or M4A file in a folder you declared as AI-generated with neither IPTC marking nor a C2PA manifest. Since 0.2. |
| `ai-text-unmarked` | warning | A text file you declared as AI-generated without the Witness watermark. |
| `chat-without-notice` | error | A chat page without an AI notice in the chat container. |
| `chat-selector-missing` | warning | A chat page where the configured chat container does not exist. |

A label counts as "next to" an image when it sits in the same marked block, the same `<figure>`, the parent of a `<picture>` or the image's direct parent. Broad containers such as `<main>` or `<body>` do not count, so an unrelated label elsewhere on the page does not hide a finding.

## Configuration

The `scan` section of `witness.config.json`:

```json
{
  "scan": {
    "root": "out",
    "chat": [{ "pages": ["support/**/*.html"], "selector": "#chat" }],
    "aiImages": ["images/generated/**"],
    "aiMedia": ["media/generated/**"],
    "aiText": ["answers/**/*.md"],
    "rules": { "ai-text-unmarked": "off" }
  }
}
```

| Option | Default | Meaning |
|---|---|---|
| `root` | `.` | Build output folder. The first CLI argument overrides it. |
| `include` | `["**/*.html"]` | Pages to check. |
| `exclude` | `[]` | Paths to skip. `node_modules` and `.git` are always skipped. |
| `chat` | `[]` | Pages with a chat, and optionally the CSS selector of the chat container the notice must be in. |
| `aiImages` | `[]` | Images that must carry an AI marking. |
| `aiMedia` | `[]` | Audio and video files that must carry an AI marking ([how to mark them](../guides/audio-video.md)). |
| `aiText` | `[]` | Text files that must carry the Witness watermark. |
| `labelSelectors` | `witness-label`, `.witness-label`, `[data-ai-label]` | What counts as a visible label. Add your own badge class here. |
| `noticeSelectors` | `witness-notice`, `.witness-notice`, `[data-ai-notice]` | What counts as a chatbot notice. |
| `rules` | | Per rule `error`, `warning` or `off`. |

## CLI

| Option | Meaning |
|---|---|
| `--config <file>` | Config file. Default `witness.config.json`. |
| `--json <file>` | Write the full report as JSON, the input for `witness-report`. |
| `--markdown <file>` | Write a Markdown summary. |
| `--fail-on <level>` | `error` (default), `warning` or `never`. |
| `--quiet` | Print only findings. |

## GitHub Actions

In GitHub Actions every finding becomes an annotation on the pull request and a summary table is added to the job summary. No extra setup is needed:

```yaml
- run: pnpm build
- run: npx witness-scan out --json witness-scan.json
  env:
    WITNESS_PRO_TOKEN: ${{ secrets.WITNESS_PRO_TOKEN }}
```

## Limits

The scanner sees only what is in the build output. Content loaded at runtime, pages behind a login, native apps and spoken disclosures are outside its view. A clean scan means the checked files have no gaps of these kinds, not that a site meets the AI Act.
