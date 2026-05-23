#!/usr/bin/env node
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { readJson, repoPath, toPosixPath, writeJson } from "./lib/fs-json.mjs";
import { sha256File } from "./lib/hash.mjs";
import { writeStoreZip } from "./lib/zip-store.mjs";

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");

function usage() {
  console.log(`Usage: node tools/promote-downloads.mjs --write

Promotes downloaded pet assets into pets/<source>/<pet-id>/ with:
  pet.json
  spritesheet.webp or spritesheet.png
  <pet-id>.zip
  meta.json`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findFirstFile(dir, names) {
  for (const name of names) {
    const candidate = path.join(dir, name);
    if (await exists(candidate)) return candidate;
  }
  return "";
}

async function findZip(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const zip = entries.find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".zip"));
  return zip ? path.join(dir, zip.name) : "";
}

function upsertPet(pets, sourceId, id, update) {
  const index = pets.findIndex((pet) => pet.sourceId === sourceId && pet.id === id);
  if (index === -1) {
    pets.push({
      id,
      name: id.split("-").map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" "),
      sourceId,
      sourceUrl: "",
      author: "",
      license: "unknown",
      redistribution: "allowed",
      status: "packaged",
      tags: [sourceId],
      atlas: {
        width: 1536,
        height: 1872,
        columns: 8,
        rows: 9,
        cellWidth: 192,
        cellHeight: 208
      },
      validated: false,
      fetchedAt: new Date().toISOString().slice(0, 10),
      ...update
    });
    return;
  }
  pets[index] = { ...pets[index], ...update };
}

async function promoteOne(sourceId, id, sourceDir, pets) {
  const petJson = await findFirstFile(sourceDir, ["pet.json"]);
  const spritesheet = await findFirstFile(sourceDir, ["spritesheet.webp", "spritesheet.png"]);
  if (!petJson || !spritesheet) return { skipped: true, reason: "missing pet.json or spritesheet" };

  const destDir = repoPath("pets", sourceId, id);
  await mkdir(destDir, { recursive: true });

  const spritesheetExt = path.extname(spritesheet).toLowerCase() || ".webp";
  const destPetJson = path.join(destDir, "pet.json");
  const destSpritesheet = path.join(destDir, `spritesheet${spritesheetExt}`);
  const destMeta = path.join(destDir, "meta.json");
  const destZip = path.join(destDir, `${id}.zip`);

  if (shouldWrite) {
    await copyFile(petJson, destPetJson);
    await copyFile(spritesheet, destSpritesheet);

    const sourceMeta = await findFirstFile(sourceDir, ["meta.json"]);
    const meta = sourceMeta
      ? JSON.parse(await readFile(sourceMeta, "utf8"))
      : { id, sourceId, note: "Generated during promotion." };
    meta.packagePath = toPosixPath(path.relative(process.cwd(), destZip));
    meta.petJsonPath = toPosixPath(path.relative(process.cwd(), destPetJson));
    meta.spritesheetPath = toPosixPath(path.relative(process.cwd(), destSpritesheet));
    meta.promotedAt = new Date().toISOString();
    await writeFile(destMeta, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

    const zip = await findZip(sourceDir);
    if (zip) {
      await copyFile(zip, destZip);
    } else {
      await writeStoreZip(destZip, [
        { name: "pet.json", data: await readFile(destPetJson) },
        { name: path.basename(destSpritesheet), data: await readFile(destSpritesheet) }
      ]);
    }
  }

  const petJsonPath = toPosixPath(path.relative(process.cwd(), destPetJson));
  const spritesheetPath = toPosixPath(path.relative(process.cwd(), destSpritesheet));
  const packagePath = toPosixPath(path.relative(process.cwd(), destZip));
  const metaPath = toPosixPath(path.relative(process.cwd(), destMeta));

  const files = {
    petJsonPath,
    spritesheetPath,
    packagePath,
    metaPath,
    petJsonSha256: shouldWrite ? await sha256File(destPetJson) : "",
    spritesheetSha256: shouldWrite ? await sha256File(destSpritesheet) : "",
    packageSha256: shouldWrite ? await sha256File(destZip) : ""
  };

  upsertPet(pets, sourceId, id, {
    redistribution: "allowed",
    status: "packaged",
    files,
    localReviewPath: undefined
  });

  return { skipped: false, packagePath };
}

async function promoteRoot(root, pets) {
  const results = [];
  if (!(await exists(root))) return results;
  const sources = await readdir(root, { withFileTypes: true });
  for (const source of sources.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))) {
    const sourceDir = path.join(root, source.name);
    const petDirs = await readdir(sourceDir, { withFileTypes: true });
    for (const petDir of petDirs.filter((entry) => entry.isDirectory())) {
      const result = await promoteOne(source.name, petDir.name, path.join(sourceDir, petDir.name), pets);
      results.push({ sourceId: source.name, id: petDir.name, ...result });
    }
  }
  return results;
}

const pets = await readJson(repoPath("data", "pets.json"));
const results = await promoteRoot(repoPath("downloads", "review"), pets);
pets.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.id.localeCompare(b.id));

if (shouldWrite) {
  await writeJson(repoPath("data", "pets.json"), pets);
  await writeJson(repoPath("data", "promotion-report.json"), {
    generatedAt: new Date().toISOString(),
    total: results.length,
    promoted: results.filter((result) => !result.skipped).length,
    skipped: results.filter((result) => result.skipped)
  });
  console.log(`Promoted ${results.filter((result) => !result.skipped).length} pet packages.`);
} else {
  console.log(JSON.stringify({
    total: results.length,
    promotable: results.filter((result) => !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length
  }, null, 2));
}
