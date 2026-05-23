import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}
