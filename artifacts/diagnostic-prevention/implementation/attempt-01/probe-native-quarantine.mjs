import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const output = path.resolve(process.argv[2]);
const evidence = path.resolve('artifacts/diagnostic-prevention/implementation/attempt-01');
if (!output.startsWith(evidence + path.sep)) throw new Error('Evidence outside authorized artifact directory');
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-native-quarantine-probe-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const attrs = file => Object.fromEntries(execFileSync('/usr/bin/xattr', [file], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort().map(name => [name, hash(execFileSync('/usr/bin/xattr', ['-px', name, file]))]));
async function identity(file) { const stat = await fs.lstat(file); return { device: stat.dev, inode: stat.ino, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, xattrs: attrs(file) }; }
try {
  const source = path.join(fixture, '.ags-tmp-fixture');
  const container = path.join(fixture, 'quarantine');
  const moved = path.join(container, '.ags-tmp-fixture');
  await fs.mkdir(source, { mode: 0o700 });
  await fs.copyFile(path.resolve('.agents/skills/common/common-context-optimization/references/implementation.md'), path.join(source, 'payload'));
  const beforeDir = await identity(source);
  const beforePayload = await identity(path.join(source, 'payload'));
  const beforeHash = hash(await fs.readFile(path.join(source, 'payload')));
  await fs.mkdir(container, { mode: 0o700 });
  const beforeContainer = await identity(container);
  if (beforeDir.device !== beforeContainer.device) throw new Error('Fixture crosses devices');
  execFileSync('/bin/mv', ['-n', source, moved]);
  const afterDir = await identity(moved);
  const afterPayload = await identity(path.join(moved, 'payload'));
  const afterContainer = await identity(container);
  let sourceAbsent = false;
  try { await fs.lstat(source); } catch (error) { if (error.code !== 'ENOENT') throw error; sourceAbsent = true; }
  const collisionSource = path.join(fixture, 'collision');
  await fs.mkdir(collisionSource, { mode: 0o700 });
  await fs.writeFile(path.join(collisionSource, 'sentinel'), 'foreign\n');
  const collisionDest = path.join(container, 'collision');
  await fs.writeFile(collisionDest, 'preserve\n');
  execFileSync('/bin/mv', ['-n', collisionSource, collisionDest]);
  const record = {
    kind: 'ISOLATED_NATIVE_QUARANTINE_NOT_ROOT_AUTHORITY',
    command: '/bin/mv -n <exact-source-directory> <exact-absent-child-of-private-container>',
    directoryIdentityPreserved: JSON.stringify(beforeDir) === JSON.stringify(afterDir),
    payloadIdentityPreserved: JSON.stringify(beforePayload) === JSON.stringify(afterPayload),
    payloadHashPreserved: beforeHash === hash(await fs.readFile(path.join(moved, 'payload'))),
    containerIdentityPreserved: JSON.stringify(beforeContainer) === JSON.stringify(afterContainer),
    sourceAbsent, soleChild: (await fs.readdir(moved)).join(',') === 'payload',
    collisionDestinationPreserved: (await fs.readFile(collisionDest, 'utf8')) === 'preserve\n',
    collisionSourceRetained: (await fs.readFile(path.join(collisionSource, 'sentinel'), 'utf8')) === 'foreign\n',
    limits: ['Isolated fixture; no actual interrupted temporary directory or recovery target moved.', 'mv -n may exit zero on a skip; actual absence and exact inode checks, not exit status alone, define success.'],
  };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(record, null, 2));
} finally { await fs.rm(fixture, { recursive: true, force: true }); }
