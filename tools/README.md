# Tools

Available tools:

- `npm run discover`: collect source-level candidate metadata from known sources.
- `npm run discover:write`: write candidates to `data/candidates.json`.
- `npm run discover:fetch`: fetch source pages and record lightweight hints.
- `npm run download`: mirror clearly reusable OpenPets packages and download
  license-unclear assets into the ignored local review cache.
- `npm run promote`: standardize downloaded assets into `pets/<source>/<id>/`
  with `pet.json`, spritesheet, zip package, and `meta.json`.
- `npm run import:candidates`: import discovered pet page links as link-only
  catalog entries.
- `npm run report`: generate `docs/discovery-report.md`.
- `npm run validate`: check source data, pet data, local package files, hashes,
  and WebP dimensions.

Planned tools:

- `download`: fetch static package files for approved entries.
- `report`: generate markdown summaries and missing-license reports.

Tooling should avoid executing third-party package installers. Prefer direct
HTTP downloads of static files and keep all fetched metadata auditable.
