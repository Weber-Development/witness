# @sweberdev/witness

## 2.0.1

### Patch Changes

- f32d7cd: README: add a section about Witness Pro.

## 2.0.0

### Major Changes

- 5fb390e: Witness 2.0, following the final Code of Practice on marking and labelling.

  - New: marking layers. `createMarking({ layers })`, `assessLayers`, `inspectLayers` and `witness layers` record which techniques mark your content and check them against the two machine-readable layers the Code asks for.
  - New: `<witness-credentials>` and `useContentCredentials` read and show C2PA Content Credentials in the browser. The panel says that the signature is not verified.
  - Breaking: `Marking` has the new required fields `schema: 2` and `layers`. `markingAttributes` and `labelHtml` also write `data-ai-schema` and `data-ai-layers`. Old marking objects are upgraded by `normaliseMarking`.
  - Breaking: Node 22 or newer.

  See "Migrating to 2.0" in the docs.

## 2.0.0-next.0

### Major Changes

- 5fb390e: Witness 2.0, following the final Code of Practice on marking and labelling.

  - New: marking layers. `createMarking({ layers })`, `assessLayers`, `inspectLayers` and `witness layers` record which techniques mark your content and check them against the two machine-readable layers the Code asks for.
  - New: `<witness-credentials>` and `useContentCredentials` read and show C2PA Content Credentials in the browser. The panel says that the signature is not verified.
  - Breaking: `Marking` has the new required fields `schema: 2` and `layers`. `markingAttributes` and `labelHtml` also write `data-ai-schema` and `data-ai-layers`. Old marking objects are upgraded by `normaliseMarking`.
  - Breaking: Node 22 or newer.

  See "Migrating to 2.0" in the docs.

## 1.0.0

### Major Changes

- First stable release. The API of 0.9.0 is unchanged and now covered by [semantic versioning](docs/reference/stability.md): every export, custom element, attribute, event and command line option on the reference pages stays compatible until 2.0.0. Free and Pro move to 1.0.0 together.

## 0.9.0

### Minor Changes

- Release candidate for 1.0.0. The API is frozen: every export, element, attribute and event on the reference pages is covered by [semantic versioning](docs/reference/stability.md) from here on. New in this release line since 0.5.1: the complete API reference, the stability policy, browser tests in Chromium, coverage thresholds and a Vite example. Free and Pro move to 0.9.0 together.

## 0.5.1

### Patch Changes

- 49ececa: Fix `<witness-player>`: the label of a video now sits in the corner of the video instead of at the right edge of the page. Found by the new browser tests, which run the elements in a real Chromium in CI.

## 0.5.0

### Minor Changes

- 7485685: `<witness-player>` and `AiPlayer`: wrap an `<audio>` or `<video>` with the AI label that has to stay visible for deepfake content (Art. 50(4)), as an overlay on video and above the controls on audio.

## 0.4.0

### Minor Changes

- 8f73117: Add `readC2paManifests`, the raw structure of a C2PA manifest store (claim, signed claim bytes, assertions with the bytes that are hashed, signature), as the input for validators such as the Witness Pro scanner.

## 0.3.0

### Minor Changes

- 7ac5b5f: Read C2PA Content Credentials: `readC2pa` reads the manifest store of PNG, JPEG, WebP, MP3, WAV and MP4 files and returns the claim generator, the actions and the IPTC digital source type they declare (not validated). `readImageMarking`, `readMediaMarking`, `readMarking` and `witness inspect` now count a C2PA AI declaration as AI marking and expose it as `c2paManifest`. Text watermarks can go on every paragraph: `watermarkText(text, mark, { paragraphs: true })` and the `paragraphs` option of `witnessMiddleware`, also for streams.

## 0.2.0

### Minor Changes

- 0683c88: Mark audio and video: `markMedia` and `readMediaMarking` write and read XMP with the IPTC Digital Source Type in MP3 (ID3v2 `PRIV`), WAV (`_PMX`) and MP4, MOV and M4A (`uuid` box at the end of the file). `markFile` and `readMarking` handle images, audio and video in one call, and the CLI marks and inspects audio and video files.

## 0.1.1

### Patch Changes

- fcf2059: `<witness-notice>` sends `witness-shown` once per disclosure id and version. Setting attributes after the element was inserted, as frameworks do, no longer repeats the event, so evidence counts stay correct.

## 0.1.0

### Minor Changes

- 9e8bcaf: First release: chatbot notice and AI label custom elements, React components, IPTC/XMP marking for PNG, JPEG and WebP, invisible text watermark, schema.org metadata, Vercel AI SDK middleware and the `witness` CLI. Wording in English, German, French and Italian.
