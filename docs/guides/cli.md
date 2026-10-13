---
title: CLI
description: Mark images, audio and video in bulk and check files for AI marking from the command line.
---

```sh
npx witness mark public/generated/*.png --out public/marked --generator "gpt-image-2" --provider "Beispiel AG"
npx witness mark hero.webp --in-place --kind edited
npx witness inspect public/marked/*.png
npx witness inspect build/answers/*.md --require   # exit 1 if any file is unmarked
```

`mark` needs either `--out <dir>` or `--in-place`. Options: `--generator`, `--generator-version`, `--kind` (`generated`, `edited`, `deepfake`), `--provider`, `--url`, `--description`, `--overwrite-c2pa`.

`mark` handles PNG, JPEG, WebP, MP3, WAV, MP4, MOV and M4A files.

`inspect` reports the file format, the IPTC source type, the AI system and whether a C2PA manifest is present. For other files it looks for the text watermark. `--json` prints one JSON object per file.

In PowerShell, quote globs or list files explicitly:

```powershell
npx witness mark (Get-ChildItem public\generated\*.png).FullName --out public\marked --generator "gpt-image-2"
```

## `witness layers`

```sh
npx witness layers ./out/* [--assume watermark] [--json] [--require]
```

Shows which marking layers an image, audio or video file carries (`metadata`, `credentials`) and how many machine-readable layers the Code of Practice asks for. `--assume` adds layers Witness cannot detect, such as a provider's watermark. `--require` exits 1 when a file has too few. See [Marking layers](layers.md).
