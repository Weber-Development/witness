---
title: Keeping evidence
description: Record which notices people saw and acknowledged, and which content was marked.
---

When a client asks "how do we show that our chatbot told people it was an AI?", the answer is a log. Witness emits an event whenever a notice is shown or acknowledged, and whenever the AI SDK middleware marks content.

```ts
import { createDisclosure } from "@sweberdev/witness";

createDisclosure({
  id: "support-chat",
  version: "2",
  onEvent: (event) => {
    // { type: "shown" | "acknowledged", id, kind, version, locale, at }
    navigator.sendBeacon("/api/ai-disclosure", JSON.stringify(event));
  },
});
```

With the element, listen for the DOM events:

```ts
document.addEventListener("witness-acknowledged", (e) => send(e.detail));
```

With the middleware, use `onMarked`:

```ts
witnessMiddleware({ onMarked: ({ type, marking }) => audit.write({ action: "ai.marked", type, ...marking }) });
```

## With Logarithm

[Logarithm](/logarithm) stores tamper-evident audit entries. A disclosure event maps to one entry:

```ts
await audit.log({
  action: `ai.disclosure.${event.type}`,
  target: { type: "disclosure", id: event.id },
  metadata: { kind: event.kind, version: event.version, locale: event.locale },
});
```

Do not log more than you need. The events contain no personal data by themselves; if you attach a user id, the usual data protection rules apply.

Witness Pro's [report](../pro/report.md) turns your AI register and these records into a document for clients.
