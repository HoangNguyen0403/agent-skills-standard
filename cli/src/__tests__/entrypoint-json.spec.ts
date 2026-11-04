import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cliRoot = process.cwd();
const repoRoot = path.resolve(cliRoot, '..');
const entrypoint = path.join(cliRoot, 'src', 'index.ts');

/**
 * Resolves the workspace `tsx` runner so the real entrypoint can be spawned
 * without building. Failing resolution is a test failure, never a silent skip.
 */
function resolveTsxCli(): string {
  const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
  return requireFromRepo.resolve('tsx/cli');
}

describe('CLI entrypoint JSON output', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-entrypoint-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  const runEntrypoint = async (
    args: string[],
  ): Promise<{ code: number | null; stdout: string; stderr: string }> => {
    const tsxCli = resolveTsxCli();
    const child = spawn(process.execPath, [tsxCli, entrypoint, ...args], {
      cwd: tempDir,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: tempDir,
        USERPROFILE: tempDir,
        XDG_CACHE_HOME: path.join(tempDir, '.cache'),
        NODE_OPTIONS: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

    const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
    const closed = new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    const code = await closed.finally(() => clearTimeout(timer));

    return {
      code,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    };
  };

  it('emits exactly one JSON document on stdout even when .env is present', async () => {
    await fs.outputFile(path.join(tempDir, '.env'), 'AGS_ENTRYPOINT_PROOF=1\n');

    const result = await runEntrypoint(['sync', '--json']);

    expect(result.code).toBe(1);
    expect(result.stdout.trimEnd().split('\n')).toHaveLength(1);
    const envelope: unknown = JSON.parse(result.stdout);
    expect(envelope).toMatchObject({
      schema_version: 1,
      kind: 'sync.error',
      data: { code: 'config-invalid' },
    });
    expect(result.stdout).not.toContain('injected env');
    expect(result.stderr).not.toContain('injected env');
  });
});
