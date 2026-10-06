---
title: Witness Pro
description: All 24 EU languages, a CI scanner for unlabelled AI content and an AI register with client reports.
---

Witness Pro adds four packages to the free kit. They are meant for agencies and teams that look after several sites and need to show their clients what was done. They run on your machines and in your CI and send nothing to us.

| Package | What it does |
|---|---|
| [`witness-locales`](locales.md) | Notice and label wording in the 20 official EU languages the free package does not ship, so all 24 are covered. |
| [`witness-scan`](scan.md) | Checks a static build in CI for AI images and text without a label or marking and for chat pages without a notice. |
| [`witness-report`](report.md) | Turns an AI register into a transparency report for clients and a public "How we use AI" page. |
| [`witness-sign`](sign.md) | Signs AI-generated images, audio and video with C2PA Content Credentials, using your own certificate. |

The packages build on `@sweberdev/witness` and read the same marking, watermark and events. Both share one config file, `witness.config.json`, with a `scan` and a `register` section.

## Licence and installation

Witness Pro is licensed per person: Freelancer (1 person), Agency (up to 10) and Lifetime (up to 10, one payment). After a purchase you get read access to the customer repository `Weber-Development/witness-pro-dist`; the packages are installed from GitHub Packages with a token. The full guide is `INSTALL.md` in that repository.

```ini
# .npmrc
@weber-development:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${WITNESS_PRO_TOKEN}
```

```sh
pnpm add @weber-development/witness-locales
pnpm add -D @weber-development/witness-scan @weber-development/witness-report
pnpm add @weber-development/witness-sign
```

When a subscription ends, installed versions keep working. Only updates and repository access end.

## What Pro does not do

The scanner and the report help you find gaps and document what you did. They are not a legal assessment and do not confirm compliance with the AI Act. See [Article 50 in brief](../legal/article-50.md) for the duties and their sources.
