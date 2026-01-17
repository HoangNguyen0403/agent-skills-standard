import { execSync } from 'child_process';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import { getGitLogs, getSmartChangelog } from './release-utils';

const ROOT_DIR = path.resolve(__dirname, '../..');
const METADATA_PATH = path.join(ROOT_DIR, 'skills/metadata.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

const isDryRun = process.argv.includes('--dry-run');
const noEdit = process.argv.includes('--no-edit');

async function main() {
  console.log(
    pc.bold(pc.blue('\n🚀 Agent Skills Standard - Release Manager\n')),
  );

  if (isDryRun) {
    console.log(pc.magenta('🔍 DRY RUN MODE ENABLED'));
  }

  if (!fs.existsSync(METADATA_PATH)) {
    console.error(pc.red(`❌ Metadata file not found at ${METADATA_PATH}`));
    process.exit(1);
  }

  const metadata = await fs.readJson(METADATA_PATH);
  const categories = Object.keys(metadata.categories);

  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Which skill category would you like to release?',
      choices: categories.map((c) => ({
        name: `${c} (Current: ${
          metadata.categories[c].version || 'Unreleased'
        })`,
        value: c,
      })),
    },
  ]);

  const currentVersion = metadata.categories[category].version || '0.0.0';
  const tagPrefix = metadata.categories[category].tag_prefix || `${category}-v`;

  console.log(pc.gray(`\nCurrent version: ${currentVersion}`));
  console.log(pc.gray(`Tag prefix: ${tagPrefix}`));

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
    { name: 'Custom Input', value: 'custom' }, // Added custom option
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

  // Changelog Update
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
      // Attempt to auto-generate logs from git history
      let defaultNotes = '### Added\n- ';
      try {
        const prevTag = `${tagPrefix}${currentVersion}`;
        const logs = getGitLogs(prevTag, `skills/${category}`);
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
        }\n**Category**: ${category}\n\n${notes.trim()}\n\n`;
      }
    }
  }

  // DRY RUN / PLAN PREVIEW
  console.log(pc.bold(pc.yellow('\n👀 Dry Run / Release Plan:')));

  console.log(pc.bold('1. Update Metadata:'));
  console.log(pc.dim(`   File: ${METADATA_PATH}`));
  console.log(`   ${category}: ${currentVersion} -> ${pc.green(finalVersion)}`);

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
    console.log(pc.dim('   ---------------------'));
  } else {
    console.log(pc.dim('   (Skipped)'));
  }

  console.log(pc.bold('\n3. Git Operations:'));

  // Use relative paths for display cleanly
  const relMeta = path.relative(ROOT_DIR, METADATA_PATH);
  const relChange = path.relative(ROOT_DIR, CHANGELOG_PATH);

  const commands = [
    `git add ${relMeta}`,
    changelogEntry ? `git add ${relChange}` : '',
    `git commit -m "chore(release): ${tagName}"`,
    `git tag ${tagName}`,
    `git push && git push origin ${tagName}`,
  ].filter(Boolean);

  commands.forEach((cmd) => console.log(pc.dim(`   $ ${cmd}`)));
  console.log(''); // spacer

  if (isDryRun) {
    console.log(pc.magenta('\n✨ Dry run complete. No changes were made.'));

    console.log(pc.bold('\n📋 Manual Command (Copy & Paste):'));
    console.log(pc.cyan(`cd ${ROOT_DIR} && \\`));
    console.log(pc.cyan(commands.join(' && \\\n')));

    console.log(
      pc.gray(
        '\nRun without --dry-run to have this script execute them for you.',
      ),
    );
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Everything looks good? Execute release for ${pc.green(
        tagName,
      )}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(pc.yellow('Cancelled.'));
    return;
  }

  // Update Metadata
  metadata.categories[category].version = finalVersion;
  metadata.categories[category].last_updated = new Date()
    .toISOString()
    .split('T')[0];
  metadata.categories[category].tag_prefix = tagPrefix; // Ensure prefix is saved

  await fs.writeJson(METADATA_PATH, metadata, { spaces: 2 });
  console.log(pc.green(`\n✅ Updated metadata.json`));

  // Update Changelog
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
        execSync(`git add ${CHANGELOG_PATH}`, { cwd: ROOT_DIR });
      } else {
        console.warn(
          pc.yellow(
            `⚠️  Could not find insertion point in CHANGELOG.md (looking for '## [')`,
          ),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(pc.red(`❌ Failed to update changelog: ${msg}`));
    }
  }

  // Git Operations
  try {
    console.log(pc.gray('Executing git operations...'));

    execSync(`git add ${METADATA_PATH}`, { cwd: ROOT_DIR });
    execSync(`git commit -m "chore(release): ${tagName}"`, { cwd: ROOT_DIR });
    console.log(pc.green('✅ Committed metadata change'));

    execSync(`git tag ${tagName}`, { cwd: ROOT_DIR });
    console.log(pc.green(`✅ Created tag ${tagName}`));

    console.log(pc.cyan('\n⚠️  Pushing to remote...'));
    execSync(`git push && git push origin ${tagName}`, { cwd: ROOT_DIR });
    console.log(pc.green(`✅ Pushed changes and tag!`));

    console.log(pc.bold(pc.magenta(`\n🎉 Release ${tagName} is live!`)));
    console.log(pc.gray('The GitHub Action workflow should trigger shortly.'));
  } catch (error) {
    console.error(pc.red(`\n❌ Git operation failed:`));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
