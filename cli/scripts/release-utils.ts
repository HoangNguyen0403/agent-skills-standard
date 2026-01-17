import { execSync } from 'child_process';

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
    execSync(`git rev-parse "${prevTag}"`, { stdio: 'ignore' });
    return execSync(
      `git log "${prevTag}"..HEAD --pretty=format:"- %s" -- ${filterPath}`,
      { encoding: 'utf-8' },
    ).trim();
  } catch {
    return '';
  }
}
