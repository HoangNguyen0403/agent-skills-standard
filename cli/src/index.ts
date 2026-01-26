#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { FeedbackCommand } from './commands/feedback';
import { InitCommand } from './commands/init';
import { ListSkillsCommand } from './commands/list-skills';
import { SyncCommand } from './commands/sync';
import { ValidateCommand } from './commands/validate-skills';

// Load .env from current directory (for development and other env vars)
dotenv.config();

const program = new Command();

program
  .name('agent-skills-standard')
  .description(
    'A CLI to manage and sync AI agent skills for Cursor, Claude, Copilot, Windsurf, and more.',
  )
  .version('1.5.1');

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
  .action(async () => {
    const sync = new SyncCommand();
    await sync.run();
  });

program
  .command('list-skills')
  .description('List available framework skills and detection status')
  .action(async () => {
    const cmd = new ListSkillsCommand();
    await cmd.run();
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
  .action(async (options: Record<string, string>) => {
    const cmd = new FeedbackCommand();
    await cmd.run(options);
  });

program.parse();
