# Release checklist (package-launch)

| Item | Status |
|---|---|
| Repo `Weber-Development/witness` | private; created by the Werkbank workflow `new-package` (secret `NPM_TOKEN` set there) |
| npm `@sweberdev/witness`, `@sweberdev/witness-react` | 0.1.0 via the first changeset. npm provenance needs a public repo: make it public first, then merge the "version packages" PR |
| packages.sweber.dev | entry, docs and live demo at packages.sweber.dev/witness (portfoliov3 PR) |
| Docs | Markdown in `docs/` with `nav.json`; Pro pages under `docs/pro/` |
| Pro | yes: `@weber-development/witness-{locales,scan,report}` in `Weber-Development/witness-pro`, customers via `witness-pro-dist` |
| Prices | Freelancer 19 CHF/month or 190/year, Agency 59/590, Lifetime 1'990 CHF (Seya, 2026-10-05) |
| Polar | config in Werkbank `packages/witness.json`; benefit "Witness Pro" to be created by Seya |
| Blog post | `content/blog/witness-0-1-0-released.md` in portfoliov3, after 0.1.0 is on npm |
| Trademark check "Witness" | open (Seya) |
| Legal review of the docs' summary of Art. 50 | recommended (Seya) |

## 0.2.0 (2026-10-05)

| Item | Status |
|---|---|
| npm `@sweberdev/witness`, `@sweberdev/witness-react` 0.2.0 | published (audio and video marking) |
| Pro 0.2.0 (scanner checks audio and video) | `Weber-Development/witness-pro` PR #4, then the version PR and the dist sync |
| Docs | `docs/guides/audio-video.md`, Pro scanner rules in `docs/pro/scan.md` |
| Blog post | `content/blog/witness-0-2-0-released.md` in portfoliov3 |
| Roadmap | `/mnt/project-files/roadmaps/witness.md` in the project files |

## 0.3.0 (2026-10-06)

| Item | Status |
|---|---|
| npm `@sweberdev/witness`, `@sweberdev/witness-react` 0.3.0 | published (C2PA reading, paragraph watermarks) |
| Pro 0.3.0 (C2PA-declared AI in the scanner, key dates in the report) | `Weber-Development/witness-pro` PR #6, then the version PR and the dist release |
| Docs | C2PA section in `docs/guides/images.md`, paragraphs in `docs/guides/text.md` and `docs/guides/ai-sdk.md`, Pro pages |
| Blog post | `content/blog/witness-0-3-0-released.md` in portfoliov3 |

## 0.4.0 (2026-10-06)

| Item | Status |
|---|---|
| npm `@sweberdev/witness`, `@sweberdev/witness-react` 0.4.0 | `readC2paManifests` for validators |
| Pro 0.4.0 | C2PA verification (signature, assertion hashes, file binding, trust anchors), single-page-app scan in a browser, register import and export as CSV |
| Docs | `docs/pro/scan.md` (C2PA verification, single-page apps), `docs/pro/report.md` (CSV), `docs/reference/api.md` |
| Blog post | `content/blog/witness-0-4-0-released.md` in portfoliov3 |
| Not yet | superseded by 0.5.0 and 0.6.0 below |

## 0.5.0 (2026-10-06, Pro only)

| Item | Status |
|---|---|
| Free | unchanged at 0.4.0 |
| Pro 0.5.0 | scanner verifies the file binding of MP4, MOV and M4A (`c2pa.hash.bmff` v2/v3); `witness-report check` warns about key dates (`--warn-within`, `--fail-within`) |
| Docs | `docs/pro/scan.md`, `docs/pro/report.md` |
| Blog post | `content/blog/witness-0-5-0-released.md` in portfoliov3 |
| Dropped from the plan | speech middleware: the AI SDK has no speech middleware yet; marking `generateSpeech` output stays a documented `markMedia` call |

## 0.6.0 (2026-10-06, Pro only)

| Item | Status |
|---|---|
| Free | unchanged at 0.4.0 |
| Pro 0.6.0 | new package `witness-sign`: `signC2pa` and CLI `witness-sign` sign PNG, JPEG, WebP, WAV, MP4/MOV/M4A with the customer's certificate (ES256/384/512, Ed25519, RSA-PSS) |
| Checked against | `verifyC2pa` (tests for every format and key type) and the c2pa-rs reference reader (valid; only "signer untrusted" with a test CA) |
| Docs | `docs/pro/sign.md` |
| Blog post | `content/blog/witness-0-6-0-released.md` in portfoliov3 |
| Open for Seya (optional) | a trust-list certificate only if the demo should sign as sweber.dev; customers use their own |
| Not yet | MP3, replacing or extending existing manifests, signed timestamp (TSA), AI SDK middleware |
