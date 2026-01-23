#!/usr/bin/env node
import { Command } from 'commander';
import { InitCommand } from './commands/init';
import { ListSkillsCommand } from './commands/list-skills';
import { SyncCommand } from './commands/sync';
import { ValidateCommand } from './commands/validate-skills';

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

program.parse();
