import { execFileSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

export function getSmartChangelog(logs: string): string {
  const lines = logs.split('\n').filter(Boolean);
  const groups: Record<string, string[]> = {
    '### Added': [],
    '### Fixed': [],
    '### Improved': [],
    '### Maintenance': [],
    '### Other Changes': [],
  };

  for (const line of lines) {
    const cleanLine = line.replace(/^- /, '').trim();
    const lower = cleanLine.toLowerCase();

    if (lower.startsWith('feat') || lower.startsWith('new')) {
      groups['### Added'].push(cleanLine);
    } else if (lower.startsWith('fix') || lower.startsWith('bug')) {
      groups['### Fixed'].push(cleanLine);
    } else if (
      lower.startsWith('perf') ||
      lower.startsWith('refactor') ||
      lower.startsWith('improve') ||
      lower.startsWith('style')
    ) {
      groups['### Improved'].push(cleanLine);
    } else if (
      lower.startsWith('chore') ||
      lower.startsWith('ci') ||
      lower.startsWith('build') ||
      lower.startsWith('docs') ||
      lower.startsWith('test')
    ) {
      groups['### Maintenance'].push(cleanLine);
    } else {
      groups['### Other Changes'].push(cleanLine);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(
      ([title, items]) => `${title}\n${items.map((i) => `- ${i}`).join('\n')}`,
    )
    .join('\n\n');
}

export function getGitLogs(prevTag: string, filterPath: string): string {
  try {
    execFileSync('git', ['rev-parse', prevTag], { stdio: 'ignore' });
    return execFileSync(
      'git',
      ['log', `${prevTag}..HEAD`, '--pretty=format:- %s', '--', filterPath],
      { encoding: 'utf-8' },
    ).trim();
  } catch {
    return '';
  }
}

export async function updateChangelog(
  changelogPath: string,
  tagName: string,
  category: string,
  notes: string,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  let date = today;
  try {
    // Ensure the changelog date is not later than the latest commit date.
    const latestCommitDate = execFileSync(
      'git',
      ['log', '-1', '--format=%cs'],
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
      .trim()
      .split('T')[0];
    // Both dates are in ISO format (YYYY-MM-DD), so string comparison is safe.
    if (latestCommitDate && latestCommitDate < date) {
      date = latestCommitDate;
    }
  } catch {
    // If Git is unavailable or the command fails, fall back to today's date.
  }

  const changelogEntry = `## [${tagName}] - ${date}\n\n**Category**: ${category}\n\n${notes.trim()}\n\n`;

  try {
    const currentChangelog = await fs.readFile(changelogPath, 'utf-8');
    const splitIndex = currentChangelog.indexOf('## [');

    if (splitIndex !== -1) {
      const newContent =
        currentChangelog.slice(0, splitIndex) +
        changelogEntry +
        currentChangelog.slice(splitIndex);
      await fs.writeFile(changelogPath, newContent);
      console.log(pc.green(`✅ Updated CHANGELOG.md`));
    } else {
      // If no entries yet, append after header
      const headerEnd = currentChangelog.indexOf('---\n\n');
      const insertAt =
        headerEnd !== -1 ? headerEnd + 5 : currentChangelog.length;
      const newContent =
        currentChangelog.slice(0, insertAt) +
        changelogEntry +
        currentChangelog.slice(insertAt);
      await fs.writeFile(changelogPath, newContent);
      console.log(pc.green(`✅ Initialized CHANGELOG.md with first entry`));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to update changelog: ${msg}`);
  }
}

export async function updateCLIVersion(
  rootDir: string,
  version: string,
): Promise<void> {
  const pkgPath = path.join(rootDir, 'cli/package.json');
  const indexPath = path.join(rootDir, 'cli/src/index.ts');

  // 1. Update package.json
  if (fs.existsSync(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    pkg.version = version;
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    console.log(pc.green(`✅ Updated cli/package.json to ${version}`));
  }

  // 2. Update cli/src/index.ts version
  if (fs.existsSync(indexPath)) {
    const content = await fs.readFile(indexPath, 'utf-8');
    const updatedContent = content.replace(
      /\.version\(['"][0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?['"]\)/,
      `.version('${version}')`,
    );
    await fs.writeFile(indexPath, updatedContent);
    console.log(pc.green(`✅ Updated cli/src/index.ts version to ${version}`));
  }
}

export async function updateSkillVersion(
  rootDir: string,
  category: string,
  version: string,
): Promise<void> {
  const metadataPath = path.join(rootDir, 'skills/metadata.json');

  if (fs.existsSync(metadataPath)) {
    const metadata = await fs.readJson(metadataPath);
    if (metadata.categories[category]) {
      metadata.categories[category].version = version;
      metadata.categories[category].last_updated = new Date()
        .toISOString()
        .split('T')[0];
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
      console.log(
        pc.green(`✅ Updated skills/metadata.json (${category}) to ${version}`),
      );
    } else {
      console.warn(
        pc.yellow(`⚠️  Category ${category} not found in metadata.json`),
      );
    }
  }
}
