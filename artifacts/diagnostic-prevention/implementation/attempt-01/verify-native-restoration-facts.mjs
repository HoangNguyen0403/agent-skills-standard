import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const a = path.resolve('artifacts/diagnostic-prevention/implementation/attempt-01');
const [inputArg, countArg, outputArg] = process.argv.slice(2);
const restoredCount = Number(countArg);
if (!Number.isInteger(restoredCount) || restoredCount < 0 || restoredCount > 15) throw new Error('Expected restored count 0..15');
const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
if (![input, output].every(file => file.startsWith(a + path.sep))) throw new Error('Evidence path outside authorized artifacts');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baselineBytes = await fs.readFile(path.join(a, 'native-restoration-facts-02.json'));
if (hash(baselineBytes) !== '005f949cc3c028088768b7ae9b1bd4e78b9f506bbf73919188fd368edcfae18f') throw new Error('Baseline pin mismatch');
const baseline = JSON.parse(baselineBytes);
const currentBytes = await fs.readFile(input);
const current = JSON.parse(currentBytes);
const failures = [];
const requireTrue = (condition, name) => { if (!condition) failures.push(name); };
const equal = (actual, expected, name) => requireTrue(JSON.stringify(actual) === JSON.stringify(expected), name);
for (const key of ['head', 'worktree', 'gitDir', 'gitBinary', 'gitBinarySha256', 'gitVersion', 'indexPath', 'indexFileSha256', 'indexEntriesSha256', 'indexFlagsSha256', 'uid', 'gid', 'umask', 'config', 'configConditions', 'attributeViews', 'attributeFiles', 'hooksPath', 'executableHooks', 'parents', 'beforeProofSha256']) equal(current[key], baseline[key], key);
equal(current.beforeImages, baseline.beforeImages, 'all before-image digests');
requireTrue(current.beforeImages.length === 95 && current.beforeImages.every(item => item.matches), '95 valid before-images');
equal(current.targets.map(target => target.path), baseline.targets.map(target => target.path), 'exact15target order');
requireTrue(current.destinations.length === 96 && new Set(current.destinations.map(item => item.path)).size === 96, '96unique destinations');
const restored = new Set(baseline.targets.slice(0, restoredCount).map(item => item.path));
for (const before of baseline.destinations) {
  const now = current.destinations.find(item => item.path === before.path);
  requireTrue(!!now, `missing destination:${before.path}`);
  if (!now) continue;
  const target = baseline.targets.find(item => item.path === before.path);
  const expectedHash = restored.has(before.path) ? target.baseBlobSha256 : before.sha256;
  equal(now.sha256, expectedHash, `destination digest:${before.path}`);
  equal(now.kind, before.kind, `destination kind:${before.path}`);
  equal(now.state, restored.has(before.path) ? 'BEFORE' : before.state, `destination state:${before.path}`);
  for (const key of ['mode', 'uid', 'gid', 'nlink', 'device']) equal(now[key], before[key], `${key}:${before.path}`);
  if (!restored.has(before.path)) equal(now.inode, before.inode, `unchanged inode:${before.path}`);
}
for (const before of baseline.targets) {
  const now = current.targets.find(item => item.path === before.path);
  requireTrue(!!now, `missing target:${before.path}`);
  if (!now) continue;
  equal(now, before, `target metadata/base/index/attributes:${before.path}`);
}
const record = { kind: 'READONLY_NATIVE_RESTORATION_INVARIANTS', input: path.relative(a, input), inputSha256: hash(currentBytes), baselineSha256: hash(baselineBytes), restoredCount, passed: failures.length === 0, failures, limits: ['Compares observed receipts; does not mutate root or eliminate time-of-check/time-of-use races.', 'No restore/quarantine/generation authority is granted by a passing receipt.'] };
await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
if (failures.length) process.exitCode = 1;
