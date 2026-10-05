# Release checklist (package-launch)

| Item | Status |
|---|---|
| Repo `Weber-Development/witness` | private; created by the Werkbank workflow `new-package` (secret `NPM_TOKEN` set there) |
| npm `@sweberdev/witness`, `@sweberdev/witness-react` | 0.1.0 via the first changeset. npm provenance needs a public repo: make it public first, then merge the "version packages" PR |
| packages.sweber.dev | entry, docs and live demo at packages.sweber.dev/witness (portfoliov3 PR) |
| Docs | Markdown in `docs/` with `nav.json`; Pro pages under `docs/pro/` |
| Pro | yes: `@weber-development/witness-{locales,scan,report}` in `Weber-Development/witness-pro`, customers via `witness-pro-dist` |
| Prices | Freelancer 19 CHF/month or 190/year, Agency 59/590, Lifetime 1'990 CHF (Seya, 2026-10-05) |
| Polar | config in Werkbank `packages/witness.json`; benefit "Witness Pro" to be created by Seya |
| Blog post | `content/blog/witness-0-1-0-released.md` in portfoliov3, after 0.1.0 is on npm |
| Trademark check "Witness" | open (Seya) |
| Legal review of the docs' summary of Art. 50 | recommended (Seya) |
