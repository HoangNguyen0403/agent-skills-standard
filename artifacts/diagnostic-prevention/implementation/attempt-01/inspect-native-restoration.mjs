import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = '/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention';
const base = '52ac482a5b948d9d26df4c3a2617afec74d1cf54';
const a = path.join(root, 'artifacts/diagnostic-prevention/implementation/attempt-01');
if (await fs.realpath(process.cwd()) !== await fs.realpath(root)) throw new Error('Wrong physical workspace');
const output = path.resolve(process.argv[2]);
if (!output.startsWith(a + path.sep)) throw new Error('Evidence must be beneath A');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const allowedGitEnvironment = { GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true', GIT_PAGER: 'cat' };
const unexpectedGitEnvironment = Object.keys(process.env).filter(key => key.startsWith('GIT_') && process.env[key] !== allowedGitEnvironment[key]);
if (unexpectedGitEnvironment.length) throw new Error(`Unreviewed Git environment keys: ${unexpectedGitEnvironment.join(',')}`);
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
const git = args => execFileSync('git', args, { cwd: root, env, maxBuffer: 16 * 1024 * 1024, timeout: 30000 });
async function pinned(relative, expected) { const bytes = await fs.readFile(path.join(a, relative)); if (hash(bytes) !== expected) throw new Error(`Pin mismatch ${relative}`); return JSON.parse(bytes); }
const audit = await pinned('root-interrupted-effect-audit-01.json', '6294f5b5c8afbd4ef680d6f2a8e94b57f14df8948cc55035dbd6afd4f780d7e5');
const targets = audit.files.filter(file => file.state === 'PUBLISHED_CANDIDATE');
if (targets.length !== 15 || audit.files.length !== 96) throw new Error('Wrong audit scope');
async function optionalStat(absolute) { try { return await fs.lstat(absolute); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function inspect(relative) {
  if (path.isAbsolute(relative) || relative.split('/').some(part => part === '..' || part === '.')) throw new Error('Unsafe relative path');
  const parts = relative.split('/');
  for (let i = 0; i < parts.length - 1; i++) { const stat = await fs.lstat(path.join(root, ...parts.slice(0, i + 1))); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe ancestor ${relative}`); }
  const absolute = path.join(root, relative); const stat = await optionalStat(absolute);
  if (!stat) return { path: relative, kind: 'absent', sha256: null };
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Nonregular leaf ${relative}`);
  return { path: relative, kind: 'file', sha256: hash(await fs.readFile(absolute)), mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, nlink: stat.nlink, device: stat.dev, inode: stat.ino };
}
const destinations = [];
for (const file of audit.files) { const live = await inspect(file.path); const state = file.path === '.skills-lock.json' ? live.kind === 'absent' ? 'LEDGER_ABSENT' : 'UNEXPECTED' : live.sha256 === file.beforeSha256 ? 'BEFORE' : live.sha256 === file.candidateSha256 ? 'CANDIDATE' : 'OTHER'; destinations.push({ ...live, state }); }
const configKeys = ['core.autocrlf', 'core.eol', 'core.safecrlf', 'core.filemode', 'core.attributesFile', 'core.hooksPath', 'core.fsmonitor', 'core.untrackedCache', 'core.sharedRepository', 'core.sparseCheckout', 'core.sparseCheckoutCone', 'extensions.worktreeConfig', 'extensions.objectFormat'];
const config = {};
const privateConfig = {};
for (const key of configKeys) {
  const result = spawnSync('git', ['config', '--show-origin', '--show-scope', '--get', key], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
  if (result.error || ![0, 1].includes(result.status)) throw result.error ?? new Error(`Config query failed ${key}`);
  if (result.status === 1) { config[key] = { configured: false }; privateConfig[key] = null; continue; }
  const raw = result.stdout.trimEnd();
  const fields = raw.split('\t');
  if (fields.length < 3 || !['system', 'global', 'local', 'worktree', 'command'].includes(fields[0])) throw new Error(`Unsupported config output ${key}`);
  const value = fields.slice(2).join('\t');
  privateConfig[key] = value;
  config[key] = { configured: true, scope: fields[0], origin: fields[1], value: /^(true|false|input|lf|crlf|native|0|1|sha1|sha256)$/.test(value) ? value : '[redacted-path-or-command]', valueSha256: hash(Buffer.from(value)) };
}
if (privateConfig['core.fsmonitor'] && privateConfig['core.fsmonitor'] !== 'false') throw new Error('Unreviewed fsmonitor configuration; no index/attribute inspection performed');
const attributeViews = {};
for (const [name, flags] of [['worktree', []], ['index', ['--cached']], ['base', [`--source=${base}`]]]) { const raw = git(['check-attr', '-z', '--all', ...flags, '--', ...targets.map(file => file.path)]); const cells = raw.toString('utf8').split('\0'); const records = []; for (let i = 0; i + 2 < cells.length; i += 3) records.push({ path: cells[i], attribute: cells[i + 1], value: cells[i + 2] }); attributeViews[name] = { sha256: hash(raw), records }; }
const index = git(['ls-files', '--stage', '-z']);
const flags = git(['ls-files', '-v', '-z']);
const indexPath = git(['rev-parse', '--path-format=absolute', '--git-path', 'index']).toString().trim();
const indexRows = index.toString('utf8').split('\0').filter(Boolean).map(row => { const tab = row.indexOf('\t'); return { header: row.slice(0, tab), path: row.slice(tab + 1) }; });
const flagRows = flags.toString('utf8').split('\0').filter(Boolean).map(row => ({ flag: row[0], path: row.slice(2) }));
const tree = git(['ls-tree', '-r', '-z', '--full-tree', base]);
const treeRows = tree.toString('utf8').split('\0').filter(Boolean).map(row => { const tab = row.indexOf('\t'); return { header: row.slice(0, tab), path: row.slice(tab + 1) }; });
const proofBytes = await fs.readFile(path.join(root, audit.attempt, 'publication-before/proof.json'));
if (hash(proofBytes) !== '7918b85b217d839827d0609f5a8f869b5ea3388185d9af159f76d1e70d82679b') throw new Error('Before proof pin mismatch');
const beforeProof = JSON.parse(proofBytes);
const beforeImages = [];
for (const item of beforeProof.records.filter(item => item.path !== '.skills-lock.json')) { const live = await inspect(`${audit.attempt}/publication-before/${item.path}`); beforeImages.push({ path: item.path, matches: live.sha256 === item.sha256 }); }
const configConditions = [];
for (const relative of ['.skillsrc', '.skillsrc.yaml']) { const live = await inspect(relative); const baseRows = treeRows.filter(row => row.path === relative); const liveIndexRows = indexRows.filter(row => row.path === relative); const rawBlobSha256 = baseRows.length === 1 ? hash(git(['cat-file', 'blob', `${base}:${relative}`])) : null; configConditions.push({ ...live, baseRows, indexRows: liveIndexRows, rawBlobSha256, worktreeMatchesBase: live.sha256 === rawBlobSha256 }); }
const parentFacts = [];
for (const relative of [...new Set(targets.map(target => path.dirname(target.path)))]) { const stat = await fs.lstat(path.join(root, relative)); const acl = execFileSync('/bin/ls', ['-ldne', path.join(root, relative)], { encoding: 'utf8' }); parentFacts.push({ path: relative, mode: (stat.mode & 0o7777).toString(8), uid: stat.uid, gid: stat.gid, device: stat.dev, inode: stat.ino, hasACL: /^\s*\d+:/m.test(acl) }); }
const targetFacts = [];
for (const target of targets) {
  const before = await fs.readFile(path.join(root, audit.attempt, 'publication-before', target.path));
  const blob = git(['cat-file', 'blob', `${base}:${target.path}`]);
  const live = destinations.find(file => file.path === target.path);
  const acl = execFileSync('/bin/ls', ['-ldne', path.join(root, target.path)], { encoding: 'utf8' });
  const xattrs = execFileSync('/usr/bin/xattr', [path.join(root, target.path)], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const xattrHashes = Object.fromEntries(xattrs.sort().map(name => [name, hash(execFileSync('/usr/bin/xattr', ['-px', name, path.join(root, target.path)]))]));
  targetFacts.push({ path: target.path, beforeMatchesArchive: hash(before) === target.beforeSha256, baseBlobSha256: hash(blob), beforeEqualsRawBase: blob.equals(before), containsCR: blob.includes(13), mode: live.mode.toString(8), uid: live.uid, gid: live.gid, nlink: live.nlink, hasACL: /^\s*\d+:/m.test(acl), xattrNames: xattrs, xattrHashes, tree: treeRows.filter(row => row.path === target.path), index: indexRows.filter(row => row.path === target.path), flags: flagRows.filter(row => row.path === target.path) });
}
const hookPath = privateConfig['core.hooksPath'];
const hooksAbsolute = hookPath ? path.resolve(root, hookPath.replace(/^~(?=\/)/, os.homedir())) : git(['rev-parse', '--path-format=absolute', '--git-path', 'hooks']).toString().trim();
const hooks = [];
if (await optionalStat(hooksAbsolute)) for (const name of await fs.readdir(hooksAbsolute)) { if (name.endsWith('.sample')) continue; const stat = await fs.lstat(path.join(hooksAbsolute, name)); if (stat.mode & 0o111) hooks.push({ name, kind: stat.isSymbolicLink() ? 'symlink' : stat.isFile() ? 'file' : 'other' }); }
const attributeInputs = new Set([git(['rev-parse', '--path-format=absolute', '--git-path', 'info/attributes']).toString().trim()]);
for (const target of targets) { const parts = target.path.split('/'); for (let i = 0; i < parts.length; i++) attributeInputs.add(path.join(root, ...parts.slice(0, i), '.gitattributes')); }
const configuredAttributes = privateConfig['core.attributesFile'];
attributeInputs.add(configuredAttributes ? path.resolve(root, configuredAttributes.replace(/^~(?=\/)/, os.homedir())) : path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'git/attributes'));
const attributeFiles = [];
for (const absolute of attributeInputs) { const stat = await optionalStat(absolute); attributeFiles.push({ path: absolute.startsWith(root + path.sep) ? path.relative(root, absolute) : '[external-path]', pathSha256: hash(Buffer.from(absolute)), exists: !!stat, kind: !stat ? 'absent' : stat.isSymbolicLink() ? 'symlink' : stat.isFile() ? 'file' : 'other', sha256: stat?.isFile() ? hash(await fs.readFile(absolute)) : null }); }
const gitBinary = execFileSync('/usr/bin/which', ['git'], { encoding: 'utf8' }).trim();
const record = {
  schemaVersion: 1, kind: 'READONLY_NATIVE_RESTORATION_FACTS_NOT_EXECUTION_CLEARANCE',
  gitVersion: git(['--version']).toString().trim(), gitBinary, gitBinarySha256: hash(await fs.readFile(gitBinary)),
  head: git(['rev-parse', 'HEAD']).toString().trim(), worktree: git(['rev-parse', '--show-toplevel']).toString().trim(),
  gitDir: git(['rev-parse', '--absolute-git-dir']).toString().trim(), indexPath,
  indexFileSha256: hash(await fs.readFile(indexPath)), indexEntriesSha256: hash(index), indexFlagsSha256: hash(flags),
  umask: process.umask().toString(8), uid: process.getuid(), gid: process.getgid(), config, configConditions,
  attributeViews, attributeFiles, hooksPath: hooksAbsolute, executableHooks: hooks,
  destinations, targets: targetFacts, parents: parentFacts, beforeImages, beforeProofSha256: hash(proofBytes),
  limits: ['Read-only inspection only; no restore, quarantine, index/config change or automatic eligibility decision.', 'System attribute-file provenance not separately resolved; effective worktree/index/BASE attribute views are observed.', 'Current facts must be rechecked immediately before any separately reviewed native command.'],
};
await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), head: record.head, targetCount: targetFacts.length, destinationCounts: Object.fromEntries([...new Set(destinations.map(file => file.state))].map(state => [state, destinations.filter(file => file.state === state).length])), attributes: Object.fromEntries(Object.entries(attributeViews).map(([key, value]) => [key, value.records.length])), executableHooks: hooks.length }));
