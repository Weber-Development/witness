---
title: CLI
description: Mark images in bulk and check files for AI marking from the command line.
---

```sh
npx witness mark public/generated/*.png --out public/marked --generator "gpt-image-2" --provider "Beispiel AG"
npx witness mark hero.webp --in-place --kind edited
npx witness inspect public/marked/*.png
npx witness inspect build/answers/*.md --require   # exit 1 if any file is unmarked
```

`mark` needs either `--out <dir>` or `--in-place`. Options: `--generator`, `--generator-version`, `--kind` (`generated`, `edited`, `deepfake`), `--provider`, `--url`, `--description`, `--overwrite-c2pa`.

`inspect` reports the image format, the IPTC source type, the AI system and whether a C2PA manifest is present. For other files it looks for the text watermark. `--json` prints one JSON object per file.

In PowerShell, quote globs or list files explicitly:

```powershell
npx witness mark (Get-ChildItem public\generated\*.png).FullName --out public\marked --generator "gpt-image-2"
```
