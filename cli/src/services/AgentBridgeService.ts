import fs from 'fs-extra';
import path from 'path';
import { Agent, getAgentDefinition } from '../constants';

/**
 * Service responsible for bridging native AI agent rule files to AGENTS.md.
 * Creates agent-specific rule files (e.g., .mdc, .instructions.md)
 * in their respective directories.
 */
export class AgentBridgeService {
  /**
   * Bridges native agent rule files to AGENTS.md by creating discovery instructions.
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
}
