#!/usr/bin/env node
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_ATLAS, ALLOWED_REDISTRIBUTION, ALLOWED_STATUSES, requiredString } from "./lib/catalog.mjs";
import { readJson, repoPath } from "./lib/fs-json.mjs";
import { sha256File } from "./lib/hash.mjs";
import { readImageSize } from "./lib/webp.mjs";

const problems = [];
const warnings = [];

function problem(message) {
  problems.push(message);
}

function warning(message) {
  warnings.push(message);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function validateUniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!requiredString(item.id)) {
      problem(`${label}: item is missing id.`);
      continue;
    }
    if (seen.has(item.id)) {
      problem(`${label}: duplicate id "${item.id}".`);
    }
    seen.add(item.id);
  }
}

function validateSources(sources) {
  if (!Array.isArray(sources)) {
    problem("data/sources.json must be an array.");
    return;
  }
  validateUniqueIds(sources, "sources");

  for (const source of sources) {
    if (!requiredString(source.name)) problem(`source ${source.id}: missing name.`);
    if (!requiredString(source.url)) problem(`source ${source.id}: missing url.`);
    if (!requiredString(source.type)) problem(`source ${source.id}: missing type.`);
    if (source.url) {
      try {
        new URL(source.url);
      } catch {
        problem(`source ${source.id}: url is invalid.`);
      }
    }
  }
}

async function validatePetFiles(pet) {
  if (!pet.files) {
    if (pet.status !== "link-only") problem(`pet ${pet.id}: missing files object.`);
    return;
  }

  const petJsonPath = pet.files.petJsonPath ? repoPath(pet.files.petJsonPath) : "";
  const spritesheetPath = pet.files.spritesheetPath ? repoPath(pet.files.spritesheetPath) : "";
  const packagePath = pet.files.packagePath ? repoPath(pet.files.packagePath) : "";
  const metaPath = pet.files.metaPath ? repoPath(pet.files.metaPath) : "";

  if (petJsonPath) {
    if (!(await exists(petJsonPath))) {
      problem(`pet ${pet.id}: petJsonPath does not exist: ${pet.files.petJsonPath}`);
    } else if (pet.files.petJsonSha256) {
      const actual = await sha256File(petJsonPath);
      if (actual !== pet.files.petJsonSha256) {
        problem(`pet ${pet.id}: pet.json sha256 mismatch.`);
      }
    }
  }

  if (spritesheetPath) {
    if (!(await exists(spritesheetPath))) {
      problem(`pet ${pet.id}: spritesheetPath does not exist: ${pet.files.spritesheetPath}`);
      return;
    }

    if (pet.files.spritesheetSha256) {
      const actual = await sha256File(spritesheetPath);
      if (actual !== pet.files.spritesheetSha256) {
        problem(`pet ${pet.id}: spritesheet sha256 mismatch.`);
      }
    }

    try {
      const size = await readImageSize(spritesheetPath);
      const expected = pet.atlas || DEFAULT_ATLAS;
      if (size.width !== expected.width || size.height !== expected.height) {
        problem(`pet ${pet.id}: spritesheet is ${size.width}x${size.height}, expected ${expected.width}x${expected.height}.`);
      }
    } catch (error) {
      problem(`pet ${pet.id}: cannot read spritesheet dimensions: ${error.message}`);
    }
  }

  if (packagePath) {
    if (!(await exists(packagePath))) {
      problem(`pet ${pet.id}: packagePath does not exist: ${pet.files.packagePath}`);
    } else if (pet.files.packageSha256) {
      const actual = await sha256File(packagePath);
      if (actual !== pet.files.packageSha256) {
        problem(`pet ${pet.id}: package sha256 mismatch.`);
      }
    }
  }

  if (metaPath && !(await exists(metaPath))) {
    problem(`pet ${pet.id}: metaPath does not exist: ${pet.files.metaPath}`);
  }

  if (pet.status === "packaged") {
    if (!petJsonPath) problem(`pet ${pet.id}: packaged pets must include files.petJsonPath.`);
    if (!spritesheetPath) problem(`pet ${pet.id}: packaged pets must include files.spritesheetPath.`);
    if (!packagePath) problem(`pet ${pet.id}: packaged pets must include files.packagePath.`);
    if (!metaPath) problem(`pet ${pet.id}: packaged pets must include files.metaPath.`);
  }
}

async function validatePets(pets, sourceIds) {
  if (!Array.isArray(pets)) {
    problem("data/pets.json must be an array.");
    return;
  }
  validateUniqueIds(pets, "pets");

  for (const pet of pets) {
    if (!requiredString(pet.name)) problem(`pet ${pet.id}: missing name.`);
    if (!requiredString(pet.sourceId)) problem(`pet ${pet.id}: missing sourceId.`);
    if (pet.sourceId && !sourceIds.has(pet.sourceId)) {
      warning(`pet ${pet.id}: sourceId "${pet.sourceId}" is not in data/sources.json.`);
    }
    if (!requiredString(pet.sourceUrl)) problem(`pet ${pet.id}: missing sourceUrl.`);
    if (!ALLOWED_STATUSES.has(pet.status)) {
      problem(`pet ${pet.id}: invalid status "${pet.status}".`);
    }
    if (!ALLOWED_REDISTRIBUTION.has(pet.redistribution)) {
      problem(`pet ${pet.id}: invalid redistribution "${pet.redistribution}".`);
    }
    if (!Array.isArray(pet.tags)) problem(`pet ${pet.id}: tags must be an array.`);
    if (pet.status === "verified" && pet.validated !== true) {
      problem(`pet ${pet.id}: verified pets must set validated to true.`);
    }
    await validatePetFiles(pet);
  }
}

async function validatePetsDirectory() {
  const petsDir = repoPath("pets");
  const entries = await readdir(petsDir, { withFileTypes: true });
  const packageDirs = entries.filter((entry) => entry.isDirectory());
  for (const sourceDir of packageDirs) {
    const sourcePath = path.join(petsDir, sourceDir.name);
    const petDirs = await readdir(sourcePath, { withFileTypes: true });
    for (const petDir of petDirs.filter((entry) => entry.isDirectory())) {
      const petPath = path.join(sourcePath, petDir.name);
      const petJson = path.join(petPath, "pet.json");
      const spritesheet = path.join(petPath, "spritesheet.webp");
      const pngSpritesheet = path.join(petPath, "spritesheet.png");
      if (!(await exists(petJson))) warning(`pets/${sourceDir.name}/${petDir.name}: missing pet.json.`);
      if (!(await exists(spritesheet)) && !(await exists(pngSpritesheet))) {
        warning(`pets/${sourceDir.name}/${petDir.name}: missing spritesheet.webp or spritesheet.png.`);
      }
    }
  }
}

const sources = await readJson(repoPath("data", "sources.json"));
const pets = await readJson(repoPath("data", "pets.json"));
validateSources(sources);
await validatePets(pets, new Set(Array.isArray(sources) ? sources.map((source) => source.id) : []));
await validatePetsDirectory();

for (const item of warnings) console.warn(`WARN ${item}`);
for (const item of problems) console.error(`ERROR ${item}`);

if (problems.length > 0) {
  console.error(`Validation failed with ${problems.length} error(s) and ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Validation passed with ${warnings.length} warning(s).`);
