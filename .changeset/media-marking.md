---
"@sweberdev/witness": minor
---

Mark audio and video: `markMedia` and `readMediaMarking` write and read XMP with the IPTC Digital Source Type in MP3 (ID3v2 `PRIV`), WAV (`_PMX`) and MP4, MOV and M4A (`uuid` box at the end of the file). `markFile` and `readMarking` handle images, audio and video in one call, and the CLI marks and inspects audio and video files.
