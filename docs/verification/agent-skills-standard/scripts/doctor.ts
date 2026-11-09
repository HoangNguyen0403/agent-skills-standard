/**
 * Project-owned read-only verification doctor for agent-skills-standard.
 *
 * Readiness oracle for the repository verification kit. A listening port, an
 * existing directory, or a non-empty output is never readiness. This doctor
 * binds the identity of everything the journeys actually consume:
 *
 *   - runtime: Node executable/version and the resolved TypeScript loader bytes;
 *   - build:   package manifests plus the resolved versions of every dependency
 *              the journeys load (no compiled artifacts exist for this kit);
 *   - source:  canonical PRD/SRS digests (a criteria change invalidates proof)
 *              and the exact digest of every declared consumed product input;
 *   - recipe:  the journey recipes actually read by the runner;
 *   - harness: this doctor and the runner that executes the actions;
 *   - state:   git HEAD plus the scoped dirty set for the consumed basis.
 *
 * It performs read-only inspection only and never mutates repository state.
 *
 * Run: node --import tsx docs/verification/agent-skills-standard/scripts/doctor.ts [--repo-root <dir>]
 * Exit: 0 healthy, 1 unhealthy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

export const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const MINIMUM_NODE_MAJOR = 22;

export interface DoctorCheck {
  id: string;
  name: string;
  expected: string;
  actual: string;
  ok: boolean;
}

export interface FileIdentity {
  path: string;
  exists: boolean;
  sha256: string | null;
  bytes: number | null;
}

export interface DependencyIdentity {
  name: string;
  declared_from: string;
  declared_range: string | null;
  resolved_path: string | null;
  resolved_version: string | null;
  ok: boolean;
  reason?: string;
}

export interface DoctorReport {
  kind: 'kit.doctor';
  schema_version: 1;
  timestamp: string;
  repo_root: string;
  healthy: boolean;
  source_revision: string;
  declared_source_revision: string | null;
  dirty_identity: {
    declared: string | null;
    consumed_digests: FileIdentity[];
    scoped_git_status: string[];
    scoped_status_ok: boolean;
  };
  runtime: {
    node_version: string;
    exec_path: string;
    loader_path: string;
    loader_sha256: string | null;
    loader_version: string | null;
    build_mode: string;
  };
  dependency_identity: DependencyIdentity[];
  canonical_input_identity: FileIdentity[];
  consumed_input_identity: FileIdentity[];
  recipe_identity: FileIdentity[];
  harness_identity: FileIdentity[];
  diagnostics: string[];
  checks: DoctorCheck[];
}

export const KIT_REL = 'docs/verification/agent-skills-standard';
export const EVIDENCE_REL = 'artifacts/verification/agent-skills-standard';

/** Dependencies the journeys actually resolve, with the manifest that declares them. */
export const DECLARED_DEPENDENCIES: Array<{ name: string; from: string }> = [
  { name: 'tsx', from: 'package.json' },
  { name: 'fs-extra', from: 'package.json' },
  { name: 'picocolors', from: 'package.json' },
  { name: 'js-yaml', from: 'package.json' },
  { name: 'commander', from: 'cli/package.json' },
  { name: 'cross-fetch', from: 'cli/package.json' },
  { name: 'dotenv', from: 'cli/package.json' },
  { name: 'zod', from: 'cli/package.json' },
];

export function kitDir(repoRoot: string): string {
  return path.join(repoRoot, KIT_REL);
}

export function evidenceDir(repoRoot: string): string {
  return path.join(repoRoot, EVIDENCE_REL);
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function sha256File(absPath: string): string | null {
  try {
    return sha256Buffer(fs.readFileSync(absPath));
  } catch {
    return null;
  }
}

export function fileIdentity(repoRoot: string, relPath: string): FileIdentity {
  const absPath = path.join(repoRoot, relPath);
  try {
    const buffer = fs.readFileSync(absPath);
    return { path: relPath, exists: true, sha256: sha256Buffer(buffer), bytes: buffer.byteLength };
  } catch {
    return { path: relPath, exists: false, sha256: null, bytes: null };
  }
}

function readJson(repoRoot: string, relPath: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8')), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function findPackageJson(startFile: string, packageName: string): string | null {
  let current = path.dirname(startFile);
  for (let depth = 0; depth < 12; depth += 1) {
    const candidate = path.join(current, 'package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as {
        name?: unknown;
        version?: unknown;
      };
      if (pkg.name === packageName && typeof pkg.version === 'string') return candidate;
    } catch {
      // Continue upward; dependency entrypoints may be nested below package metadata.
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function dependencyIdentity(repoRoot: string, entry: { name: string; from: string }): DependencyIdentity {
  const manifestPath = path.join(repoRoot, entry.from);
  const base: DependencyIdentity = {
    name: entry.name,
    declared_from: entry.from,
    declared_range: null,
    resolved_path: null,
    resolved_version: null,
    ok: false
  };
  if (!fs.existsSync(manifestPath)) {
    return { ...base, reason: `${entry.from} is absent` };
  }
  let declaredRange: string | null = null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    declaredRange =
      manifest.devDependencies?.[entry.name] ?? manifest.dependencies?.[entry.name] ?? null;
  } catch (error) {
    return { ...base, reason: `${entry.from} is not readable JSON: ${String(error)}` };
  }
  try {
    const requireFrom = createRequire(manifestPath);
    const resolved = requireFrom.resolve(entry.name);
    const pkgPath = findPackageJson(resolved, entry.name);
    if (!pkgPath) {
      return { ...base, declared_range: declaredRange, reason: `resolved ${resolved} has no versioned ${entry.name} package.json` };
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
    return {
      ...base,
      declared_range: declaredRange,
      resolved_path: path.relative(repoRoot, pkgPath),
      resolved_version: pkg.version ?? null,
      ok: true
    };
  } catch (error) {
    return {
      ...base,
      declared_range: declaredRange,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

export interface JourneyRecipe {
  journey: string;
  surface: string;
  entry?: string;
  recipe_path: string;
  consumed_recipe_inputs: string[];
  consumed_product_inputs: string[];
  identity: FileIdentity;
}

interface KitManifest {
  schema_version: number;
  source_revision: string;
  dirty_identity: string;
  canonical_inputs: Array<{ path: string; sha256: string }>;
  journeys: Array<{ id: string; recipe: string }>;
  evidence_dir: string;
  evidence_name_prefix: string;
}

/** Loads kit.json plus every declared recipe and validates their shape. */
export function loadKit(repoRoot: string): {
  manifest: KitManifest | null;
  recipes: JourneyRecipe[];
  diagnostics: string[];
} {
  const diagnostics: string[] = [];
  const manifestRel = path.posix.join(KIT_REL, 'kit.json');
  const { value, error } = readJson(repoRoot, manifestRel);
  if (error || typeof value !== 'object' || value === null) {
    diagnostics.push(`kit manifest unreadable at ${manifestRel}: ${error ?? 'not an object'}`);
    return { manifest: null, recipes: [], diagnostics };
  }
  const manifest = value as KitManifest;
  if (manifest.schema_version !== 1) diagnostics.push(`kit manifest schema_version must be 1`);
  if (!Array.isArray(manifest.journeys) || manifest.journeys.length !== 3) {
    diagnostics.push(`kit manifest must declare exactly 3 journeys`);
  }

  const recipes: JourneyRecipe[] = [];
  for (const journey of Array.isArray(manifest.journeys) ? manifest.journeys : []) {
    const recipeRel = path.posix.join(KIT_REL, journey.recipe);
    const parsed = readJson(repoRoot, recipeRel);
    if (parsed.error || typeof parsed.value !== 'object' || parsed.value === null) {
      diagnostics.push(`recipe unreadable for ${journey.id} at ${recipeRel}: ${parsed.error ?? 'not an object'}`);
      continue;
    }
    const recipe = parsed.value as Partial<JourneyRecipe> & { scenarios?: unknown };
    if (recipe.journey !== journey.id) {
      diagnostics.push(`recipe ${recipeRel} declares journey ${String(recipe.journey)}, manifest says ${journey.id}`);
    }
    if (!Array.isArray(recipe.consumed_product_inputs) || recipe.consumed_product_inputs.length === 0) {
      diagnostics.push(`recipe ${recipeRel} declares no consumed_product_inputs`);
      continue;
    }
    if (!Array.isArray(recipe.consumed_recipe_inputs) || recipe.consumed_recipe_inputs.length === 0) {
      diagnostics.push(`recipe ${recipeRel} declares no consumed_recipe_inputs`);
      continue;
    }
    recipes.push({
      journey: journey.id,
      surface: String(recipe.surface ?? 'unknown'),
      entry: recipe.entry,
      recipe_path: recipeRel,
      consumed_recipe_inputs: recipe.consumed_recipe_inputs.map((p) =>
        path.posix.join(KIT_REL, p),
      ),
      consumed_product_inputs: recipe.consumed_product_inputs,
      identity: fileIdentity(repoRoot, recipeRel)
    });
  }
  return { manifest, recipes, diagnostics };
}

function git(repoRoot: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const res = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return {
    status: res.status ?? -1,
    stdout: (res.stdout ?? '').trim(),
    stderr: (res.stderr ?? '').trim()
  };
}

/**
 * Runs every readiness check. Never writes. The returned report carries the
 * full identity payload used by the runner, so evidence is source-bound even
 * when a check fails.
 */
export function runDoctor(repoRoot: string = DEFAULT_REPO_ROOT): DoctorReport {
  const checks: DoctorCheck[] = [];
  const diagnostics: string[] = [];
  const add = (id: string, name: string, expected: string, actual: string, ok: boolean): void => {
    checks.push({ id, name, expected, actual, ok });
  };

  const kit = loadKit(repoRoot);
  diagnostics.push(...kit.diagnostics);
  add(
    'CHK-KIT-MANIFEST',
    'Kit manifest and journey recipes',
    'kit.json with 3 readable recipes',
    kit.manifest ? `${kit.recipes.length} recipes loaded` : 'manifest unreadable',
    kit.manifest !== null && kit.recipes.length === 3
  );

  // Runtime identity.
  const nodeMajor = Number.parseInt(process.version.replace(/^v/, '').split('.')[0] ?? '0', 10);
  add(
    'CHK-NODE-RUNTIME',
    `Node.js >= ${MINIMUM_NODE_MAJOR}.0.0`,
    `>= ${MINIMUM_NODE_MAJOR}.0.0`,
    `${process.version} (${process.execPath})`,
    nodeMajor >= MINIMUM_NODE_MAJOR
  );

  const tsxDependency = dependencyIdentity(repoRoot, { name: 'tsx', from: 'package.json' });
  const loaderPath = tsxDependency.resolved_path
    ? path.join(repoRoot, path.dirname(tsxDependency.resolved_path), 'dist', 'loader.mjs')
    : null;
  const loaderSha = loaderPath ? sha256File(loaderPath) : null;
  add(
    'CHK-TS-LOADER',
    'TypeScript loader bytes resolve',
    'node_modules/tsx/dist/loader.mjs present',
    loaderPath && loaderSha
      ? `${path.relative(repoRoot, loaderPath)} sha256=${loaderSha}`
      : 'loader unresolved',
    Boolean(loaderPath && loaderSha)
  );

  // Build identity: declared manifests must agree on the product version.
  const manifestVersions: Record<string, string> = {};
  for (const rel of ['package.json', 'cli/package.json', 'mcp/package.json']) {
    const parsed = readJson(repoRoot, rel);
    const value = parsed.value;
    const version =
      value !== null && typeof value === 'object' && 'version' in value && typeof value.version === 'string'
        ? value.version
        : 'unreadable';
    manifestVersions[rel] = version;
  }
  const productVersionAgrees =
    manifestVersions['package.json'] !== 'unreadable' &&
    manifestVersions['package.json'] === manifestVersions['cli/package.json'];
  add(
    'CHK-BUILD-MANIFESTS',
    'Root and CLI package manifests agree',
    'package.json version === cli/package.json version',
    JSON.stringify(manifestVersions),
    productVersionAgrees
  );

  const dependencyIdentityList = DECLARED_DEPENDENCIES.map((entry) =>
    dependencyIdentity(repoRoot, entry),
  );
  const unresolvedDependencies = dependencyIdentityList.filter((d) => !d.ok);
  add(
    'CHK-DEPENDENCY-IDENTITY',
    'Declared dependency resolution',
    'every declared dependency resolves to a versioned package.json',
    unresolvedDependencies.length === 0
      ? dependencyIdentityList.map((d) => `${d.name}@${d.resolved_version}`).join(', ')
      : unresolvedDependencies.map((d) => `${d.name}: ${d.reason ?? 'unresolved'}`).join('; '),
    unresolvedDependencies.length === 0
  );

  // Canonical criteria identity: a criteria change invalidates every proof.
  const canonicalIdentity: FileIdentity[] = [];
  const canonicalMismatches: string[] = [];
  for (const expected of kit.manifest?.canonical_inputs ?? []) {
    const identity = fileIdentity(repoRoot, expected.path);
    canonicalIdentity.push(identity);
    if (identity.sha256 !== expected.sha256) {
      canonicalMismatches.push(
        `${expected.path}: expected ${expected.sha256} actual ${identity.sha256 ?? 'missing'}`,
      );
    }
  }
  add(
    'CHK-CANONICAL-INPUTS',
    'Canonical PRD/SRS digests unchanged',
    `${(kit.manifest?.canonical_inputs ?? []).length} canonical digests`,
    canonicalMismatches.length === 0
      ? canonicalIdentity.map((i) => `${i.path}=${i.sha256}`).join(', ')
      : canonicalMismatches.join('; '),
    kit.manifest !== null && (kit.manifest.canonical_inputs ?? []).length > 0 && canonicalMismatches.length === 0
  );

  // Consumed product inputs and recipe inputs must exist and hash.
  const consumedPaths = new Set<string>();
  const recipePaths = new Set<string>();
  for (const recipe of kit.recipes) {
    for (const input of recipe.consumed_product_inputs) consumedPaths.add(input);
    for (const input of recipe.consumed_recipe_inputs) recipePaths.add(input);
    recipePaths.add(recipe.recipe_path);
  }
  const consumedIdentity = [...consumedPaths].sort().map((rel) => fileIdentity(repoRoot, rel));
  const recipeIdentity = [...recipePaths].sort().map((rel) => fileIdentity(repoRoot, rel));
  const missingConsumed = consumedIdentity.filter((i) => !i.exists);
  add(
    'CHK-CONSUMED-INPUTS',
    'Declared consumed product inputs exist',
    `${consumedIdentity.length} declared inputs present`,
    missingConsumed.length === 0
      ? `${consumedIdentity.length} inputs hashed`
      : `missing: ${missingConsumed.map((i) => i.path).join(', ')}`,
    consumedIdentity.length > 0 && missingConsumed.length === 0
  );
  const missingRecipes = recipeIdentity.filter((i) => !i.exists);
  add(
    'CHK-RECIPE-INPUTS',
    'Declared recipe inputs exist',
    `${recipeIdentity.length} recipe files present`,
    missingRecipes.length === 0
      ? `${recipeIdentity.length} recipe inputs hashed`
      : `missing: ${missingRecipes.map((i) => i.path).join(', ')}`,
    recipeIdentity.length > 0 && missingRecipes.length === 0
  );

  // Journey entrypoints are executable surfaces, not directories.
  const missingEntries: string[] = [];
  for (const recipe of kit.recipes) {
    if (!recipe.entry) continue;
    if (!fs.existsSync(path.join(repoRoot, recipe.entry))) missingEntries.push(recipe.entry);
  }
  add(
    'CHK-JOURNEY-ENTRYPOINTS',
    'Journey CLI entrypoints exist',
    `${kit.recipes.filter((r) => r.entry).length} entry files present`,
    missingEntries.length === 0 ? 'all entry files present' : `missing: ${missingEntries.join(', ')}`,
    missingEntries.length === 0
  );

  // Harness identity: the scripts that execute the proof.
  const harnessIdentity = [
    path.posix.join(KIT_REL, 'scripts/doctor.ts'),
    path.posix.join(KIT_REL, 'scripts/run-verification.ts')
  ].map((rel) => fileIdentity(repoRoot, rel));
  const missingHarness = harnessIdentity.filter((i) => !i.exists);
  add(
    'CHK-HARNESS-IDENTITY',
    'Harness scripts present and hashed',
    'doctor.ts and run-verification.ts present',
    missingHarness.length === 0
      ? harnessIdentity.map((i) => `${i.path}=${i.sha256}`).join(', ')
      : `missing: ${missingHarness.map((i) => i.path).join(', ')}`,
    missingHarness.length === 0
  );

  // State identity: source revision plus the scoped dirty set of the consumed basis.
  const head = git(repoRoot, ['rev-parse', 'HEAD']);
  const scoped = git(repoRoot, [
    'status',
    '--porcelain',
    '--',
    ...[...consumedPaths, ...recipePaths, ...harnessIdentity.map((i) => i.path)].sort()
  ]);
  add(
    'CHK-SOURCE-REVISION',
    'Git HEAD resolves for source identity',
    'git rev-parse HEAD succeeds',
    head.status === 0 ? head.stdout : head.stderr || 'git unavailable',
    head.status === 0 && head.stdout.length > 0
  );
  add(
    'CHK-SCOPED-DIRTY-STATUS',
    'Scoped consumed-basis git status',
    'scoped git status succeeds (dirty entries are identity, not a gate)',
    scoped.status === 0 ? `${scoped.stdout === '' ? 'clean' : `${scoped.stdout.split('\n').length} entries`}` : scoped.stderr,
    scoped.status === 0
  );

  const declaredRevision = kit.manifest?.source_revision ?? null;
  if (declaredRevision && head.status === 0 && declaredRevision !== head.stdout) {
    diagnostics.push(
      `declared source revision ${declaredRevision} differs from git HEAD ${head.stdout}; record it as identity, not as product regression`,
    );
  }

  const healthy = checks.every((c) => c.ok);
  return {
    kind: 'kit.doctor',
    schema_version: 1,
    timestamp: new Date().toISOString(),
    repo_root: repoRoot,
    healthy,
    source_revision: head.status === 0 ? head.stdout : 'unavailable',
    declared_source_revision: declaredRevision,
    dirty_identity: {
      declared: kit.manifest?.dirty_identity ?? null,
      consumed_digests: consumedIdentity,
      scoped_git_status: scoped.status === 0 && scoped.stdout !== '' ? scoped.stdout.split('\n') : [],
      scoped_status_ok: scoped.status === 0
    },
    runtime: {
      node_version: process.version,
      exec_path: process.execPath,
      loader_path: loaderPath ? path.relative(repoRoot, loaderPath) : '',
      loader_sha256: loaderSha,
      loader_version: tsxDependency.resolved_version,
      build_mode: 'typescript-source-via-loader (no compiled artifacts)'
    },
    dependency_identity: dependencyIdentityList,
    canonical_input_identity: canonicalIdentity,
    consumed_input_identity: consumedIdentity,
    recipe_identity: recipeIdentity,
    harness_identity: harnessIdentity,
    diagnostics,
    checks
  };
}

export function reportFailureLines(report: DoctorReport): string[] {
  return report.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.actual}`);
}

function parseRepoRoot(argv: string[]): string {
  const index = argv.indexOf('--repo-root');
  if (index === -1) return DEFAULT_REPO_ROOT;
  const value = argv[index + 1];
  if (!value) throw new Error('--repo-root requires a value');
  return path.resolve(value);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try {
    const report = runDoctor(parseRepoRoot(process.argv.slice(2)));
    console.log(JSON.stringify(report, null, 2));
    if (!report.healthy) {
      console.error(`doctor: unhealthy — ${reportFailureLines(report).join(' | ')}`);
    }
    process.exit(report.healthy ? 0 : 1);
  } catch (error) {
    console.error(`doctor: fatal — ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
