export const DEFAULT_ATLAS = {
  width: 1536,
  height: 1872,
  columns: 8,
  rows: 9,
  cellWidth: 192,
  cellHeight: 208
};

export const ALLOWED_STATUSES = new Set([
  "link-only",
  "downloaded",
  "downloaded-review",
  "packaged",
  "verified",
  "needs-review",
  "invalid"
]);

export const ALLOWED_REDISTRIBUTION = new Set([
  "allowed",
  "unknown",
  "not-allowed",
  "link-only"
]);

export function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function requiredString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
