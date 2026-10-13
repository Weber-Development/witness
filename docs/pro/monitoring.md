---
title: Monitoring
description: Fail only on new findings, comment on pull requests and get an alert when a deploy breaks a label.
---

A scan of a real site often has findings you know about and cannot fix today. A baseline keeps them quiet and makes `witness-scan` report only what is new. Available from Witness Pro 2.1.

## Create a baseline

```sh
npx witness-scan out --write-baseline witness-baseline.json
```

Commit the file. It lists each known finding by rule, file and element, not by wording.

## Use it in CI

```sh
npx witness-scan out --baseline witness-baseline.json --comment witness-comment.md
```

The run fails only when a finding is not in the baseline. The output says how many are new, fixed and unchanged. `--comment` writes a Markdown comparison you can post on a pull request. In GitHub Actions it also goes to the job summary.

```yaml
- run: npx witness-scan out --baseline witness-baseline.json --comment witness-comment.md
- if: always() && github.event_name == 'pull_request'
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    path: witness-comment.md
```

Fixed findings stay in the baseline until you write it again. Do that when you want to tighten the gate.

## Watch the live site

Run the scan on a schedule against a fresh build of your main branch and send an alert when something new shows up:

```yaml
on:
  schedule:
    - cron: "17 6 * * 1-5"
jobs:
  watch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npx witness-scan out --baseline witness-baseline.json --label "Shop"
        env:
          WITNESS_WEBHOOK_URL: ${{ secrets.WITNESS_WEBHOOK_URL }}
```

| Option | Meaning |
|---|---|
| `--baseline <file>` | Known findings. Only new ones fail the run. |
| `--write-baseline <file>` | Save the current findings as the baseline and exit with 0. |
| `--comment <file>` | Write the comparison as Markdown. |
| `--webhook <url>` | POST an alert when there are new findings. Also read from `WITNESS_WEBHOOK_URL`. Must be an `https://` URL. |
| `--label <text>` | Name shown in the alert, e.g. the site. |

The alert body has `text` (Slack and Mattermost), `content` (Discord) and `witness` with the new and fixed findings as data, so any endpoint that takes JSON works. Email needs a service that turns a webhook into mail. The webhook is only called when there are new findings.

The scan checks the build, not the running site. It does not replace a look at the live pages after a deploy.
