---
title: Labels
description: Visible "AI" labels for generated, edited and deepfake content, as a web component, as server-rendered HTML or in React.
---

## `<witness-label>`

```html
<witness-label
  kind="generated"
  generator="gpt-image-2"
  created="2026-10-05"
  href="/ki-einsatz"
></witness-label>
```

The label is a button with an "AI" mark and a short text. Clicking it opens a small panel that explains the label and lists the AI system, the date and, with `reviewed`, that a person reviewed the content. Escape or a click outside closes it.

| Attribute | Meaning |
|---|---|
| `kind` | `generated` (default), `edited` or `deepfake` |
| `generator`, `generator-version` | The AI system |
| `created` | ISO date |
| `reviewed` | A person reviewed the content and holds editorial responsibility |
| `href` | Link to your AI page |
| `variant` | `inline` (default) or `overlay`, which pins it to the top corner of a positioned parent |
| `locale` | Defaults to the page language |

Over an image or video:

```html
<figure style="position: relative">
  <img src="/campaign.jpg" alt="…" />
  <witness-label variant="overlay" kind="deepfake"></witness-label>
</figure>
```

## Which kind?

- `generated`: the content was created by an AI system.
- `edited`: existing content was substantially changed with AI (inpainting, face swap, rewritten text). Small edits such as colour correction or spelling fixes are not meant here.
- `deepfake`: generated or manipulated content that looks like real people, places or events and could be taken as real. Art. 50(4) requires this disclosure from deployers.

## Server-rendered HTML

`labelHtml` wraps HTML in an element with the marking attributes and a visible label. It needs no JavaScript.

```ts
import { labelHtml } from "@sweberdev/witness";
import "@sweberdev/witness/styles.css";

const html = labelHtml(summaryHtml, { generator: "Claude", disclosureUrl: "/ki" }, { locale: "de" });
```

```html
<div class="witness-content" data-ai-generated="true" data-ai-kind="generated" …>
  <p class="witness-label" role="note"><span class="witness-label__icon" aria-hidden="true">AI</span> <span class="witness-label__text">KI-generiert · Erzeugt mit Claude</span> <a href="/ki">Wie wir KI einsetzen</a></p>
  …
</div>
```

## The EU icon

The Code of Practice foresees a common EU icon built around the letters "AI". Witness draws its own "AI" mark in the same spirit. If you want the official asset, hide Witness's mark and put the icon in front of the label:

```css
witness-label::part(icon) { display: none; }
```
