import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import { DEFAULT_REGISTER } from '../constants';
import { InitAnswers, InitService } from '../services/InitService';
import { RegistryService } from '../services/RegistryService';

/**
 * Command for initializing the agent-skills-standard configuration in a project.
 * It guides the user through environment detection and creates the `.skillsrc` file.
 */
export class InitCommand {
  private initService: InitService;
  private registryService: RegistryService;

  constructor(initService?: InitService, registryService?: RegistryService) {
    this.initService = initService || new InitService();
    this.registryService = registryService || new RegistryService();
  }

  /**
   * Executes the initialization flow.
   * Checks for existing config, discovers the environment, prompts the user, and saves the configuration.
   */
  async run() {
    const configPath = path.join(process.cwd(), '.skillsrc');

    // 1. Check for existing config
    if (await fs.pathExists(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '.skillsrc already exists. Do you want to overwrite it?',
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(pc.yellow('Aborted.'));
        return;
      }
    }

    // 2. Gather context data
    const context = await this.initService.getInitializationContext();
    const { categories, metadata } =
      await this.registryService.discoverRegistry(DEFAULT_REGISTER);

    // 3. Prepare Choices
    const { frameworkChoices, agentChoices, defaultFramework } =
      this.initService.getPromptChoices(context, categories);

    // 4. Prompt User
    const answers = await inquirer.prompt<InitAnswers>([
      {
        type: 'list',
        name: 'framework',
        message: 'Select Framework:',
        choices: frameworkChoices,
        default: defaultFramework,
      },
      {
        type: 'checkbox',
        name: 'agents',
        message: 'Select AI Agents you use:',
        choices: agentChoices,
      },
      {
        type: 'input',
        name: 'registry',
        message: 'Skills Registry URL:',
        default: DEFAULT_REGISTER,
      },
    ]);

    // 4b. MCP consent step
    this.printMcpValueProp();
    const mcpDecision = await inquirer.prompt<{
      mcpEnabled: boolean;
      mcpScope: 'project' | 'user' | 'snippets-only';
    }>([
      {
        type: 'confirm',
        name: 'mcpEnabled',
        message: 'Enable MCP server integration?',
        default: true,
      },
      {
        type: 'list',
        name: 'mcpScope',
        message: 'Where should sync write MCP configs?',
        when: (a) => a.mcpEnabled === true,
        choices: [
          {
            name: 'project (recommended)  — only files inside this project (.mcp.json, .cursor/mcp.json, etc.)',
            value: 'project',
          },
          {
            name: 'user                    — also $HOME files (~/.cursor/mcp.json, ~/.gemini/settings.json) — sync prompts each',
            value: 'user',
          },
          {
            name: 'snippets-only           — never edits any runtime config; just generates ./mcp-config-snippets/*.json',
            value: 'snippets-only',
          },
        ],
        default: 'project',
      },
    ]);
    answers.mcpEnabled = mcpDecision.mcpEnabled;
    answers.mcpScope = mcpDecision.mcpEnabled
      ? mcpDecision.mcpScope
      : 'disabled';

    // 5. Build and Save
    await this.initService.buildAndSaveConfig(answers, metadata);

    console.log(pc.green('\n✅ Initialized .skillsrc with your preferences!'));
    console.log(pc.gray(`   Selected framework: ${answers.framework}`));
    if (answers.mcpEnabled) {
      console.log(
        pc.gray(`   MCP integration: enabled (scope: ${answers.mcpScope})`),
      );
    } else {
      console.log(
        pc.gray(
          `   MCP integration: disabled (change later via \`ags mcp enable\`)`,
        ),
      );
    }
    console.log(
      pc.cyan(
        '\nNext step: Run `agent-skills-standard sync` to install skills and wire MCP.',
      ),
    );
  }

  private printMcpValueProp(): void {
    console.log(pc.bold('\n🔌 MCP server setup\n'));
    console.log(
      'agent-skills-standard ships an optional MCP server that serves your skills',
    );
    console.log('to AI agents at runtime. Quick comparison:\n');
    console.log(pc.bold('  WITHOUT MCP') + ' (skills as static files only)');
    console.log(pc.green('    ✓') + ' Zero setup overhead');
    console.log(
      pc.red('    ✗') +
        ' Sub-agents (Claude Code tdd-implementer, architecture-guard, etc.)',
    );
    console.log(
      '      do NOT inherit AGENTS.md — they often skip skill loading entirely',
    );
    console.log(
      pc.red('    ✗') + ' No audit trail of which skills were consulted',
    );
    console.log(
      pc.red('    ✗') +
        ' False findings in code review (agent uses pre-training defaults)\n',
    );
    console.log(pc.bold('  WITH MCP') + ' (runtime tool calls)');
    console.log(
      pc.green('    ✓') +
        ' Sub-agents in EVERY runtime can call load_skills_for_files',
    );
    console.log(
      pc.green('    ✓') +
        " Returns matched SKILL.md as a tool response — can't be silently skipped",
    );
    console.log(
      pc.green('    ✓') +
        ' audit_session_compliance gives you a receipt of what was loaded',
    );
    console.log(
      pc.gray('    -') + ' Adds one more process to your AI runtime config\n',
    );
  }
}
