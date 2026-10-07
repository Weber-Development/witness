---
title: Audio and video
description: Write the IPTC Digital Source Type into MP3, WAV, MP4, MOV and M4A files, read it back, and what this does not cover.
---

Article 50(2) covers synthetic audio and video as well as images. `markMedia` writes the same XMP packet as [`markImage`](images.md) into audio and video files: the IPTC Digital Source Type, the AI system, the creation date and, if you pass them, your company and your AI page.

The audio and video data is not touched and nothing is re-encoded.

```ts
import { markMedia, readMediaMarking } from "@sweberdev/witness";

const result = markMedia(bytes, {
  kind: "generated",
  generator: "voice-model-2",
  provider: "Beispiel AG",
});

if (result.status === "marked") await save(result.bytes);

readMediaMarking(result.bytes);
// { format: "mp3", aiGenerated: true, sourceType: "trainedAlgorithmicMedia",
//   generator: "voice-model-2", witness: true, c2pa: false, xmp: "…" }
```

| Format | Where the XMP goes |
|---|---|
| MP3 | ID3v2 `PRIV` frame with the owner `XMP`. Other ID3 frames (title, artist, cover) are kept. A file without a tag gets an ID3v2.4 tag |
| WAV | RIFF `_PMX` chunk at the end |
| MP4, MOV, M4A | Top-level `uuid` box with the XMP UUID, appended at the end of the file, so no sample offsets move |

These are the places the XMP specification defines, and ExifTool, Adobe tools and most asset managers read them. Marking the same file again replaces Witness's block and keeps XMP from other tools.

## Images, audio and video in one call

When you do not know the type in advance, use `markFile` and `readMarking`. They detect images, audio and video and call the right function.

```ts
import { markFile, readMarking } from "@sweberdev/witness";

const result = markFile(bytes, { generator: "video-model" });
readMarking(result.bytes).aiGenerated; // true
```

## Text-to-speech with the AI SDK

The AI SDK has no middleware for speech models yet, so mark the audio after `generateSpeech`:

```ts
import { experimental_generateSpeech as generateSpeech } from "ai";
import { markMedia } from "@sweberdev/witness";

const { audio } = await generateSpeech({ model, text });
const { bytes } = markMedia(audio.uint8Array, { generator: "tts-model" });
```

## A visible label next to the player

The XMP marking is for machines. For deepfake audio and video, Article 50(4) also asks for a disclosure people can see. `<witness-player>` wraps the media element and keeps the label with it: an overlay in the corner of a video, a bar above the controls of an audio player.

```html
<witness-player kind="deepfake" generator="video-model" href="/ki">
  <video src="clip.mp4" controls></video>
</witness-player>
```

It takes the attributes of [`<witness-label>`](labels.md) (`kind`, `locale`, `generator`, `created`, `reviewed`, `href`). With `kind="deepfake"` the label reads "Artificially generated" in the page language. In React use `AiPlayer`:

```tsx
<AiPlayer marking={{ kind: "deepfake", generator: "video-model" }} media="video">
  <video src="clip.mp4" controls />
</AiPlayer>
```

The label is there for as long as the player is on the page. Witness does not decide whether content counts as a deepfake or whether an exception applies; see [Article 50 in brief](../legal/article-50.md). The [Pro scanner](../pro/scan.md) accepts `<witness-player>` as the visible label of the media it wraps.

## C2PA and limits

Files that carry a C2PA manifest (a `uuid` box in MP4, a `C2PA` chunk in WAV, a `GEOB` frame in MP3) are returned unchanged with `status: "skipped-c2pa"`, as for images. Pass `{ c2pa: "overwrite" }` only if you do not need the manifest.

Not supported: ID3v2.2 and unsynchronised ID3 tags, RF64 WAV files, and old QuickTime files without an `ftyp` box. These return `status: "unsupported"`.

Metadata is not a watermark. Re-encoding, streaming platforms and most messengers drop it. For deepfake audio and video, Article 50(4) also asks for a visible or audible disclosure: put a [label](labels.md) on the player and, for audio, a short spoken notice at the start.
