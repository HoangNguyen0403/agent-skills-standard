import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import path from 'path';
import { z } from 'zod';
import { Agent, getAgentDefinition } from '../constants';

export const LOCKFILE_NAME = '.skills-lock.json';
export type Owner = 'skill' | 'workflow' | 'specialist' | 'bridge' | 'index';

/**
 * Reserved ownership agent for the shared canonical workflow body installed at
 * `.agents/workflows/*.md`. It is not a provider and must never be added to the
 * `Agent` enumeration.
 */
export const SHARED_WORKFLOW_AGENT = 'shared';

export interface ManifestEntry {
  owner: Owner;
  source: string;
  agent: string;
  sha256: string;
}

export interface SourceRef {
  ref: string;
  commit: string | null;
}

export interface WorkflowCatalogBinding {
  /** Provider whose native export was generated from the canonical body. */
  agent: string;
  /** Bounded project-relative native output path. */
  path: string;
  /** Digest of the deterministic generated export. */
  outputDigest: string;
  /** Digest of the canonical body that generated this export. */
  canonicalDigest: string;
}

export interface WorkflowCatalogBindingConflict {
  /** Provider whose expected native export could not be verified. */
  agent: string;
  /** Bounded project-relative native output path. */
  path: string;
}

export interface WorkflowCatalogWorkflow {
  /** Bounded project-relative canonical body path. */
  path: string;
  digest: string;
  registry: string;
  requestedRef: string;
  resolvedCommit: string | null;
  /**
   * Verified native exports. Several providers may alias the same physical
   * output path (e.g. Antigravity and Kiro), provided their digests agree.
   */
  nativeBindings: WorkflowCatalogBinding[];
  /** Expected exports whose on-disk bytes could not be verified. */
  nativeConflicts?: WorkflowCatalogBindingConflict[];
}

export interface WorkflowCatalog {
  version: 1;
  workflows: Record<string, WorkflowCatalogWorkflow>;
}

/** Repository-generation authority is deliberately separate from CLI-owned entries. */
export interface GenerationEntry {
  source: string;
  sha256: string;
  scope?: {
    kind: 'category-token-metrics';
    sha256: string;
  };
}

export interface GenerationLedger {
  version: 1;
  entries: Record<string, GenerationEntry>;
}

export interface SkillsLockFile {
  version: 2;
  registry: string;
  generatedAt: string;
  sources: Record<string, SourceRef>;
  entries: Record<string, ManifestEntry>;
  generation?: GenerationLedger;
  disclosed?: Record<string, string[]>;
  workflowCatalog?: WorkflowCatalog;
}

export interface LoadedLock {
  lock: SkillsLockFile | null;
  migratedFromV1: boolean;
}

export interface VerifyResult {
  ok: boolean;
  mismatches: string[];
  missing: string[];
}
export function parseGenerationLedger(
  value: unknown,
): GenerationLedger | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Unsupported repository-generation lock namespace');
  }
  const ledger = value as Record<string, unknown>;
  if (
    ledger.version !== 1 ||
    typeof ledger.entries !== 'object' ||
    ledger.entries === null ||
    Array.isArray(ledger.entries) ||
    Object.keys(ledger).some((key) => key !== 'version' && key !== 'entries')
  ) {
    throw new Error('Unsupported repository-generation lock namespace');
  }
  const rawEntries = ledger.entries as Record<string, unknown>;
  const entries: Record<string, GenerationEntry> = {};
  for (const [rel, rawEntry] of Object.entries(rawEntries)) {
    if (
      !rel ||
      rel.startsWith('/') ||
      rel.includes('\\') ||
      rel
        .split('/')
        .some((part) => part === '' || part === '.' || part === '..') ||
      typeof rawEntry !== 'object' ||
      rawEntry === null ||
      Array.isArray(rawEntry)
    ) {
      throw new Error(`Invalid repository-generation ownership entry: ${rel}`);
    }
    const entry = rawEntry as Record<string, unknown>;
    let scope: GenerationEntry['scope'];
    if (Object.prototype.hasOwnProperty.call(entry, 'scope')) {
      const rawScope = entry.scope;
      if (
        rel !== 'skills/metadata.json' ||
        typeof rawScope !== 'object' ||
        rawScope === null ||
        Array.isArray(rawScope)
      ) {
        throw new Error(
          `Invalid repository-generation ownership entry: ${rel}`,
        );
      }
      const descriptor = rawScope as Record<string, unknown>;
      if (
        Object.keys(descriptor).length !== 2 ||
        Object.keys(descriptor).some(
          (key) => key !== 'kind' && key !== 'sha256',
        ) ||
        descriptor.kind !== 'category-token-metrics' ||
        typeof descriptor.sha256 !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(descriptor.sha256)
      ) {
        throw new Error(
          `Invalid repository-generation ownership entry: ${rel}`,
        );
      }
      scope = {
        kind: 'category-token-metrics',
        sha256: descriptor.sha256,
      };
    }
    if (
      Object.keys(entry).some(
        (key) => key !== 'source' && key !== 'sha256' && key !== 'scope',
      ) ||
      typeof entry.source !== 'string' ||
      entry.source.length === 0 ||
      typeof entry.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(entry.sha256)
    ) {
      throw new Error(`Invalid repository-generation ownership entry: ${rel}`);
    }
    entries[rel] = {
      source: entry.source,
      sha256: entry.sha256,
      ...(scope ? { scope } : {}),
    };
  }
  return { version: 1, entries };
}

export function sha256(content: Buffer | string): string {
  return createHash('sha256')
    .update(content, Buffer.isBuffer(content) ? undefined : 'utf8')
    .digest('hex');
}

/**
 * Reads JSON through the existing YAML core parser first so duplicate object
 * keys are rejected before `JSON.parse` silently keeps the last value. The
 * returned value still comes from strict JSON parsing.
 */
export async function readJsonStrict(file: string): Promise<unknown> {
  const text = await fs.readFile(file, 'utf8');
  try {
    yaml.load(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicated mapping key/i.test(message)) {
      throw new Error('Invalid .skills-lock.json: duplicate JSON keys', {
        cause: error,
      });
    }
    throw new Error(`Invalid .skills-lock.json: ${message}`, { cause: error });
  }
  return JSON.parse(text);
}

const lockV2Schema = z
  .object({
    version: z.literal(2),
    registry: z.string(),
    generatedAt: z.string(),
    sources: z.record(
      z.string(),
      z.object({ ref: z.string(), commit: z.string().nullable() }),
    ),
    entries: z.record(
      z.string(),
      z.object({
        owner: z.enum(['skill', 'workflow', 'specialist', 'bridge', 'index']),
        source: z.string(),
        agent: z.string(),
        sha256: z.string(),
      }),
    ),
    disclosed: z.record(z.string(), z.array(z.string())).optional(),
    workflowCatalog: z.unknown().optional(),
  })
  .passthrough();

const lockVersionProbe = z.object({ version: z.unknown() });

/**
 * Validates the complete outer v2 shape with a schema, then applies the
 * catalog-specific checks. No partially checked object is asserted as a lock.
 */
function parseLockV2(raw: unknown): SkillsLockFile {
  const parsed = lockV2Schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join('.') : 'root';
    throw new Error(
      `Invalid .skills-lock.json: ${where} ${issue?.message ?? 'is invalid'}`,
    );
  }
  const { workflowCatalog: rawCatalog, ...rest } = parsed.data;
  const generation = parseGenerationLedger(
    (raw as Record<string, unknown>).generation,
  );
  return {
    ...rest,
    ...(generation ? { generation } : {}),
    ...(rawCatalog === undefined
      ? {}
      : { workflowCatalog: validateWorkflowCatalog(rawCatalog) }),
  };
}

const DIGEST_RE = /^[a-f0-9]{64}$/;
const WORKFLOW_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function isBoundedRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.includes('\0') || value.includes('\\')) return false;
  if (path.posix.isAbsolute(value) || path.isAbsolute(value)) return false;
  // Reject any non-canonical form (`a/../b`, `a//b`, `./a`, trailing slash).
  if (path.posix.normalize(value) !== value) return false;
  return !value.split('/').includes('..');
}

function assertWorkflowCatalog(version: unknown, workflows: unknown) {
  if (version !== 1) {
    throw new Error(
      `Invalid .skills-lock.json workflowCatalog: unsupported version ${String(version)}`,
    );
  }
  if (!workflows || typeof workflows !== 'object' || Array.isArray(workflows)) {
    throw new Error(
      'Invalid .skills-lock.json workflowCatalog: workflows must be an object',
    );
  }
  for (const [name, raw] of Object.entries(
    workflows as Record<string, unknown>,
  )) {
    if (!WORKFLOW_NAME_RE.test(name)) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: invalid workflow name '${name}'`,
      );
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' must be an object`,
      );
    }
    const entry = raw as Record<string, unknown>;
    if (!isBoundedRelativePath(entry.path)) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an unsafe path`,
      );
    }
    if (
      path.posix.dirname(entry.path) !== '.agents/workflows' ||
      path.posix.basename(entry.path) !== `${name}.md`
    ) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' path is not a canonical .agents/workflows path`,
      );
    }
    if (typeof entry.digest !== 'string' || !DIGEST_RE.test(entry.digest)) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid digest`,
      );
    }
    if (typeof entry.registry !== 'string') {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid registry`,
      );
    }
    if (typeof entry.requestedRef !== 'string') {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid requestedRef`,
      );
    }
    if (
      entry.resolvedCommit !== null &&
      typeof entry.resolvedCommit !== 'string'
    ) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid resolvedCommit`,
      );
    }
    if (!Array.isArray(entry.nativeBindings)) {
      throw new Error(
        `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has no nativeBindings array`,
      );
    }
    const bindingsByPath = new Map<
      string,
      { outputDigest: string; canonicalDigest: string }
    >();
    const bindingKeys = new Set<string>();
    for (const rawBinding of entry.nativeBindings) {
      if (
        !rawBinding ||
        typeof rawBinding !== 'object' ||
        Array.isArray(rawBinding)
      ) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid native binding`,
        );
      }
      const binding = rawBinding as Record<string, unknown>;
      if (typeof binding.agent !== 'string' || binding.agent.length === 0) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid binding agent`,
        );
      }
      if (!isBoundedRelativePath(binding.path)) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an unsafe binding path`,
        );
      }
      const bindingKey = `${binding.agent}\0${binding.path}`;
      if (bindingKeys.has(bindingKey)) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has a duplicate native binding for '${binding.path}'`,
        );
      }
      bindingKeys.add(bindingKey);
      if (
        typeof binding.outputDigest !== 'string' ||
        !DIGEST_RE.test(binding.outputDigest)
      ) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid binding output digest`,
        );
      }
      if (
        typeof binding.canonicalDigest !== 'string' ||
        !DIGEST_RE.test(binding.canonicalDigest) ||
        binding.canonicalDigest !== entry.digest
      ) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has a binding that does not reference its canonical digest`,
        );
      }
      // Several providers may alias one physical output path. They are only
      // unambiguous while every alias describes the same bytes.
      const alias = bindingsByPath.get(binding.path);
      if (
        alias &&
        (alias.outputDigest !== binding.outputDigest ||
          alias.canonicalDigest !== binding.canonicalDigest)
      ) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has conflicting native bindings for '${binding.path}'`,
        );
      }
      bindingsByPath.set(binding.path, {
        outputDigest: binding.outputDigest,
        canonicalDigest: binding.canonicalDigest,
      });
    }

    if (entry.nativeConflicts !== undefined) {
      if (!Array.isArray(entry.nativeConflicts)) {
        throw new Error(
          `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid nativeConflicts value`,
        );
      }
      const conflictKeys = new Set<string>();
      for (const rawConflict of entry.nativeConflicts) {
        if (
          !rawConflict ||
          typeof rawConflict !== 'object' ||
          Array.isArray(rawConflict)
        ) {
          throw new Error(
            `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid native conflict`,
          );
        }
        const conflict = rawConflict as Record<string, unknown>;
        if (typeof conflict.agent !== 'string' || conflict.agent.length === 0) {
          throw new Error(
            `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an invalid conflict agent`,
          );
        }
        if (!isBoundedRelativePath(conflict.path)) {
          throw new Error(
            `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has an unsafe conflict path`,
          );
        }
        const key = `${conflict.agent}\0${conflict.path}`;
        if (conflictKeys.has(key)) {
          throw new Error(
            `Invalid .skills-lock.json workflowCatalog: workflow '${name}' has a duplicate native conflict for '${conflict.path}'`,
          );
        }
        conflictKeys.add(key);
      }
    }
  }
}

/**
 * Validates and narrows the optional versioned workflow catalog. Throws on any
 * malformed/unsupported metadata so callers never silently degrade it.
 */
export function validateWorkflowCatalog(catalog: unknown): WorkflowCatalog {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error(
      'Invalid .skills-lock.json workflowCatalog: expected an object',
    );
  }
  const raw = catalog as Record<string, unknown>;
  assertWorkflowCatalog(raw.version, raw.workflows);
  return catalog as WorkflowCatalog;
}

export function migrateV1(v1: unknown, agents: Agent[]): SkillsLockFile {
  const old = v1 as {
    registry?: string;
    generatedAt?: string;
    disclosed?: Record<string, string[]>;
    skills?: Record<string, { ref: string; files: Record<string, string> }>;
  };
  const sources: Record<string, SourceRef> = {};
  const entries: Record<string, ManifestEntry> = {};
  for (const [key, skill] of Object.entries(old.skills ?? {})) {
    const [category, name] = key.split('/');
    sources[`skills/${category}`] = { ref: skill.ref, commit: null };
    for (const agent of agents) {
      if (agent === Agent.Kiro) continue; // v1 hashed pre-transform content; Kiro files are re-adopted
      const base = getAgentDefinition(agent).path;
      for (const [rel, hash] of Object.entries(skill.files)) {
        entries[`${base}/${category}/${name}/${rel}`] = {
          owner: 'skill',
          source: `skill:${category}/${name}@${skill.ref}`,
          agent,
          sha256: hash,
        };
      }
    }
  }
  return {
    version: 2,
    registry: old.registry ?? '',
    generatedAt: old.generatedAt ?? '',
    sources,
    entries,
    ...(old.disclosed ? { disclosed: old.disclosed } : {}),
  };
}

export class LockfileService {
  private lockfilePath(rootDir: string): string {
    return path.join(rootDir, LOCKFILE_NAME);
  }

  async load(rootDir: string, agents: Agent[]): Promise<LoadedLock> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) {
      return { lock: null, migratedFromV1: false };
    }
    const raw: unknown = await readJsonStrict(file);
    const probe = lockVersionProbe.safeParse(raw);
    if (!probe.success) {
      throw new Error('Invalid .skills-lock.json: missing version');
    }
    if (probe.data.version === 2) {
      return { lock: parseLockV2(raw), migratedFromV1: false };
    }
    if (probe.data.version === 1) {
      if ((raw as Record<string, unknown>).generation !== undefined) {
        throw new Error('Unsupported repository-generation lock namespace');
      }
      return { lock: migrateV1(raw, agents), migratedFromV1: true };
    }
    throw new Error('Unsupported .skills-lock.json version');
  }

  async write(rootDir: string, lock: SkillsLockFile): Promise<void> {
    const file = this.lockfilePath(rootDir);
    if (lock.workflowCatalog !== undefined) {
      // Validate before touching the previous publication.
      validateWorkflowCatalog(lock.workflowCatalog);
    }
    let existingDisclosed: Record<string, string[]> | undefined;
    let existingGeneration: GenerationLedger | undefined;
    if (await fs.pathExists(file)) {
      let raw:
        | {
            version?: unknown;
            disclosed?: Record<string, string[]>;
            generation?: unknown;
          }
        | undefined;
      try {
        raw = (await readJsonStrict(file)) as typeof raw;
      } catch {
        // Unreadable/unparseable previous lock: nothing to preserve.
      }
      if (raw) {
        existingDisclosed = raw.disclosed;
        if (raw.version === 2) {
          // Semantic validation is never swallowed: an invalid ledger in the
          // previous lock must fail the write before publication.
          existingGeneration = parseGenerationLedger(raw.generation);
        } else if (raw.generation !== undefined) {
          throw new Error('Unsupported repository-generation lock namespace');
        }
      }
    }
    const generation =
      lock.generation === undefined
        ? existingGeneration
        : parseGenerationLedger(lock.generation);
    const disclosed = lock.disclosed ?? existingDisclosed;
    const sortedEntries: Record<string, ManifestEntry> = {};
    for (const k of Object.keys(lock.entries).sort()) {
      sortedEntries[k] = lock.entries[k];
    }
    const sortedGenerationEntries: Record<string, GenerationEntry> = {};
    for (const k of Object.keys(generation?.entries ?? {}).sort()) {
      sortedGenerationEntries[k] = generation!.entries[k];
    }
    const out: SkillsLockFile = {
      ...lock,
      entries: sortedEntries,
      ...(generation
        ? { generation: { version: 1, entries: sortedGenerationEntries } }
        : {}),
      ...(disclosed ? { disclosed } : {}),
    };
    if (!generation) delete out.generation;
    if (!disclosed) {
      delete out.disclosed;
    }
    await this.publishAtomic(file, out);
  }

  /**
   * Same-directory atomic replacement so an interrupted write leaves the
   * previous lock (or no lock) rather than a partial/truncated file. Every
   * whole-lock publication, including disclosure-only updates, goes through
   * this path.
   */
  private async publishAtomic(file: string, out: unknown): Promise<void> {
    const tmp = path.join(
      path.dirname(file),
      `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`,
    );
    try {
      await fs.outputFile(tmp, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
      await fs.rename(tmp, file);
    } finally {
      await fs.remove(tmp).catch(() => {});
    }
  }

  async readDisclosed(
    rootDir: string,
  ): Promise<Record<string, string[]> | undefined> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) return undefined;
    const raw = (await readJsonStrict(file)) as {
      disclosed?: Record<string, string[]>;
    };
    return raw?.disclosed;
  }

  async writeDisclosed(
    rootDir: string,
    disclosed: Record<string, string[]>,
  ): Promise<void> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) return;
    const raw = (await readJsonStrict(file)) as Record<string, unknown>;
    if (raw?.version === 2) {
      parseGenerationLedger(raw.generation);
    } else if (raw?.generation !== undefined) {
      throw new Error('Unsupported repository-generation lock namespace');
    }
    if (raw.workflowCatalog !== undefined) {
      // Validate the object being republished before replacing the lock.
      validateWorkflowCatalog(raw.workflowCatalog);
    }
    await this.publishAtomic(file, { ...raw, disclosed });
  }

  async verifyEntries(
    rootDir: string,
    entries: Record<string, ManifestEntry>,
    agent?: Agent,
  ): Promise<VerifyResult> {
    const mismatches: string[] = [];
    const missing: string[] = [];
    for (const [rel, entry] of Object.entries(entries)) {
      if (agent && entry.agent !== agent) continue;
      const absPath = path.join(rootDir, rel);
      if (!(await fs.pathExists(absPath))) {
        missing.push(rel);
        continue;
      }
      // Raw bytes, not UTF-8 decoded text, define integrity (binary resources).
      const content = await fs.readFile(absPath);
      if (sha256(content) !== entry.sha256) {
        mismatches.push(rel);
      }
    }
    return {
      ok: mismatches.length === 0 && missing.length === 0,
      mismatches,
      missing,
    };
  }
}
