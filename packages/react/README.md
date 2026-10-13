# @sweberdev/witness-react

React components for [Witness](https://packages.sweber.dev/witness): the chatbot AI notice (EU AI Act Art. 50(1)), AI labels and marked content blocks.

```sh
pnpm add @sweberdev/witness @sweberdev/witness-react
```

```tsx
import "@sweberdev/witness/styles.css";
import { AiContent, AiLabel, AiNotice, WitnessProvider } from "@sweberdev/witness-react";

<WitnessProvider locale="de">
  <AiNotice id="support-chat" href="/ki-einsatz" />
  <AiContent marking={{ generator: "Claude" }}>{summary}</AiContent>
</WitnessProvider>;
```

Docs: [packages.sweber.dev/witness/docs/guides/react](https://packages.sweber.dev/witness/docs/guides/react) · MIT

<!-- pro-promo -->
## Witness Pro

Witness Pro adds `witness-locales` (all 24 EU languages), `witness-scan` (CI scanner for unlabelled AI content), `witness-report` (AI register and client report) and `witness-sign` (C2PA signing with your own certificate). From CHF 19 per month, or a one-time Lifetime licence.

[See Witness Pro](https://packages.sweber.dev/witness?utm_source=npm&utm_medium=readme&utm_campaign=pro)
<!-- /pro-promo -->
