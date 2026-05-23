# Data Schema

This project keeps two primary data files:

- `data/sources.json`
- `data/pets.json`

## Source

```json
{
  "id": "openpets",
  "name": "OpenPets",
  "url": "https://openpets.app/",
  "type": "gallery",
  "notes": "Verified Codex CLI pet registry with downloadable packs."
}
```

Fields:

- `id`: Stable lowercase identifier.
- `name`: Human-readable source name.
- `url`: Canonical source URL.
- `type`: Source category, such as `gallery`, `github-repo`, or `community-post`.
- `notes`: Short cataloging note.

## Pet

```json
{
  "id": "terminal-pup",
  "name": "Terminal Pup",
  "sourceId": "openpets",
  "sourceUrl": "https://openpets.app/",
  "author": "",
  "license": "cc-by-4.0",
  "redistribution": "allowed",
  "status": "link-only",
  "tags": ["terminal", "mascot"],
  "files": {
    "petJsonPath": "",
    "spritesheetPath": "",
    "packagePath": "",
    "metaPath": "",
    "petJsonSha256": "",
    "spritesheetSha256": "",
    "packageSha256": ""
  },
  "atlas": {
    "width": 1536,
    "height": 1872,
    "columns": 8,
    "rows": 9,
    "cellWidth": 192,
    "cellHeight": 208
  },
  "validated": false,
  "fetchedAt": "2026-05-23"
}
```

Recommended `status` values:

- `link-only`: Indexed but not mirrored.
- `downloaded`: Files are present locally.
- `packaged`: `pet.json`, spritesheet, and zip package are present under `pets/`.
- `verified`: Files are present and pass validation.
- `needs-review`: Metadata or license needs human review.
- `invalid`: Package failed validation.

Recommended `redistribution` values:

- `allowed`
- `unknown`
- `not-allowed`
- `link-only`
