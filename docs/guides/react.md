---
title: React
description: AiNotice, AiLabel, AiContent, AiPlayer and useAiDisclosure from @sweberdev/witness-react.
---

```sh
pnpm add @sweberdev/witness @sweberdev/witness-react
```

```tsx
import "@sweberdev/witness/styles.css";
import { AiContent, AiLabel, AiNotice, WitnessProvider } from "@sweberdev/witness-react";

export function Chat() {
  return (
    <WitnessProvider locale="de">
      <AiNotice id="support-chat" href="/ki-einsatz" onEvent={log} />
      {messages.map((m) => (m.role === "assistant" ? <AiContent key={m.id} marking={{ generator: "Aria" }} labelPosition="none">{m.text}</AiContent> : …))}
    </WitnessProvider>
  );
}
```

| Export | |
|---|---|
| `WitnessProvider` | `locale` (tag or list) and `messages` (overrides) for everything below |
| `AiNotice` | The chatbot notice. Props like the [element](chatbot-notice.md): `kind`, `id`, `version`, `href`, `storage`, `onEvent`, `children` |
| `AiLabel` | The badge with details. `kind`, `generator`, `generatorVersion`, `createdAt`, `reviewed`, `href`, `variant` |
| `AiContent` | Wraps content with `data-ai-*` attributes and a label. `marking`, `as`, `labelPosition` (`top`, `bottom`, `overlay`, `none`) |
| `AiPlayer` | Wraps an `<audio>` or `<video>` with a label that stays visible. `marking`, `media` (`video` overlay, `audio` above the controls) |
| `useAiDisclosure` | State for your own notice UI |
| `useWitnessMessages` | The active wording |

The server render always contains the full notice; it collapses after hydration for people who already acknowledged it. So the notice is in the HTML from the first byte, and nobody sees a chat without it.

The components are client components (`"use client"` is set). Use `@sweberdev/witness/styles.css` or style the `witness-*` classes yourself.
