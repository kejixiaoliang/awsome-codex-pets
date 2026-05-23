import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    error.message = `${filePath}: ${error.message}`;
    throw error;
  }
}

export async function writeJson(filePath, value) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, json, "utf8");
}

export function repoPath(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
