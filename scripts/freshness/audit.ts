import fs from "fs-extra";
import path from "path";
import { CLAIM_ALIASES, scanClaims } from "./claims";
import {
  VERSION_AGNOSTIC_CATEGORIES,
  effectivePins,
  loadCategoryPins,
} from "./pins";
import { walkSkills } from "./skills";
import type { EffectivePin, FreshnessIssue, SkillRecord } from "./types";
import { compareVersions, parseVersion, significantPart } from "./versions";

/** Whole days from an ISO date (YYYY-MM-DD) to `to`. */
export function daysBetween(from: string, to: Date): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  return Math.floor((to.getTime() - start) / 86_400_000);
}

/** Reads `Reviewed: YYYY-MM-DD` from `<categoryDir>/references/framework-map.md`. */
export function readFrameworkMapReviewed(categoryDir: string): string | null {
  const mapPath = path.join(categoryDir, "references", "framework-map.md");
  if (!fs.existsSync(mapPath)) return null;
  const match = fs.readFileSync(mapPath, "utf8").match(/^Reviewed:\s*(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}

interface AuditOptions {
  staleDays: number;
  /** Injectable clock for tests; defaults to now. */
  today?: Date;
}

/**
 * Offline freshness audit: missing pins, stale reviews, framework-map
 * date mismatches, and version claims that disagree with pins.
 * Never touches the network.
 */
export function auditFreshness(
  repoRoot: string,
  options: AuditOptions,
): FreshnessIssue[] {
  const today = options.today ?? new Date();
  const skillsDir = path.join(repoRoot, "skills");
  const categoryPins = loadCategoryPins(path.join(skillsDir, "metadata.json"));
  const skills = walkSkills(skillsDir);
  const issues: FreshnessIssue[] = [];

  const pinsBySkill = new Map<SkillRecord, EffectivePin[]>();
  for (const skill of skills) pinsBySkill.set(skill, effectivePins(skill, categoryPins));

  // 1. missing-pin
  for (const [category, entries] of categoryPins) {
    if (VERSION_AGNOSTIC_CATEGORIES.has(category) || entries.length > 0) continue;
    const anySkillPin = skills.some(
      (s) => s.category === category && (pinsBySkill.get(s) ?? []).some((p) => p.origin === "skill"),
    );
    if (anySkillPin) continue;
    issues.push({
      type: "missing-pin",
      severity: "low",
      category,
      skillName: "",
      message: `Category "${category}" declares no upstream pins in skills/metadata.json`,
    });
  }

  // 2. reviewed-stale (deduped)
  const seenStale = new Set<string>();
  for (const [skill, pins] of pinsBySkill) {
    for (const pin of pins) {
      const skillName = pin.origin === "category" ? "" : skill.name;
      const dedupe = `${pin.category}:${skillName}:${pin.name}`;
      if (seenStale.has(dedupe)) continue;
      seenStale.add(dedupe);
      const age = daysBetween(pin.reviewed, today);
      if (age > options.staleDays) {
        issues.push({
          type: "reviewed-stale",
          severity: "med",
          category: pin.category,
          skillName,
          upstream: pin.name,
          message: `Pin "${pin.name}" (${pin.pinned}) last reviewed ${pin.reviewed}, ${age} days ago (> ${options.staleDays})`,
        });
      }
    }
  }

  // 3. reviewed-mismatch
  for (const [category, entries] of categoryPins) {
    const mapDate = readFrameworkMapReviewed(path.join(skillsDir, category));
    if (!mapDate || entries.length === 0) continue;
    for (const entry of entries) {
      if (entry.reviewed === mapDate) continue;
      issues.push({
        type: "reviewed-mismatch",
        severity: "low",
        category,
        skillName: "",
        upstream: entry.name,
        message: `framework-map.md says Reviewed: ${mapDate} but pin "${entry.name}" says ${entry.reviewed}`,
        file: `skills/${category}/references/framework-map.md`,
      });
    }
  }

  // 4 + 5. claims vs pins
  for (const [skill, pins] of pinsBySkill) {
    if (pins.length === 0) continue;
    const pinByName = new Map(pins.map((p) => [p.name, p]));
    for (const claim of scanClaims(skill, repoRoot)) {
      const pin = pinByName.get(claim.name);
      const alias = CLAIM_ALIASES[claim.name];
      if (!pin || !alias) continue;
      const claimed = parseVersion(claim.version);
      const pinned = parseVersion(pin.pinned);
      if (!claimed || !pinned) continue;
      // A claim written with fewer parts than the alias significance
      // ("PHP 8" against a minor-significant pin) is only as precise as
      // what was written: compare at the claim's own precision.
      const significance =
        claimed.length === 1 ? "major" : alias.significance;
      const cmp = compareVersions(
        significantPart(claimed, significance),
        significantPart(pinned, significance),
      );
      if (cmp > 0) {
        issues.push({
          type: "claim-ahead-of-pin",
          severity: "med",
          category: skill.category,
          skillName: skill.name,
          upstream: claim.name,
          message: `Claims "${claim.name} ${claim.version}${claim.floor ? "+" : ""}" but pin is ${pin.pinned}; bump the pin`,
          file: claim.file,
          line: claim.line,
        });
      } else if (cmp < 0 && !claim.floor) {
        issues.push({
          type: "claim-behind-pin",
          severity: "med",
          category: skill.category,
          skillName: skill.name,
          upstream: claim.name,
          message: `Claims "${claim.name} ${claim.version}" but pin is ${pin.pinned}; update the guidance or mark as a floor with "+"`,
          file: claim.file,
          line: claim.line,
        });
      }
    }
  }

  return issues;
}
