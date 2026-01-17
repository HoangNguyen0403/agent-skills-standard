import { execSync } from 'child_process';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import {
  getGitLogs,
  getSmartChangelog,
  updateCLIVersion,
  updateChangelog,
} from './release-utils';

const ROOT_DIR = path.resolve(__dirname, '../..');
const CLI_DIR = path.join(ROOT_DIR, 'cli');
const PACKAGE_JSON_PATH = path.join(CLI_DIR, 'package.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

const isDryRun = process.argv.includes('--dry-run');
const noEdit = process.argv.includes('--no-edit');

async function main() {
  console.log(pc.bold(pc.blue('\n🚀 Agent Skills CLI - Release Manager\n')));

  if (isDryRun) {
    console.log(pc.magenta('🔍 DRY RUN MODE ENABLED'));
  }

  const pkg = await fs.readJson(PACKAGE_JSON_PATH);
  const currentVersion = pkg.version;
  const tagPrefix = 'cli-v';

  console.log(pc.gray(`\nCurrent CLI version: ${currentVersion}`));

  const [major, minor, patch] = currentVersion.split('.').map(Number);

  const choices = [
    {
      name: `Patch (${major}.${minor}.${patch + 1})`,
      value: `${major}.${minor}.${patch + 1}`,
    },
    {
      name: `Minor (${major}.${minor + 1}.0)`,
      value: `${major}.${minor + 1}.0`,
    },
    { name: `Major (${major + 1}.0.0)`, value: `${major + 1}.0.0` },
    { name: 'Custom Input', value: 'custom' },
  ];

  const { nextVersion } = await inquirer.prompt([
    {
      type: 'list',
      name: 'nextVersion',
      message: 'Select release type:',
      choices,
    },
  ]);

  let finalVersion = nextVersion;
  if (nextVersion === 'custom') {
    const { customVer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customVer',
        message: 'Enter version (X.Y.Z):',
        default: currentVersion,
        validate: (input) => {
          if (!/^\d+\.\d+\.\d+$/.test(input)) return 'Format must be X.Y.Z';
          return true;
        },
      },
    ]);
    finalVersion = customVer;
  }

  if (finalVersion === currentVersion) {
    const { proceedSame } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceedSame',
        message: pc.yellow(
          `Version ${finalVersion} is the same as current. Continue anyway?`,
        ),
        default: false,
      },
    ]);
    if (!proceedSame) {
      console.log(pc.yellow('Cancelled.'));
      return;
    }
  }

  const tagName = `${tagPrefix}${finalVersion}`;

  // Changelog Update Logic
  let notes = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    const { shouldUpdateChangelog } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldUpdateChangelog',
        message: 'Update CHANGELOG.md?',
        default: true,
      },
    ]);

    if (shouldUpdateChangelog) {
      let defaultNotes = '### Added\n- ';
      try {
        const prevTag = `${tagPrefix}${currentVersion}`;
        const logs = getGitLogs(prevTag, 'cli/');
        if (logs) {
          defaultNotes = getSmartChangelog(logs);
        } else {
          defaultNotes = '### Initial Release';
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(pc.red(`❌ Failed to auto-generate logs: ${msg}`));
      }

      notes = defaultNotes;

      if (!noEdit) {
        const response = await inquirer.prompt([
          {
            type: 'editor',
            name: 'notes',
            message:
              'Enter release notes (markdown supported, close editor to save):',
            default: defaultNotes,
          },
        ]);
        notes = response.notes;
      } else {
        console.log(
          pc.gray('   (Using auto-generated notes due to --no-edit)'),
        );
      }
    }
  }

  // DRY RUN / PLAN PREVIEW
  console.log(pc.bold(pc.yellow('\n👀 Dry Run / Release Plan:')));

  console.log(pc.bold('1. Update Versions:'));
  console.log(pc.dim(`   - cli/package.json`));
  console.log(pc.dim(`   - cli/src/index.ts`));
  console.log(`   Version: ${currentVersion} -> ${pc.green(finalVersion)}`);

  console.log(pc.bold('\n2. Update Changelog:'));
  if (notes) {
    console.log(pc.dim(`   File: ${CHANGELOG_PATH}`));
    console.log(pc.dim('   --- Preview ---'));
    console.log(
      pc.cyan(`   ## [${tagName}] - ${new Date().toISOString().split('T')[0]}`),
    );
    console.log(pc.cyan(`   **Category**: CLI Tool\n`));
    console.log(
      pc.cyan(
        notes
          .split('\n')
          .map((l) => '   ' + l)
          .join('\n'),
      ),
    );
  } else {
    console.log(pc.dim('   (Skipped)'));
  }

  console.log(pc.bold('\n3. Git Operations:'));
  const commands = [
    `git add .`,
    `git commit -m "chore(release): ${tagName}"`,
    `git tag ${tagName}`,
    `git push && git push origin ${tagName}`,
  ];

  commands.forEach((cmd) => console.log(pc.dim(`   $ ${cmd}`)));
  console.log('');

  if (isDryRun) {
    console.log(pc.magenta('\n✨ Dry run complete. No changes were made.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Execute CLI release for ${pc.green(tagName)}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(pc.yellow('Cancelled.'));
    return;
  }

  // Execute
  try {
    await updateCLIVersion(ROOT_DIR, finalVersion);

    if (notes) {
      await updateChangelog(CHANGELOG_PATH, tagName, 'CLI Tool', notes);
    }

    console.log(pc.gray('Executing git operations...'));

    const cmdRun = (cmd: string) =>
      execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });

    cmdRun(`git add .`);

    // Check if there's anything to commit
    const status = execSync('git status --porcelain', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });

    if (status.trim().length > 0) {
      cmdRun(`git commit -m "chore(release): ${tagName}"`);
    } else {
      console.log(pc.yellow('  (No changes to commit)'));
    }

    // Check if tag exists
    try {
      execSync(`git rev-parse ${tagName}`, { stdio: 'ignore', cwd: ROOT_DIR });
      console.log(pc.yellow(`  (Tag ${tagName} already exists, skipping tag)`));
    } catch {
      cmdRun(`git tag ${tagName}`);
    }

    console.log(pc.cyan('\n⚠️  Pushing to remote...'));
    cmdRun(`git push && git push origin ${tagName}`);

    console.log(pc.bold(pc.magenta(`\n🎉 CLI Release ${tagName} is live!`)));
  } catch (error) {
    console.error(pc.red(`\n❌ Release operation failed:`));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
