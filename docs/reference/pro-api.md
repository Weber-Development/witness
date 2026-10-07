---
title: Pro API
description: Every export of the Witness Pro packages: locales, scan, report and sign.
---

All Pro packages are on GitHub Packages under `@weber-development`; see [Witness Pro](../pro/overview.md) for installation. They share one version number.

## `@weber-development/witness-locales`

| Export | |
|---|---|
| `registerEuLocales(register, only?)` | Registers the 20 additional EU languages with `registerLocale` from the free package. `only` limits it to some codes. Returns the codes registered |
| `euLocale(code)` | The messages of one language, or `undefined` |
| `EU_LOCALES` | All messages by language code |
| `EU_LANGUAGES`, `EuLanguage` | The 24 official EU language codes |
| `LocaleMessages`, `DisclosureKind`, `DisclosureText`, `UiText` | The types of the free package, re-exported |

## `@weber-development/witness-scan`

| Export | |
|---|---|
| `scan(config?, cwd?)` | Scans a build folder and returns a `ScanReport`: `{ root, scannedAt, inventory, findings, noticePages, aiPages, markedImages, markedMedia }`. Options: [Configuration](../pro/scan.md#configuration) |
| `loadConfig(path?, cwd?)` | Reads the `scan` section of `witness.config.json`; a missing file gives `{}` |
| `verifyC2pa(bytes, { trustAnchors?, now? })` | Checks the active C2PA manifest of a file: signature, assertion hashes, file binding and signer. Returns `{ status, signature, assertions, binding, trust, signer?, manifests, problems }` or `null` without a manifest. [Details](../pro/scan.md#c2pa-verification) |
| `formatText(report)`, `formatMarkdown(report)`, `formatGithubAnnotations(report, prefix?)` | The report as console text, a Markdown table and GitHub workflow annotations |
| `ruleTitle(rule)` | The readable title of a rule id |
| `routeToFile(route)` | The pseudo file name a rendered route gets in the report, e.g. `/support` becomes `support/index.html` |

Types: `ScanConfig`, `ScanReport`, `Finding`, `Inventory`, `RuleId`, `Severity` (`error` or `warning`), `ChatRule`, `RenderConfig`, `C2paConfig`, `AiPageUse`, `C2paVerification`, `C2paVerifyOptions`, `C2paCheck`, `C2paSigner`.

## `@weber-development/witness-report`

| Export | |
|---|---|
| `validateRegister(input)` | Problems of a register as readable strings; an empty list means it is valid |
| `dutiesFor(system)` | The Article 50 paragraphs a system's uses point to |
| `buildModel(register, { locale?, scan?, events?, history?, date? })` | Everything the renderers need, computed once |
| `renderReportHtml(model)`, `renderReportMarkdown(model)` | The client report |
| `renderPageHtml(model, { showVendors?, fragment? })`, `renderPageMarkdown(model, options?)` | The public "How we use AI" page |
| `parseEvents(ndjson)`, `aggregateEvents(events)` | Disclosure events from NDJSON, counted per id and version |
| `checkNotice(pages, noticePages)` | Which register pages the scan found a notice on |
| `keyDates(systems, today)` | The Article 50 dates that concern the register's systems |
| `parseRegisterCsv(text)`, `registerToCsv(systems)`, `mergeSystems(existing, imported, { replace? })` | [Spreadsheet import and export](../pro/report.md) |
| `suggestSystems(register, aiPages)`, `routeOf(file)` | [Draft systems for AI use the register misses](../pro/report.md#finding-what-the-register-misses) |
| `recordHistory(history, register, { note?, at? })`, `emptyHistory()`, `parseHistory(text)`, `diffSystems(before, after)`, `unrecordedChanges(history, register)` | [The register change log](../pro/report.md#change-log) |
| `LEGAL_CHANGES`, `LEGAL_STATUS_VERSION`, `legalChangesSince(version?)` | [The legal status changelog](../pro/report.md#legal-status) |
| `reportText(locale)` | The wording of the report in `en`, `de`, `fr` or `it` |
| `AI_USES` | The values `uses` can take |

Types: `Register`, `AiSystem`, `AiUse`, `Organisation`, `Role` (`provider` or `deployer`), `ReportLocale`, `ReportModel`, `ReportText`, `SystemEntry`, `KeyDate`, `EvidenceRow`, `BuildOptions`, `PageOptions`, `DisclosureEvent`, `ScanSummary`, `ScanAiPage`, `Suggestions`, `Uncovered`, `CsvImport`, `RegisterHistory`, `HistoryEntry`, `HistoryChange`, `LegalChange`.

## `@weber-development/witness-sign`

| Export | |
|---|---|
| `signC2pa(bytes, options)` | Signs a PNG, JPEG, WebP, WAV or MP4/MOV/M4A file with C2PA Content Credentials and returns `{ file, format, manifest, algorithm, signer }`. Options: [Signing with C2PA](../pro/sign.md#from-code) |
| `detectFormat(bytes)` | `png`, `jpeg`, `webp`, `wav`, `mp4` or `undefined` |

Types: `SignOptions`, `SignResult`, `Format`.
