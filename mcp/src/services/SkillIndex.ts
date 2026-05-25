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
    this.loaded = true;
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
            results.push({ skill, matchedBy: "file", reason: glob });
            break;
          }
        }
      }
    }

    return [...results, ...this.expandComposites(results)];
  }

  /**
   * Match keyword phrases against every skill's `triggers.keywords`.
   * Case-insensitive substring match — same semantics as IndexGeneratorService.
   */
  matchKeywords(keywords: string[]): MatchResult[] {
    this.ensureLoaded();
    const results: MatchResult[] = [];
    const seen = new Set<string>();
    const lowered = keywords.map((k) => k.toLowerCase());

    for (const skill of this.skills) {
      for (const trigger of skill.triggers.keywords) {
        const triggerLc = trigger.toLowerCase();
        const hit = lowered.find(
          (k) => k.includes(triggerLc) || triggerLc.includes(k),
        );
        if (!hit) continue;

        const key = `${skill.category}/${skill.id}`;
        if (seen.has(key)) break;
        seen.add(key);
        results.push({ skill, matchedBy: "keyword", reason: trigger });
        break;
      }
    }

    return [...results, ...this.expandComposites(results)];
  }

  /** Returns the file_routing map so the agent can discover which categories handle which extensions. */
  getRouting(): Record<string, string[]> {
    this.ensureLoaded();
    return this.metadata.file_routing;
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
