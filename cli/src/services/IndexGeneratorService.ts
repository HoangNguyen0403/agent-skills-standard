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

export class IndexGeneratorService {
  /**
   * Generates a markdown index of available skills.
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
   * Injects the index into target files (e.g., AGENTS.md).
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

        if (content.includes(markerStart) && content.includes(markerEnd)) {
          const regex = new RegExp(`${markerStart}[\\s\\S]*${markerEnd}`);
          content = content.replace(
            regex,
            `${markerStart}\n${indexContent}\n${markerEnd}`,
          );
        } else {
          content += `\n\n${markerStart}\n${indexContent}\n${markerEnd}\n`;
        }
      } else {
        content = `<!-- SKILLS_INDEX_START -->\n${indexContent}\n<!-- SKILLS_INDEX_END -->\n`;
      }

      await fs.writeFile(targetPath, content);
    }
  }

  /**
   * Bridges native agent rule files (e.g. .cursorrules) to AGENTS.md.
   */
  async bridge(rootDir: string, agents: Agent[]): Promise<void> {
    const markerStart = '<!-- SKILLS_BRIDGE_START -->';
    const markerEnd = '<!-- SKILLS_BRIDGE_END -->';
    const bridgeMessage = [
      markerStart,
      '### 🛠 Agent Skills Standard',
      'This project uses a modular skills library for specialized engineering tasks.',
      'ALWAYS consult the consolidated index in AGENTS.md to identify relevant triggers before acting.',
      markerEnd,
    ].join('\n');

    for (const agentId of agents) {
      const def = getAgentDefinition(agentId);
      const ruleFilePath = path.join(rootDir, def.ruleFile);

      // Ensure directory exists (mostly for files like .github/...)
      await fs.ensureDir(path.dirname(ruleFilePath));

      let content = '';
      if (await fs.pathExists(ruleFilePath)) {
        content = await fs.readFile(ruleFilePath, 'utf8');
        if (content.includes(markerStart) && content.includes(markerEnd)) {
          const regex = new RegExp(`${markerStart}[\\s\\S]*${markerEnd}`);
          content = content.replace(regex, bridgeMessage);
        } else {
          content = `${bridgeMessage}\n\n${content}`;
        }
      } else {
        content = `${bridgeMessage}\n`;
      }

      await fs.writeFile(ruleFilePath, content);
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
    // Truncate description to max 12 chars to save space
    let desc = metadata.description || '';
    if (desc.length > 12) {
      desc = desc.substring(0, 11) + '…';
    }

    // Remove triggers column to save space
    // Remove all whitespace padding
    const prefix = metadata.priority.startsWith('P0') ? '🚨' : '';
    // Format: ID|Desc (No outer pipes to save 2 bytes/line)
    return `${id}|${prefix}${desc}`;
  }

  public assembleIndex(entries: string[]): string {
    const header = [
      '# Index',
      'Retrieval-led reasoning required.',
      'ID|Desc',
      ':--|:--',
    ].join('\n');

    return `${header}\n${entries.join('\n')}\n`;
  }
}
