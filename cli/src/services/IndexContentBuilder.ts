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
   * Assembles the full AGENTS.md markdown including headers and Zero-Trust rules.
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
      '> Because this project supports multiple AI agents, skills may reside in a base directory like `.gemini/skills/`, `.agents/skills/`, or `.cursor/skills/`.',
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
      '### List of Available Skills',
      '',
    ].join('\n');

    return `${header}\n${entries.join('\n')}\n`;
  }
}
