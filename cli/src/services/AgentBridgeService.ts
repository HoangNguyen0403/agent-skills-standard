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
        '# 🛠 Agent Skills Routing Protocol (CRITICAL)',
        '',
        'You are operating in a Zero-Trust environment. You are strictly forbidden from relying on your baseline pre-training for architecture, styling, testing, or code patterns in this repository.',
        '',
        '> [!CRITICAL] GATEKEEPER CONSTRAINT',
        '> **Your first action in ANY session MUST be a tool call to read `AGENTS.md`.**',
        '> You must NOT write code, suggest solutions, or output text explanations until you have completed the State Machine below.',
        '',
        '## 🔄 The Mandatory State Machine',
        '',
        'You must execute these states sequentially. Do not proceed to the next state until the current one is satisfied.',
        '',
        '### State 1: Discovery (Tool Call Required)',
        '',
        '- **Action:** Execute a file-reading tool (e.g., `view_file`, `read_file`, `cat`) targeting the exact path: `AGENTS.md` (located in the project root).',
        '- **Condition to pass:** You have successfully read the `<!-- SKILLS_INDEX_START -->` block.',
        '',
        '### State 2: Trigger Matching (Internal Thought)',
        '',
        "- **Action:** Analyze the user's prompt (keywords) and the files involved in the task (globs).",
        '- **Condition to pass:** Cross-reference them against the `(triggers: ...)` list inside `AGENTS.md`. Identify all matching Skills and note their exact file paths.',
        '',
        '### State 3: Context Loading (Tool Call Required)',
        '',
        `- **Action:** Execute file-reading tools to read the \`SKILL.md\` files at the exact paths identified in State 2.`,
        '- **Condition to pass:** You have ingested the specific guidelines for the task. If no skills matched in State 2, you may skip this state.',
        '',
        '### State 4: Execution & Audit Log (Output Generation)',
        '',
        '- **Action:** You may now begin answering the user or writing code.',
        '- **Constraint:** Your very first text output MUST be a "Pre-Write Audit Log" confirming which skills were loaded, or explicitly stating "No project-specific skills applicable."',
        '',
        '## Self-Learning Protocol',
        '',
        `At the end of any multi-step task with user corrections, load and run **[common/common-session-retrospective](${prefix}common/common-session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.`,
        '',
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

      const isClaude = agentId === Agent.Claude;

      if (isClaude) {
        const claudeProtocol = [
          '',
          '## Agent Protocol',
          '',
          'See `AGENTS.md` for the Zero-Trust skill loading protocol (applies to all AI agents).',
          '',
          '## Self-Learning Protocol',
          '',
          `At the end of any multi-step task with user corrections, load and run **[common/common-session-retrospective](${prefix}common/common-session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.`,
          '',
        ].join('\n');

        const claudePath = path.join(rootDir, 'CLAUDE.md');
        if (await fs.pathExists(claudePath)) {
          const existingContent = await fs.readFile(claudePath, 'utf8');
          if (
            existingContent &&
            !existingContent.includes('## Agent Protocol')
          ) {
            await fs.appendFile(claudePath, claudeProtocol);
          }
        } else {
          await fs.outputFile(claudePath, claudeProtocol.trimStart());
        }
        // Also write the full Zero-Trust rules to the rule directory if it's not the root
        // But for Claude, CLAUDE.md IS the rule file.
        // The user wants CLAUDE.md to refer to AGENTS.md.
        continue;
      }

      content += commonBody;

      await fs.outputFile(ruleFilePath, content);
    }
  }
}
