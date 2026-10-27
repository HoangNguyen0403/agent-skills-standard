#!/usr/bin/env node
/**
 * prepare-exports.mjs
 *
 * Isolated, guarded export helper for AI Test Assurance (T8).
 * Prepares a disposable staging worktree, narrows .skillsrc there, deletes stale
 * generated mirrors in staging (no-lockfile ownership trap), runs the canonical
 * generators in staging, and performs guarded individual-file copyback restricted
 * to the packaged files of two skill packages plus three configured-host workflow
 * wrappers. The canonical `.agents/workflows/<workflow>.md` is an INPUT and is
 * never a copyback target.
 *
 * Authority / Constraints (all fail-closed):
 * - Never modifies active .skillsrc; gates on its byte identity across stage/apply.
 * - Stage directory must be lexically AND physically outside the active repository
 *   (symlinked ancestors are resolved); must not itself be a symlink; must be empty
 *   when it already exists.
 * - Copies the working tree minus .git, .agent, node_modules, artifacts and
 *   .skills-lock.json. ANY symlink or special entry inside the copied tree aborts:
 *   a staged link could retarget the active checkout while generators run.
 * - Provisions exactly two dependency links afterwards (root `node_modules` and
 *   `cli/node_modules`) and asserts the staged symlink inventory is exactly that
 *   set. These links point INTO the active dependency directory on purpose. They
 *   are reused dependencies under a no-write operational rule; this helper does NOT
 *   make them read-only at the OS level and does not claim to.
 * - Pre-stage snapshot records: evidence set+hashes, canonical source set+hashes,
 *   complete destination inventory (file set+hashes plus per-root present/absent
 *   state, so absent destinations stay absent), configured agent set, .skillsrc hash.
 * - Stage records `active_before_sha256` ONLY from the pre-stage snapshot, never
 *   from post-generator active bytes.
 * - The frozen stage manifest is the copy LIST; apply re-derives the allowlist
 *   itself, rejects absolute/traversal/unpackaged/duplicate/omitted entries and
 *   wrong repo/stage/snapshot bindings, and preflights every entry before writing.
 * - Staged canonical target skill sources and the canonical workflow must remain
 *   byte-identical to the pre-stage snapshot; divergence aborts the stage.
 * - Copyback re-verifies evidence AND canonical source sets+hashes before and
 *   after writing; unchanged destinations are not rewritten.
 * - Finite, externally logged generator runs (`rtk proxy node` when available).
 * - Durable receipt at artifacts/ai-test-assurance/evidence/export-receipt.json and
 *   logs under artifacts/ai-test-assurance/evidence/logs/.
 *
 * This is a local administrative guard against path mistakes, concurrent edits and
 * stale/edited manifests. It is not a sandbox and not an attestation service.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import os from 'node:os';
import * as yaml from 'js-yaml';

// ── Allowed Packaged Files Pattern ──────────────────────────────────────────
// Inside allowed skill directories, only packaged files are eligible for copyback.
// Eval metadata, benchmarks, and test transcripts are strictly excluded.
const PACKAGED_FILE_REGEX = /^(SKILL\.md|(references|scripts|assets)\/.*|(LICENSE|NOTICE)(\.(md|txt))?)$/i;

// ── Target Skills and Workflow Configuration ────────────────────────────────
const TARGET_SKILLS = [
  { category: 'common', name: 'common-tdd' },
  { category: 'quality-engineering', name: 'quality-engineering-test-healing' },
];

const TARGET_WORKFLOW = 'test-loop';

// Configured host -> generated skill root.
const AGENT_SKILL_ROOTS = {
  claude: '.claude/skills',
  copilot: '.github/skills',
  codex: '.codex/skills',
  antigravity: '.agents/skills',
};

// Configured host -> generated workflow wrapper path. Antigravity has no wrapper:
// `.agents/workflows/<workflow>.md` is canonical source, never generated output.
const AGENT_WORKFLOW_WRAPPERS = {
  claude: (wf) => `.claude/commands/${wf}.md`,
  copilot: (wf) => `.github/prompts/${wf}.prompt.md`,
  codex: (wf) => `.codex/skills/${wf}/SKILL.md`,
  antigravity: null,
};

const CANONICAL_WORKFLOW_REL = `.agents/workflows/${TARGET_WORKFLOW}.md`;
const EVIDENCE_DIR_REL = '.agent/sdd/ai-test-assurance';
const EXCLUDED_STAGE_ROOTS = ['.git', '.agent', 'node_modules', 'artifacts', '.skills-lock.json'];

// ── Helper Utilities ────────────────────────────────────────────────────────
function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function guard(message) {
  return new Error(`[GUARD FAILURE] ${message}`);
}

/**
 * lstat that treats only ENOENT as "absent". A dangling symlink IS present.
 * ENOTDIR (non-directory ancestor) is a broken state and throws.
 */
function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw guard(`cannot lstat ${p}: ${err.code || err.message}`);
  }
}

/**
 * Rejects absolute paths, traversal, and empty segments.
 */
export function normalizeManifestPath(raw, label) {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw guard(`${label}: manifest path must be a non-empty string (got ${JSON.stringify(raw)})`);
  }
  const p = normalizePath(raw);
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p) || path.isAbsolute(p)) {
    throw guard(`${label}: absolute manifest path rejected: ${raw}`);
  }
  const parts = p.split('/');
  if (parts.some((seg) => seg === '' || seg === '.' || seg === '..')) {
    throw guard(`${label}: traversal/empty segment rejected: ${raw}`);
  }
  return parts.join('/');
}

/**
 * Validates that baseDir exists, is a real directory (not a link), and that no
 * existing path component of relPath is a symlink (live OR dangling).
 * Returns the deepest component that exists.
 */
export function assertNoSymlinkComponents(baseDir, relPath) {
  const parts = normalizePath(relPath).split('/').filter(Boolean);

  const baseStat = lstatOrNull(baseDir);
  if (!baseStat) throw guard(`base directory missing: ${baseDir}`);
  if (baseStat.isSymbolicLink()) throw guard(`base directory is a symlink: ${baseDir}`);
  if (!baseStat.isDirectory()) throw guard(`base path is not a directory: ${baseDir}`);

  let current = path.resolve(baseDir);
  for (let i = 0; i < parts.length; i++) {
    const next = path.join(current, parts[i]);
    const st = lstatOrNull(next);
    if (!st) return current; // remaining tail is absent
    if (st.isSymbolicLink()) {
      throw guard(`disallowed symlink component: ${normalizePath(path.relative(baseDir, next))} (under ${baseDir})`);
    }
    if (i < parts.length - 1 && !st.isDirectory()) {
      throw guard(`non-directory path component: ${normalizePath(path.relative(baseDir, next))}`);
    }
    current = next;
  }
  return current;
}

/**
 * Physical path for p, resolving symlinks in the nearest existing ancestor.
 * Components that do not exist yet are appended literally.
 */
export function realPathOfNearestExisting(p) {
  const abs = path.resolve(p);
  const tail = [];
  let cur = abs;
  for (;;) {
    const st = lstatOrNull(cur);
    if (st) {
      let realBase;
      try {
        realBase = fs.realpathSync(cur);
      } catch (err) {
        throw guard(`cannot resolve physical path for ${cur}: ${err.code || err.message}`);
      }
      return tail.length ? path.join(realBase, ...tail.slice().reverse()) : realBase;
    }
    const parent = path.dirname(cur);
    if (parent === cur) return abs;
    tail.push(path.basename(cur));
    cur = parent;
  }
}

function isStrictlyInside(parentReal, childReal) {
  const rel = path.relative(parentReal, childReal);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

function assertInsideOrEqual(parentReal, childReal, label) {
  if (childReal === parentReal) return;
  if (!isStrictlyInside(parentReal, childReal)) {
    throw guard(`${label} escapes ${parentReal}: ${childReal}`);
  }
}

/**
 * Validates stageDir safety (lexical + physical) and returns the resolved real path.
 * - must not equal or be inside the active repo (after symlink resolution)
 * - must not itself be a symlink
 * - if it exists, must be an empty directory
 */
export function validateStageDir(stageDir, repoRoot) {
  const absRepoLexical = path.resolve(repoRoot);
  const absStageLexical = path.resolve(stageDir);

  let realRepo;
  try {
    realRepo = fs.realpathSync(absRepoLexical);
  } catch (err) {
    throw guard(`cannot resolve active repoRoot ${absRepoLexical}: ${err.code || err.message}`);
  }

  // Lexical pre-checks (clear messages before touching the filesystem).
  if (absStageLexical === absRepoLexical) {
    throw guard(`stageDir cannot equal repoRoot: ${absStageLexical}`);
  }
  if (isStrictlyInside(absRepoLexical, absStageLexical)) {
    throw guard(`stageDir cannot be located inside repoRoot: ${absStageLexical}`);
  }

  const stageStat = lstatOrNull(absStageLexical);
  if (stageStat) {
    if (stageStat.isSymbolicLink()) {
      throw guard(`stageDir cannot be a symlink: ${absStageLexical}`);
    }
    if (!stageStat.isDirectory()) {
      throw guard(`stageDir must be a directory: ${absStageLexical}`);
    }
    const entries = fs.readdirSync(absStageLexical);
    if (entries.length > 0) {
      throw guard(`stageDir must be empty: ${absStageLexical} (contains ${entries.length} items)`);
    }
  }

  // Physical checks: a symlinked ancestor may alias an innocent-looking path
  // into the active checkout.
  const realStage = realPathOfNearestExisting(absStageLexical);
  if (realStage === realRepo) {
    throw guard(`stageDir resolves to repoRoot: ${realStage}`);
  }
  if (isStrictlyInside(realRepo, realStage)) {
    throw guard(`stageDir resolves inside repoRoot (symlinked ancestor): ${realStage}`);
  }

  return { realRepo, realStage };
}

/**
 * Strict walk: rejects symlinks and special files, returns sorted rel paths.
 */
function walkFilesStrict(rootAbs) {
  const results = [];
  const stack = [''];
  while (stack.length > 0) {
    const relDir = stack.pop();
    const absDir = relDir ? path.join(rootAbs, relDir) : rootAbs;
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        throw guard(`symlink entry rejected during inventory: ${normalizePath(rel)} (under ${rootAbs})`);
      }
      if (entry.isDirectory()) {
        stack.push(rel);
      } else if (entry.isFile()) {
        results.push(normalizePath(rel));
      } else {
        throw guard(`unsupported entry type rejected during inventory: ${normalizePath(rel)} (under ${rootAbs})`);
      }
    }
  }
  return results.sort();
}

/**
 * Lenient walk (DESCRIPTIVE ONLY): lists regular files, silently skipping symlinks
 * and special entries. Used for the changed-collateral report, never for guards.
 */
function getAllFiles(dir, baseDir = dir) {
  const results = [];
  if (!lstatOrNull(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push(normalizePath(path.relative(baseDir, fullPath)));
    }
  }
  return results.sort();
}

/**
 * Copies the working tree. Exclusions are matched by entry NAME at every depth.
 * Any symlink or special entry aborts the stage.
 */
export function copyDirectoryExcluding(src, dest, excludes = []) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (excludes.includes(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isSymbolicLink()) {
      throw guard(`refusing to stage symlink ${normalizePath(path.relative(src, srcPath))}: a copied link could retarget the active checkout during staged generator runs`);
    }
    if (entry.isDirectory()) {
      copyDirectoryExcluding(srcPath, destPath, excludes);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    } else {
      throw guard(`refusing to stage special entry ${normalizePath(path.relative(src, srcPath))}`);
    }
  }
}

/**
 * Collects symlink rel paths in a staged tree (does not follow them).
 */
export function collectSymlinks(rootAbs) {
  const results = [];
  const stack = [''];
  while (stack.length > 0) {
    const relDir = stack.pop();
    const absDir = relDir ? path.join(rootAbs, relDir) : rootAbs;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        results.push(normalizePath(rel));
      } else if (entry.isDirectory()) {
        stack.push(rel);
      }
    }
  }
  return results.sort();
}

// ── Allowlist Derivation (single source of truth for stage AND apply) ───────
export function deriveAllowlist(skillsrc) {
  const configuredAgents = skillsrc?.agents;
  if (!Array.isArray(configuredAgents) || configuredAgents.length === 0) {
    throw guard('.skillsrc must declare a non-empty agents list');
  }
  if (new Set(configuredAgents).size !== configuredAgents.length) {
    throw guard(`.skillsrc declares duplicate agents: ${configuredAgents.join(', ')}`);
  }
  const unknown = configuredAgents.filter((a) => !Object.prototype.hasOwnProperty.call(AGENT_SKILL_ROOTS, a));
  if (unknown.length > 0) {
    throw guard(`.skillsrc declares agents with no known export mapping: ${unknown.join(', ')}`);
  }

  const skillDirs = [];
  for (const agent of configuredAgents) {
    for (const skill of TARGET_SKILLS) {
      skillDirs.push(`${AGENT_SKILL_ROOTS[agent]}/${skill.category}/${skill.name}`);
    }
  }

  const workflowWrappers = configuredAgents
    .map((agent) => AGENT_WORKFLOW_WRAPPERS[agent])
    .filter((fn) => typeof fn === 'function')
    .map((fn) => fn(TARGET_WORKFLOW));

  for (const p of [...skillDirs, ...workflowWrappers]) {
    if (p === CANONICAL_WORKFLOW_REL || p.startsWith('.agents/workflows/')) {
      throw guard(`canonical workflow path must never be a copyback target: ${p}`);
    }
  }
  const all = [...skillDirs, ...workflowWrappers];
  if (new Set(all).size !== all.length) {
    throw guard('derived allowlist contains duplicate paths');
  }

  return { configuredAgents, skillDirs, workflowWrappers, allPaths: all };
}

/**
 * Classifies an allowlisted relative path against the derived allowlist.
 * Throws for absolute/traversal/unpackaged/out-of-scope/canonical paths.
 */
export function classifyAllowlistedPath(rawPath, derived) {
  const relPath = normalizeManifestPath(rawPath, 'allowlist');

  if (derived.workflowWrappers.includes(relPath)) {
    return { kind: 'workflow', relPath };
  }
  if (relPath === CANONICAL_WORKFLOW_REL || relPath.startsWith('.agents/workflows/')) {
    throw guard(`canonical workflow source is never a copyback target: ${relPath}`);
  }
  for (const dirRel of derived.skillDirs) {
    if (relPath.startsWith(`${dirRel}/`)) {
      const inner = relPath.slice(dirRel.length + 1);
      if (!PACKAGED_FILE_REGEX.test(inner)) {
        throw guard(`unpackaged file is never a copyback target: ${relPath}`);
      }
      return { kind: 'skill', relPath, inner };
    }
  }
  throw guard(`path is outside the derived allowlist: ${relPath}`);
}

// ── Snapshots ───────────────────────────────────────────────────────────────
export function captureCanonicalSources(baseDir) {
  const files = [];
  const hashes = {};

  for (const skill of TARGET_SKILLS) {
    const dirRel = `skills/${skill.category}/${skill.name}`;
    assertNoSymlinkComponents(baseDir, dirRel);
    const abs = path.join(baseDir, dirRel);
    const st = lstatOrNull(abs);
    if (!st || !st.isDirectory()) {
      throw guard(`canonical skill source missing or not a directory: ${dirRel} (under ${baseDir})`);
    }
    for (const rel of walkFilesStrict(abs)) {
      const relPath = `${dirRel}/${rel}`;
      assertNoSymlinkComponents(baseDir, relPath);
      files.push(relPath);
      hashes[relPath] = sha256File(path.join(baseDir, relPath));
    }
  }

  assertNoSymlinkComponents(baseDir, CANONICAL_WORKFLOW_REL);
  const wfAbs = path.join(baseDir, CANONICAL_WORKFLOW_REL);
  const wfStat = lstatOrNull(wfAbs);
  if (!wfStat || !wfStat.isFile()) {
    throw guard(`canonical workflow missing or not a regular file: ${CANONICAL_WORKFLOW_REL} (under ${baseDir})`);
  }
  files.push(CANONICAL_WORKFLOW_REL);
  hashes[CANONICAL_WORKFLOW_REL] = sha256File(wfAbs);

  files.sort();
  return { files, hashes };
}

export function captureEvidence(baseDir) {
  assertNoSymlinkComponents(baseDir, EVIDENCE_DIR_REL);
  const abs = path.join(baseDir, EVIDENCE_DIR_REL);
  const st = lstatOrNull(abs);
  if (!st || !st.isDirectory()) {
    throw guard(`SDD evidence directory missing: ${EVIDENCE_DIR_REL} (under ${baseDir})`);
  }
  const files = [];
  const hashes = {};
  for (const rel of walkFilesStrict(abs)) {
    const relPath = `${EVIDENCE_DIR_REL}/${rel}`;
    assertNoSymlinkComponents(baseDir, relPath);
    files.push(relPath);
    hashes[relPath] = sha256File(path.join(baseDir, relPath));
  }
  files.sort();
  return { files, hashes };
}

/**
 * Complete destination inventory: per-root state ('absent' | 'dir'), the full file
 * set under existing roots, and hashes. Workflow wrappers contribute a key with a
 * null hash when absent, so absent destinations are recorded as absent.
 */
export function captureDestinationsInventory(baseDir, derived) {
  const rootStates = {};
  const files = [];
  const hashes = {};

  for (const dirRel of derived.skillDirs) {
    assertNoSymlinkComponents(baseDir, dirRel);
    const abs = path.join(baseDir, dirRel);
    const st = lstatOrNull(abs);
    if (!st) {
      rootStates[dirRel] = 'absent';
      continue;
    }
    if (!st.isDirectory()) {
      throw guard(`destination root is not a directory: ${dirRel}`);
    }
    rootStates[dirRel] = 'dir';
    for (const rel of walkFilesStrict(abs)) {
      const relPath = `${dirRel}/${rel}`;
      assertNoSymlinkComponents(baseDir, relPath);
      files.push(relPath);
      hashes[relPath] = sha256File(path.join(baseDir, relPath));
    }
  }

  for (const wrapperRel of derived.workflowWrappers) {
    assertNoSymlinkComponents(baseDir, wrapperRel);
    const abs = path.join(baseDir, wrapperRel);
    const st = lstatOrNull(abs);
    if (!st) {
      hashes[wrapperRel] = null;
      continue;
    }
    if (!st.isFile()) {
      throw guard(`workflow wrapper is not a regular file: ${wrapperRel}`);
    }
    files.push(wrapperRel);
    hashes[wrapperRel] = sha256File(abs);
  }

  files.sort();
  return { rootStates, files, hashes };
}

/**
 * Pre-stage identity for a destination path: known state + recorded hash (null when
 * the path did not exist). Unknown means the path was never in scope of the snapshot.
 */
export function preStageDestinationIdentity(preSnapshot, relPath) {
  if (Object.prototype.hasOwnProperty.call(preSnapshot.destinations, relPath)) {
    return { known: true, hash: preSnapshot.destinations[relPath] };
  }
  // In-scope but absent before staging: under a recorded skill root, or an exact
  // recorded workflow wrapper (recorded with a null hash).
  const underKnownRoot = (preSnapshot.skill_dirs || []).some((dirRel) => relPath.startsWith(`${dirRel}/`));
  const knownWrapper = (preSnapshot.workflow_wrappers || []).includes(relPath);
  if (underKnownRoot || knownWrapper) {
    return { known: true, hash: null };
  }
  return { known: false, hash: null };
}

function compareStringSets(expected, actual, label) {
  if (expected.length !== actual.length) {
    throw guard(`${label}: count mismatch (expected ${expected.length}, found ${actual.length})`);
  }
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== actual[i]) {
      throw guard(`${label}: set mismatch at ${actual[i]} (expected ${expected[i]})`);
    }
  }
}

/**
 * Enumerates the allowlist from a STAGE tree. This is the only source of allowlist
 * membership during apply; the manifest is compared against it, never trusted.
 */
export function enumerateStagedAllowlist(stageDirReal, derived, { withBytes = false } = {}) {
  const entries = [];

  for (const dirRel of derived.skillDirs) {
    assertNoSymlinkComponents(stageDirReal, dirRel);
    const abs = path.join(stageDirReal, dirRel);
    const st = lstatOrNull(abs);
    if (!st || !st.isDirectory()) {
      throw guard(`staged allowlist root missing: ${dirRel}`);
    }
    for (const rel of walkFilesStrict(abs)) {
      if (!PACKAGED_FILE_REGEX.test(rel)) continue;
      const relPath = `${dirRel}/${rel}`;
      assertNoSymlinkComponents(stageDirReal, relPath);
      const full = path.join(stageDirReal, relPath);
      const fstat = lstatOrNull(full);
      if (!fstat || !fstat.isFile()) {
        throw guard(`staged allowlist entry is not a regular file: ${relPath}`);
      }
      const bytes = fs.readFileSync(full);
      entries.push({ path: relPath, staged_sha256: sha256Buffer(bytes), bytes: bytes.length, ...(withBytes ? { content: bytes } : {}) });
    }
  }

  for (const wrapperRel of derived.workflowWrappers) {
    assertNoSymlinkComponents(stageDirReal, wrapperRel);
    const full = path.join(stageDirReal, wrapperRel);
    const fstat = lstatOrNull(full);
    if (!fstat || !fstat.isFile()) {
      throw guard(`staged workflow wrapper missing or not a regular file: ${wrapperRel}`);
    }
    const bytes = fs.readFileSync(full);
    entries.push({ path: wrapperRel, staged_sha256: sha256Buffer(bytes), bytes: bytes.length, ...(withBytes ? { content: bytes } : {}) });
  }

  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return entries;
}

// ── Stage Phase ─────────────────────────────────────────────────────────────
export async function runStage({ repoRoot, stageDir, snapshotOutPath, logsDir }) {
  console.log(`[STAGE] Initializing disposable staging worktree at: ${stageDir}`);

  const activeSkillsrcPath = path.join(repoRoot, '.skillsrc');
  if (!lstatOrNull(activeSkillsrcPath)) {
    throw new Error(`Active .skillsrc not found at ${activeSkillsrcPath}`);
  }

  // 0. Validate stageDir lexically AND physically before any snapshot/copy/delete.
  const { realRepo, realStage } = validateStageDir(stageDir, repoRoot);
  console.log(`[STAGE] Physical isolation verified: stage=${realStage} repo=${realRepo}`);

  // 1. Snapshot active state BEFORE any staging operation.
  console.log('[STAGE] Capturing pre-export repository snapshot...');
  const originalSkillsrcBytes = fs.readFileSync(activeSkillsrcPath);
  const skillsrcSha256 = sha256Buffer(originalSkillsrcBytes);
  const originalSkillsrc = yaml.load(originalSkillsrcBytes.toString('utf8'));
  const derived = deriveAllowlist(originalSkillsrc);

  const sourcesSnapshot = captureCanonicalSources(realRepo);
  const evidenceSnapshot = captureEvidence(realRepo);
  const destinationsSnapshot = captureDestinationsInventory(realRepo, derived);

  const preSnapshot = {
    schema_version: 2,
    timestamp: new Date().toISOString(),
    repo_root: realRepo,
    skillsrc_sha256: skillsrcSha256,
    configured_agents: derived.configuredAgents,
    skill_dirs: derived.skillDirs,
    workflow_wrappers: derived.workflowWrappers,
    canonical_workflow: CANONICAL_WORKFLOW_REL,
    evidence_file_list: evidenceSnapshot.files,
    evidence: evidenceSnapshot.hashes,
    sources_file_list: sourcesSnapshot.files,
    sources: sourcesSnapshot.hashes,
    destination_roots: destinationsSnapshot.rootStates,
    destinations_file_list: destinationsSnapshot.files,
    destinations: destinationsSnapshot.hashes,
  };
  fs.mkdirSync(path.dirname(snapshotOutPath), { recursive: true });
  fs.writeFileSync(snapshotOutPath, JSON.stringify(preSnapshot, null, 2) + '\n');
  const preSnapshotSha256 = sha256File(snapshotOutPath);
  console.log(`[STAGE] Pre-export snapshot recorded at: ${snapshotOutPath} (${preSnapshotSha256})`);

  // 2. Copy the working tree (symlink or special entry => abort).
  console.log(`[STAGE] Copying repository tree to staging (excluding ${EXCLUDED_STAGE_ROOTS.join(', ')})...`);
  copyDirectoryExcluding(realRepo, realStage, EXCLUDED_STAGE_ROOTS);

  // 3. Provision dependency links EXPLICITLY: exactly root and cli node_modules.
  // These link into the active dependency directory. No read-only claim is made.
  console.log('[STAGE] Provisioning dependency links (root + cli node_modules)...');
  const dependencyLinks = [];
  const rootNm = path.join(realRepo, 'node_modules');
  const rootNmStat = lstatOrNull(rootNm);
  if (!rootNmStat || !rootNmStat.isDirectory()) {
    throw new Error(`Root node_modules not found (or not a real directory) at ${rootNm}`);
  }
  const rootNmReal = fs.realpathSync(rootNm);
  fs.symlinkSync(rootNmReal, path.join(realStage, 'node_modules'), 'junction');
  dependencyLinks.push({ staged: 'node_modules', target: rootNmReal });

  const cliNm = path.join(realRepo, 'cli', 'node_modules');
  const cliNmStat = lstatOrNull(cliNm);
  if (cliNmStat) {
    if (!cliNmStat.isDirectory()) {
      throw new Error(`cli/node_modules exists but is not a real directory: ${cliNm}`);
    }
    const cliNmReal = fs.realpathSync(cliNm);
    fs.mkdirSync(path.join(realStage, 'cli'), { recursive: true });
    fs.symlinkSync(cliNmReal, path.join(realStage, 'cli', 'node_modules'), 'junction');
    dependencyLinks.push({ staged: 'cli/node_modules', target: cliNmReal });
  }

  // Exactly these symlinks may exist in staging; nothing else may alias the active repo.
  const stagedSymlinks = collectSymlinks(realStage);
  const expectedSymlinks = dependencyLinks.map((l) => l.staged).sort();
  compareStringSets(expectedSymlinks, stagedSymlinks, 'staged symlink inventory');

  // 4. Narrow .skillsrc in staging (active .skillsrc is never written).
  console.log('[STAGE] Narrowing staging .skillsrc to common-tdd, quality-engineering-test-healing, and test-loop...');
  const narrowedSkillsrc = {
    ...originalSkillsrc,
    skills: {
      common: { include: ['common-tdd'] },
      'quality-engineering': { include: ['quality-engineering-test-healing'] },
    },
    workflows: [TARGET_WORKFLOW],
  };
  fs.writeFileSync(path.join(realStage, '.skillsrc'), yaml.dump(narrowedSkillsrc, { indent: 2 }));

  // 5. Delete stale generated mirrors IN STAGING (no-lockfile ownership trap).
  console.log('[STAGE] Deleting generated mirror targets in staging to avoid no-lockfile stale ownership...');
  for (const dirRel of derived.skillDirs) {
    assertNoSymlinkComponents(realStage, dirRel);
    const targetDir = path.join(realStage, dirRel);
    const st = lstatOrNull(targetDir);
    if (!st) continue;
    if (!st.isDirectory()) {
      throw guard(`staged mirror target is not a directory: ${dirRel}`);
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  for (const wrapperRel of derived.workflowWrappers) {
    assertNoSymlinkComponents(realStage, wrapperRel);
    const targetPath = path.join(realStage, wrapperRel);
    const st = lstatOrNull(targetPath);
    if (!st) continue;
    if (!st.isFile()) {
      throw guard(`staged workflow wrapper is not a regular file: ${wrapperRel}`);
    }
    fs.rmSync(targetPath, { force: true });
    const parentDir = path.dirname(targetPath);
    const parentStat = lstatOrNull(parentDir);
    if (parentStat && parentStat.isDirectory() && fs.readdirSync(parentDir).length === 0) {
      fs.rmSync(parentDir, { recursive: true, force: true });
    }
  }
  const canonicalInStage = lstatOrNull(path.join(realStage, CANONICAL_WORKFLOW_REL));
  if (!canonicalInStage || !canonicalInStage.isFile()) {
    throw new Error(`Canonical workflow ${CANONICAL_WORKFLOW_REL} missing in staging!`);
  }

  // 6. Execute canonical generators inside staging with finite timeouts + external logs.
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('[STAGE] Executing canonical generators inside staging...');
  const useRtk = hasRtk();
  const generatorRuns = [];

  const runGenerator = (label, scriptRel, timeoutMs, maxBuffer) => {
    const bin = useRtk ? 'rtk' : 'node';
    const args = useRtk ? ['proxy', 'node', '--import', 'tsx', scriptRel] : ['--import', 'tsx', scriptRel];
    console.log(`[STAGE] Running: ${[bin, ...args].join(' ')}`);
    const logFile = path.join(logsDir, `${label}.log`);
    const res = cp.spawnSync(bin, args, {
      cwd: realStage,
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
      timeout: timeoutMs,
      maxBuffer,
    });
    const exitCode = typeof res.status === 'number' ? res.status : null;
    fs.writeFileSync(
      logFile,
      `--- COMMAND ---\n${[bin, ...args].join(' ')}\n--- CWD ---\n${realStage}\n--- STDOUT ---\n${res.stdout || ''}\n--- STDERR ---\n${res.stderr || ''}\n--- ERROR ---\n${res.error ? String(res.error.message || res.error) : ''}\nExit Code: ${exitCode}\n`,
    );
    generatorRuns.push({ command: scriptRel, exit_code: exitCode, log: logFile });
    if (exitCode !== 0) {
      console.error(`[ERROR] ${scriptRel} failed in staging (see log at ${logFile}):`);
      console.error(res.stderr || res.stdout || res.error);
      throw new Error(`${scriptRel} exited with code ${exitCode}`);
    }
    console.log(`[STAGE] ${scriptRel} completed successfully. Log saved to ${logFile}`);
  };

  runGenerator('generate-indices', 'scripts/generate-indices.ts', 180000, 20 * 1024 * 1024);
  runGenerator('generate-capabilities-doc', 'scripts/generate-capabilities-doc.ts', 60000, 10 * 1024 * 1024);

  // 7. Fail closed on any missing required staged output.
  console.log('[STAGE] Verifying required generated skill directories and workflow wrappers...');
  for (const dirRel of derived.skillDirs) {
    assertNoSymlinkComponents(realStage, dirRel);
    const st = lstatOrNull(path.join(realStage, dirRel));
    if (!st || !st.isDirectory()) {
      throw new Error(`[STAGE FAILURE] Required generated skill directory missing in stage: ${dirRel}`);
    }
  }
  for (const wrapperRel of derived.workflowWrappers) {
    assertNoSymlinkComponents(realStage, wrapperRel);
    const st = lstatOrNull(path.join(realStage, wrapperRel));
    if (!st || !st.isFile()) {
      throw new Error(`[STAGE FAILURE] Required generated workflow wrapper missing in stage: ${wrapperRel}`);
    }
  }

  // 8. E5: staged canonical inputs must remain byte-identical to the frozen active source.
  console.log('[STAGE] Verifying staged canonical sources and workflow are unchanged from the pre-stage snapshot...');
  const stagedSources = captureCanonicalSources(realStage);
  compareStringSets(preSnapshot.sources_file_list, stagedSources.files, 'staged canonical source set');
  for (const relPath of preSnapshot.sources_file_list) {
    if (stagedSources.hashes[relPath] !== preSnapshot.sources[relPath]) {
      throw new Error(`[STAGE FAILURE] Staged canonical input diverged from frozen source: ${relPath}`);
    }
  }

  // 9. Build the frozen copy list from independently enumerated stage contents.
  console.log('[STAGE] Enumerating frozen allowlisted copy list from staged output...');
  const allowlisted = enumerateStagedAllowlist(realStage, derived);
  if (allowlisted.length === 0) {
    throw new Error('[STAGE FAILURE] Derived allowlist is empty!');
  }

  const allowlistedCopies = allowlisted.map((entry) => {
    const identity = preStageDestinationIdentity(preSnapshot, entry.path);
    if (!identity.known) {
      throw new Error(`[STAGE FAILURE] Staged output path is outside the pre-stage destination inventory: ${entry.path}`);
    }
    const activeFullPath = path.join(realRepo, entry.path);
    assertNoSymlinkComponents(realRepo, entry.path);
    const current = lstatOrNull(activeFullPath);

    if (identity.hash === null) {
      // Absent before staging => must still be absent. Never adopt later bytes.
      if (current) {
        throw new Error(`[STAGE FAILURE] Destination appeared during staging; refusing to adopt it: ${entry.path}`);
      }
      return {
        path: entry.path,
        staged_sha256: entry.staged_sha256,
        active_before_sha256: null,
        active_before_state: 'absent',
        bytes: entry.bytes,
      };
    }

    if (!current || !current.isFile()) {
      throw new Error(`[STAGE FAILURE] Pre-existing destination vanished during staging: ${entry.path}`);
    }
    const currentHash = sha256File(activeFullPath);
    if (currentHash !== identity.hash) {
      throw new Error(`[STAGE FAILURE] Destination drifted during staging: ${entry.path} (expected ${identity.hash}, found ${currentHash})`);
    }
    return {
      path: entry.path,
      staged_sha256: entry.staged_sha256,
      active_before_sha256: identity.hash,
      active_before_state: 'file',
      bytes: entry.bytes,
    };
  });

  // 10. Descriptive changed-collateral inventory (never authorized for copyback).
  const changedGeneratedCollateral = [];
  const allowlistedPathsSet = new Set(allowlistedCopies.map((c) => c.path));
  const allStagedFiles = getAllFiles(realStage, realStage);
  for (const rel of allStagedFiles) {
    if (allowlistedPathsSet.has(rel) || rel === 'stage-manifest.json' || rel.startsWith('node_modules/')) {
      continue;
    }
    const stagedHash = sha256File(path.join(realStage, rel));
    const fullActive = path.join(realRepo, rel);
    const activeStat = lstatOrNull(fullActive);
    const activeHash = activeStat && activeStat.isFile() ? sha256File(fullActive) : null;
    if (activeHash !== stagedHash) {
      changedGeneratedCollateral.push({
        path: rel,
        active_sha256: activeHash,
        staged_sha256: stagedHash,
        reason: 'Generated collateral modified/created outside the copyback allowlist (index/lock/config). Descriptive only, never copied.',
      });
    }
  }

  // 11. Write the frozen stage manifest.
  const stageManifest = {
    schema_version: 2,
    timestamp: new Date().toISOString(),
    repo_root: realRepo,
    stage_dir: realStage,
    skillsrc_sha256: skillsrcSha256,
    configured_agents: derived.configuredAgents,
    skill_dirs: derived.skillDirs,
    workflow_wrappers: derived.workflowWrappers,
    canonical_workflow: CANONICAL_WORKFLOW_REL,
    pre_snapshot_path: snapshotOutPath,
    pre_snapshot_sha256: preSnapshotSha256,
    generator_runs: generatorRuns,
    dependency_links: dependencyLinks.map((l) => ({
      staged_path: l.staged,
      target_real_path: l.target,
      note: 'reused dependency directory linked into staging; writable through the link, NOT OS read-only',
    })),
    allowlisted_copies_count: allowlistedCopies.length,
    allowlisted_copies: allowlistedCopies,
    changed_generated_collateral_count: changedGeneratedCollateral.length,
    changed_generated_collateral: changedGeneratedCollateral,
  };

  const manifestPath = path.join(realStage, 'stage-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(stageManifest, null, 2) + '\n');
  console.log(`[STAGE] Stage phase complete. Frozen copy list recorded to ${manifestPath}`);

  return stageManifest;
}

// ── Apply Phase (Guarded Copyback) ──────────────────────────────────────────
export async function runApply({ repoRoot, stageDir, snapshotInPath, receiptOutPath }) {
  console.log(`[APPLY] Starting guarded copyback from stage (${stageDir}) to active repo (${repoRoot})...`);

  // ── 0. Bindings: repo, stage, snapshot, manifest — all re-resolved independently.
  const stageStat = lstatOrNull(stageDir);
  if (!stageStat) {
    throw new Error(`Stage directory not found at ${stageDir}. Run --stage first.`);
  }
  if (stageStat.isSymbolicLink()) {
    throw guard(`stageDir cannot be a symlink: ${stageDir}`);
  }
  if (!stageStat.isDirectory()) {
    throw guard(`stageDir must be a directory: ${stageDir}`);
  }

  let realRepo;
  let realStage;
  try {
    realRepo = fs.realpathSync(path.resolve(repoRoot));
    realStage = fs.realpathSync(path.resolve(stageDir));
  } catch (err) {
    throw guard(`cannot resolve repo/stage physical paths: ${err.code || err.message}`);
  }
  if (realStage === realRepo || isStrictlyInside(realRepo, realStage)) {
    throw guard(`stage directory resolves into the active repo: ${realStage}`);
  }

  if (!lstatOrNull(snapshotInPath)) {
    throw new Error(`Pre-export snapshot not found at ${snapshotInPath}. Run --stage first.`);
  }
  const preSnapshot = JSON.parse(fs.readFileSync(snapshotInPath, 'utf8'));
  if (preSnapshot.schema_version !== 2) {
    throw guard(`pre-export snapshot schema_version must be 2 (found ${JSON.stringify(preSnapshot.schema_version)})`);
  }
  if (preSnapshot.repo_root !== realRepo) {
    throw guard(`pre-export snapshot repo binding mismatch: snapshot=${preSnapshot.repo_root} actual=${realRepo}`);
  }

  const manifestPath = path.join(realStage, 'stage-manifest.json');
  const manifestStat = lstatOrNull(manifestPath);
  if (!manifestStat || !manifestStat.isFile()) {
    throw new Error(`Stage manifest not found at ${manifestPath}. Run --stage first.`);
  }
  const stageManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (stageManifest.schema_version !== 2) {
    throw guard(`stage manifest schema_version must be 2 (found ${JSON.stringify(stageManifest.schema_version)})`);
  }
  if (stageManifest.repo_root !== realRepo) {
    throw guard(`stage manifest repo binding mismatch: manifest=${stageManifest.repo_root} actual=${realRepo}`);
  }
  if (stageManifest.stage_dir !== realStage) {
    throw guard(`stage manifest stage binding mismatch: manifest=${stageManifest.stage_dir} actual=${realStage}`);
  }
  const actualSnapshotHash = sha256File(snapshotInPath);
  if (stageManifest.pre_snapshot_sha256 !== actualSnapshotHash) {
    throw guard(`stage manifest is bound to a different pre-export snapshot (${stageManifest.pre_snapshot_sha256} vs ${actualSnapshotHash})`);
  }

  const activeSkillsrcPath = path.join(realRepo, '.skillsrc');
  if (!lstatOrNull(activeSkillsrcPath)) {
    throw guard(`active .skillsrc missing at ${activeSkillsrcPath}`);
  }
  const activeSkillsrcHash = sha256File(activeSkillsrcPath);
  if (activeSkillsrcHash !== preSnapshot.skillsrc_sha256) {
    throw guard(`active .skillsrc changed since staging (${preSnapshot.skillsrc_sha256} -> ${activeSkillsrcHash})`);
  }

  // ── 1. Re-derive the allowlist independently from the ACTIVE configuration.
  const activeSkillsrc = yaml.load(fs.readFileSync(activeSkillsrcPath, 'utf8'));
  const derived = deriveAllowlist(activeSkillsrc);

  compareStringSets([...preSnapshot.skill_dirs].sort(), [...derived.skillDirs].sort(), 'derived skill dir set vs snapshot');
  compareStringSets([...preSnapshot.workflow_wrappers].sort(), [...derived.workflowWrappers].sort(), 'derived workflow wrapper set vs snapshot');
  compareStringSets([...stageManifest.skill_dirs].sort(), [...derived.skillDirs].sort(), 'derived skill dir set vs manifest');
  compareStringSets([...stageManifest.workflow_wrappers].sort(), [...derived.workflowWrappers].sort(), 'derived workflow wrapper set vs manifest');
  if (preSnapshot.canonical_workflow !== CANONICAL_WORKFLOW_REL) {
    throw guard(`snapshot canonical workflow binding mismatch: ${preSnapshot.canonical_workflow}`);
  }

  // ── 2. Manifest entry validation (structure first: no reads of entry files yet).
  if (!Array.isArray(stageManifest.allowlisted_copies) || stageManifest.allowlisted_copies.length === 0) {
    throw new Error('[APPLY FAILURE] Stage manifest contains no frozen allowlisted copies!');
  }
  const manifestByPath = new Map();
  for (const [index, entry] of stageManifest.allowlisted_copies.entries()) {
    if (!entry || typeof entry !== 'object') {
      throw guard(`manifest entry ${index} is not an object`);
    }
    const relPath = classifyAllowlistedPath(entry.path, derived).relPath;
    if (manifestByPath.has(relPath)) {
      throw guard(`duplicate manifest entry: ${relPath}`);
    }
    if (typeof entry.staged_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.staged_sha256)) {
      throw guard(`manifest entry has invalid staged_sha256: ${relPath}`);
    }
    if (!(entry.active_before_sha256 === null || (typeof entry.active_before_sha256 === 'string' && /^[0-9a-f]{64}$/.test(entry.active_before_sha256)))) {
      throw guard(`manifest entry has invalid active_before_sha256: ${relPath}`);
    }
    manifestByPath.set(relPath, entry);
  }
  if (stageManifest.allowlisted_copies_count !== manifestByPath.size) {
    throw guard(`manifest allowlisted_copies_count (${stageManifest.allowlisted_copies_count}) disagrees with entries (${manifestByPath.size})`);
  }

  // ── 3. Independently enumerate the stage allowlist; require exact set equality.
  const rederivedEntries = enumerateStagedAllowlist(realStage, derived);
  const rederivedByPath = new Map(rederivedEntries.map((e) => [e.path, e]));
  compareStringSets(
    [...rederivedByPath.keys()].sort(),
    [...manifestByPath.keys()].sort(),
    'manifest vs re-derived stage allowlist',
  );
  for (const [relPath, staged] of rederivedByPath) {
    const entry = manifestByPath.get(relPath);
    if (staged.staged_sha256 !== entry.staged_sha256) {
      throw guard(`manifest staged hash disagrees with staged bytes: ${relPath}`);
    }
    const identity = preStageDestinationIdentity(preSnapshot, relPath);
    if (!identity.known) {
      throw guard(`allowlisted path is outside the pre-stage destination inventory: ${relPath}`);
    }
    if (entry.active_before_sha256 !== identity.hash) {
      throw guard(`manifest active_before_sha256 disagrees with the pre-stage snapshot: ${relPath}`);
    }
  }

  // ── 4. Active evidence and canonical source SET+hash must match the snapshot.
  console.log('[APPLY] Verifying active SDD evidence set and hashes...');
  const evidenceNow = captureEvidence(realRepo);
  compareStringSets(preSnapshot.evidence_file_list, evidenceNow.files, 'active evidence set');
  for (const relPath of preSnapshot.evidence_file_list) {
    if (evidenceNow.hashes[relPath] !== preSnapshot.evidence[relPath]) {
      throw guard(`active evidence drifted: ${relPath}`);
    }
  }

  console.log('[APPLY] Verifying active canonical source set and hashes (additions included)...');
  const sourcesNow = captureCanonicalSources(realRepo);
  compareStringSets(preSnapshot.sources_file_list, sourcesNow.files, 'active canonical source set');
  for (const relPath of preSnapshot.sources_file_list) {
    if (sourcesNow.hashes[relPath] !== preSnapshot.sources[relPath]) {
      throw guard(`active canonical source drifted: ${relPath}`);
    }
  }

  // ── 5. Complete destination inventory must match the snapshot (refuses appearing files).
  console.log('[APPLY] Verifying complete destination inventory against the pre-stage snapshot...');
  const destinationsNow = captureDestinationsInventory(realRepo, derived);
  compareStringSets([...Object.keys(preSnapshot.destination_roots)].sort(), [...Object.keys(destinationsNow.rootStates)].sort(), 'destination root set');
  for (const [rootRel, state] of Object.entries(preSnapshot.destination_roots)) {
    if (destinationsNow.rootStates[rootRel] !== state) {
      throw guard(`destination root state changed: ${rootRel} (${state} -> ${destinationsNow.rootStates[rootRel]})`);
    }
  }
  compareStringSets(preSnapshot.destinations_file_list, destinationsNow.files, 'destination file inventory');
  for (const relPath of preSnapshot.destinations_file_list) {
    if (destinationsNow.hashes[relPath] !== preSnapshot.destinations[relPath]) {
      throw guard(`destination file drifted: ${relPath}`);
    }
  }

  // ── 6. Staged canonical inputs must still match the frozen source snapshot (E5).
  const stagedSources = captureCanonicalSources(realStage);
  compareStringSets(preSnapshot.sources_file_list, stagedSources.files, 'staged canonical source set');
  for (const relPath of preSnapshot.sources_file_list) {
    if (stagedSources.hashes[relPath] !== preSnapshot.sources[relPath]) {
      throw guard(`staged canonical input diverged from frozen source: ${relPath}`);
    }
  }

  // ── 7. Preflight EVERY planned destination before the first write.
  console.log('[APPLY] Preflighting all planned copyback destinations...');
  const plan = [];
  for (const [relPath, staged] of rederivedByPath) {
    assertNoSymlinkComponents(realStage, relPath);
    assertNoSymlinkComponents(realRepo, relPath);

    const fullActive = path.join(realRepo, relPath);
    const parentReal = realPathOfNearestExisting(path.dirname(fullActive));
    assertInsideOrEqual(realRepo, parentReal, `destination parent of ${relPath}`);

    const identity = preStageDestinationIdentity(preSnapshot, relPath);
    const current = lstatOrNull(fullActive);
    if (identity.hash === null) {
      if (current) {
        throw guard(`destination appeared since staging; refusing to overwrite it: ${relPath}`);
      }
    } else {
      if (!current || !current.isFile()) {
        throw guard(`pre-existing destination vanished since staging: ${relPath}`);
      }
      const currentHash = sha256File(fullActive);
      if (currentHash !== identity.hash) {
        throw guard(`destination drifted since staging: ${relPath}`);
      }
    }

    plan.push({
      relPath,
      fullStaged: path.join(realStage, relPath),
      fullActive,
      stagedHash: staged.staged_sha256,
      activeBeforeHash: identity.hash,
      bytes: staged.bytes,
      status: identity.hash === staged.staged_sha256 ? 'unchanged' : 'write',
    });
  }

  // ── 8. Execute the preflighted plan with immediate per-file re-verification.
  console.log('[APPLY] Executing guarded file-by-file copyback...');
  const copiedFiles = [];
  let writtenCount = 0;
  let unchangedCount = 0;

  for (const item of plan) {
    const currentStagedHash = sha256File(item.fullStaged);
    if (currentStagedHash !== item.stagedHash) {
      throw new Error(`[APPLY FAILURE] Staged file hash drifted from preflight: ${item.relPath}`);
    }
    const current = lstatOrNull(item.fullActive);
    const currentActiveHash = current ? sha256File(item.fullActive) : null;
    if (currentActiveHash !== item.activeBeforeHash) {
      throw new Error(`[APPLY FAILURE] Active file hash drifted from preflight: ${item.relPath}`);
    }

    if (item.status === 'unchanged') {
      copiedFiles.push({ path: item.relPath, status: 'unchanged', sha256: item.stagedHash, bytes: item.bytes });
      unchangedCount++;
      continue;
    }

    const stagedBytes = fs.readFileSync(item.fullStaged);
    fs.mkdirSync(path.dirname(item.fullActive), { recursive: true });
    fs.writeFileSync(item.fullActive, stagedBytes);

    const writtenHash = sha256File(item.fullActive);
    if (writtenHash !== item.stagedHash) {
      throw new Error(`[INTEGRITY FAILURE] Written file hash mismatch: ${item.relPath}`);
    }

    copiedFiles.push({
      path: item.relPath,
      status: 'written',
      sha256_before: item.activeBeforeHash,
      sha256_after: writtenHash,
      bytes: stagedBytes.length,
    });
    writtenCount++;
  }

  // ── 9. Post-copy integrity: evidence AND canonical sources unchanged (E2).
  console.log('[APPLY] Post-copy verification: evidence and canonical sources...');
  const evidenceAfter = captureEvidence(realRepo);
  compareStringSets(preSnapshot.evidence_file_list, evidenceAfter.files, 'post-copy evidence set');
  for (const relPath of preSnapshot.evidence_file_list) {
    if (evidenceAfter.hashes[relPath] !== preSnapshot.evidence[relPath]) {
      throw new Error(`[INTEGRITY FAILURE] Active evidence modified during copyback: ${relPath}`);
    }
  }
  const sourcesAfter = captureCanonicalSources(realRepo);
  compareStringSets(preSnapshot.sources_file_list, sourcesAfter.files, 'post-copy canonical source set');
  for (const relPath of preSnapshot.sources_file_list) {
    if (sourcesAfter.hashes[relPath] !== preSnapshot.sources[relPath]) {
      throw new Error(`[INTEGRITY FAILURE] Active canonical source modified during copyback: ${relPath}`);
    }
  }

  // ── 10. Durable receipt outside .agent.
  const gitRevision = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: realRepo, encoding: 'utf8' });
  const receipt = {
    schema_version: 2,
    status: 'success',
    timestamp: new Date().toISOString(),
    repo_root: realRepo,
    stage_dir: realStage,
    git_revision: (gitRevision.stdout || '').trim() || null,
    skillsrc_sha256: activeSkillsrcHash,
    pre_snapshot_sha256: actualSnapshotHash,
    configured_agents: derived.configuredAgents,
    dependency_provenance: {
      dependency_links: stageManifest.dependency_links || [],
      note: 'Dependencies are linked from the active checkout into staging and are writable through that link. No OS-level read-only protection is claimed.',
      node_version: process.version,
    },
    derived_allowlist: {
      skill_dirs: derived.skillDirs,
      workflow_wrappers: derived.workflowWrappers,
      canonical_workflow_excluded: CANONICAL_WORKFLOW_REL,
      packaged_file_rule: PACKAGED_FILE_REGEX.source,
    },
    total_allowlisted_count: copiedFiles.length,
    written_count: writtenCount,
    unchanged_count: unchangedCount,
    copied_files: copiedFiles,
    changed_generated_collateral_count: (stageManifest.changed_generated_collateral || []).length,
    changed_generated_collateral: stageManifest.changed_generated_collateral || [],
    evidence_preserved: true,
    canonical_sources_preserved: true,
  };

  fs.mkdirSync(path.dirname(receiptOutPath), { recursive: true });
  fs.writeFileSync(receiptOutPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(`[APPLY] Guarded copyback complete (${writtenCount} written, ${unchangedCount} unchanged). Durable receipt written to ${receiptOutPath}`);

  return receipt;
}

function hasRtk() {
  try {
    const res = cp.spawnSync('rtk', ['--version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

// ── CLI Dispatch ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const repoRoot = path.resolve(process.cwd());
  const defaultSnapshotPath = path.join(repoRoot, 'artifacts/ai-test-assurance/evidence/pre-export-snapshot.json');
  const defaultReceiptPath = path.join(repoRoot, 'artifacts/ai-test-assurance/evidence/export-receipt.json');
  const defaultLogsDir = path.join(repoRoot, 'artifacts/ai-test-assurance/evidence/logs');

  let mode = null;
  let customStageDir = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--stage') mode = 'stage';
    else if (arg === '--apply') mode = 'apply';
    else if (arg === '--all' || arg === '--execute') mode = 'all';
    else if (arg === '--stage-dir' && args[i + 1]) {
      customStageDir = path.resolve(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node .agent/sdd/ai-test-assurance/prepare-exports.mjs [options]

Modes:
  --stage              Prepare staging worktree, narrow config, and run generators in stage only
  --apply              Perform guarded file-by-file copyback from staging to active repo
  --all                Execute both --stage and --apply in sequence with all guard assertions

Options:
  --stage-dir <path>   Explicit stage directory (defaults to unique os.tmpdir()/ags-exports-stage-XXXXXX)
  --help, -h           Show this help message
`);
      process.exit(0);
    }
  }

  if (!mode) {
    console.error('[ERROR] Please specify --stage, --apply, or --all. Use --help for usage.');
    process.exit(1);
  }

  const stageDir = customStageDir || fs.mkdtempSync(path.join(os.tmpdir(), 'ags-exports-stage-'));

  try {
    if (mode === 'stage') {
      const manifest = await runStage({
        repoRoot,
        stageDir,
        snapshotOutPath: defaultSnapshotPath,
        logsDir: defaultLogsDir,
      });
      console.log(`\n[SUCCESS] Stage complete. When ready, invoke:\n  node .agent/sdd/ai-test-assurance/prepare-exports.mjs --apply --stage-dir "${manifest.stage_dir}"\n`);
    } else if (mode === 'apply') {
      if (!customStageDir) {
        console.error('[ERROR] --apply requires --stage-dir <path> pointing to an existing staging directory.');
        process.exit(1);
      }
      await runApply({
        repoRoot,
        stageDir: customStageDir,
        snapshotInPath: defaultSnapshotPath,
        receiptOutPath: defaultReceiptPath,
      });
      console.log(`\n[SUCCESS] Guarded copyback applied cleanly.`);
    } else if (mode === 'all') {
      const manifest = await runStage({
        repoRoot,
        stageDir,
        snapshotOutPath: defaultSnapshotPath,
        logsDir: defaultLogsDir,
      });
      await runApply({
        repoRoot,
        stageDir: manifest.stage_dir,
        snapshotInPath: defaultSnapshotPath,
        receiptOutPath: defaultReceiptPath,
      });
      console.log(`\n[SUCCESS] Full staging and guarded copyback completed cleanly.`);
    }
  } catch (err) {
    console.error(`\n[FATAL] Export helper failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('prepare-exports.mjs')) {
  main();
}
