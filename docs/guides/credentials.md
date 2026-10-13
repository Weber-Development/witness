---
title: Content Credentials in the browser
description: Read and show the C2PA manifest of an image, audio or video file without a server.
---

`<witness-credentials>` reads the C2PA manifest of a file in the visitor's browser and shows a "Content Credentials" badge with a details panel: the tool that made the file, whether the manifest declares AI as the source, and the recorded actions.

```html
<script type="module">
  import "@sweberdev/witness/elements";
</script>

<img src="/media/picture.jpg" alt="…">
<witness-credentials src="/media/picture.jpg"></witness-credentials>
```

The badge appears only when the file carries a manifest. The file must be served with CORS headers when it comes from another origin.

| Attribute | Meaning |
|---|---|
| `src` | URL of the image, audio or video file |
| `href` | Link to your AI page |
| `locale` | Defaults to the page language (English, German, French, Italian) |

The element fires `witness-credentials` with `detail: { info, state }`, where `state` is `found`, `none` or `error` and `info` is the result of `readC2pa`. `el.info` holds the last result.

## It does not verify

Witness reads the manifest. It does **not** check the signature, the certificate chain or the hash binding in the browser, and the panel says so. Use a C2PA validator, or `witness-scan` in [Witness Pro](../pro/scan.md), when you need validation.

## React

```tsx
import { useContentCredentials } from "@sweberdev/witness-react";

function Credentials({ src }: { src: string }) {
  const { state, info } = useContentCredentials(src);
  if (state !== "found" || !info) return null;
  return <span>Made with {info.generator ?? info.active.claimGenerator}</span>;
}
```
