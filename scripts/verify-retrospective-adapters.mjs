#!/usr/bin/env node
// Verify retrospective adapters against their declared SDK versions, using pinned tarballs fetched
// by `npm pack` and a scratch fixture. No dependency install into the repo, no lockfile change.
//   node scripts/verify-retrospective-adapters.mjs
// Requires mcp/dist/retrospective.{js,d.ts} (build first).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MCP = path.join(REPO, 'mcp');
const CORE_TYPES = path.join(MCP, 'dist/retrospective.d.ts');
const CORE_RUNTIME = path.join(MCP, 'dist/retrospective.js');
const ADAPTERS = [
  { name: 'omp', dir: 'integrations/session-retrospective/omp', packs: ['@oh-my-pi/pi-coding-agent'] },
  {
    name: 'paseo',
    dir: 'integrations/session-retrospective/paseo',
    packs: ['@getpaseo/client', '@getpaseo/plugin', '@getpaseo/protocol', 'react', 'react-native', '@types/react'],
  },
];
const REUSED_TOOLS = ['typescript', 'vitest', 'zod', '@types/node'];
const KEEP = process.env.AGS_ADAPTER_FIXTURE_KEEP === '1';
const LIMITS = [
  'npm pack resolves the declared range to the current max satisfying release; resolved versions are recorded',
  'repo-installed typescript/vitest/zod/@types/node are reused via symlinks (not the adapter-declared tool versions)',
  'scratch extraction is not installation: host plugin loading, native UI, and platform behavior remain unproved',
  'network access is required for npm pack; Windows execution of this script is not exercised',
];
const must = (ok, message) => { if (!ok) throw new Error(message); };
const exists = (target) => fs.stat(target).then((stat) => stat.isFile() || stat.isDirectory(), () => false);
function run(command, args, cwd, timeout = 900_000) {
  const result = spawnSync(command, args, { cwd, shell: false, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  must(!result.error, `${command} ${args.join(' ')}: ${result.error?.code ?? result.error?.message}`);
  const stdout = result.stdout ?? '';
  const tail = `${stdout}\n${result.stderr ?? ''}`.trim().split('\n').slice(-12);
  return { status: result.status, signal: result.signal, stdout, tail };
}
function summarize(status, code, extra) {
  console.log(JSON.stringify({ status, exitCode: code, scope: 'current retrospective adapters (omp, paseo) + declared SDK versions', repo: REPO, linkedCore: MCP, linkedCoreRuntime: CORE_RUNTIME, installActions: false, lockfileChange: false, limitations: LIMITS, ...extra }, null, 2));
  process.exitCode = code;
}
async function resolveTool(name) {
  for (const base of [path.join(REPO, 'node_modules'), path.join(MCP, 'node_modules')]) {
    const target = path.join(base, name);
    if (await exists(target)) return target;
  }
  throw new Error(`missing repo-installed tool dependency: ${name}`);
}
function declaredSpec(manifest, name) {
  const spec = manifest.peerDependencies?.[name] ?? manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
  must(typeof spec === 'string', `adapter does not declare ${name}`);
  return spec;
}
async function npmPack(spec, packsDir) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = run(npm, ['pack', '--ignore-scripts', '--pack-destination', packsDir, spec], packsDir);
  must(result.status === 0, `npm pack ${spec} failed (${result.status}): ${result.tail.join(' | ')}`);
  const tarball = result.stdout.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.tgz')).pop();
  must(tarball, `npm pack ${spec} printed no tarball`);
  return path.join(packsDir, tarball);
}
async function extract(tarball, destination) {
  const listing = run('tar', ['-tzf', tarball], path.dirname(tarball));
  const listed = listing.stdout.split('\n').filter(Boolean);
  must(listing.status === 0, `tar listing failed for ${path.basename(tarball)} (${listing.status})`);
  // npm tarballs normally root at package/, but @types/* use their own folder (e.g. react/).
  // Require exactly one shared top-level folder and no absolute or parent-relative entries.
  const root = listed[0]?.split('/')[0];
  must(listed.length > 0 && root && listed.every((entry) => entry.startsWith(`${root}/`) && !entry.split('/').includes('..') && !path.isAbsolute(entry)), `unexpected archive paths in ${path.basename(tarball)}`);
  must(listed.includes(`${root}/package.json`), `archive ${path.basename(tarball)} lacks ${root}/package.json`);
  await fs.mkdir(destination, { recursive: true });
  const extractResult = run('tar', ['-xzf', tarball, '-C', destination, '--strip-components=1'], path.dirname(tarball));
  must(extractResult.status === 0, `tar extraction failed for ${path.basename(tarball)} (${extractResult.status})`);
  const manifest = JSON.parse(await fs.readFile(path.join(destination, 'package.json'), 'utf8'));
  return { name: manifest.name, version: manifest.version };
}
async function verifyAdapter(adapter, scratchBase, tools) {
  const manifest = JSON.parse(await fs.readFile(path.join(REPO, adapter.dir, 'package.json'), 'utf8'));
  const base = path.join(scratchBase, adapter.name);
  const packsDir = path.join(base, 'packs');
  const fixture = path.join(base, 'fixture');
  const nodeModules = path.join(fixture, 'node_modules');
  await fs.mkdir(packsDir, { recursive: true });
  const packs = [];
  for (const name of adapter.packs) {
    const spec = declaredSpec(manifest, name);
    const tarball = await npmPack(`${name}@${spec}`, packsDir);
    const target = path.join(nodeModules, name);
    const resolved = await extract(tarball, target);
    must(resolved.name === name, `packed ${name} resolved to ${resolved.name}`);
    packs.push({ name, spec: `${name}@${spec}`, tarball: path.basename(tarball), resolved: resolved.version, target });
  }
  await fs.cp(path.join(REPO, adapter.dir), fixture, { recursive: true, filter: (source) => !source.includes(`${path.sep}node_modules`) });
  await fs.symlink(MCP, path.join(nodeModules, 'agent-skills-standard-mcp'));
  const reused = {};
  for (const [name, target] of Object.entries(tools)) {
    await fs.mkdir(path.dirname(path.join(nodeModules, name)), { recursive: true });
    await fs.symlink(target, path.join(nodeModules, name));
    reused[name] = target;
  }
  await fs.writeFile(path.join(fixture, 'tsconfig.verify.json'), JSON.stringify({
    extends: './tsconfig.json',
    compilerOptions: { paths: { 'agent-skills-standard-mcp/retrospective': [CORE_TYPES] } },
  }, null, 2));
  const typecheck = run(process.execPath, [path.join(tools.typescript, 'bin/tsc'), '--noEmit', '-p', 'tsconfig.verify.json'], fixture);
  const results = [{ name: 'typecheck', status: typecheck.status, signal: typecheck.signal, tail: typecheck.tail }];
  if (typecheck.status === 0) {
    const vitest = run(process.execPath, [path.join(tools.vitest, 'vitest.mjs'), 'run', '--root', fixture], fixture);
    results.push({ name: 'vitest', status: vitest.status, signal: vitest.signal, tail: vitest.tail });
  } else results.push({ name: 'vitest', status: null, tail: ['skipped: typecheck failed'] });
  const ok = results.every((entry) => entry.status === 0);
  return { adapter: adapter.name, status: ok ? 'PASS' : 'FAIL', packs, reusedTools: reused, commands: results };
}

let tools;
try {
  for (const target of [CORE_TYPES, CORE_RUNTIME]) must(await exists(target), `mcp build missing ${path.relative(REPO, target)}; run: pnpm --filter agent-skills-standard-mcp build`);
  tools = Object.fromEntries(await Promise.all(REUSED_TOOLS.map(async (name) => [name, await resolveTool(name)])));
  const npmCheck = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], REPO, 60_000);
  must(npmCheck.status === 0, 'npm is unavailable');
} catch (error) {
  summarize('BLOCKED', 2, { error: error instanceof Error ? error.message : String(error) });
  process.exit(2);
}
const scratchBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'ags-retro-adapters-')));
const adapters = [];
try {
  for (const adapter of ADAPTERS) {
    try { adapters.push(await verifyAdapter(adapter, scratchBase, tools)); } catch (error) {
      adapters.push({ adapter: adapter.name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) });
    }
  }
  const failed = adapters.filter((entry) => entry.status !== 'PASS');
  summarize(failed.length === 0 ? 'PASS' : 'FAIL', failed.length === 0 ? 0 : 1, { adapters, fixtureRoot: scratchBase, tools });
} finally {
  if (!KEEP) {
    const [tmp, actual] = [await fs.realpath(os.tmpdir()), await fs.realpath(scratchBase)];
    if (actual.startsWith(`${tmp}${path.sep}`) && path.basename(actual).startsWith('ags-retro-adapters-')) await fs.rm(actual, { recursive: true, force: true });
    else console.error(JSON.stringify({ error: `refused to clean unexpected fixture path: ${actual}` }));
  }
}
