import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkCodexMcp,
  checkGhSkill,
  checkOpencodeAgents,
  checkSkillsInstaller,
  computeExitCode,
  defaultExec,
  renderResults,
  type CheckResult,
} from './checks';

async function main() {
  const repoRoot = path.resolve(__dirname, '../..');
  const isWrite = process.argv.includes('--write');

  let commit = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : '';
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      commit = 'unknown';
    }
  }

  const date = new Date().toISOString().split('T')[0];
  const meta = { date, commit };

  const results: CheckResult[] = [
    await checkSkillsInstaller(repoRoot, defaultExec),
    await checkGhSkill(repoRoot, defaultExec),
    await checkCodexMcp(repoRoot, defaultExec),
    await checkOpencodeAgents(repoRoot, defaultExec),
  ];

  const table = renderResults(results, meta);
  console.log('\n' + table + '\n');

  if (isWrite) {
    const docPath = path.join(repoRoot, 'docs', 'round-trip-results.md');
    const content = [
      '# Round-Trip CLI Smoke Test Results',
      '',
      table,
      '',
      '## How to reproduce',
      '',
      '```bash',
      'pnpm harness:smoke',
      '```',
      '',
    ].join('\n');

    fs.writeFileSync(docPath, content, 'utf8');
    console.log(`Wrote results to ${path.relative(repoRoot, docPath)}`);
  }

  const exitCode = computeExitCode(results);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
