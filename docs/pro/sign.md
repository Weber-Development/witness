---
title: Signing with C2PA
description: Sign AI-generated images, audio and video with C2PA Content Credentials using your own certificate.
---

`witness-sign` adds a signed C2PA manifest to a file. The manifest says the content was made by a generative model (IPTC digital source type `trainedAlgorithmicMedia`), is bound to the exact bytes of the file by a hash and carries the signer's certificate chain. Anyone with a C2PA reader can then check where the file came from and that it has not been changed.

It works with **your own signing certificate**. Witness does not issue certificates and does not run a signing service, so keys never leave your machine.

```sh
npx witness-sign generated/*.png --cert signer-chain.pem --key signer.key \
  --model "Image Model X" --model-version 3
```

By default each file is written next to the original as `<name>.signed.<ext>`. Use `--out-dir` to collect the results, `--out` for a single file or `--in-place` to replace the originals.

## Formats

| Format | Where the manifest lives |
|---|---|
| PNG | `caBX` chunk after the header |
| JPEG | APP11 segments (large manifests are split over several) |
| WebP, WAV | `C2PA` chunk at the end of the RIFF container |
| MP4, MOV, M4A | `uuid` box at the end of the file, so the offsets in `moov` stay valid |

MP3 is not supported yet. Files that already carry a manifest are refused instead of overwritten, because signing again would break the existing credentials.

## From code

```ts
import { readFile, writeFile } from "node:fs/promises";
import { signC2pa } from "@weber-development/witness-sign";

const { file, manifest, algorithm } = signC2pa(new Uint8Array(await readFile("out.png")), {
  certificate: await readFile("signer-chain.pem", "utf8"), // signer first, then intermediates
  privateKey: await readFile("signer.key", "utf8"),
  model: { name: "Image Model X", version: "3" },
  title: "Hero image",
});
await writeFile("out.signed.png", file);
```

| Option | Meaning |
|---|---|
| `certificate` | Signer certificate first, then its intermediates (PEM). Leave the root out. |
| `privateKey`, `passphrase` | The key of the signer certificate, PEM text or a `KeyObject`. |
| `model` | The AI model, written as the software agent of the `c2pa.created` action. |
| `digitalSourceType` | Short name or full IPTC URI. Default `trainedAlgorithmicMedia`; use `compositeWithTrainedAlgorithmicMedia` for edited material. |
| `generator`, `title` | Name of your software and a title for the claim. |
| `assertions` | Further assertions as `{ label, data }`, written as CBOR. |

Witness checks before it signs: the key must belong to the first certificate, every certificate must be valid now, and each one must be issued by the next. Supported keys are ECDSA P-256, P-384 and P-521 (ES256, ES384, ES512), Ed25519 and RSA with at least 2048 bits (RSA-PSS).

## Checking the result

```ts
import { verifyC2pa } from "@weber-development/witness-scan";

const check = verifyC2pa(signedBytes, { trustAnchors: [await readFile("my-ca.pem", "utf8")] });
// check.status === "valid"
```

The [Pro scanner](scan.md#c2pa-verification) runs the same check over a whole build. The output has also been checked against the reference c2pa-rs reader.

## Trust

Readers such as Adobe's Content Credentials viewer only show a signer as trusted when the certificate chains to the **C2PA trust list**. A certificate you create yourself gives a valid signature that readers report as "signer not recognised". For public-facing content get a signing certificate from a CA on the trust list. The Code of Practice names C2PA as one way to mark content; a signature does not by itself fulfil Article 50.

## Not yet

Replacing or extending an existing manifest, MP3, and a signed timestamp (without one a signature is only as long-lived as the certificate).
