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
