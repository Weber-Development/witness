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
| `c2pa-invalid` | error | A file whose C2PA manifest does not match it: the file was changed after signing, an assertion was altered or the signature is broken. Since 0.4. |
| `c2pa-untrusted` | warning | A file with an intact C2PA manifest whose signer does not chain to your trust anchors. Only reported when you configure `c2pa.trustAnchors`. Since 0.4. |
| `ai-text-unmarked` | warning | A text file you declared as AI-generated without the Witness watermark. |
| `chat-without-notice` | error | A chat page without an AI notice in the chat container. |
| `chat-selector-missing` | warning | A chat page where the configured chat container does not exist. |

A label counts as "next to" an image when it sits in the same marked block, the same `<figure>`, the parent of a `<picture>` or the image's direct parent. Broad containers such as `<main>` or `<body>` do not count, so an unrelated label elsewhere on the page does not hide a finding.

Since 0.3 an image, audio or video file counts as AI content when its XMP **or** its C2PA manifest declares a trained AI model as the source (read with [`readC2pa`](../guides/images.md#c2pa), not validated). Files from generators that embed Content Credentials therefore also need a label next to them; the finding names the C2PA manifest as the source.

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
    "c2pa": { "trustAnchors": ["trust/c2pa-trust-list.pem"] },
    "render": { "routes": ["/", "/support"], "waitFor": "#chat" },
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
| `c2pa` | verify on | `verify: false` turns C2PA verification off. `trustAnchors` lists PEM files with the certificates you trust ([details](#c2pa-verification)). |
| `render` | off | Routes of a single-page app to render in a browser first ([details](#single-page-apps)). |
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

## C2PA verification

Since 0.4 the scanner verifies every C2PA manifest it finds in images, audio and video, not only reads it. For the active manifest of a file it checks:

1. the **claim signature** (ES256, ES384, ES512, Ed25519 or RSA-PSS) against the signer certificate in the manifest;
2. the **assertion hashes**: every assertion the claim lists is still the one that was signed;
3. the **file content**: the hash in `c2pa.hash.data` matches the file, so a changed image, sound or video is caught (`c2pa.hash.data` for PNG, JPEG, WebP, MP3 and WAV; `c2pa.hash.bmff` version 2 and 3 for MP4, MOV and M4A, where the top-level boxes are hashed with their offsets. A fragmented file with a Merkle tree is reported as not checked. MP4 binding since 0.5);
4. the **certificate chain** from the signer to a trust anchor you supply, with validity dates (a manifest with a timestamp is not failed for a certificate that has expired since).

Anything that does not match is the `c2pa-invalid` error. The scanner ships no trust list, because lists change: download the current C2PA trust list (or your own signer's root certificate) as PEM and point `c2pa.trustAnchors` at it. Without anchors the signer is not checked, and a file that is otherwise intact counts as unverified, not as a finding. With anchors, an intact manifest from an unknown signer is the `c2pa-untrusted` warning.

```ts
import { verifyC2pa } from "@weber-development/witness-scan";

verifyC2pa(bytes, { trustAnchors: [pem] });
// { status: "valid" | "invalid" | "unverified", signature, assertions, binding, trust,
//   signer: { subject, issuer, notAfter }, manifests, problems: [] }
```

Verification tells you the manifest is intact and belongs to this file, and with trust anchors who signed it. It does not tell you that the claims in it are true, and it does not replace a full C2PA validator for ingredient manifests: older manifests of an edited file are read, the active one is verified.

## Single-page apps

A static scan of a single-page app sees an empty shell, so it misses the chat and the images the app renders in the browser. With `render` the scanner serves the build output on a local port, opens each route in headless Chromium, waits for the page to settle and runs the same checks on the rendered DOM. Calls to other hosts are blocked while it runs.

```json
{ "scan": { "root": "dist", "render": { "routes": ["/", "/support"], "waitFor": "#chat" },
            "chat": [{ "pages": ["support/**"], "selector": "#chat" }] } }
```

Findings name a rendered route like a file: `/` is `index.html`, `/support` is `support/index.html`, which is what `chat.pages` matches. A rendered route replaces the static file of the same name; other HTML files are still read from disk. Rendering needs the optional package `playwright-core` and a Chromium (`npx playwright-core install chromium`, or set `render.executablePath` or `WITNESS_CHROMIUM`). Options: `routes`, `waitFor` (selector to wait for), `fallback` (serve `index.html` for unknown routes, default true), `timeout` (milliseconds, default 15000).

## Limits

The scanner sees only what is in the build output (and, with `render`, the routes you list). Content behind a login, content that appears only after interaction, native apps and spoken disclosures are outside its view.
A clean scan means the checked files have no gaps of these kinds, not that a site meets the AI Act.
