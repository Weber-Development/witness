---
title: Stability and versioning
description: What semantic versioning covers in Witness and Witness Pro, and how things get deprecated.
---

Witness follows [semantic versioning](https://semver.org). From 1.0.0, a minor or patch release does not break code that uses the documented parts below. A major release can.

## What the version covers

- Every export listed on the [API reference](api.md) and the [Pro API reference](pro-api.md), with their documented behaviour and types.
- The custom elements `<witness-notice>`, `<witness-label>` and `<witness-player>`: their names, attributes, events (`witness-shown`, `witness-acknowledged`) and CSS custom properties and `part` names.
- The markup that `labelHtml` writes and the `data-ai-*` attributes.
- What is written into files: the XMP packet, the IPTC source types and the text watermark format. Files marked with an older version stay readable.
- Command line options and exit codes of `witness`, `witness-scan`, `witness-report` and `witness-sign`.
- The shape of the files the tools write and read: `witness.config.json` (the `scan` and `register` sections), the JSON report of `witness-scan`, the register history file and the NDJSON disclosure events. New fields can appear in a minor release, existing ones keep their meaning.

## What it does not cover

- Anything that is not on the reference pages. In particular `decodeCbor`, `parseManifestStore`, `escapeHtml` and `generatorName` from `@sweberdev/witness` are helpers shared with the Pro packages.
- Wording. Translations of notices, labels and reports can be corrected in any release. If you must show exact text, pass your own with `messages` or register your own locale.
- Findings of `witness-scan`. A new minor release can add rules and make existing rules stricter, so a build can start to report findings after an update. Turn a rule off or down in the configuration, or pin the version.
- Legal status. The [legal status changelog](../pro/report.md#legal-status) records changes to the law as Witness uses it. A new entry arrives in a minor release and can change what a report says.
- The visual design of components.

## Deprecation

A feature is deprecated in a minor release: the docs and the TypeScript types (`@deprecated`) say so and name the replacement, and it keeps working. It is removed no earlier than the next major release. Command line options print a warning to the error output while they are deprecated.

## The packages move together

`@sweberdev/witness` and `@sweberdev/witness-react` always have the same version. The four Pro packages (`witness-locales`, `witness-scan`, `witness-report`, `witness-sign`) share one version number as well. Pro packages need the free package at a version they list as a dependency; install both from the same line (for example `^1.0.0`).
