---
title: Chatbot notice
description: Tell people they are talking to an AI before the first message, as Article 50(1) and 50(5) ask.
---

Article 50(1) asks that people are informed they are interacting with an AI system, and 50(5) asks for this at the latest at the first interaction. `<witness-notice>` does that: it shows a short notice above the chat until the person acknowledges it, then collapses into a compact "AI assistant" label that stays visible and reopens the notice on click.

```html
<witness-notice
  locale="de"
  disclosure-id="support-chat"
  version="1"
  href="/ki-einsatz"
></witness-notice>
<script type="module">
  import "@sweberdev/witness/elements";
</script>
```

| Attribute | Default | Meaning |
|---|---|---|
| `kind` | `chatbot` | Also `emotion-recognition` or `biometric-categorisation` for Art. 50(3) |
| `locale` | page `lang`, then browser languages | `de`, `fr-CH`, … |
| `disclosure-id` | the kind | Separate acknowledgements for separate assistants |
| `version` | `1` | Bump it when the wording changes, so everyone sees the notice again |
| `href` | none | Link to a page that explains how you use AI |
| `storage` | `local` | `session` or `memory` to ask again in every session or page view |

Your own text goes in the element's content and replaces the body sentence:

```html
<witness-notice locale="de">
  Aria ist ein KI-System. Für verbindliche Auskünfte erreichen Sie uns unter 044 000 00 00.
</witness-notice>
```

## Placement

- Put the notice inside the chat panel, above the first message, so it is visible before anyone types.
- Keep the compact label in the chat header after the acknowledgement. Witness does this for you; don't hide the element.
- If the assistant can also speak, say the disclosure at the start of the voice conversation as well. Witness only covers the visual part.

## Styling

The element uses shadow DOM and CSS custom properties: `--witness-accent`, `--witness-accent-text`, `--witness-bg`, `--witness-fg`, `--witness-muted`, `--witness-border`, `--witness-radius`. Parts: `notice`, `title`, `body`, `button`, `link`, `compact`, `icon`.

```css
witness-notice {
  --witness-accent: #0f766e;
}
witness-notice::part(notice) {
  border-radius: 0;
}
```

## Events

`witness-shown` and `witness-acknowledged` bubble with a `detail` of `{ type, id, kind, version, locale, at }`. See [Keeping evidence](evidence.md).

## Without the element

`createDisclosure()` gives you the same state for your own UI:

```ts
import { createDisclosure, disclosureText } from "@sweberdev/witness";

const disclosure = createDisclosure({ id: "support-chat", version: "1" });
if (disclosure.needsAcknowledgement()) {
  showBanner(disclosureText("chatbot", "de"));
  disclosure.markShown();
}
```
