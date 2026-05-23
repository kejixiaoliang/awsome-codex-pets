#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_ATLAS, normalizeId, todayIsoDate } from "./lib/catalog.mjs";
import { readJson, repoPath, toPosixPath, writeJson } from "./lib/fs-json.mjs";
import { sha256File } from "./lib/hash.mjs";

const args = process.argv.slice(2);
const argSet = new Set(args);
const shouldWrite = argSet.has("--write");
const shouldFetchPetsCodex = argSet.has("--petscodex-index");
const reviewLimit = Number(args.find((arg) => arg.startsWith("--review-limit="))?.split("=")[1] || "0");

function usage() {
  console.log(`Usage: node tools/download.mjs --write [--petscodex-index] [--review-limit=N]

Downloads mirrorable OpenPets packages into pets/openpets and downloads
license-unclear assets into downloads/review for local review. The review cache
is ignored by git.`);
}

if (argSet.has("--help") || argSet.has("-h")) {
  usage();
  process.exit(0);
}

function petNameFromId(id) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function webUrl(...parts) {
  return parts.map((part, index) => {
    const text = String(part);
    if (index === 0) return text.replace(/\/+$/, "");
    return text.replace(/^\/+|\/+$/g, "");
  }).join("/");
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "awesome-codex-pet/0.1"
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchText(url) {
  const buffer = await fetchBuffer(url);
  return buffer.toString("utf8");
}

async function saveUrl(url, filePath) {
  const buffer = await fetchBuffer(url);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return {
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
}

function upsertPet(pets, pet) {
  const index = pets.findIndex((item) => item.id === pet.id);
  if (index === -1) {
    pets.push(pet);
    return "added";
  }
  pets[index] = { ...pets[index], ...pet };
  return "updated";
}

function standardAnimations(columns = DEFAULT_ATLAS.columns) {
  const rowFrames = (row, count = columns) => Array.from({ length: count }, (_, index) => row * columns + index);
  return {
    idle: { frames: rowFrames(0, 6), fps: 7, loop: true },
    "running-right": { frames: rowFrames(1), fps: 10, loop: true, fallback: "idle" },
    "running-left": { frames: rowFrames(2), fps: 10, loop: true, fallback: "idle" },
    waving: { frames: rowFrames(3, 5), fps: 8, loop: false, fallback: "idle" },
    jumping: { frames: rowFrames(4, 5), fps: 9, loop: false, fallback: "idle" },
    failed: { frames: rowFrames(5, 6), fps: 6, loop: true, fallback: "idle" },
    waiting: { frames: rowFrames(6, 6), fps: 8, loop: true, fallback: "idle" },
    running: { frames: rowFrames(7, 6), fps: 10, loop: true, fallback: "idle" },
    review: { frames: rowFrames(8, 6), fps: 7, loop: true, fallback: "idle" }
  };
}

async function mirrorOpenPets(pets) {
  const openPets = [
    {
      id: "terminal-pup",
      name: "Terminal Pup",
      description: "A calm status dog for long Codex CLI sessions.",
      author: "OpenPets Studio",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      tags: ["openpets", "terminal", "dog", "status"]
    },
    {
      id: "review-fox",
      name: "Review Fox",
      description: "A sharp Codex pet for review-first workflows.",
      author: "OpenPets Studio",
      license: "MIT",
      licenseUrl: "https://opensource.org/license/mit",
      tags: ["openpets", "review", "agent"]
    },
    {
      id: "sprite-debugger",
      name: "Sprite Debugger",
      description: "A reference Codex pet atlas for debugging frames.",
      author: "OpenPets Studio",
      license: "CC0 1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      tags: ["openpets", "debug", "validator", "reference"]
    }
  ];

  const results = [];
  for (const pet of openPets) {
    const dir = repoPath("pets", "openpets", pet.id);
    const petJsonPath = path.join(dir, "pet.json");
    const spritesheetPath = path.join(dir, "spritesheet.png");
    const coverPath = path.join(dir, "cover.png");
    const zipPath = path.join(dir, `${pet.id}.codex-pet.zip`);

    await mkdir(dir, { recursive: true });
    const manifest = {
      id: pet.id,
      displayName: pet.name,
      description: pet.description,
      spritesheetPath: "spritesheet.png",
      version: "1.0.0",
      frame: DEFAULT_ATLAS,
      animations: standardAnimations(),
      author: pet.author,
      license: pet.license,
      homepage: `https://openpets.app/pets/${pet.id}`,
      tags: pet.tags.filter((tag) => tag !== "openpets")
    };
    await writeFile(petJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const base = `https://openpets.app/pets/${pet.id}`;
    const spritesheet = await saveUrl(`${base}/spritesheet.png`, spritesheetPath);
    await saveUrl(`${base}/cover.png`, coverPath).catch(() => null);
    await saveUrl(`${base}/${pet.id}.codex-pet.zip`, zipPath).catch(() => null);
    const manifestHash = await sha256File(petJsonPath);

    upsertPet(pets, {
      id: pet.id,
      name: pet.name,
      sourceId: "openpets",
      sourceUrl: `https://openpets.app/pets/${pet.id}`,
      author: pet.author,
      license: pet.license,
      licenseUrl: pet.licenseUrl,
      redistribution: "allowed",
      status: "downloaded",
      tags: pet.tags,
      files: {
        petJsonPath: toPosixPath(path.relative(process.cwd(), petJsonPath)),
        spritesheetPath: toPosixPath(path.relative(process.cwd(), spritesheetPath)),
        petJsonSha256: manifestHash,
        spritesheetSha256: spritesheet.sha256
      },
      atlas: DEFAULT_ATLAS,
      validated: false,
      fetchedAt: todayIsoDate()
    });

    results.push({ id: pet.id, kind: "mirror", bytes: spritesheet.bytes });
  }
  return results;
}

function reviewPetEntry({ id, name, sourceId, sourceUrl, description = "", author = "", tags = [], remote = {} }) {
  return {
    id,
    name,
    sourceId,
    sourceUrl,
    author,
    license: "unknown",
    redistribution: "link-only",
    status: "downloaded-review",
    tags: [...new Set([sourceId, ...tags].filter(Boolean))],
    description,
    remote,
    files: {
      petJsonPath: "",
      spritesheetPath: "",
      petJsonSha256: "",
      spritesheetSha256: ""
    },
    atlas: DEFAULT_ATLAS,
    validated: false,
    fetchedAt: todayIsoDate()
  };
}

async function downloadReviewPet(pet, urls) {
  const dir = repoPath("downloads", "review", pet.sourceId, pet.id);
  const saved = {};
  await mkdir(dir, { recursive: true });

  if (urls.petJson) {
    try {
      const result = await saveUrl(urls.petJson, path.join(dir, "pet.json"));
      saved.petJson = { url: urls.petJson, ...result };
    } catch (error) {
      saved.petJson = { url: urls.petJson, error: error.message };
    }
  } else if (pet.generatedManifest) {
    const manifestPath = path.join(dir, "pet.json");
    await writeFile(manifestPath, `${JSON.stringify(pet.generatedManifest, null, 2)}\n`, "utf8");
    saved.petJson = { generated: true, sha256: await sha256File(manifestPath) };
  }

  if (urls.spritesheet) {
    const ext = new URL(urls.spritesheet).pathname.split(".").pop() || "webp";
    try {
      const result = await saveUrl(urls.spritesheet, path.join(dir, `spritesheet.${ext}`));
      saved.spritesheet = { url: urls.spritesheet, ...result };
    } catch (error) {
      saved.spritesheet = { url: urls.spritesheet, error: error.message };
    }
  }

  if (urls.package) {
    try {
      const result = await saveUrl(urls.package, path.join(dir, `${pet.id}.zip`));
      saved.package = { url: urls.package, ...result };
    } catch (error) {
      saved.package = { url: urls.package, error: error.message };
    }
  }

  const meta = {
    ...pet,
    reviewOnly: true,
    saved,
    note: "Local review cache. Do not redistribute until the original license is confirmed."
  };
  await writeFile(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return saved;
}

async function collectPetsCodexFromHomepage() {
  const html = await fetchText("https://petscodex.com/");
  const jsonMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const items = [];
  for (const match of jsonMatches) {
    const parsed = JSON.parse(match[1]);
    const graph = parsed["@graph"] || [];
    for (const node of graph) {
      const list = node.mainEntity?.itemListElement || [];
      for (const listItem of list) {
        const item = listItem.item || {};
        if (!item.url || !item.image) continue;
        const id = normalizeId(new URL(item.url).pathname.split("/").filter(Boolean).pop());
        const imageUrl = item.image;
        const folderMatch = imageUrl.match(/\/main\/([^/]+)\/spritesheet\.webp/i);
        const folder = folderMatch ? folderMatch[1] : id;
        items.push({
          id,
          name: item.name || petNameFromId(id),
          sourceId: "petscodex",
          sourceUrl: item.url,
          description: item.description || "",
          author: "",
          tags: [],
          remote: {
            repository: "https://github.com/mn8821236/petscodex",
            githubFolder: folder
          },
          urls: {
            petJson: `https://raw.githubusercontent.com/mn8821236/petscodex/main/${folder}/pet.json`,
            spritesheet: imageUrl,
            package: `https://petscodex.com/download/${id}.zip`
          }
        });
      }
    }
  }
  return items;
}

function collectKnownReviewPets(pets) {
  const review = [];
  for (const pet of pets) {
    if (pet.sourceId === "codexpets") {
      review.push({
        id: pet.id,
        name: pet.name,
        sourceId: pet.sourceId,
        sourceUrl: pet.sourceUrl,
        description: pet.description || "",
        urls: {
          petJson: webUrl("https://codexpets.org", "pets", pet.id, "pet.json"),
          spritesheet: webUrl("https://codexpets.org", "pets", pet.id, "spritesheet.webp"),
          package: webUrl("https://codexpets.org", "pets", pet.id, `${pet.id}-codex-pet.zip`)
        }
      });
    }

    if (pet.sourceId === "codex-pet") {
      const spritesheet = webUrl("https://cdn.codex-pet.com", "pets", pet.id, "spritesheet.webp");
      review.push({
        id: pet.id,
        name: pet.name,
        sourceId: pet.sourceId,
        sourceUrl: pet.sourceUrl,
        description: pet.description || "",
        generatedManifest: {
          id: pet.id,
          displayName: pet.name,
          description: pet.description || "",
          spritesheetPath: "spritesheet.webp"
        },
        urls: {
          spritesheet,
          package: webUrl("https://codex-pet.com", "api", "download", pet.id)
        }
      });
    }
  }
  return review;
}

const pets = await readJson(repoPath("data", "pets.json"));
const downloadReport = {
  generatedAt: new Date().toISOString(),
  mirror: [],
  review: [],
  failures: []
};

downloadReport.mirror = await mirrorOpenPets(pets);

let reviewPets = collectKnownReviewPets(pets);
if (shouldFetchPetsCodex) {
  const petsCodex = await collectPetsCodexFromHomepage();
  for (const item of petsCodex) {
    upsertPet(pets, reviewPetEntry(item));
  }
  reviewPets.push(...petsCodex);
}

const seenReview = new Set();
reviewPets = reviewPets.filter((pet) => {
  const key = `${pet.sourceId}:${pet.id}`;
  if (seenReview.has(key)) return false;
  seenReview.add(key);
  return true;
});
if (reviewLimit > 0) reviewPets = reviewPets.slice(0, reviewLimit);

if (!shouldWrite) {
  console.log(JSON.stringify({
    mirrorable: downloadReport.mirror.map((item) => item.id),
    reviewCount: reviewPets.length,
    reviewSample: reviewPets.slice(0, 10).map((item) => `${item.sourceId}:${item.id}`)
  }, null, 2));
  process.exit(0);
}

for (const pet of reviewPets) {
  try {
    const saved = await downloadReviewPet(pet, pet.urls || {});
    const existing = pets.find((item) => item.sourceId === pet.sourceId && item.id === pet.id);
    if (existing && existing.status !== "verified") {
      existing.status = "downloaded-review";
      existing.localReviewPath = toPosixPath(path.join("downloads", "review", pet.sourceId, pet.id));
    }
    downloadReport.review.push({ id: pet.id, sourceId: pet.sourceId, saved });
  } catch (error) {
    downloadReport.failures.push({ id: pet.id, sourceId: pet.sourceId, error: error.message });
  }
}

pets.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.id.localeCompare(b.id));
await writeJson(repoPath("data", "pets.json"), pets);
await mkdir(repoPath("downloads"), { recursive: true });
await writeJson(repoPath("downloads", "download-report.json"), downloadReport);

console.log(`Mirrored ${downloadReport.mirror.length} OpenPets packages.`);
console.log(`Downloaded ${downloadReport.review.length} review-cache packages.`);
console.log(`Failures: ${downloadReport.failures.length}.`);
