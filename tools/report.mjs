#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readJson, repoPath } from "./lib/fs-json.mjs";

const outPath = repoPath("docs", "discovery-report.md");

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? "").replace(/\|/g, "\\|")).join(" | ")} |`;
}

function renderLinkList(links) {
  if (!Array.isArray(links) || links.length === 0) return "- No candidate links recorded.";
  return links.map((link) => `- ${link}`).join("\n");
}

const sources = await readJson(repoPath("data", "sources.json"));
const candidates = await readJson(repoPath("data", "candidates.json"));
const pets = await readJson(repoPath("data", "pets.json"));

const lines = [];
lines.push("# Discovery Report");
lines.push("");
lines.push(`Generated from local catalog data.`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(tableRow(["Metric", "Count"]));
lines.push(tableRow(["---", "---"]));
lines.push(tableRow(["Sources", sources.length]));
lines.push(tableRow(["Discovery candidates", candidates.length]));
lines.push(tableRow(["Cataloged pets", pets.length]));
lines.push("");
lines.push("## Source Review Queue");
lines.push("");
lines.push(tableRow(["Source", "Status", "HTTP", "Candidate links", "Redistribution"]));
lines.push(tableRow(["---", "---", "---", "---", "---"]));
for (const candidate of candidates) {
  lines.push(tableRow([
    candidate.sourceName,
    candidate.status,
    candidate.httpStatus || "",
    Array.isArray(candidate.candidateLinks) ? candidate.candidateLinks.length : 0,
    candidate.redistribution
  ]));
}
lines.push("");

for (const candidate of candidates) {
  lines.push(`## ${candidate.sourceName}`);
  lines.push("");
  lines.push(`- URL: ${candidate.sourceUrl}`);
  lines.push(`- Page title: ${candidate.pageTitle || "n/a"}`);
  lines.push(`- Status: ${candidate.status}`);
  lines.push(`- Redistribution: ${candidate.redistribution}`);
  if (candidate.error) lines.push(`- Error: ${candidate.error}`);
  lines.push("");
  lines.push(renderLinkList(candidate.candidateLinks));
  lines.push("");
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${outPath}`);
