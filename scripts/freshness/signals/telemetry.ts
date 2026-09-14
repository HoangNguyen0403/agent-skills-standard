import fs from "fs-extra";
import path from "path";
import { VERSION_AGNOSTIC_CATEGORIES } from "../pins";
import type { FreshnessIssue } from "../types";

/** Loads summed over the telemetry records inside the window. */
export interface TelemetryAggregate {
  sessions: number;
  from: string | null;
  to: string | null;
  loadsBySkill: Map<string, number>;
  noMatchCalls: number;
  /** Category names with any skill load or any `category/<name>` load, observed anywhere in the window. */
  categoriesSeen: Set<string>;
}

/** True for a JSON count that is a non-negative, safe integer. */
function isValidCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

/**
 * Lines of one `.jsonl` file, or of every `*.jsonl` in a directory
 * (sorted by file name). Throws when the path does not exist.
 */
export function readTelemetryFiles(target: string): string[] {
  if (!fs.existsSync(target)) throw new Error(`telemetry path not found: ${target}`);
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((f) => f.endsWith(".jsonl")).sort().map((f) => path.join(target, f))
    : [target];
  return files.flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return text === "" ? [] : text.replace(/\r?\n$/, "").split(/\r?\n/);
  });
}

/** Parses JSONL records written by the MCP TelemetryWriter; invalid or out-of-window lines are skipped. */
export function aggregateTelemetry(lines: string[], options: { today: Date; windowDays: number }): TelemetryAggregate {
  const cutoff = options.today.getTime() - options.windowDays * 86_400_000;
  const agg: TelemetryAggregate = { sessions: 0, from: null, to: null, loadsBySkill: new Map(), noMatchCalls: 0, categoriesSeen: new Set() };
  let fromEpoch = Infinity;
  let toEpoch = -Infinity;
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;
    let record: { at?: unknown; skills?: unknown; noMatchCalls?: unknown; categories?: unknown };
    try {
      record = JSON.parse(text);
    } catch {
      continue;
    }
    if (typeof record.at !== "string" || !record.skills || typeof record.skills !== "object" || Array.isArray(record.skills)) continue;
    const epoch = new Date(record.at).getTime();
    if (!Number.isFinite(epoch) || epoch < cutoff || epoch > options.today.getTime()) continue;
    agg.sessions += 1;
    if (epoch < fromEpoch) {
      fromEpoch = epoch;
      agg.from = record.at;
    }
    if (epoch > toEpoch) {
      toEpoch = epoch;
      agg.to = record.at;
    }
    for (const [key, count] of Object.entries(record.skills as Record<string, unknown>)) {
      if (key.startsWith("category/") || key.startsWith("workflow/")) continue;
      if (!isValidCount(count)) continue;
      agg.loadsBySkill.set(key, (agg.loadsBySkill.get(key) ?? 0) + count);
      agg.categoriesSeen.add(key.split("/")[0]);
    }
    if (record.categories && typeof record.categories === "object" && !Array.isArray(record.categories)) {
      for (const key of Object.keys(record.categories as Record<string, unknown>)) {
        if (key.startsWith("category/")) agg.categoriesSeen.add(key.slice("category/".length));
      }
    }
    if (isValidCount(record.noMatchCalls)) agg.noMatchCalls += record.noMatchCalls;
  }
  return agg;
}

/**
 * `unused-skill` (low) for every version-sensitive skill with zero loads,
 * only once enough sessions were observed to make "zero" meaningful.
 */
export function telemetryIssues(
  aggregate: TelemetryAggregate,
  skills: { category: string; name: string }[],
  options: { minSessions: number; windowDays: number },
): FreshnessIssue[] {
  if (aggregate.sessions < options.minSessions) return [];
  const issues: FreshnessIssue[] = [];
  for (const skill of skills) {
    if (VERSION_AGNOSTIC_CATEGORIES.has(skill.category)) continue;
    if (!aggregate.categoriesSeen.has(skill.category)) continue;
    const loads = aggregate.loadsBySkill.get(`${skill.category}/${skill.name}`) ?? 0;
    if (loads > 0) continue;
    issues.push({
      type: "unused-skill",
      severity: "low",
      category: skill.category,
      skillName: skill.name,
      message: `Category "${skill.category}" was loaded in this window but this skill never was, across ${aggregate.sessions} sessions in ${options.windowDays} days; check its triggers or consider retiring it`,
    });
  }
  return issues;
}

/** `category/skill` and `category (category)` → loads, for ranking. */
export function loadsByTarget(aggregate: TelemetryAggregate): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, loads] of aggregate.loadsBySkill) {
    out[key] = loads;
    const category = key.split("/")[0];
    const catKey = `${category} (category)`;
    out[catKey] = (out[catKey] ?? 0) + loads;
  }
  return out;
}
