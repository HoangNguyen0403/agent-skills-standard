import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

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

      return {
        name: fm.name || '',
        description: fm.description || '',
        priority,
        triggers:
          (fm.metadata?.triggers as {
            files?: string[];
            keywords?: string[];
            composite?: string[];
            exclude?: string[];
          }) || {},
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

    const triggerText = triggers ? ` (triggers: ${triggers})` : '';

    const content = `${prefix}${metadata.description || ''}`.trim();
    return `- **[${id}]**: ${content}${triggerText}`;
  }
}
