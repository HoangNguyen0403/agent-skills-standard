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
        '## Strict Pre-Flight Protocol (Blocking)',
        '',
        '> [!CRITICAL]',
        '> **DO NOT WRITE CODE OR ANSWER QUESTIONS UNTIL YOU HAVE COMPLETED THESE STEPS. This is a mandatory pre-flight checklist.**',
        '',
        '1. **Step 1: Read Index** → Call the `view_file` tool on `AGENTS.md` to load the skill index and triggers.',
        "2. **Step 2: Compare Context** → Check the user's prompt (keywords) and involved files (globs) against the index triggers.",
        '3. **Step 3: Load Skills** → Call `view_file` to read the full `SKILL.md` for _every_ matching skill.',
        '4. **Step 4: Audit Output** → Before writing or editing any code, verify your proposed solution adheres to the loaded skills.',
        '',
        "_Only after completing Step 3 may you begin reasoning about or executing the user's request._",
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
          content += `---\ndescription: ${commonDescription}\nglobs: ['**/*']\nalwaysApply: true\n---\n\n`;
          break;
        case 'copilot':
          content += `---\ndescription: ${commonDescription}\napplyTo: '**/*'\n---\n\n`;
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
