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

function petCard(pet, lang) {
  const name = escapeHtml(pet.name || pet.id);
  const image = assetPath(pet.files.spritesheetPath);
  const zip = assetPath(pet.files.packagePath);
  const json = assetPath(pet.files.petJsonPath);
  const meta = assetPath(pet.files.metaPath || "");
  const source = escapeHtml(sourceNames[pet.sourceId] || pet.sourceId);
  const alt = `${name} Codex pet spritesheet`;
  const actions = lang === "zh"
    ? `<a href="${zip}">下载 ZIP</a> · <a href="${json}">pet.json</a>${meta ? ` · <a href="${meta}">meta</a>` : ""}`
    : `<a href="${zip}">Download ZIP</a> · <a href="${json}">pet.json</a>${meta ? ` · <a href="${meta}">meta</a>` : ""}`;
  return [
    `<td width="25%" align="center" valign="top">`,
    `<a href="${image}"><img src="${image}" alt="${escapeHtml(alt)}" width="118"></a><br>`,
    `<strong>${name}</strong><br>`,
    `<sub>${source}</sub><br>`,
    `<sub>${actions}</sub>`,
    `</td>`
  ].join("");
}

function galleryTable(items, lang) {
  const rows = [];
  for (let index = 0; index < items.length; index += 4) {
    const cells = items.slice(index, index + 4).map((pet) => petCard(pet, lang));
    while (cells.length < 4) cells.push(`<td width="25%"></td>`);
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table>\n${rows.join("\n")}\n</table>`;
}

function sourceDetails(lang) {
  return Object.entries(bySource)
    .map(([sourceId, items], index) => {
      const title = `${sourceNames[sourceId] || sourceId} (${items.length})`;
      const open = index === 0 ? " open" : "";
      return `<details${open}>\n<summary><strong>${escapeHtml(title)}</strong></summary>\n\n${galleryTable(items, lang)}\n\n</details>`;
    })
    .join("\n\n");
}

function featuredGallery(lang) {
  const featured = [
    ...packaged.filter((pet) => pet.sourceId === "openpets"),
    ...packaged.filter((pet) => pet.sourceId === "codexpets"),
    ...packaged.filter((pet) => pet.sourceId === "petscodex").slice(0, 8),
    ...packaged.filter((pet) => pet.sourceId === "codex-pet").slice(0, 13)
  ].slice(0, 28);
  return galleryTable(featured, lang);
}

const readme = `# Awesome Codex Pets

<p align="center">
  <a href="#中文">中文</a> · <a href="#english">English</a>
</p>

<p align="center">
  <strong>266 packaged Codex pets with previewable spritesheets and direct ZIP downloads.</strong>
</p>

<a id="中文"></a>

## 中文

这是一个可以直接浏览、预览和下载的 Codex Pet 图鉴。每个已整理的 pet 都包含：

- 可直接下载的 ZIP 包
- 可在 README 和网页中预览的 spritesheet 图片
- 可查看的 \`pet.json\`
- 记录来源和校验信息的 \`meta.json\`

当前状态：

- 已标准化 pet：${packaged.length}
- 来源：${Object.keys(bySource).map((sourceId) => sourceNames[sourceId] || sourceId).join(" / ")}
- 二进制资源通过 Git LFS 管理：\`*.zip\`、\`*.webp\`、\`*.png\`

### 快速预览

点击图片可以查看完整 spritesheet，点击 ZIP 可以直接下载对应 pet 包。

${featuredGallery("zh")}

### 完整图鉴

${sourceDetails("zh")}

### 本地结构

\`\`\`text
pets/<source>/<pet-id>/
  pet.json
  spritesheet.webp 或 spritesheet.png
  <pet-id>.zip
  meta.json
\`\`\`

### 常用命令

\`\`\`bash
npm run discover:fetch
npm run import:candidates
npm run download
npm run promote
npm run report
npm run validate
npm run generate:readme
\`\`\`

<p align="right"><a href="#awesome-codex-pets">回到顶部</a> · <a href="#english">English</a></p>

---

<a id="english"></a>

## English

This is a browsable Codex Pet gallery with direct previews and downloads. Every packaged pet includes:

- a ZIP package for direct download
- a spritesheet image that can be previewed in README or a website
- a readable \`pet.json\`
- a \`meta.json\` file with source and integrity metadata

Current status:

- Packaged pets: ${packaged.length}
- Sources: ${Object.keys(bySource).map((sourceId) => sourceNames[sourceId] || sourceId).join(" / ")}
- Binary assets are managed with Git LFS: \`*.zip\`, \`*.webp\`, \`*.png\`

### Quick Preview

Click an image to inspect the full spritesheet. Click ZIP to download the pet package.

${featuredGallery("en")}

### Full Gallery

${sourceDetails("en")}

### Local Layout

\`\`\`text
pets/<source>/<pet-id>/
  pet.json
  spritesheet.webp or spritesheet.png
  <pet-id>.zip
  meta.json
\`\`\`

### Commands

\`\`\`bash
npm run discover:fetch
npm run import:candidates
npm run download
npm run promote
npm run report
npm run validate
npm run generate:readme
\`\`\`

<p align="right"><a href="#awesome-codex-pets">Back to top</a> · <a href="#中文">中文</a></p>

## License

Project code and documentation are released under the MIT License. Pet package metadata preserves source attribution for each item.
`;

await writeFile(repoPath("README.md"), readme, "utf8");
console.log(`Generated README.md with ${packaged.length} packaged pet cards.`);
