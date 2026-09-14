import fs from "fs-extra";
import type { EffectivePin, SkillRecord, UpstreamEntry } from "./types";

/** Categories that track no upstream and are exempt from `missing-pin`. */
export const VERSION_AGNOSTIC_CATEGORIES: ReadonlySet<string> = new Set([
  "common",
  "specialists",
  "system-design",
]);

/** Runtime guard for an UpstreamEntry declared in JSON or YAML. */
export function isUpstreamEntry(value: unknown): value is UpstreamEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || v.name.length === 0) return false;
  if (v.source !== "github" && v.source !== "manual") return false;
  if (v.source === "github" && typeof v.repo !== "string") return false;
  if (typeof v.pinned !== "string" || v.pinned.length === 0) return false;
  if (typeof v.reviewed !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.reviewed))
    return false;
  if (v.acknowledged !== undefined && typeof v.acknowledged !== "string") return false;
  return true;
}

/**
 * Reads `categories.<cat>.upstream[]` from skills/metadata.json.
 * Every category present in metadata gets a key; categories without
 * `upstream` map to an empty array so callers can detect `missing-pin`.
 */
export function loadCategoryPins(
  metadataPath: string,
): Map<string, UpstreamEntry[]> {
  const metadata = fs.readJsonSync(metadataPath) as {
    categories?: Record<string, { upstream?: unknown }>;
  };
  const result = new Map<string, UpstreamEntry[]>();
  for (const [category, meta] of Object.entries(metadata.categories ?? {})) {
    const raw = Array.isArray(meta.upstream) ? meta.upstream : [];
    result.set(category, raw.filter(isUpstreamEntry));
  }
  return result;
}

/**
 * Category pins ∪ skill pins. A skill-level entry with the same `name`
 * replaces the category entry. Malformed skill entries are ignored.
 */
export function effectivePins(
  skill: SkillRecord,
  categoryPins: Map<string, UpstreamEntry[]>,
): EffectivePin[] {
  const byName = new Map<string, EffectivePin>();
  for (const entry of categoryPins.get(skill.category) ?? []) {
    byName.set(entry.name, {
      ...entry,
      category: skill.category,
      skillName: skill.name,
      origin: "category",
    });
  }
  const metadata = (skill.frontmatter.metadata ?? {}) as Record<string, unknown>;
  const skillEntries = Array.isArray(metadata.upstream) ? metadata.upstream : [];
  for (const entry of skillEntries.filter(isUpstreamEntry)) {
    byName.set(entry.name, {
      ...entry,
      category: skill.category,
      skillName: skill.name,
      origin: "skill",
    });
  }
  return [...byName.values()];
}
