import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const base = path.join(root, 'artifacts/diagnostic-prevention/implementation/attempt-01');
const hash = value => createHash('sha256').update(value).digest('hex');
const entries = [];
async function visit(relative) {
  const absolute = path.join(root, relative);
  let stat;
  try { stat = await fs.lstat(absolute); } catch (error) { if (error.code !== 'ENOENT') throw error; entries.push({ path: relative, kind: 'absent' }); return; }
  const entry = { path: relative, mode: stat.mode & 0o777, kind: stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : stat.isSymbolicLink() ? 'symlink' : 'unsupported' };
  if (entry.kind === 'unsupported') throw new Error(`Unsupported preservation path ${relative}`);
  if (stat.isFile()) entry.sha256 = hash(await fs.readFile(absolute));
  if (stat.isSymbolicLink()) entry.target = await fs.readlink(absolute);
  entries.push(entry);
  if (stat.isDirectory()) for (const child of (await fs.readdir(absolute)).sort()) await visit(path.join(relative, child));
}
for (const prefix of ['.agent', '.agents/sdd']) await visit(prefix);
if (process.argv[2] === 'capture') {
  const archive = path.join(base, 'root-sdd-before-01.tar'); const handle = await fs.open(archive, 'wx');
  try { const inputs = ['.agent', '.agents/sdd'].filter(prefix => entries.some(entry => entry.path === prefix && entry.kind !== 'absent')); const result = spawnSync('tar', ['-cf', '/dev/fd/3', ...inputs], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', handle.fd], timeout: 30000 }); if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr.toString()); } finally { await handle.close(); }
  await fs.chmod(archive, 0o444); const record = { schemaVersion: 1, archive: path.relative(root, archive), archiveSha256: hash(await fs.readFile(archive)), entries }; await fs.writeFile(path.join(base, 'root-sdd-before-01.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ archived: record.archive, sha256: record.archiveSha256, entries: entries.length }));
} else if (process.argv[2] === 'verify') {
  const before = JSON.parse(await fs.readFile(path.join(base, 'root-sdd-before-01.json'), 'utf8')); const unchanged = JSON.stringify(before.entries) === JSON.stringify(entries); const archiveIntact = before.archiveSha256 === hash(await fs.readFile(path.join(root, before.archive))); const record = { unchanged, archiveIntact, entries: entries.length }; await fs.writeFile(process.argv[3], JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(record)); if (!unchanged || !archiveIntact) process.exitCode = 1;
} else throw new Error('Expected capture or verify');
