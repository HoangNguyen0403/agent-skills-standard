import { MetadataReader, SkillMetadata } from './MetadataReader';

/**
 * Service for building the markdown content of AGENTS.md and _INDEX.md files.
 * Handles formatting, ordering, and template injection.
 */
export class IndexContentBuilder {
  private metadataReader: MetadataReader;

  constructor(metadataReader: MetadataReader) {
    this.metadataReader = metadataReader;
  }

  /**
   * Derives foundational composite IDs for a skill based on registry-owned naming rules.
   * Only applies to non-common skills. Deduplicates against explicit composites.
   */
  public deriveFoundationalComposites(
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
   * Formats a single skill into a list item for AGENTS.md.
   */
  public formatEntry(
    category: string,
    skill: string,
    metadata: SkillMetadata,
    foundationalRules: Record<string, string[]> = {},
  ): string {
    const id = `${category}/${skill}`;

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

    let desc = this.metadataReader.sanitizeDescription(
      metadata.description || '',
      id,
    );
    // Remove (triggers: ...) if it already exists to avoid duplication
    desc = desc.replace(/\s*\(triggers:.*?\)\s*$/, '');

    const prefixIcon = metadata.priority.startsWith('P0') ? '🚨 ' : '';
    const content = `${prefixIcon}${desc}${triggerText}`.trim();
    return `- **[${id}]**: ${content}`;
  }

  /**
   * Assembles the full index markdown: guidance header plus skill entries.
   */
  public assembleIndex(entries: string[]): string {
    const header = [
      '## Agent Skills Index',
      '',
      '> Load the `SKILL.md` for every matched skill before editing files; these skills override pre-training patterns.',
      '> Prefer `load_skills_for_files` when the MCP server is registered — it returns this same content.',
      '> No match? State "No project-specific skills applicable."',
      '',
      '## ⚡ How to Find and Use This Index',
      '',
      '> [!IMPORTANT] PATH RESOLUTION (Cross-Platform)',
      '> Skill IDs in the list below (e.g., `[category/skill-name]`) represent the relative folder path.',
      '> Because this project supports multiple AI agents, skills may reside in a base directory like `.gemini/skills/`, `.agents/skills/`, or `.cursor/skills/`.',
      '> **Action:** You must prepend the correct base directory to the ID. (Example: If ID is `[flutter/cicd]`, the file is at `<BASE_DIR>/flutter/cicd/SKILL.md`). Use your file search tools (e.g., `list_directory` or `find`) if you are unsure of the base directory.',
      '',
      '| Trigger Type | What to match | Required Action |',
      '| --- | --- | --- |',
      '| **File glob** (e.g. `**/*.ts`) | Files you are currently editing match the pattern | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |',
      '| **Keyword** (e.g. `auth`, `refactor`) | Normalized concepts associated with requested work; keep each multiword concept atomic (Flutter CI/CD → `keywords: ["flutter cicd"]`) | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md`; separate entries are not combined |',
      '| **Composite** (e.g. `+other/skill`) | Another listed skill is already active | Also load this skill via `view_file` |',
      '',
      '> [!TIP]',
      '> The caller associates concepts with requested work; the registry matches declared phrases and does not infer relationships between separate terms. Pass a multiword concept intact, for example `keywords: ["flutter cicd"]`.',
      '',
      '### List of Available Skills',
      '',
    ].join('\n');

    return `${header}\n${entries.join('\n')}\n`;
  }
}
