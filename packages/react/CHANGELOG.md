# @sweberdev/witness-react

## 0.5.0

### Minor Changes

- 7485685: `<witness-player>` and `AiPlayer`: wrap an `<audio>` or `<video>` with the AI label that has to stay visible for deepfake content (Art. 50(4)), as an overlay on video and above the controls on audio.

### Patch Changes

- Updated dependencies [7485685]
  - @sweberdev/witness@0.5.0

## 0.4.0

### Minor Changes

- 8f73117: Add `readC2paManifests`, the raw structure of a C2PA manifest store (claim, signed claim bytes, assertions with the bytes that are hashed, signature), as the input for validators such as the Witness Pro scanner.

### Patch Changes

- Updated dependencies [8f73117]
  - @sweberdev/witness@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [7ac5b5f]
  - @sweberdev/witness@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [0683c88]
  - @sweberdev/witness@0.2.0

## 0.1.1

### Patch Changes

- fcf2059: `<witness-notice>` sends `witness-shown` once per disclosure id and version. Setting attributes after the element was inserted, as frameworks do, no longer repeats the event, so evidence counts stay correct.
- Updated dependencies [fcf2059]
  - @sweberdev/witness@0.1.1

## 0.1.0

### Minor Changes

- 9e8bcaf: First release: chatbot notice and AI label custom elements, React components, IPTC/XMP marking for PNG, JPEG and WebP, invisible text watermark, schema.org metadata, Vercel AI SDK middleware and the `witness` CLI. Wording in English, German, French and Italian.

### Patch Changes

- Updated dependencies [9e8bcaf]
  - @sweberdev/witness@0.1.0
