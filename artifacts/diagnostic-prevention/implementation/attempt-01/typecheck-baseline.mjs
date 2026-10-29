import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const candidate = process.cwd();
const base = '52ac482a5b948d9d26df4c3a2617afec74d1cf54';
const output = path.resolve(process.argv[2]);
try {
  await fs.lstat(output);
  throw new Error(`Refusing existing evidence output: ${output}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const require = createRequire(path.join(candidate, 'package.json'));
const compiler = require.resolve('typescript/bin/tsc');
const compilerVersion = require('typescript/package.json').version;
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-typecheck-base-'));
const files = ['cli/src/services/ConfigService.ts', 'cli/src/services/SyncService.ts'];
const flags = ['--ignoreConfig', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--strict', '--esModuleInterop', '--skipLibCheck', '--resolveJsonModule', '--types', 'node', '--allowImportingTsExtensions'];
let record;
try {
  const archive = path.join(temporary, 'baseline.tar');
  await execFile('git', ['archive', '--format=tar', `--output=${archive}`, base, 'cli/src', 'cli/package.json', 'package.json', 'tsconfig.json'], { cwd: candidate });
  await execFile('tar', ['-xf', archive, '-C', temporary]);
  await fs.symlink(await fs.realpath(path.join(candidate, 'node_modules')), path.join(temporary, 'node_modules'), 'dir');
  await fs.symlink(await fs.realpath(path.join(candidate, 'cli', 'node_modules')), path.join(temporary, 'cli', 'node_modules'), 'dir');
  const sourceHashes = {};
  for (const file of files) {
    sourceHashes[file] = createHash('sha256').update(await fs.readFile(path.join(temporary, file))).digest('hex');
  }
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    const result = await execFile(process.execPath, [compiler, ...flags, ...files], { cwd: temporary, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    exitCode = error.code;
    stdout = error.stdout ?? '';
    stderr = error.stderr ?? '';
  }
  record = { schemaVersion: 1, purpose: 'Attribute imported CLI semantic diagnostics against pinned source, not qualify generator behavior', baseCommit: base, nodeVersion: process.version, compilerVersion, flags, files, sourceHashes, exitCode, stdout, stderr, limits: ['Uses existing candidate dependency trees; not a lock-qualified dependency installation.', 'Baseline diagnostics do not authorize suppressing new generator diagnostics.', 'No producer, root generation, adoption, publication or baseline runtime execution.'] };
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
record.temporarySnapshotRemoved = true;
await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
