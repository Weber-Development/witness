---
title: Locales
description: The built-in wording in English, German, French and Italian, and how to change it.
---

Witness ships English, German, French and Italian. German and French use the formal address ("Sie", "vous"), Italian the informal one ("tu"), as is common on the web in each language. Witness Pro adds the other 20 official EU languages.

| Kind | en | de | fr | it |
|---|---|---|---|---|
| `chatbot` | AI assistant | KI-Assistent | Assistant IA | Assistente IA |
| `generated` | AI-generated | KI-generiert | Généré par IA | Generato con IA |
| `edited` | AI-edited | Mit KI bearbeitet | Modifié par IA | Modificato con IA |
| `deepfake` | Artificially generated | Künstlich erzeugt | Généré artificiellement | Generato artificialmente |
| `emotion-recognition` | Emotion recognition | Emotionserkennung | Reconnaissance des émotions | Riconoscimento delle emozioni |
| `biometric-categorisation` | Biometric categorisation | Biometrische Kategorisierung | Catégorisation biométrique | Categorizzazione biometrica |

Each kind also has a `title` and a `body`. The texts are in [`src/i18n.ts`](https://github.com/Weber-Development/witness/blob/main/packages/core/src/i18n.ts).

## Changing the wording

Override single strings for a locale, for example the informal "du":

```ts
import { registerLocale } from "@sweberdev/witness";

registerLocale("de", {
  kinds: {
    chatbot: {
      title: "Du chattest mit einer KI",
      body: "Dieser Assistent ist ein KI-System und kein Mensch. Seine Antworten können falsch sein.",
    },
  },
});
```

`registerLocale` also adds new languages; anything missing falls back to English. In React, pass `messages` to `WitnessProvider` instead.

Keep the meaning when you rewrite: the person must understand that they are dealing with an AI, or that the content was generated or changed by one.
