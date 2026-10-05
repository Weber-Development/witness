---
title: All 24 EU languages
description: Notice and label wording in every official EU language with witness-locales.
---

The free package ships English, German, French and Italian. `@weber-development/witness-locales` adds the other 20 official EU languages: Bulgarian, Croatian, Czech, Danish, Dutch, Estonian, Finnish, Greek, Hungarian, Irish, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Slovak, Slovenian, Spanish and Swedish.

## Register

Register the languages once, before the first notice or label renders:

```ts
import { registerLocale } from "@sweberdev/witness";
import { registerEuLocales } from "@weber-development/witness-locales";

registerEuLocales(registerLocale); // all 20
registerEuLocales(registerLocale, ["pl", "nl"]); // or only the ones you need
```

After that, `<witness-notice locale="pl">`, `<AiNotice locale="nl">` and the page language (`<html lang="es">`) pick the new wording like any built-in locale. `resolveLocale` matches regional tags such as `pt-BR` or `nl-BE` to the base language.

## Helpers

| Export | What it is |
|---|---|
| `EU_LANGUAGES` | All 24 official EU language codes, including the four free ones. |
| `EU_LOCALES` | The 20 languages this package adds, as a map from code to messages. |
| `euLocale(code)` | The messages of one language, for your own registry or a server render. |

## Wording

The texts avoid addressing the reader directly ("This assistant is an AI system" rather than "you are chatting with"), so they fit formal and informal brands in languages that distinguish the two.

They were written carefully but not reviewed by professional translators or lawyers. Have a language checked by a native speaker before you use it on a client site you cannot read yourself. Override single strings the same way as for the built-in languages:

```ts
registerLocale("pl", { kinds: { chatbot: { title: "Rozmawiasz z asystentem AI" } } });
```
