import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { Agent, getAgentDefinition } from '../constants';

interface SkillMetadata {
  name: string;
  description: string;
  priority: string;
  triggers: {
    files?: string[];
    keywords?: string[];
  };
}

/**
 * Service for generating and managing the Agent Skills Index in markdown format.
 * It handles parsing skill metadata, injecting the index into documentation,
 * and bridging agent-specific rule files.
 */
export class IndexGeneratorService {
  /**
   * Generates a markdown index of available skills across multiple categories.
   * @param baseDir The base directory containing categories and skills
   * @param frameworks List of framework categories to include in the index
   * @returns A formatted markdown string representing the index
   */
  async generate(baseDir: string, frameworks: string[]): Promise<string> {
    const categories = ['common', ...frameworks];
    const entries: string[] = [];

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
          entries.push(entry);
        }
      }
    }

    return this.assembleIndex(entries);
  }

  /**
   * Injects the generated index into target documentation files (e.g., AGENTS.md).
   * It uses HTML comments as markers for safe injection and replacement.
   * @param rootDir Project root directory
   * @param indexContent The markdown content to inject
   */
  async inject(rootDir: string, indexContent: string): Promise<void> {
    const targets = ['AGENTS.md'];
    for (const target of targets) {
      const targetPath = path.join(rootDir, target);
      let content = '';

      if (await fs.pathExists(targetPath)) {
        content = await fs.readFile(targetPath, 'utf8');
        const markerStart = '<!-- SKILLS_INDEX_START -->';
        const markerEnd = '<!-- SKILLS_INDEX_END -->';

        const startIndex = content.indexOf(markerStart);
        const endIndex = content.indexOf(markerEnd);

        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          // Both markers exist and are in the correct order
          const preMarker = content.substring(
            0,
            startIndex + markerStart.length,
          );
          const postMarker = content.substring(endIndex);
          content = `${preMarker}\n${indexContent}\n${postMarker}`;
        } else if (startIndex !== -1 || endIndex !== -1) {
          // One of the markers is missing or they are out of order
          // This is a damaged state, we should probably append at the end to be safe,
          // but first let's try to remove any lone markers to avoid further damage.
          content = content.replace(markerStart, '').replace(markerEnd, '');
          content =
            content.trimEnd() +
            `\n\n${markerStart}\n${indexContent}\n${markerEnd}\n`;
        } else {
          // No markers found
          content =
            content.trimEnd() +
            `\n\n${markerStart}\n${indexContent}\n${markerEnd}\n`;
        }
      } else {
        content = `<!-- SKILLS_INDEX_START -->\n${indexContent}\n<!-- SKILLS_INDEX_END -->\n`;
      }

      await fs.outputFile(targetPath, content);
    }
  }

  /**
   * Bridges native agent rule files to AGENTS.md by creating discovery instructions.
   * Creates agent-specific rule files (e.g., .mdc, .instructions.md) in their respective directories.
   * @param rootDir Project root directory
   * @param agents List of agents to generate rules for
   */
  async bridge(rootDir: string, agents: Agent[]): Promise<void> {
    const fileNameBase = 'agent-skill-standard-rule';
    const commonDescription =
      'Rule for Agent Skills Standard - Always consult AGENTS.md for consolidated project context and technical triggers.';
    const commonBody = [
      '# 🛠 Agent Skills Standard',
      '',
      'This project uses a modular skills library for specialized engineering tasks.',
      '',
      '> [!IMPORTANT]',
      '> ALWAYS consult the consolidated index in **AGENTS.md** to identify relevant triggers before acting.',
      '',
      'The `AGENTS.md` file contains mapping between project files and the specific agent skills located in the respective agent-specific folders (e.g., `.cursor/skills`, `.claude/skills`).',
    ].join('\n');

    for (const agentId of agents) {
      const config = getAgentDefinition(agentId);
      if (!config) continue;

      // SAFETY: Only write if the agent is detected in the project
      // This prevents creating unused directories.
      let detected = false;
      for (const file of config.detectionFiles) {
        if (await fs.pathExists(path.join(rootDir, file))) {
          detected = true;
          break;
        }
      }

      if (!detected) continue;

      const ruleFilePath = path.join(
        rootDir,
        config.ruleFile,
        config.ruleFileName || `${fileNameBase}${config.ruleExtension}`,
      );

      // Ensure directory exists (e.g. .cursor/rules inside .cursor)
      await fs.ensureDir(path.dirname(ruleFilePath));

      let content = '';

      switch (config.frontmatterStyle) {
        case 'cursor':
          content += `---\ndescription: ${commonDescription}\nglobs: ["**/*"]\nalwaysApply: true\n---\n\n`;
          break;
        case 'copilot':
          content += `---\ndescription: ${commonDescription}\napplyTo: "**/*"\n---\n\n`;
          break;
        case 'none':
          // No frontmatter
          break;
      }

      content += commonBody;

      await fs.outputFile(ruleFilePath, content);
    }
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
    ].join(', ');

    const triggerText = triggers ? ` (triggers: ${triggers})` : '';

    // Format: - **[category/skill]**: 🚨 Description (triggers: file.ts, keyword)
    const content = `${prefix}${metadata.description || ''}`.trim();
    return `- **[${id}]**: ${content}${triggerText}`;
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
}
