import { execFileSync } from 'child_process';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import {
  getGitLogs,
  getSmartChangelog,
  updateChangelog,
} from './release-utils';

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const PACKAGE_JSON_PATH = path.join(SERVER_DIR, 'package.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

const isDryRun = process.argv.includes('--dry-run');
const noEdit = process.argv.includes('--no-edit');

async function main() {
  console.log(pc.bold(pc.blue('\n🚀 Agent Skills Server - Release Manager\n')));

  if (isDryRun) {
    console.log(pc.magenta('🔍 DRY RUN MODE ENABLED'));
  }

  const pkg = await fs.readJson(PACKAGE_JSON_PATH);
  const currentVersion = pkg.version;
  const tagPrefix = 'server-v';

  console.log(pc.gray(`\nCurrent Server version: ${currentVersion}`));

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
        const logs = getGitLogs(prevTag, 'server/');
        if (logs) {
          defaultNotes = getSmartChangelog(logs);
        } else {
          defaultNotes = '### Initial Server Release';
        }
      } catch {
        defaultNotes = '### Server Update';
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
      }
    }
  }

  // Preview
  console.log(pc.bold(pc.yellow('\n👀 Release Plan:')));
  console.log(`   Version: ${currentVersion} -> ${pc.green(finalVersion)}`);
  console.log(`   Tag: ${pc.cyan(tagName)}`);

  if (isDryRun) {
    console.log(pc.magenta('\n✨ Dry run complete.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Execute server release for ${pc.green(tagName)}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(pc.yellow('Cancelled.'));
    return;
  }

  // Execute
  try {
    // 1. Update package.json
    pkg.version = finalVersion;
    await fs.writeJson(PACKAGE_JSON_PATH, pkg, { spaces: 2 });

    // 2. Update Changelog
    if (notes) {
      await updateChangelog(CHANGELOG_PATH, tagName, 'Feedback Server', notes);
    }

    // 3. Git operations
    const gitRun = (args: string[]) =>
      execFileSync('git', args, { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log(pc.gray('\n📦 Preparing git commit...'));
    gitRun(['add', '.']);

    // Check if there's anything to commit
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });

    if (status.trim().length > 0) {
      gitRun(['commit', '-m', `chore(release): ${tagName}`]);
    } else {
      console.log(pc.yellow('  (No changes to commit)'));
    }

    // Check if tag already exists
    try {
      execFileSync('git', ['rev-parse', tagName], { stdio: 'ignore' });
      console.log(pc.yellow(`\n⚠️  Tag ${tagName} already exists locally.`));
      const { overwriteTag } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwriteTag',
          message: 'Force recreate tag?',
          default: false,
        },
      ]);
      if (overwriteTag) {
        gitRun(['tag', '-f', tagName]);
      } else {
        console.log(pc.yellow('Using existing tag.'));
      }
    } catch {
      gitRun(['tag', tagName]);
    }

    console.log(pc.cyan('\n⚠️  Pushing to remote...'));
    gitRun(['push']);
    gitRun(['push', 'origin', tagName]);

    console.log(
      pc.bold(pc.magenta(`\n🎉 Server Release ${tagName} triggered!`)),
    );
    console.log(
      pc.gray('The GitHub Action will now handle the Render.com deployment.\n'),
    );
  } catch (error) {
    console.error(pc.red(`\n❌ Release operation failed:`));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
