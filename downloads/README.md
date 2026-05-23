# Downloads

This folder stores generated download reports and local review caches.

- `download-report.json`: summary from the latest `npm run download` run.
- `review/`: local-only cache for license-unclear third-party assets.

`downloads/review/` is ignored by git. Do not publish files from that folder
until the original source license clearly allows redistribution.
