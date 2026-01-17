#!/usr/bin/env node
import { Command } from 'commander';
import { InitCommand } from './commands/init';
import { SyncCommand } from './commands/sync';

const program = new Command();

program
  .name('agent-skills-standard')
  .description(
    'A CLI to manage and sync AI agent skills for Cursor, Claude, Copilot, and more.',
  )
  .version('1.0.7');

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

program.parse();
