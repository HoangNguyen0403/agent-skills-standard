import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const archive = path.resolve(process.argv[2]);
const receipt = path.resolve(process.argv[3]);
const snapshotKind = process.argv[4] ?? 'PRE_REPLACEMENT_SOURCE_SNAPSHOT_NOT_RED_EVIDENCE';
for (const target of [archive, receipt]) {
  try {
    await fs.lstat(target);
    throw new Error(`Refusing existing snapshot artifact: ${target}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const inputs = ['package.json', 'tsconfig.json', 'cli/package.json', 'cli/src', 'scripts/generation', 'scripts/generate-indices.ts', 'scripts/calculate-tokens.ts', 'scripts/generate-capabilities-doc.ts'];
const handle = await fs.open(archive, 'wx');
try {
  const result = spawnSync('tar', ['-cf', '/dev/fd/3', ...inputs], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', handle.fd], encoding: 'utf8', timeout: 30000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Snapshot archive failed: ${result.stderr}`);
} finally {
  await handle.close();
}
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
await fs.chmod(archive, 0o444);
const record = { schemaVersion: 1, kind: snapshotKind, baseCommit: '52ac482a5b948d9d26df4c3a2617afec74d1cf54', snapshotIncludesDirtyFoundationRepairs: true, inputs, archive: path.relative(root, archive), sha256: hash.digest('hex'), bytes: (await fs.stat(archive)).size, dependencyTreesExcluded: true, limits: ['Read-only mode is cooperative protection, not hostile-writer containment.', 'No historical failing-before claim; behavioral replay against these frozen bytes is a separate operation.', 'No root producer/generation/adoption/publication or ownership-ledger mutation.'] };
await fs.writeFile(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
await fs.chmod(receipt, 0o444);
console.log(JSON.stringify(record, null, 2));
