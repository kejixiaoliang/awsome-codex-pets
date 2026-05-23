#!/usr/bin/env node
import { readJson, repoPath, writeJson } from "./lib/fs-json.mjs";
import { normalizeId, todayIsoDate } from "./lib/catalog.mjs";
import { decodeHtml } from "./lib/html.mjs";

const args = new Set(process.argv.slice(2));
const shouldFetch = args.has("--fetch");
const shouldWrite = args.has("--write");
const linkLimit = Number(process.argv.slice(2).find((arg) => arg.startsWith("--link-limit="))?.split("=")[1] || "250");

function usage() {
  console.log(`Usage: npm run discover -- [--fetch] [--write]

Without --fetch, this creates source-level review candidates from data/sources.json.
With --fetch, it also fetches each source page and records lightweight page hints.
With --write, it writes data/candidates.json. Otherwise it prints a preview.
Use --link-limit=N to control how many candidate links are kept per source.`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1]).replace(/\s+/g, " ").trim() : "";
}

function extractPetishLinks(html, baseUrl) {
  const links = [];
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html))) {
    const href = decodeHtml(match[1]);
    if (!/(pet|pack|download|gallery|install)/i.test(href)) continue;
    try {
      links.push(new URL(href, baseUrl).toString());
    } catch {
      continue;
    }
  }
  return [...new Set(links)]
    .filter((url) => !url.includes("&#"))
    .slice(0, linkLimit);
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "awesome-codex-pet/0.1 (+https://github.com/)"
    }
  });
  const html = await response.text();
  return {
    httpStatus: response.status,
    pageTitle: extractTitle(html),
    candidateLinks: extractPetishLinks(html, source.url)
  };
}

const sources = await readJson(repoPath("data", "sources.json"));
const candidates = [];

for (const source of sources) {
  const candidate = {
    id: normalizeId(source.id),
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    status: "source-review",
    redistribution: "unknown",
    fetchedAt: todayIsoDate(),
    notes: source.notes || "",
    pageTitle: "",
    candidateLinks: []
  };

  if (shouldFetch) {
    try {
      Object.assign(candidate, await fetchSource(source));
    } catch (error) {
      candidate.status = "fetch-failed";
      candidate.error = error.message;
    }
  }

  candidates.push(candidate);
}

if (shouldWrite) {
  await writeJson(repoPath("data", "candidates.json"), candidates);
  console.log(`Wrote ${candidates.length} candidates to data/candidates.json`);
} else {
  console.log(JSON.stringify(candidates, null, 2));
}
