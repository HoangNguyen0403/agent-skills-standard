import { execSync } from 'child_process';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import { getGitLogs, getSmartChangelog } from './release-utils';

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
        validate: (input) =>
          /^\d+\.\d+\.\d+$/.test(input) ? true : 'Format must be X.Y.Z',
      },
    ]);
    finalVersion = customVer;
  }

  const tagName = `${tagPrefix}${finalVersion}`;

  // Changelog Update Logic
  let changelogEntry = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    const { updateChangelog } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'updateChangelog',
        message: 'Update CHANGELOG.md?',
        default: true,
      },
    ]);

    if (updateChangelog) {
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
        console.error(pc.red(`❌ Failed to update changelog: ${msg}`));
      }

      let notes = defaultNotes;

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

      if (notes && notes.trim().length > 0) {
        changelogEntry = `## [${tagName}] - ${
          new Date().toISOString().split('T')[0]
        }\n**Category**: CLI Tool\n\n${notes.trim()}\n\n`;
      }
    }
  }

  // DRY RUN / PLAN PREVIEW
  console.log(pc.bold(pc.yellow('\n👀 Dry Run / Release Plan:')));

  console.log(pc.bold('1. Update package.json:'));
  console.log(pc.dim(`   File: ${PACKAGE_JSON_PATH}`));
  console.log(`   Version: ${currentVersion} -> ${pc.green(finalVersion)}`);

  console.log(pc.bold('\n2. Update Changelog:'));
  if (changelogEntry) {
    console.log(pc.dim(`   File: ${CHANGELOG_PATH}`));
    console.log(pc.dim('   --- Entry Preview ---'));
    console.log(
      pc.cyan(
        changelogEntry
          .trim()
          .split('\n')
          .map((l) => '   ' + l)
          .join('\n'),
      ),
    );
  } else {
    console.log(pc.dim('   (Skipped)'));
  }

  console.log(pc.bold('\n3. Git Operations:'));
  const relPkg = path.relative(ROOT_DIR, PACKAGE_JSON_PATH);
  const relChange = path.relative(ROOT_DIR, CHANGELOG_PATH);

  const commands = [
    `git add ${relPkg}`,
    changelogEntry ? `git add ${relChange}` : '',
    `git commit -m "chore(release): ${tagName}"`,
    `git tag ${tagName}`,
    `git push && git push origin ${tagName}`,
  ].filter(Boolean);

  commands.forEach((cmd) => console.log(pc.dim(`   $ ${cmd}`)));
  console.log('');

  if (isDryRun) {
    console.log(pc.magenta('\n✨ Dry run complete. No changes were made.'));
    console.log(pc.bold('\n📋 Manual Command (Copy & Paste):'));
    console.log(pc.cyan(`cd ${ROOT_DIR} && \\`));
    console.log(pc.cyan(commands.join(' && \\\n')));
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
  pkg.version = finalVersion;
  await fs.writeJson(PACKAGE_JSON_PATH, pkg, { spaces: 2 });
  console.log(pc.green(`\n✅ Updated package.json`));

  if (changelogEntry) {
    try {
      const currentChangelog = await fs.readFile(CHANGELOG_PATH, 'utf-8');
      const splitIndex = currentChangelog.indexOf('## [');
      if (splitIndex !== -1) {
        const newContent =
          currentChangelog.slice(0, splitIndex) +
          changelogEntry +
          currentChangelog.slice(splitIndex);
        await fs.writeFile(CHANGELOG_PATH, newContent);
        console.log(pc.green(`✅ Updated CHANGELOG.md`));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(pc.red(`❌ Failed to update changelog: ${msg}`));
    }
  }

  try {
    console.log(pc.gray('Executing git operations...'));

    const cmdRun = (cmd: string) =>
      execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });

    cmdRun(`git add ${relPkg}`);
    if (changelogEntry) cmdRun(`git add ${relChange}`);

    cmdRun(`git commit -m "chore(release): ${tagName}"`);
    cmdRun(`git tag ${tagName}`);

    console.log(pc.cyan('\n⚠️  Pushing to remote...'));
    cmdRun(`git push && git push origin ${tagName}`);

    console.log(pc.bold(pc.magenta(`\n🎉 CLI Release ${tagName} is live!`)));
  } catch (error) {
    console.error(pc.red(`\n❌ Git operation failed:`));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
