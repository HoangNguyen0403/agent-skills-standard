import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { INJECTION_PATTERNS } from '../constants/security';

/**
 * Metadata structure for a skill, extracted from the frontmatter and content of a SKILL.md file.
 */
export interface SkillMetadata {
  /** The human-readable name of the skill. */
  name: string;
  /** A brief summary of what the skill covers. */
  description: string;
  /** The priority level (e.g., P0, P1) determining its critical importance. */
  priority: string;
  /** Trigger conditions for when this skill should be activated. */
  triggers: {
    /** Glob patterns of files that trigger this skill. */
    files?: string[];
    /** List of keywords that trigger this skill. */
    keywords?: string[];
    /** Other skill IDs that, when active, also trigger this skill. */
    composite?: string[];
    /** Patterns to explicitly exclude from triggering this skill. */
    exclude?: string[];
  };
}

/**
 * Service for generating the Agent Skills Index in markdown format.
 * It handles parsing skill metadata and structuring the markdown document.
 *
 * Composite rules are registry-owned: loaded from `skills/metadata.json` at
 * index-generation time. Adding a new foundational skill or pattern requires
 * only a change to `metadata.json` — no CLI source edit or release needed.
 *
 * Injection and bridging are handled by MarkdownUtils and AgentBridgeService respectively.
 */
export class IndexGeneratorService {
  /**
   * Loads foundational composite rules from the registry's metadata.json.
   * Falls back to an empty map if the file is missing or malformed.
   */
  private async loadFoundationalRules(
    baseDir: string,
  ): Promise<Record<string, string[]>> {
    try {
      const metaPath = path.join(baseDir, 'metadata.json');
      const raw = await fs.readFile(metaPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        foundational_composite_rules?: Record<string, string[]>;
      };
      return parsed.foundational_composite_rules ?? {};
    } catch {
      return {};
    }
  }
  /**
   * Generates a markdown index of available skills across multiple categories.
   * @param baseDir The base directory containing categories and skills
   * @param allowedCategories List of categories/frameworks to include. If undefined, all found are included.
   * @returns A formatted markdown string representing the index
   */
  async generate(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<string> {
    const entries = new Set<string>();
    const foundationalRules = await this.loadFoundationalRules(baseDir);

    if (!(await fs.pathExists(baseDir))) return this.assembleIndex([]);

    let categories = await fs.readdir(baseDir);

    // Filter categories to only those specified, plus 'common' and hidden dirs rule.
    categories = categories.filter((category) => {
      if (category.startsWith('.')) return false;
      if (
        allowedCategories &&
        !allowedCategories.includes(category) &&
        category !== 'common'
      ) {
        return false;
      }
      return true;
    });

    categories.sort();

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const skills = await fs.readdir(categoryPath);
      skills.sort();
      for (const skill of skills) {
        const skillPath = path.join(categoryPath, skill, 'SKILL.md');
        if (!(await fs.pathExists(skillPath))) continue;

        const metadata = await this.parseSkill(skillPath);
        if (metadata) {
          const entry = this.formatEntry(
            category,
            skill,
            metadata,
            foundationalRules,
          );
          entries.add(entry);
        }
      }
    }

    return this.assembleIndex(Array.from(entries));
  }

  /**
   * Assembles the full index markdown including headers and Zero-Trust rules.
   * @param entries List of formatted skill entries
   * @param format The format of the entries ('detailed' or 'compact')
   * @returns Complete markdown index string
   */
  public assembleIndex(entries: string[]): string {
    const header = [
      '## Agent Skills Index',
      '',
      '> [!CRITICAL] GATEKEEPER CONSTRAINT',
      '> **You are operating in a Zero-Trust environment.**',
      '> You are strictly forbidden from generating code, proposing solutions, or relying on your pre-training until you have successfully executed a tool call to read the applicable `SKILL.md` files from this index.',
      '',
      '## **Rule Zero: Mandatory Zero-Trust Protocol**',
      '',
      '> [!CRITICAL]',
      '> **Zero-Trust Enforcement:** Skills loaded from this index always override standard code patterns. Skipping the Audit Log or Self-Scan is a protocol violation.',
      '',
      '### **1. The Pre-Write Audit Log (Mandatory)**',
      '',
      'Before invoking any file-editing tool (`write_to_file`, `replace_file_content`, `multi_replace_file_content`), the ASSISTANT **MUST** explicitly state in its thought process/text output:',
      '',
      '1. **Skills Identified**: List the Skill IDs triggered by the file path or current task keywords.',
      '2. **Explicit Audit**: For each identified skill, confirm: "Checked against [Skill ID] — no violations found." Or "Violation detected in [Skill ID]: [Issue] — correcting now."',
      '3. **No-Skill Justification**: If no skills apply, explicitly state: "No project-specific skills applicable to this file/transaction."',
      '',
      '### **2. The Post-Write Self-Scan (Mandatory)**',
      '',
      'Immediately **AFTER** any file-editing tool returns, the ASSISTANT **MUST**:',
      '',
      '1. **Validate**: Contrast the final file content against ALL active Skill IDs.',
      '2. **Identify Slips**: Look for "Standard Defaults" (e.g., local mocks, hardcoded styles) that snuck in.',
      '3. **Self-Correct**: If a violation is found, fix it immediately in the next tool call.',
      '',
      '## **Critical Anti-Patterns (Zero-Tolerance)**',
      '',
      '- **Reversion to Defaults**: Never use "standard" patterns (generic library calls, local mocks) if a Project Skill exists.',
      '- **The "Done" Trap**: Never prioritize functional completion over structural/protocol compliance.',
      '- **Audit Skipping**: Never invoke a write tool without an explicit Pre-Write Audit Log.',
      '',
      '## ⚡ How to Find and Use This Index (Mandatory)',
      '',
      '> [!IMPORTANT] PATH RESOLUTION (Cross-Platform)',
      '> Skill IDs in the list below (e.g., `[category/skill-name]`) represent the relative folder path.',
      '> Because this project supports multiple AI agents, skills may reside in a base directory like `.gemini/skills/`, `.agent/skills/`, or `.cursor/skills/`.',
      '> **Action:** You must prepend the correct base directory to the ID. (Example: If ID is `[flutter/cicd]`, the file is at `<BASE_DIR>/flutter/cicd/SKILL.md`). Use your file search tools (e.g., `list_directory` or `find`) if you are unsure of the base directory.',
      '',
      '| Trigger Type | What to match | Required Action |',
      '| --- | --- | --- |',
      '| **File glob** (e.g. `**/*.ts`) | Files you are currently editing match the pattern | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |',
      "| **Keyword** (e.g. `auth`, `refactor`) | These words appear in the user\\'s request | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |",
      '| **Composite** (e.g. `+other/skill`) | Another listed skill is already active | Also load this skill via `view_file` |',
      '',
      '> [!TIP]',
      '> **Indirect phrasing still counts.** Match keywords by intent, not just exact words.',
      '> Examples: "make it faster" → `performance`, "broken query" → `database`, "login flow" → `auth`, "clean up this file" → `refactor`.',
      '',
    ].join('\n');

    return `${header}\n${entries.join('\n')}\n`;
  }

  /**
   * Loads file routing rules from the registry's metadata.json.
   * Maps file extensions to category arrays for router table generation.
   */
  private async loadFileRouting(
    baseDir: string,
  ): Promise<Record<string, string[]>> {
    try {
      const metaPath = path.join(baseDir, 'metadata.json');
      const raw = await fs.readFile(metaPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        file_routing?: Record<string, string[]>;
      };
      return parsed.file_routing ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Loads broad glob patterns and base language skill mappings from metadata.json.
   * Used to classify triggers into tiers (file match vs keyword match).
   */
  private async loadTierConfig(baseDir: string): Promise<{
    broadGlobs: string[];
    baseSkills: Record<string, string>;
  }> {
    try {
      const metaPath = path.join(baseDir, 'metadata.json');
      const raw = await fs.readFile(metaPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        broad_globs?: string[];
        base_language_skills?: Record<string, string>;
      };
      return {
        broadGlobs: parsed.broad_globs ?? [],
        baseSkills: parsed.base_language_skills ?? {},
      };
    } catch {
      return { broadGlobs: [], baseSkills: {} };
    }
  }

  /**
   * Generates a tiered per-category _INDEX.md with two sections:
   * - **File Match**: Skills with specific path patterns (auto-match when editing a file)
   * - **Keyword Match**: Skills triggered by user intent (only when user mentions the concept)
   *
   * Broad globs (e.g., **\/*.ts) are stripped from non-base skills and those skills
   * are moved to Keyword Match only. This prevents 30+ skills from matching a single file.
   */
  async generateCategoryIndex(
    baseDir: string,
    category: string,
  ): Promise<string> {
    const categoryPath = path.join(baseDir, category);
    if (!(await fs.pathExists(categoryPath))) return '';

    const { broadGlobs, baseSkills } = await this.loadTierConfig(baseDir);
    const baseSkillForCategory = baseSkills[category];

    const skills = await fs.readdir(categoryPath);
    skills.sort();

    const fileMatchRows: string[] = [];
    const keywordMatchRows: string[] = [];

    for (const skill of skills) {
      if (skill.startsWith('.') || skill === '_INDEX.md') continue;
      const skillPath = path.join(categoryPath, skill, 'SKILL.md');
      if (!(await fs.pathExists(skillPath))) continue;

      const metadata = await this.parseSkill(skillPath);
      if (!metadata) continue;

      const isBaseSkill = skill === baseSkillForCategory;
      const allFiles = metadata.triggers.files || [];
      const kwTrigs = (metadata.triggers.keywords || []).join(', ') || '—';
      const prefix = metadata.priority.startsWith('P0') ? '**' : '';
      const suffix = prefix ? '**' : '';

      // Separate specific path patterns from broad globs
      const specificFiles = allFiles.filter((f) => !broadGlobs.includes(f));
      const hasBroadGlob = allFiles.some((f) => broadGlobs.includes(f));

      if (isBaseSkill || (specificFiles.length > 0 && !hasBroadGlob)) {
        // Tier 1/2: Has specific file patterns OR is the base skill → File Match
        const displayFiles = isBaseSkill
          ? allFiles.map((f) => `\`${f}\``).join(', ')
          : specificFiles.map((f) => `\`${f}\``).join(', ');
        fileMatchRows.push(
          `| ${prefix}${skill}${suffix} | ${displayFiles || '—'} | ${kwTrigs} |`,
        );
      } else if (specificFiles.length > 0 && hasBroadGlob) {
        // Has both specific and broad — show specific in file match, but note it
        const displayFiles = specificFiles.map((f) => `\`${f}\``).join(', ');
        fileMatchRows.push(
          `| ${prefix}${skill}${suffix} | ${displayFiles} | ${kwTrigs} |`,
        );
      } else {
        // Tier 3: Only broad globs or no file triggers → Keyword Match only
        keywordMatchRows.push(`| ${prefix}${skill}${suffix} | ${kwTrigs} |`);
      }
    }

    if (fileMatchRows.length === 0 && keywordMatchRows.length === 0) return '';

    const lines = [
      `<!-- AUTO-GENERATED from SKILL.md frontmatters — do not edit manually -->`,
      `# ${category} Skills Index`,
      '',
    ];

    if (fileMatchRows.length > 0) {
      lines.push(
        `## File Match (auto-check against the file you are editing)`,
        '',
        '| Skill | File pattern | Keywords |',
        '| ----- | ------------ | -------- |',
        ...fileMatchRows,
        '',
      );
    }

    if (keywordMatchRows.length > 0) {
      lines.push(
        `## Keyword Match (only when user's request mentions these)`,
        '',
        '| Skill | Match when user mentions |',
        '| ----- | ----------------------- |',
        ...keywordMatchRows,
        '',
      );
    }

    lines.push(
      `> Load matched skills: \`<SKILLS>/${category}/<skill>/SKILL.md\`. Load ALL that match — the tier model already filters irrelevant ones.`,
      '',
    );

    return lines.join('\n');
  }

  /**
   * Generates all _INDEX.md files for categories found in baseDir.
   * @returns Map of category name to generated index content
   */
  async generateAllCategoryIndices(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<Record<string, string>> {
    if (!(await fs.pathExists(baseDir))) return {};

    let categories = await fs.readdir(baseDir);
    categories = categories.filter((c) => {
      if (c.startsWith('.') || c === '_INDEX.md') return false;
      if (
        allowedCategories &&
        !allowedCategories.includes(c) &&
        c !== 'common'
      ) {
        return false;
      }
      return true;
    });
    categories.sort();

    const result: Record<string, string> = {};
    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const index = await this.generateCategoryIndex(baseDir, category);
      if (index) result[category] = index;
    }
    return result;
  }

  /**
   * Assembles a router-style AGENTS.md that maps file extensions to
   * per-category _INDEX.md files. Much smaller than the flat list.
   * @param baseDir The base directory containing skill categories
   * @param allowedCategories Optional filter for which categories to include
   * @returns A compact router-table markdown string
   */
  async assembleRouterIndex(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<string> {
    const fileRouting = await this.loadFileRouting(baseDir);

    // Determine which categories actually exist on disk
    let availableCategories: string[] = [];
    if (await fs.pathExists(baseDir)) {
      const dirs = await fs.readdir(baseDir);
      availableCategories = dirs.filter((d) => {
        if (d.startsWith('.') || d === '_INDEX.md') return false;
        if (
          allowedCategories &&
          !allowedCategories.includes(d) &&
          d !== 'common'
        ) {
          return false;
        }
        return true;
      });
    }

    // Build router rows from file_routing, filtered to available categories
    const routerRows: string[] = [];
    const coveredCategories = new Set<string>();

    // Group extensions by their category set for cleaner output
    const extGrouped = new Map<string, string[]>();
    for (const [ext, cats] of Object.entries(fileRouting)) {
      if (ext === '_comment') continue;
      const filtered = cats.filter((c: string) =>
        availableCategories.includes(c),
      );
      if (filtered.length === 0) continue;

      const key = filtered.sort().join('+');
      if (!extGrouped.has(key)) extGrouped.set(key, []);
      extGrouped.get(key)!.push(ext);
      filtered.forEach((c) => coveredCategories.add(c));
    }

    for (const [catKey, exts] of extGrouped) {
      const cats = catKey.split('+');
      const extDisplay = exts.map((e) => `\`*.${e}\``).join(', ');
      const catDisplay = cats
        .map((c) => `\`<SKILLS>/${c}/_INDEX.md\``)
        .join(', ');
      routerRows.push(`| ${extDisplay} | ${catDisplay} |`);
    }

    // Add common as catch-all if present
    if (availableCategories.includes('common')) {
      coveredCategories.add('common');
      routerRows.push(
        '| Any file (keyword match) | `<SKILLS>/common/_INDEX.md` |',
      );
    }

    // Add quality-engineering if present
    if (availableCategories.includes('quality-engineering')) {
      coveredCategories.add('quality-engineering');
      routerRows.push(
        '| QE workflow | `<SKILLS>/quality-engineering/_INDEX.md` |',
      );
    }

    const header = [
      '## Agent Skills Index',
      '',
      '> [!CRITICAL] Zero-Trust: Read the matching `SKILL.md` BEFORE writing any code.',
      '> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."',
      '',
      '## Skill Resolution Protocol',
      '',
      'Each `_INDEX.md` has two sections — follow both:',
      '',
      '1. **Match file type** → find the category index in the router table below.',
      '2. **Read the `_INDEX.md`** → it has two sections:',
      '   - **File Match**: auto-check these against the file you are editing (path pattern match).',
      "   - **Keyword Match**: only check if the user's request mentions these concepts.",
      '3. **Load ALL matched `SKILL.md`** → read every matched skill before writing code. The tier model keeps matches focused.',
      '',
      "> `<SKILLS>` = your agent's skill directory (e.g., `.claude/skills/`, `.cursor/skills/`, `.gemini/skills/`).",
      '',
      '| File type | Read category index |',
      '| --------- | ------------------- |',
      ...routerRows,
      '',
      '> [!TIP] **Indirect phrasing counts.** "make it faster" → performance, "broken query" → database, "login flow" → auth.',
      '',
    ].join('\n');

    return header;
  }

  private async parseSkill(skillPath: string): Promise<SkillMetadata | null> {
    try {
      const content = await fs.readFile(skillPath, 'utf8');
      const frontmatterMatch = content.match(
        /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/,
      );

      if (!frontmatterMatch) return null;

      const fm = yaml.load(frontmatterMatch[1]) as unknown as {
        name?: string;
        description?: string;
        metadata?: {
          triggers?: {
            files?: string[];
            keywords?: string[];
            composite?: string[];
            exclude?: string[];
          };
        };
      };
      const body = frontmatterMatch[2];

      const priorityMatch = body.match(/## \*\*Priority:\s*([^*]+)\*\*/);
      const priority = priorityMatch ? priorityMatch[1].trim() : 'P1';

      let triggers =
        (fm.metadata?.triggers as {
          files?: string[];
          keywords?: string[];
          composite?: string[];
          exclude?: string[];
        }) || {};

      // If no structured triggers, extract from description's (triggers: ...) suffix
      const hasStructured =
        (triggers.files && triggers.files.length > 0) ||
        (triggers.keywords && triggers.keywords.length > 0);
      if (!hasStructured && fm.description) {
        const descTrigs = fm.description.match(/\(triggers:\s*`?(.*?)`?\)\s*$/);
        if (descTrigs) {
          const rawParts = descTrigs[1].split(',');
          const parts: string[] = [];
          let current = '';
          let braceCount = 0;

          for (let i = 0; i < rawParts.length; i++) {
            const p = rawParts[i];
            braceCount += (p.match(/{/g) || []).length;
            braceCount -= (p.match(/}/g) || []).length;
            current += (current ? ',' : '') + p;

            if (braceCount === 0) {
              parts.push(current.trim());
              current = '';
            }
          }

          // If there are leftover unbalanced braces, add them as keywords to at least capture them
          if (current) parts.push(current.trim());

          // Classify: anything with glob chars (*, /, .) or braces ({}) is a file pattern
          const files = parts.filter(
            (p) =>
              p.includes('*') ||
              p.includes('/') ||
              p.includes('{') ||
              /\.\w+$/.test(p),
          );
          const keywords = parts.filter(
            (p) =>
              !p.includes('*') &&
              !p.includes('/') &&
              !p.includes('{') &&
              !/\.\w+$/.test(p),
          );
          triggers = {
            ...triggers,
            files: files.length > 0 ? files : triggers.files,
            keywords: keywords.length > 0 ? keywords : triggers.keywords,
          };
        }
      }

      return {
        name: fm.name || '',
        description: fm.description || '',
        priority,
        triggers,
      };
    } catch {
      return null;
    }
  }

  /**
   * Derives foundational composite IDs for a skill based on registry-owned naming rules.
   * Only applies to non-common skills. Deduplicates against explicit composites.
   */
  private deriveFoundationalComposites(
    category: string,
    skill: string,
    explicitComposites: string[],
    rules: Record<string, string[]>,
  ): string[] {
    if (category === 'common') return [];
    const derived: string[] = [];
    for (const [foundational, patterns] of Object.entries(rules)) {
      const matches = patterns.some((p) => skill.includes(p));
      if (matches && !explicitComposites.includes(foundational)) {
        derived.push(foundational);
      }
    }
    return derived;
  }

  /**
   * Sanitizes a skill description to prevent indirect prompt injection.
   * Strips known instruction-hijack patterns and replaces them with [REDACTED].
   * Logs a stderr warning for every skill that required sanitisation.
   * @param desc The raw description string from skill frontmatter
   * @param skillId The skill identifier (category/skill) for log context
   * @returns Sanitised description safe to embed in AGENTS.md
   */
  sanitizeDescription(desc: string, skillId: string = 'unknown'): string {
    let sanitized = desc;
    let wasModified = false;

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        wasModified = true;
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
      pattern.lastIndex = 0; // reset global regex state
    }

    if (wasModified) {
      process.stderr.write(
        `[SECURITY] Prompt injection pattern stripped from skill description: ${skillId}\n`,
      );
    }

    return sanitized;
  }

  private formatEntry(
    category: string,
    skill: string,
    metadata: SkillMetadata,
    foundationalRules: Record<string, string[]> = {},
  ): string {
    const id = `${category}/${skill}`;
    const prefix = metadata.priority.startsWith('P0') ? '🚨 ' : '';

    const explicitComposites = metadata.triggers.composite || [];
    const autoComposites = this.deriveFoundationalComposites(
      category,
      skill,
      explicitComposites,
      foundationalRules,
    );
    const allComposites = [...explicitComposites, ...autoComposites];

    const triggers = [
      ...(metadata.triggers.files || []),
      ...(metadata.triggers.keywords || []),
      ...(allComposites.length ? allComposites.map((c) => `+${c}`) : []),
      ...(metadata.triggers.exclude
        ? metadata.triggers.exclude.map((e) => `!${e}`)
        : []),
    ].join(', ');

    const triggerText = triggers ? ` (triggers: \`${triggers}\`)` : '';

    let desc = this.sanitizeDescription(metadata.description || '', id);
    // Wrap any inline triggers in backticks as well to avoid formatting issues
    desc = desc.replace(/\(triggers:\s*`?(.*?)`?\)/g, '(triggers: `$1`)');

    const content = `${prefix}${desc}`.trim();
    return `- **[${id}]**: ${content}${triggerText}`;
  }
}
