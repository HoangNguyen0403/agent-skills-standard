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
   * @param frameworks List of framework categories to include in the index
   * @returns A formatted markdown string representing the index
   */
  async generate(baseDir: string, frameworks: string[]): Promise<string> {
    const categories = Array.from(new Set(['common', ...frameworks]));
    const entries = new Set<string>();
    const foundationalRules = await this.loadFoundationalRules(baseDir);

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.pathExists(categoryPath))) continue;

      const skills = await fs.readdir(categoryPath);
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
      '# Agent Skills Index',
      '',
      '> [!IMPORTANT]',
      '> **Prefer retrieval-led reasoning over pre-training-led reasoning.**',
      '> Before writing any code, you MUST CHECK if a relevant skill exists in the index below.',
      '> If a skill matches your task, READ the file using `view_file`.',
      '',
      '## **Rule Zero: Zero-Trust Engineering**',
      '',
      '- **Skill Authority:** Loaded skills always override existing code patterns.',
      '- **Audit Before Write:** Audit every file write against the `common/feedback-reporter` skill.',
      '',
      '## **Reading This Index**',
      '',
      'Each entry lists `(triggers: ...)` conditions. Three trigger types:',
      '- **File globs** (`**/*.ts`) — activate when working with matching files.',
      '- **Keywords** (`auth`, `refactor`) — activate when these appear in the task.',
      '- **Composite** (`+other/skill`) — activate THIS skill whenever `other/skill` is also active. Used by foundational skills to co-load with their framework peers automatically.',
      '',
    ].join('\n');

    return `${header}\n${entries.join('\n')}\n`;
  }

  private async parseSkill(skillPath: string): Promise<SkillMetadata | null> {
    try {
      const content = await fs.readFile(skillPath, 'utf8');
      const frontmatterMatch = content.match(
        /^---\n([\s\S]*?)\n---\n([\s\S]*)$/,
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

    // Format: - **[category/skill]**: 🚨 Description (triggers: file.ts, keyword, +composite, !exclude)
    const content = `${prefix}${metadata.description || ''}`.trim();
    return `- **[${id}]**: ${content}${triggerText}`;
  }
}
