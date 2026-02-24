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
 * Injection and bridging are handled by MarkdownUtils and AgentBridgeService respectively.
 */
export class IndexGeneratorService {
  /**
   * Generates a markdown index of available skills across multiple categories.
   * @param baseDir The base directory containing categories and skills
   * @param frameworks List of framework categories to include in the index
   * @returns A formatted markdown string representing the index
   */
  async generate(baseDir: string, frameworks: string[]): Promise<string> {
    const categories = Array.from(new Set(['common', ...frameworks]));
    const entries = new Set<string>();

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.pathExists(categoryPath))) continue;

      const skills = await fs.readdir(categoryPath);
      for (const skill of skills) {
        const skillPath = path.join(categoryPath, skill, 'SKILL.md');
        if (!(await fs.pathExists(skillPath))) continue;

        const metadata = await this.parseSkill(skillPath);
        if (metadata) {
          const entry = this.formatEntry(category, skill, metadata);
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
          }) || {},
      };
    } catch {
      return null;
    }
  }

  private formatEntry(
    category: string,
    skill: string,
    metadata: SkillMetadata,
  ): string {
    const id = `${category}/${skill}`;
    const prefix = metadata.priority.startsWith('P0') ? '🚨 ' : '';

    const triggers = [
      ...(metadata.triggers.files || []),
      ...(metadata.triggers.keywords || []),
      ...(metadata.triggers.composite
        ? metadata.triggers.composite.map((c) => `+${c}`)
        : []),
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
