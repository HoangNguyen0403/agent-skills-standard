import fs from "fs-extra";
import { minimatch } from "minimatch";
import path from "path";
import { parseSkill, SkillMetadata } from "./SkillParser";

export interface RegistryMetadata {
  file_routing: Record<string, string[]>;
  broad_globs: string[];
  base_language_skills: Record<string, string>;
  /**
   * Map of foundational skill id → list of substring patterns. When ANY skill
   * whose id contains one of these substrings appears in a match result, the
   * foundational skill is also surfaced. Mirrors the same composite-trigger
   * semantics that `IndexGeneratorService` bakes into the static `_INDEX.md`.
   *
   * Format: { "common/best-practices": ["architecture", "api", "error-handling", ...] }
   */
  foundational_composite_rules: Record<string, string[]>;
}

export interface MatchResult {
  skill: SkillMetadata;
  /** What caused the match — useful for audit and debugging. */
  matchedBy: "file" | "keyword" | "composite" | "direct";
  /** The trigger value that matched (glob, keyword, or skill id). */
  reason: string;
  /**
   * Relevance tier used to order results — lower is more relevant.
   * 0 = narrow file glob, 1 = base-language broad glob, 2 = exact keyword,
   * 3 = partial keyword, 4 = composite (foundational, cross-cutting).
   */
  tier: number;
}

/**
 * In-memory index of all SKILL.md files under the configured skillsDir, plus
 * the registry metadata that drives the tier model. Built once at server start
 * and refreshed on demand.
 */
export class SkillIndex {
  private skillsDir: string | null;
  private metadataPath?: string;
  private skills: SkillMetadata[] = [];
  private metadata: RegistryMetadata = {
    file_routing: {},
    broad_globs: [],
    base_language_skills: {},
    foundational_composite_rules: {},
  };
  private loaded = false;

  constructor(skillsDir: string | null, metadataPath?: string) {
    this.skillsDir = skillsDir;
    this.metadataPath = metadataPath;
  }

  async load(): Promise<void> {
    if (this.skillsDir === null) {
      // No skills installed yet — keep an empty but valid state.
      this.loaded = true;
      return;
    }
    this.metadata = await this.loadMetadata();
    this.skills = await this.scanSkills();
    // When metadata.json is absent (no sync step run), derive file_routing
    // directly from the triggers.files globs already parsed from SKILL.md files.
    // This makes load_skills_for_files work out-of-the-box without requiring
    // any offline sync or metadata generation step.
    if (
      Object.keys(this.metadata.file_routing).length === 0 &&
      this.skills.length > 0
    ) {
      this.metadata = {
        ...this.metadata,
        file_routing: this.deriveFileRouting(),
      };
    }
    this.loaded = true;
  }

  /**
   * Derive a file_routing map from scanned SKILL.md triggers.files globs.
   * Used as a fallback when metadata.json is not present on disk.
   * Extracts the file extension from each glob (e.g. `**\/*.dart` → `dart`)
   * and maps it to the skill's category.
   */
  private deriveFileRouting(): Record<string, string[]> {
    const routing: Record<string, string[]> = {};
    for (const skill of this.skills) {
      for (const glob of skill.triggers.files) {
        const ext = path.extname(glob).replace(/^\./, "");
        if (!ext) continue;
        if (!routing[ext]) routing[ext] = [];
        if (!routing[ext].includes(skill.category)) {
          routing[ext].push(skill.category);
        }
      }
    }
    return routing;
  }

  /** True when no skills directory was found at startup. */
  isEmpty(): boolean {
    return this.skillsDir === null || this.skills.length === 0;
  }

  ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error("SkillIndex.load() must be called before querying.");
    }
  }

  /** All categories present on disk (one subdirectory per category). */
  listCategories(): string[] {
    this.ensureLoaded();
    return Array.from(new Set(this.skills.map((s) => s.category))).sort();
  }

  /** All skills in a category. */
  listSkillsInCategory(category: string): SkillMetadata[] {
    this.ensureLoaded();
    return this.skills.filter((s) => s.category === category);
  }

  /** Direct lookup. */
  findSkill(category: string, id: string): SkillMetadata | undefined {
    this.ensureLoaded();
    const direct = this.skills.find(
      (s) => s.category === category && s.id === id,
    );
    if (direct) return direct;

    // Compatibility: allow callers to omit the category prefix in the skill id.
    // Canonical on-disk ids are often "{category}-{skill}" (e.g. "quality-engineering-playwright-cli"),
    // but some runtimes/users naturally try "playwright-cli". Prefer canonical naming while
    // making direct lookup forgiving.
    const prefixed = id.startsWith(`${category}-`) ? id : `${category}-${id}`;
    return this.skills.find(
      (s) => s.category === category && s.id === prefixed,
    );
  }

  /**
   * Match files against the index. Implements the tier model:
   *   - File extension routes to N candidate categories via file_routing
   *   - Within each category, only skills whose `triggers.files` glob matches
   *     the file path are returned
   *   - Skills with broad globs (e.g. `**\/*.ts`) are demoted: they match only
   *     if they are the registered `base_language_skills` for that category
   *   - `exclude` patterns in a skill suppress matches
   */
  matchFiles(files: string[]): MatchResult[] {
    this.ensureLoaded();
    const results: MatchResult[] = [];
    const seen = new Set<string>();

    for (const fileRaw of files) {
      const file = fileRaw.replace(/\\/g, "/");
      const ext = path.extname(file).replace(/^\./, "");
      const categories = this.metadata.file_routing[ext] ?? [];

      for (const category of categories) {
        const categorySkills = this.listSkillsInCategory(category);
        const baseSkillId = this.metadata.base_language_skills[category];

        for (const skill of categorySkills) {
          if (this.isExcluded(skill, file)) continue;

          for (const glob of skill.triggers.files) {
            if (!minimatch(file, glob, { matchBase: true })) continue;

            const isBroad = this.metadata.broad_globs.includes(glob);
            const isBaseLanguage = skill.id === baseSkillId;
            if (isBroad && !isBaseLanguage) continue; // demoted

            const key = `${skill.category}/${skill.id}`;
            if (seen.has(key)) break;
            seen.add(key);
            // Narrow globs are the strongest file-relevance signal; a base-language
            // skill only appears via its broad glob, so it ranks one tier lower.
            results.push({
              skill,
              matchedBy: "file",
              reason: glob,
              tier: isBroad ? 1 : 0,
            });
            break;
          }
        }
      }
    }

    const ranked = [...results].sort((a, b) => a.tier - b.tier);
    return [...ranked, ...this.expandComposites(results)];
  }

  /**
   * Match keyword phrases against every skill's `triggers.keywords`.
   * Case-insensitive: exact match ranks highest; otherwise a word-boundary
   * substring match in either direction (partial keywords under 3 chars are
   * ignored to avoid a short trigger matching inside an unrelated word).
   */
  matchKeywords(keywords: string[]): MatchResult[] {
    this.ensureLoaded();
    const results: MatchResult[] = [];
    const seen = new Set<string>();
    const lowered = keywords.map((k) => k.toLowerCase());

    for (const skill of this.skills) {
      for (const trigger of skill.triggers.keywords) {
        const triggerLc = trigger.toLowerCase();
        const match = this.matchKeyword(lowered, triggerLc);
        if (!match.hit) continue;

        const key = `${skill.category}/${skill.id}`;
        if (seen.has(key)) break;
        seen.add(key);
        results.push({
          skill,
          matchedBy: "keyword",
          reason: trigger,
          tier: match.exact ? 2 : 3,
        });
        break;
      }
    }

    const ranked = [...results].sort((a, b) => a.tier - b.tier);
    return [...ranked, ...this.expandComposites(results)];
  }

  /** Exact match, else a word-boundary substring match in either direction (min 3 chars). */
  private matchKeyword(
    inputLowered: string[],
    triggerLc: string,
  ): { hit: boolean; exact: boolean } {
    if (inputLowered.includes(triggerLc)) return { hit: true, exact: true };

    for (const k of inputLowered) {
      if (triggerLc.length >= 3 && this.hasBoundaryMatch(k, triggerLc)) {
        return { hit: true, exact: false };
      }
      if (k.length >= 3 && this.hasBoundaryMatch(triggerLc, k)) {
        return { hit: true, exact: false };
      }
    }
    return { hit: false, exact: false };
  }

  /**
   * True when `needle` occurs in `haystack` without being embedded inside a
   * larger alphanumeric run on either side (e.g. "ts" must not match inside
   * "tests"). Needles that start/end with a non-alphanumeric char (e.g.
   * "@riverpod") are exempt from that side's check since there's no word to
   * accidentally split.
   */
  private hasBoundaryMatch(haystack: string, needle: string): boolean {
    const isWordChar = (ch: string) => /[a-z0-9]/i.test(ch);
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      const before = idx > 0 ? haystack[idx - 1] : "";
      const after =
        idx + needle.length < haystack.length
          ? haystack[idx + needle.length]
          : "";
      const leftOk = !(isWordChar(before) && isWordChar(needle[0] ?? ""));
      const rightOk = !(
        isWordChar(after) && isWordChar(needle[needle.length - 1] ?? "")
      );
      if (leftOk && rightOk) return true;
      idx = haystack.indexOf(needle, idx + 1);
    }
    return false;
  }

  /** Returns the file_routing map so the agent can discover which categories handle which extensions. */
  getRouting(): Record<string, string[]> {
    this.ensureLoaded();
    return this.metadata.file_routing;
  }

  /** Path to a category-level guide such as references/framework-map.md, if present. */
  getCategoryGuidePath(category: string): string | null {
    this.ensureLoaded();
    if (!this.skillsDir) return null;
    const hit = this.listCategories().find(
      (entry) => entry.toLowerCase() === category.toLowerCase(),
    );
    if (!hit) return null;
    return path.join(this.skillsDir, hit, "references", "framework-map.md");
  }

  /**
   * Expand a set of direct match results with composite-triggered foundational
   * skills. Mirrors the same `String.includes` semantics that the CLI's
   * IndexGeneratorService uses when baking composites into static `_INDEX.md`.
   *
   * For each rule `"<category>/<id>": [pattern, ...]`, if any direct match's
   * skill id contains any pattern, the foundational skill is appended.
   *
   * Composite-triggered results are deduped against the seed set and against
   * other composites — each (category, id) appears at most once.
   *
   * Composites are NOT recursive — a composite-triggered skill cannot trigger
   * further composites. This matches the static index generator's behaviour
   * and prevents infinite loops if rules are configured carelessly.
   */
  expandComposites(seeds: MatchResult[]): MatchResult[] {
    this.ensureLoaded();
    const seenKeys = new Set(
      seeds.map((r) => `${r.skill.category}/${r.skill.id}`),
    );
    const out: MatchResult[] = [];

    for (const [foundationalRef, patterns] of Object.entries(
      this.metadata.foundational_composite_rules,
    )) {
      const slash = foundationalRef.indexOf("/");
      if (slash < 0) continue;
      const cat = foundationalRef.slice(0, slash);
      const idStub = foundationalRef.slice(slash + 1);

      // The composite key in metadata.json is e.g. "common/best-practices".
      // The on-disk skill id is "common-best-practices" (category prefix included).
      // Resolve to whichever convention the registry uses.
      const skill =
        this.findSkill(cat, `${cat}-${idStub}`) ?? this.findSkill(cat, idStub);
      if (!skill) continue;

      const skillKey = `${skill.category}/${skill.id}`;
      if (seenKeys.has(skillKey)) continue;

      const trigger = seeds.find((s) =>
        patterns.some((p) => s.skill.id.includes(p)),
      );
      if (!trigger) continue;

      seenKeys.add(skillKey);
      out.push({
        skill,
        matchedBy: "composite",
        reason: `via ${trigger.skill.category}/${trigger.skill.id}`,
        tier: 4,
      });
    }

    return out;
  }

  private isExcluded(skill: SkillMetadata, fileRaw: string): boolean {
    const file = fileRaw.replace(/\\/g, "/");
    return skill.triggers.exclude.some((glob) =>
      minimatch(file, glob, { matchBase: true }),
    );
  }

  private async loadMetadata(): Promise<RegistryMetadata> {
    if (!this.metadataPath || !(await fs.pathExists(this.metadataPath))) {
      return {
        file_routing: {},
        broad_globs: [],
        base_language_skills: {},
        foundational_composite_rules: {},
      };
    }
    const raw = await fs.readFile(this.metadataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RegistryMetadata> & {
      base_language_skills?: Record<string, string>;
    };

    const baseSkills = { ...(parsed.base_language_skills ?? {}) };
    delete (baseSkills as Record<string, string>)._comment;

    const fileRouting = { ...(parsed.file_routing ?? {}) };
    delete (fileRouting as Record<string, string[]>)
      ._comment as unknown as undefined;

    const composites = { ...(parsed.foundational_composite_rules ?? {}) };
    delete (composites as Record<string, string[]>)
      ._comment as unknown as undefined;

    return {
      file_routing: fileRouting,
      broad_globs: parsed.broad_globs ?? [],
      base_language_skills: baseSkills,
      foundational_composite_rules: composites,
    };
  }

  private async scanSkills(): Promise<SkillMetadata[]> {
    if (this.skillsDir === null) return [];
    const out: SkillMetadata[] = [];
    const categories = await fs.readdir(this.skillsDir);

    for (const category of categories) {
      const categoryDir = path.join(this.skillsDir, category);
      const stat = await fs.stat(categoryDir).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const skillDirs = await fs.readdir(categoryDir);
      for (const skillId of skillDirs) {
        const skillPath = path.join(categoryDir, skillId, "SKILL.md");
        if (!(await fs.pathExists(skillPath))) continue;
        const parsed = await parseSkill(skillPath, category, skillId);
        if (parsed) out.push(parsed);
      }
    }

    return out;
  }
}
