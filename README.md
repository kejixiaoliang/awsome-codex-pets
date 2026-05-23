# Awesome Codex Pet

A curated, license-aware index of community-made Codex pets.

This project collects public Codex pet resources, records their source metadata,
and separates installable mirrored packs from link-only references. The goal is
to make Codex pets easier to discover, validate, categorize, and install without
losing attribution or license context.

## Scope

- Track public Codex pet galleries, tools, and community posts.
- Catalog pets with source URL, author, license, tags, validation status, and
  fetch date.
- Mirror only assets that are clearly redistributable.
- Prefer static pet package files over third-party install scripts.
- Validate package shape before marking a pet as installable.

## Standard Pet Shape

Most Codex pets use this layout:

```text
<pet-id>/
  pet.json
  spritesheet.webp
```

Common atlas geometry:

- Image size: `1536 x 1872`
- Grid: `8 columns x 9 rows`
- Cell size: `192 x 208`

## Repository Layout

```text
awesome-codex-pet/
  data/
    candidates.json
    sources.json
    pets.json
  docs/
    license-policy.md
    schema.md
    sources.md
  pets/
    <source>/
      <pet-id>/
        pet.json
        spritesheet.webp
        <pet-id>.zip
        meta.json
  tools/
    README.md
```

## Categories

Suggested tags:

- Source: `openpets`, `codexpets`, `codingpets`, `codexpethub`,
  `codex-pet`, `github`, `reddit`, `other`
- License: `cc-by-4.0`, `cc0`, `mit`, `unknown`, `link-only`
- Style: `pixel`, `terminal`, `mascot`, `robot`, `soft`, `brand`,
  `agent`, `utility`
- Status: `downloaded`, `link-only`, `needs-review`, `invalid`,
  `verified`

## Initial Sources

The first source list is in [`data/sources.json`](data/sources.json). It starts
with public galleries and hubs discovered during initial research.

## Tooling

This repository uses dependency-free Node.js scripts.

```bash
npm run discover
npm run discover:write
npm run discover:fetch
npm run import:candidates
npm run download
npm run promote
npm run report
npm run validate
```

`discover` builds a review queue from known sources. `import:candidates` turns
discovered `/pets/<id>` links into link-only catalog entries. `download` mirrors
clearly reusable OpenPets assets into `pets/` and stores license-unclear files
under the local review cache `downloads/review/`. `promote` turns downloaded
assets into the standard package layout under `pets/`. `validate` checks catalog
JSON, package references, hashes, and spritesheet dimensions. On Windows, the
direct `node tools/discover.mjs --fetch --write` form is also a reliable option
when experimenting with flags.

## Contribution Rules

1. Add source metadata before adding mirrored files.
2. Do not mirror a pet unless its license allows redistribution.
3. Keep original attribution and source URLs.
4. Do not execute third-party install commands during cataloging.
5. Validate dimensions and manifest fields before marking a pet as verified.

## License

Project code and documentation are released under the MIT License. Third-party
Codex pet assets remain under their original licenses and should not be mirrored
unless redistribution is clearly allowed.

## Status

Early project scaffold with first-pass discovery and validation tools.
