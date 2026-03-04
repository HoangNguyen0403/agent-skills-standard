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

    for (const agentId of agents) {
      const config = getAgentDefinition(agentId);
      if (!config) continue;

      const relativeSkillsPath = path
        .relative(config.ruleFile, config.path)
        .replace(/\\/g, '/');
      const prefix = relativeSkillsPath ? `${relativeSkillsPath}/` : '';

      const commonBody = [
        '# 🛠 Agent Skills Standard',
        '',
        'This project uses a modular skills library for specialized engineering tasks.',
        '',
        '> [!IMPORTANT]',
        '> **MANDATORY: At the start of EVERY session, read `AGENTS.md` to load the skill index.**',
        '> Then identify all skills whose triggers match the current task before writing any code.',
        '',
        '## Skill Activation Protocol',
        '',
        '1. **On session start** → Read `AGENTS.md` (skill index with triggers).',
        '2. **On every task** → Check file globs and keywords against the index.',
        '3. **On skill match** → Read the full `SKILL.md` file before acting.',
        '4. **On file write** → Audit against `common/feedback-reporter` skill.',
        '',
        '## Self-Learning Protocol',
        '',
        `At the end of any multi-step task with user corrections, load and run **[common/session-retrospective](${prefix}common/session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.`,
      ].join('\n');

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
