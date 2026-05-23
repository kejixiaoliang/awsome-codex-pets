#!/usr/bin/env node
import { DEFAULT_ATLAS, normalizeId, todayIsoDate } from "./lib/catalog.mjs";
import { readJson, repoPath, writeJson } from "./lib/fs-json.mjs";

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");

function usage() {
  console.log(`Usage: node tools/import-candidates.mjs [--write]

Imports /pets/<id> links from data/candidates.json into data/pets.json as
link-only entries with unknown redistribution. This never downloads assets.`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

function titleFromId(id) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractPetId(url) {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/pets\/([^/?#]+)/i);
  if (!match) return "";
  const id = normalizeId(decodeURIComponent(match[1]));
  if (!id || id === "random") return "";
  return id;
}

const candidates = await readJson(repoPath("data", "candidates.json"));
const pets = await readJson(repoPath("data", "pets.json"));
const existingIds = new Set(pets.map((pet) => pet.id));
const additions = [];

for (const candidate of candidates) {
  for (const link of candidate.candidateLinks || []) {
    let id = "";
    try {
      id = extractPetId(link);
    } catch {
      continue;
    }
    if (!id || existingIds.has(id)) continue;

    existingIds.add(id);
    additions.push({
      id,
      name: titleFromId(id),
      sourceId: candidate.sourceId,
      sourceUrl: link,
      author: "",
      license: "unknown",
      redistribution: "link-only",
      status: "link-only",
      tags: [candidate.sourceId],
      files: {
        petJsonPath: "",
        spritesheetPath: "",
        petJsonSha256: "",
        spritesheetSha256: ""
      },
      atlas: DEFAULT_ATLAS,
      validated: false,
      fetchedAt: todayIsoDate()
    });
  }
}

const nextPets = [...pets, ...additions].sort((a, b) => a.id.localeCompare(b.id));

if (shouldWrite) {
  await writeJson(repoPath("data", "pets.json"), nextPets);
  console.log(`Imported ${additions.length} new link-only pet entr${additions.length === 1 ? "y" : "ies"}.`);
} else {
  console.log(JSON.stringify(additions, null, 2));
}
