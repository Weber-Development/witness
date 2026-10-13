---
"@sweberdev/witness": major
"@sweberdev/witness-react": major
---

Witness 2.0, following the final Code of Practice on marking and labelling.

- New: marking layers. `createMarking({ layers })`, `assessLayers`, `inspectLayers` and `witness layers` record which techniques mark your content and check them against the two machine-readable layers the Code asks for.
- New: `<witness-credentials>` and `useContentCredentials` read and show C2PA Content Credentials in the browser. The panel says that the signature is not verified.
- Breaking: `Marking` has the new required fields `schema: 2` and `layers`. `markingAttributes` and `labelHtml` also write `data-ai-schema` and `data-ai-layers`. Old marking objects are upgraded by `normaliseMarking`.
- Breaking: Node 22 or newer.

See "Migrating to 2.0" in the docs.
