import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const current = process.cwd();
const directory = path.join(current, 'artifacts/diagnostic-prevention/implementation/attempt-01');
const archive = path.join(directory, 'task-1-pre-replacement-source.tar');
const sealed = JSON.parse(await fs.readFile(path.join(directory, 'task-1-pre-replacement-source-receipt.json'), 'utf8'));
const pattern = process.argv[2];
const output = path.resolve(process.argv[3]);
if (!pattern) throw new Error('A targeted test-name pattern is required');
try {
  await fs.lstat(output);
  throw new Error(`Refusing existing replay receipt: ${output}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
if (hash.digest('hex') !== sealed.sha256) throw new Error('Frozen source archive digest mismatch');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-frozen-replay-'));
let record;
try {
  await execFile('tar', ['-xf', archive, '-C', temporary]);
  const rejectLinks = async (directory) => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      const stat = await fs.lstat(target);
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) throw new Error(`Unsupported frozen source entry: ${target}`);
      if (stat.isDirectory()) await rejectLinks(target);
    }
  };
  await rejectLinks(temporary);
  const runtimePath = 'scripts/generation/isolated-stage.ts';
  const runtimeSha256 = createHash('sha256').update(await fs.readFile(path.join(temporary, runtimePath))).digest('hex');
  const testPath = 'scripts/generation/isolated-stage.test.ts';
  const testBytes = await fs.readFile(path.join(current, testPath));
  const testSha256 = createHash('sha256').update(testBytes).digest('hex');
  await fs.writeFile(path.join(temporary, testPath), testBytes);
  await fs.symlink(await fs.realpath(path.join(current, 'node_modules')), path.join(temporary, 'node_modules'), 'dir');
  await fs.symlink(await fs.realpath(path.join(current, 'cli', 'node_modules')), path.join(temporary, 'cli', 'node_modules'), 'dir');
  const argv = ['--import', 'tsx', '--test', '--test-name-pattern', pattern, testPath];
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    const result = await execFile(process.execPath, argv, { cwd: temporary, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    exitCode = error.code;
    stdout = error.stdout ?? '';
    stderr = error.stderr ?? '';
  }
  record = { schemaVersion: 1, kind: 'FROZEN_RUNTIME_REPLAY_UNADJUDICATED', baseCommit: sealed.baseCommit, archiveSha256: sealed.sha256, runtimePath, runtimeSha256, testPath, testSha256, nodeVersion: process.version, argv, exitCode, stdout, stderr, limits: ['Only the new test file overlays the sealed source snapshot; no frozen production guard is changed.', 'Exit nonzero is not automatically behavioral RED; parent must distinguish wrong received values from setup/API/import/fixture failures.', 'Original historical preimplementation RED remains NOT RUN.', 'Dependency trees are reused, not reinstalled or lock-qualified; no Node20 or host-enforcement inference.', 'No actual primary-worktree generator, adoption or publication.'] };
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
record.temporarySnapshotRemoved = true;
await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
