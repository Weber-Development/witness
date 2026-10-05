# @sweberdev/witness

## 0.2.0

### Minor Changes

- 0683c88: Mark audio and video: `markMedia` and `readMediaMarking` write and read XMP with the IPTC Digital Source Type in MP3 (ID3v2 `PRIV`), WAV (`_PMX`) and MP4, MOV and M4A (`uuid` box at the end of the file). `markFile` and `readMarking` handle images, audio and video in one call, and the CLI marks and inspects audio and video files.

## 0.1.1

### Patch Changes

- fcf2059: `<witness-notice>` sends `witness-shown` once per disclosure id and version. Setting attributes after the element was inserted, as frameworks do, no longer repeats the event, so evidence counts stay correct.

## 0.1.0

### Minor Changes

- 9e8bcaf: First release: chatbot notice and AI label custom elements, React components, IPTC/XMP marking for PNG, JPEG and WebP, invisible text watermark, schema.org metadata, Vercel AI SDK middleware and the `witness` CLI. Wording in English, German, French and Italian.
