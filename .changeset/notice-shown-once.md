---
"@sweberdev/witness": patch
"@sweberdev/witness-react": patch
---

`<witness-notice>` sends `witness-shown` once per disclosure id and version. Setting attributes after the element was inserted, as frameworks do, no longer repeats the event, so evidence counts stay correct.
