---
"@sweberdev/witness": minor
---

Read C2PA Content Credentials: `readC2pa` reads the manifest store of PNG, JPEG, WebP, MP3, WAV and MP4 files and returns the claim generator, the actions and the IPTC digital source type they declare (not validated). `readImageMarking`, `readMediaMarking`, `readMarking` and `witness inspect` now count a C2PA AI declaration as AI marking and expose it as `c2paManifest`. Text watermarks can go on every paragraph: `watermarkText(text, mark, { paragraphs: true })` and the `paragraphs` option of `witnessMiddleware`, also for streams.
