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
  return files.flatMap((file) => fs.readFileSync(file, "utf8").replace(/\r?\n$/, "").split(/\r?\n/));
}

/** Parses JSONL records written by the MCP TelemetryWriter; invalid or out-of-window lines are skipped. */
export function aggregateTelemetry(lines: string[], options: { today: Date; windowDays: number }): TelemetryAggregate {
  const cutoff = options.today.getTime() - options.windowDays * 86_400_000;
  const agg: TelemetryAggregate = { sessions: 0, from: null, to: null, loadsBySkill: new Map(), noMatchCalls: 0 };
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;
    let record: { at?: unknown; skills?: unknown; noMatchCalls?: unknown };
    try {
      record = JSON.parse(text);
    } catch {
      continue;
    }
    if (typeof record.at !== "string" || !record.skills || typeof record.skills !== "object") continue;
    const at = new Date(record.at).getTime();
    if (!Number.isFinite(at) || at < cutoff || at > options.today.getTime()) continue;
    agg.sessions += 1;
    if (!agg.from || record.at < agg.from) agg.from = record.at;
    if (!agg.to || record.at > agg.to) agg.to = record.at;
    for (const [key, count] of Object.entries(record.skills as Record<string, unknown>)) {
      if (typeof count !== "number" || !Number.isFinite(count)) continue;
      agg.loadsBySkill.set(key, (agg.loadsBySkill.get(key) ?? 0) + count);
    }
    if (typeof record.noMatchCalls === "number") agg.noMatchCalls += record.noMatchCalls;
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
    const loads = aggregate.loadsBySkill.get(`${skill.category}/${skill.name}`) ?? 0;
    if (loads > 0) continue;
    issues.push({
      type: "unused-skill",
      severity: "low",
      category: skill.category,
      skillName: skill.name,
      message: `Never loaded across ${aggregate.sessions} sessions in the last ${options.windowDays} days; check its triggers or consider retiring it`,
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
