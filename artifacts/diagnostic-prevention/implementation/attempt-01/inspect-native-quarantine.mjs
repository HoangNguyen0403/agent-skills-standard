import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = '/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention';
if (await fs.realpath(process.cwd()) !== root) throw new Error('Wrong physical cwd');
const a = path.join(root, 'artifacts/diagnostic-prevention/implementation/attempt-01');
const source = '.agents/skills/common/common-subagent-driven-development/references/.ags-tmp-Ati9K9';
const container = 'artifacts/diagnostic-prevention/implementation/attempt-01/root-interrupted-temp-quarantine-01';
const target = `${container}/.ags-tmp-Ati9K9`;
const [phase, outputArg] = process.argv.slice(2);
if (!['pre', 'container', 'post'].includes(phase)) throw new Error('Invalid phase');
const output = path.resolve(outputArg);
if (!output.startsWith(a + path.sep)) throw new Error('Evidence outside A');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function statOrNull(file) { try { return await fs.lstat(file); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; } }
async function ancestors(relative) { const parts = relative.split('/'); const result = []; for (let i = 1; i < parts.length; i++) { const relativeParent = parts.slice(0, i).join('/'); const stat = await fs.lstat(path.join(root, relativeParent)); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe ancestor:${relativeParent}`); result.push({ path: relativeParent, dev: stat.dev, ino: stat.ino, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid }); } return result; }
async function info(relative, directory) { await ancestors(relative); const file = path.join(root, relative); const stat = await fs.lstat(file); if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) throw new Error(`Unsafe leaf:${relative}`); const acl = execFileSync('/bin/ls', ['-ldne', file], { encoding: 'utf8' }); const names = execFileSync('/usr/bin/xattr', [file], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort(); return { dev: stat.dev, ino: stat.ino, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, nlink: stat.nlink, hasACL: /^\s*\d+:/m.test(acl), xattrs: Object.fromEntries(names.map(name => [name, hash(execFileSync('/usr/bin/xattr', ['-px', name, file]))])), ...(directory ? { children: (await fs.readdir(file)).sort() } : { sha256: hash(await fs.readFile(file)) }) }; }
const sourceParents = await ancestors(source);
const containerParents = await ancestors(container);
const src = await statOrNull(path.join(root, source));
const box = await statOrNull(path.join(root, container));
const failures = [];
const check = (condition, name) => { if (!condition) failures.push(name); };
const equal = (actual, expected, name) => check(JSON.stringify(actual) === JSON.stringify(expected), name);
let directory, payload, containerInfo;
if (phase === 'post') {
  check(src === null, 'source absent');
  directory = await info(target, true); payload = await info(`${target}/payload`, false);
} else {
  check(!!src, 'source present'); directory = await info(source, true); payload = await info(`${source}/payload`, false);
}
check(directory.dev === 16777231 && directory.ino === 345126518 && directory.mode === 0o700 && directory.uid === 502 && directory.gid === 20, 'pinned directory identity');
check(payload.dev === 16777231 && payload.ino === 345126519 && payload.mode === 0o644 && payload.uid === 502 && payload.gid === 20 && payload.nlink === 1 && payload.sha256 === '0e1bad24d9b189a6007aa9905aea9f3ed327d4d98d180594ffd0be219c430a22', 'pinned payload identity/digest');
equal(directory.children, ['payload'], 'sole payload');
if (phase === 'pre') check(box === null, 'container absent');
else {
  containerInfo = await info(container, true);
  check(containerInfo.dev === directory.dev && containerInfo.mode === 0o700 && containerInfo.uid === 502 && containerInfo.gid === 20 && !containerInfo.hasACL, 'private same-device container');
  equal(containerInfo.children, phase === 'post' ? ['.ags-tmp-Ati9K9'] : [], 'container contents');
  const pre = JSON.parse(await fs.readFile(path.join(a, 'native-quarantine-pre-01.json')));
  equal(directory, pre.directory, 'directory metadata preserved'); equal(payload, pre.payload, 'payload metadata preserved');
  equal(sourceParents, pre.sourceParents, 'source ancestors preserved'); equal(containerParents, pre.containerParents, 'container ancestors preserved');
  if (phase === 'container') check((await statOrNull(path.join(root, target))) === null, 'exact child absent including symlink');
  if (phase === 'post') {
    const acquired = JSON.parse(await fs.readFile(path.join(a, 'native-quarantine-container-01.json')));
    const { children: ignored, nlink: currentLinks, ...identity } = containerInfo;
    const { children: oldIgnored, nlink: priorLinks, ...priorIdentity } = acquired.containerInfo;
    equal(identity, priorIdentity, 'created container identity preserved');
    check(currentLinks === priorLinks + 1, 'one moved directory adds one container link');
  }
}
const record = { kind: 'READONLY_EXACT_QUARANTINE_FACTS', phase, passed: failures.length === 0, failures, source, container, target, sourceParents, containerParents, directory, payload, containerInfo, limits: ['Read-only inspection; native move outcome determined by actual exact identities, not exit code.', 'No generic temporary cleanup or hostile-writer exclusion.'] };
await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, phase, passed: record.passed, failures, directory, payload, containerInfo }, null, 2));
if (failures.length) process.exitCode = 1;
