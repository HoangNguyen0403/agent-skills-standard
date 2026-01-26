#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { FeedbackCommand } from './commands/feedback';
import { InitCommand } from './commands/init';
import { ListSkillsCommand } from './commands/list-skills';
import { SyncCommand } from './commands/sync';
import { ValidateCommand } from './commands/validate-skills';

// Load .env from current directory (standard)
dotenv.config();

// Also try to load from the CLI directory itself (for development)
const cliEnv = path.join(__dirname, '../.env');
if (fs.existsSync(cliEnv)) {
  dotenv.config({ path: cliEnv });
}

// And finally from the project root if we can find it
let currentDir = process.cwd();
while (currentDir !== path.parse(currentDir).root) {
  if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
    dotenv.config({ path: path.join(currentDir, '.env') });
    break;
  }
  currentDir = path.dirname(currentDir);
}

const program = new Command();

program
  .name('agent-skills-standard')
  .description(
    'A CLI to manage and sync AI agent skills for Cursor, Claude, Copilot, Windsurf, and more.',
  )
  .version('1.5.0');

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
  .option('--model <model>', 'The AI agent model (e.g., Claude 3.5 Sonnet)')
  .option('--context <context>', 'Additional context (e.g. framework version)')
  .option('--suggestion <suggestion>', 'Suggested improvement')
  .action(async (options: Record<string, string>) => {
    const cmd = new FeedbackCommand();
    await cmd.run(options);
  });

program.parse();
