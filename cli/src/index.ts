#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { FeedbackCommand } from './commands/feedback';
import { HooksCommand } from './commands/hooks';
import { InitCommand } from './commands/init';
import { ListSkillsCommand } from './commands/list-skills';
import { McpCommand } from './commands/mcp';
import { SyncCommand } from './commands/sync';
import { UpgradeCommand } from './commands/upgrade';
import { ValidateCommand } from './commands/validate-skills';

// Load .env from current directory (for development and other env vars)
dotenv.config();

const program = new Command();

program
  .name('agent-skills-standard')
  .description(
    'A CLI to manage and sync AI agent skills for Cursor, Claude, Copilot, Windsurf, and more.',
  )
  .version('2.2.4');

program
  .command('init')
  .description('Initialize a .skillsrc configuration file interactively')
  .action(async () => {
    const init = new InitCommand();
    await init.run();
  });

program
  .command('sync')
  .description('Sync skills to AI Agent skill directories')
  .option(
    '-y, --yes',
    'Automatically confirm interactive prompts (e.g. update versions)',
  )
  .option(
    '--snippets',
    'Generate JSON config snippets in ./mcp-config-snippets/; if MCP is disabled, run snippet-only mode',
  )
  .action(async (options) => {
    const sync = new SyncCommand();
    await sync.run(options);
  });

program
  .command('list-skills')
  .description('List available framework skills and detection status')
  .option('-f, --framework <framework>', 'The framework to list skills for')
  .action(async (options) => {
    const cmd = new ListSkillsCommand();
    await cmd.run(options);
  });

program
  .command('validate')
  .description('Validate skill format and token efficiency standards')
  .option('--all', 'Validate all skills instead of only changed ones')
  .action(async (options) => {
    const cmd = new ValidateCommand();
    await cmd.run(options);
  });

program
  .command('feedback')
  .description('Report skill improvement opportunities or AI agent mistakes')
  .option(
    '--skill <skill>',
    'The skill ID (e.g., flutter/bloc-state-management)',
  )
  .option('--issue <issue>', 'Brief description of the issue')
  .option('--model <model>', 'AI agent model (e.g., Claude 3.5 Sonnet)')
  .option('--context <context>', 'Additional context (e.g., framework version)')
  .option('--suggestion <suggestion>', 'Suggested improvement')
  .option(
    '--skill-instruction <instruction>',
    'Exact quote from skill that was violated (AI auto-report)',
  )
  .option(
    '--actual-action <action>',
    'What you actually did instead of following skill (AI auto-report)',
  )
  .option(
    '--decision-reason <reason>',
    'Why you chose this approach instead (AI auto-report)',
  )
  .option(
    '--loaded-skills <skills>',
    'Comma-separated list of currently loaded skills (platform-provided)',
  )
  .option(
    '--root-cause <cause>',
    'Why the violation happened: AMBIGUOUS_RULE | MISSING_COVERAGE | OUTDATED_GUIDANCE | COMPETING_RULES | PATTERN_MISMATCH',
  )
  .option('--user-intent <intent>', 'What the user was trying to achieve')
  .option(
    '--skill-gap <gap>',
    'What change to the SKILL.md would prevent this violation next time',
  )
  .action(async (options: Record<string, string>) => {
    const cmd = new FeedbackCommand();
    await cmd.run(options);
  });

program
  .command('upgrade')
  .description('Upgrade the CLI to the latest version')
  .option('--dry-run', 'Check for updates without installing')
  .action(async (options) => {
    const cmd = new UpgradeCommand();
    await cmd.run(options);
  });

program
  .command('mcp <action> [scope]')
  .description(
    'Manage the optional MCP server integration. Actions: status | enable | disable | scope <project|user|snippets-only|disabled> | install | uninstall | snippets',
  )
  .option(
    '--scope <scope>',
    'Override scope for install (project|user|snippets-only|disabled)',
  )
  .option(
    '--from <from>',
    'For uninstall: project | user | all (default: project)',
  )
  .action(
    async (
      action: string,
      positional: string | undefined,
      opts: Record<string, string>,
    ) => {
      // Allow `ags mcp scope project` (positional) AND `ags mcp scope --scope project`.
      const merged: Record<string, string> = { ...opts };
      if (positional) merged.scope = opts.scope ?? positional;
      const cmd = new McpCommand();
      await cmd.run(action, merged);
    },
  );

program
  .command('hooks <action>')
  .description(
    'Manage the PreToolUse skill-loader hook. Actions: status | install | uninstall',
  )
  .action(async (action: string) => {
    const cmd = new HooksCommand();
    await cmd.run(action);
  });

program.parse();
