#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { readJson, repoPath } from "./lib/fs-json.mjs";

const pets = await readJson(repoPath("data", "pets.json"));
const packaged = pets
  .filter((pet) => pet.files?.spritesheetPath && pet.files?.packagePath && pet.files?.petJsonPath)
  .sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.id.localeCompare(b.id));

const bySource = packaged.reduce((groups, pet) => {
  groups[pet.sourceId] ??= [];
  groups[pet.sourceId].push(pet);
  return groups;
}, {});

const sourceNames = {
  "codex-pet": "codex-pet.com",
  codexpets: "Codex Pets",
  openpets: "OpenPets",
  petscodex: "Pets Codex"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function assetPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function petCard(pet) {
  const name = escapeHtml(pet.name || pet.id);
  const image = assetPath(pet.files.spritesheetPath);
  const zip = assetPath(pet.files.packagePath);
  const json = assetPath(pet.files.petJsonPath);
  const meta = assetPath(pet.files.metaPath || "");
  const source = escapeHtml(sourceNames[pet.sourceId] || pet.sourceId);
  const alt = `${name} Codex pet spritesheet`;
  const actions = `<a href="${zip}">Download ZIP</a> · <a href="${json}">pet.json</a>${meta ? ` · <a href="${meta}">meta</a>` : ""}`;

  return [
    `<td width="25%" align="center" valign="top">`,
    `<a href="${image}"><img src="${image}" alt="${escapeHtml(alt)}" width="118"></a><br>`,
    `<strong>${name}</strong><br>`,
    `<sub>${source}</sub><br>`,
    `<sub>${actions}</sub>`,
    `</td>`
  ].join("");
}

function galleryTable(items) {
  const rows = [];
  for (let index = 0; index < items.length; index += 4) {
    const cells = items.slice(index, index + 4).map((pet) => petCard(pet));
    while (cells.length < 4) cells.push(`<td width="25%"></td>`);
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table>\n${rows.join("\n")}\n</table>`;
}

function sourceDetails() {
  return Object.entries(bySource)
    .map(([sourceId, items], index) => {
      const title = `${sourceNames[sourceId] || sourceId} (${items.length})`;
      const open = index === 0 ? " open" : "";
      return `<details${open}>\n<summary><strong>${escapeHtml(title)}</strong></summary>\n\n${galleryTable(items)}\n\n</details>`;
    })
    .join("\n\n");
}

function featuredGallery() {
  const featured = [
    ...packaged.filter((pet) => pet.sourceId === "openpets"),
    ...packaged.filter((pet) => pet.sourceId === "codexpets"),
    ...packaged.filter((pet) => pet.sourceId === "petscodex").slice(0, 8),
    ...packaged.filter((pet) => pet.sourceId === "codex-pet").slice(0, 13)
  ].slice(0, 28);
  return galleryTable(featured);
}

const sourceList = Object.keys(bySource).map((sourceId) => sourceNames[sourceId] || sourceId).join(" / ");

const readme = `# Awesome Codex Pets

<p align="center">
  <strong>A visual archive of packaged Codex pets.</strong><br>
  <strong>一个可预览、可下载、可继续扩展的 Codex Pet 图鉴。</strong>
</p>

<p align="center">
  <a href="#overview--项目概览">Overview 项目概览</a> ·
  <a href="#gallery">Gallery</a> ·
  <a href="#commands--常用命令">Commands 常用命令</a>
</p>

## Overview / 项目概览

Awesome Codex Pets collects community-made Codex pet packages and turns them into a browsable gallery. The repository is designed to be useful both as a visual catalog and as a structured asset archive.

Awesome Codex Pets 收集社区制作的 Codex pet，并把它们整理成可以直接浏览的图鉴。这个仓库既是一个视觉目录，也是一个结构化素材库。

Each packaged pet includes a downloadable ZIP package, a previewable spritesheet, the original or generated \`pet.json\`, and a local \`meta.json\` file with source and integrity metadata.

每个已标准化的 pet 都包含可直接下载的 ZIP 包、可在 README 或网页中预览的 spritesheet、对应的 \`pet.json\`，以及记录来源和校验信息的 \`meta.json\`。

Current catalog status:

当前目录状态：

- Packaged pets / 已标准化 pet：${packaged.length}
- Sources / 来源：${sourceList}
- Binary assets / 二进制资源：managed by Git LFS, including \`*.zip\`, \`*.webp\`, and \`*.png\`
- Index data / 索引数据：\`data/pets.json\`

## Repository Layout / 仓库结构

\`\`\`text
pets/<source>/<pet-id>/
  pet.json
  spritesheet.webp or spritesheet.png
  <pet-id>.zip
  meta.json
\`\`\`

\`pets/\` stores the installable and previewable pet assets. \`data/pets.json\` is the machine-readable index used by scripts and future website/gallery tooling.

\`pets/\` 存放可以安装和预览的 pet 素材。\`data/pets.json\` 是给脚本和后续网页图鉴使用的机器可读索引。

## Quick Preview

Click an image to inspect the full spritesheet. Click \`Download ZIP\` to download the pet package.

${featuredGallery()}

## Gallery

The gallery below is grouped by source. It is intentionally kept in English only to avoid duplicating hundreds of visual cards.

下面的图鉴按来源分组。图鉴卡片统一使用英文，避免中英文重复展示数百个图片卡片。

${sourceDetails()}

## Commands / 常用命令

\`\`\`bash
npm run discover:fetch
npm run import:candidates
npm run download
npm run promote
npm run report
npm run validate
npm run generate:readme
\`\`\`

\`generate:readme\` rebuilds this visual README from \`data/pets.json\`.

\`generate:readme\` 会根据 \`data/pets.json\` 自动重建当前这个图鉴 README。

## Notes / 说明

GitHub README files cannot run custom JavaScript, so this page uses static Markdown and HTML tables. That keeps previews visible directly on the repository homepage.

GitHub 的 README 不能运行自定义 JavaScript，所以这里使用静态 Markdown 和 HTML 表格。这样打开仓库首页时就能直接看到 pet 图片预览。

## Acknowledgements / 致谢

Thanks to the community sites and creators that made these Codex pet resources discoverable, including OpenPets, Codex Pets, codex-pet.com, Pets Codex, CodexPetHub, CodingPets.dev, and other community contributors.

感谢让这些 Codex pet 资源能够被发现、预览和使用的社区站点与创作者，包括 OpenPets、Codex Pets、codex-pet.com、Pets Codex、CodexPetHub、CodingPets.dev，以及其他社区贡献者。

This project is an archive and gallery built on top of those public resources. Please visit the original sites when you want to explore the upstream galleries, generators, installers, and submission pages.

本项目是在这些公开资源基础上整理出的归档和图鉴。如果你想继续探索上游图鉴、生成器、安装工具和提交入口，请优先访问对应的原始站点。

## License

Project code and documentation are released under the MIT License. Pet package metadata preserves source attribution for each item.
`;

await writeFile(repoPath("README.md"), readme, "utf8");
console.log(`Generated README.md with ${packaged.length} packaged pet cards.`);
