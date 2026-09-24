// scripts/metrics/json-series.ts
//
// Shared reader for the two committed `{ records: [...] }` history files this repo
// actually has (`benchmarks/history.json`, `benchmarks/evals/history.json`) and for
// whatever a `docs/ops/bands.yaml` band names as its `source`. Fails open: a missing
// file, an unreadable field, or a non-numeric value yields `undefined`, never a guess.

import fs from "fs";
import path from "path";

export interface JsonSeriesPoint {
  value: number;
  date: Date | undefined;
}

/**
 * Reads the raw `records[]` array from the JSON file at `relativePath` (relative
 * to `root`). Returns `undefined` when the file is absent, unparseable, or does
 * not have a `{ records: [...] }` shape.
 */
export function readJsonRecords(root: string, relativePath: string): Record<string, unknown>[] | undefined {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { records?: unknown }).records)) {
    return undefined;
  }
  return (parsed as { records: Record<string, unknown>[] }).records;
}

/**
 * Reads `records[].<field>` from the JSON file at `relativePath` (relative to
 * `root`) as a numeric series, in file order (each history file is already
 * chronological). `dateField` names the record's timestamp key, when present.
 * Returns `undefined` when the file is absent, unparseable, or the field never
 * holds a finite number.
 */
export function readJsonRecordSeries(
  root: string,
  relativePath: string,
  field: string,
  dateField = "date",
): JsonSeriesPoint[] | undefined {
  const records = readJsonRecords(root, relativePath);
  if (!records) return undefined;
  const points: JsonSeriesPoint[] = [];
  for (const record of records) {
    const raw = record[field];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const rawDate = record[dateField];
    const date = typeof rawDate === "string" ? new Date(rawDate) : undefined;
    points.push({ value: raw, date: date && !Number.isNaN(date.getTime()) ? date : undefined });
  }
  return points.length > 0 ? points : undefined;
}
