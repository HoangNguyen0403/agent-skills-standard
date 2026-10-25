import crypto from 'crypto';
import { execFile as nodeExecFile } from 'child_process';
import fs from 'fs-extra';
import { builtinModules } from 'module';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import {
  getSupervisorAsset,
  readWorkerAsset,
  SUPERVISOR_ASSET_ID,
  WORKER_ASSET_ID,
} from './RunnerAssets';
import type { FleetRuntimeConfig } from './RuntimeTypes';
import {
  canonicalDigest,
  FleetRuntimeConfigSchema,
  HarnessError,
} from './RuntimeTypes';

const execFile = promisify(nodeExecFile);

/**
 * Bounds for the installed runtime closure. Every bound fails visibly; closure
 * enumeration is never truncated, because a partial closure is not a closure.
 */
export const RUNTIME_CLOSURE_LIMITS = {
  maxFiles: 60000,
  maxTotalBytes: 2 * 1024 * 1024 * 1024,
  maxFileBytes: 512 * 1024 * 1024,
  maxDepth: 64,
  maxManifestBytes: 64 * 1024 * 1024,
  hashConcurrency: 8,
  maxSymlinks: 20000,
} as const;

/** Bounds for the emitted worker's own module graph (chunks, externals). */
export const WORKER_MODULE_LIMITS = {
  maxFiles: 4096,
  maxBytes: 256 * 1024 * 1024,
  maxFileBytes: 64 * 1024 * 1024,
  maxScanFileBytes: 4 * 1024 * 1024,
  maxDepth: 64,
} as const;

const LOCK_FILE_NAMES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
];

const CODE_FILE_PATTERN = /\.(?:js|mjs|cjs|ts|mts|cts|tsx|jsx)$/;
const NODE_BUILTINS = new Set(builtinModules);
const SPECIFIER_PATTERNS = [
  /\b(?:import|export)\s+(?:[^'"();]*?\s+from\s+)?['"]([^'"\n]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
];

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export function getSandboxUser(): string {
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  if (
    !Number.isSafeInteger(uid) ||
    !Number.isSafeInteger(gid) ||
    uid === undefined ||
    gid === undefined ||
    uid <= 0 ||
    gid <= 0
  ) {
    throw new HarnessError(
      'SANDBOX_IDENTITY_UNSUPPORTED',
      'A supported non-root host UID/GID is required for sandbox execution.',
    );
  }
  return `${uid}:${gid}`;
}

const executableEntrySchema = z
  .object({
    path: z.string().min(1).max(4096),
    sha256: sha256Schema,
    version: z.string().min(1).max(512),
  })
  .strict();

/**
 * Strict digest-bound installed runtime closure manifest (schema v3).
 *
 * The closure is the entire pinned install tree that hosts the configured SDK entry
 * module (its outermost `node_modules`), plus the emitted worker's own module graph.
 * File bytes, package identities, lockfiles, symlink alias topology, executables and
 * trusted assets are all digest-bound; unknown properties reject.
 */
export const RuntimeClosureManifestSchema = z
  .object({
    schemaVersion: z.literal(3),
    closureRoot: z.string().min(1).max(4096),
    sdk: z
      .object({
        modulePath: z.string().min(1).max(4096),
        moduleSha256: sha256Schema,
        packageName: z.string().min(1).max(256).optional(),
        packageVersion: z.string().min(1).max(128).optional(),
      })
      .strict(),
    packages: z
      .array(
        z
          .object({
            name: z.string().min(1).max(256),
            version: z.string().min(1).max(128),
            relPath: z.string().min(1).max(4096),
            packageJsonSha256: sha256Schema,
          })
          .strict(),
      )
      .max(RUNTIME_CLOSURE_LIMITS.maxFiles),
    files: z
      .array(
        z
          .object({
            relPath: z.string().min(1).max(4096),
            sha256: sha256Schema,
            bytes: z
              .number()
              .int()
              .nonnegative()
              .max(RUNTIME_CLOSURE_LIMITS.maxFileBytes),
            executable: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(RUNTIME_CLOSURE_LIMITS.maxFiles),
    symlinks: z
      .array(
        z
          .object({
            relPath: z.string().min(1).max(4096),
            targetRelPath: z.string().min(1).max(4096),
            kind: z.enum(['file', 'dir']),
          })
          .strict(),
      )
      .max(RUNTIME_CLOSURE_LIMITS.maxSymlinks),
    locks: z
      .array(
        z
          .object({
            relPath: z.string().min(1).max(4096),
            sha256: sha256Schema,
          })
          .strict(),
      )
      .max(8),
    executables: z
      .object({
        node: executableEntrySchema,
        bun: executableEntrySchema,
        git: executableEntrySchema,
        docker: executableEntrySchema,
      })
      .strict(),
    assets: z
      .object({
        supervisor: z
          .object({
            id: z.literal(SUPERVISOR_ASSET_ID),
            sha256: sha256Schema,
            bytes: z
              .number()
              .int()
              .positive()
              .max(8 * 1024 * 1024),
          })
          .strict(),
        worker: z
          .object({
            id: z.literal(WORKER_ASSET_ID),
            path: z.string().min(1).max(4096),
            sha256: sha256Schema,
            bytes: z
              .number()
              .int()
              .positive()
              .max(32 * 1024 * 1024),
            modules: z
              .array(
                z
                  .object({
                    path: z.string().min(1).max(4096),
                    specifier: z.string().min(1).max(4096).optional(),
                    sha256: sha256Schema,
                    bytes: z
                      .number()
                      .int()
                      .nonnegative()
                      .max(WORKER_MODULE_LIMITS.maxFileBytes),
                  })
                  .strict(),
              )
              .max(WORKER_MODULE_LIMITS.maxFiles),
          })
          .strict(),
      })
      .strict(),
    policy: z
      .object({
        dockerImage: z.string().min(1).max(4096),
        allowedToolNames: z.array(z.literal('sandbox_exec')).length(1),
        network: z.literal('none'),
        readOnlyRoot: z.literal(true),
        capDropAll: z.literal(true),
        noNewPrivileges: z.literal(true),
        user: z.string().regex(/^[1-9]\d*:[1-9]\d*$/),
      })
      .strict(),
    runtimeDigest: sha256Schema,
  })
  .strict();

export const RuntimeManifestInputSchema = FleetRuntimeConfigSchema.omit({
  sdkDigest: true,
  manifestDigest: true,
})
  .extend({
    expectedSdkDigest: sha256Schema.optional(),
    expectedManifestDigest: sha256Schema.optional(),
  })
  .strict();
export type RuntimeManifestInput = z.infer<typeof RuntimeManifestInputSchema>;
function readExistingManifestDigest(content: Buffer): string {
  try {
    const parsed: unknown = JSON.parse(content.toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'runtimeDigest' in parsed &&
      typeof parsed.runtimeDigest === 'string'
    ) {
      return parsed.runtimeDigest;
    }
  } catch {
    // Rejected below with a stable CAS error.
  }
  throw new HarnessError(
    'MANIFEST_DIGEST_MISMATCH',
    'Existing runtime manifest is invalid and cannot be replaced without a matching digest.',
  );
}

export type RuntimeClosureManifest = z.infer<
  typeof RuntimeClosureManifestSchema
>;
export type RuntimeExecutableEntry = z.infer<typeof executableEntrySchema>;
export type RuntimeSymlinkEntry = RuntimeClosureManifest['symlinks'][number];
export type RuntimeWorkerModuleEntry =
  RuntimeClosureManifest['assets']['worker']['modules'][number];

export interface ClosureFileEntry {
  relPath: string;
  sha256: string;
  bytes: number;
  executable: boolean;
}

export interface ClosurePackageEntry {
  name: string;
  version: string;
  relPath: string;
  packageJsonSha256: string;
}

export interface ClosureLockEntry {
  relPath: string;
  sha256: string;
}

export interface RuntimeClosure {
  closureRoot: string;
  sdkModulePath: string;
  sdkModuleSha256: string;
  packages: ClosurePackageEntry[];
  files: ClosureFileEntry[];
  symlinks: RuntimeSymlinkEntry[];
  locks: ClosureLockEntry[];
}

interface ClosureCandidate {
  absolutePath: string;
  relPath: string;
  bytes: number;
  executable: boolean;
}

interface WalkedClosure {
  candidates: Map<string, ClosureCandidate>;
  packageJsonRelPaths: string[];
  symlinks: RuntimeSymlinkEntry[];
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

/**
 * Computes SHA-256 hex digest of a regular file. Symbolic links are rejected so a digest
 * always covers examined bytes rather than an indirection.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  const stat = await fs.lstat(resolved).catch(() => null);
  if (!stat) {
    throw new HarnessError(
      'FILE_NOT_FOUND',
      `Target file for SHA-256 calculation does not exist: ${resolved}`,
    );
  }
  if (stat.isSymbolicLink()) {
    throw new HarnessError(
      'SYMLINK_NOT_ALLOWED',
      `Cannot compute digest of symbolic link: ${resolved}`,
    );
  }
  if (!stat.isFile()) {
    throw new HarnessError(
      'NOT_A_REGULAR_FILE',
      `Target path is not a regular file: ${resolved}`,
    );
  }
  return hashRegularFile(resolved);
}

async function hashRegularFile(absolutePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absolutePath);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Verifies that a Docker image string is pinned to an immutable sha256 digest.
 */
export function isPinnedImageDigest(image: string): boolean {
  return /^.+@sha256:[a-f0-9]{64}$/.test(image.trim());
}

/**
 * Calculates the canonical runtime digest of a manifest excluding runtimeDigest itself.
 */
export function computeRuntimeManifestDigest(
  manifest:
    Omit<RuntimeClosureManifest, 'runtimeDigest'> | RuntimeClosureManifest,
): string {
  return canonicalDigest({
    schemaVersion: manifest.schemaVersion,
    closureRoot: manifest.closureRoot,
    sdk: manifest.sdk,
    packages: manifest.packages,
    files: manifest.files,
    symlinks: manifest.symlinks,
    locks: manifest.locks,
    executables: manifest.executables,
    assets: manifest.assets,
    policy: manifest.policy,
  });
}

async function findClosureRoot(entryModuleRealPath: string): Promise<{
  closureRoot: string;
  walkRoots: string[];
}> {
  let current = path.dirname(entryModuleRealPath);
  const nodeModulesAncestors: string[] = [];
  let packageRoot: string | null = null;

  for (;;) {
    if (path.basename(current) === 'node_modules') {
      nodeModulesAncestors.push(current);
    } else if (packageRoot === null) {
      const packageJson = path.join(current, 'package.json');
      const stat = await fs.lstat(packageJson).catch(() => null);
      if (stat?.isFile()) {
        packageRoot = current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  if (nodeModulesAncestors.length > 0) {
    const installRoot = path.dirname(
      nodeModulesAncestors[nodeModulesAncestors.length - 1],
    );
    const installClosureRoot = await fs.realpath(installRoot);
    const nodeModules = path.join(installClosureRoot, 'node_modules');
    const stat = await fs.lstat(nodeModules).catch(() => null);
    if (!stat?.isDirectory()) {
      throw new HarnessError(
        'CLOSURE_INSTALL_ROOT_INVALID',
        `Resolved install root has no node_modules directory: ${installClosureRoot}`,
      );
    }
    return { closureRoot: installClosureRoot, walkRoots: [nodeModules] };
  }

  if (packageRoot) {
    const realPackageRoot = await fs.realpath(packageRoot);
    return { closureRoot: realPackageRoot, walkRoots: [realPackageRoot] };
  }

  const realEntryDir = await fs.realpath(path.dirname(entryModuleRealPath));
  return { closureRoot: realEntryDir, walkRoots: [realEntryDir] };
}

async function walkClosureTree(
  closureRoot: string,
  walkRoots: string[],
  excludePaths: Set<string>,
): Promise<WalkedClosure> {
  const candidates = new Map<string, ClosureCandidate>();
  const packageJsonRelPaths: string[] = [];
  const symlinks: RuntimeSymlinkEntry[] = [];
  const visitedDirs = new Set<string>();
  let totalBytes = 0;

  const addFile = (absoluteRealPath: string, stat: fs.Stats): void => {
    if (excludePaths.has(absoluteRealPath)) {
      return;
    }
    const relPath = toPosix(path.relative(closureRoot, absoluteRealPath));
    if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
      throw new HarnessError(
        'CLOSURE_PATH_ESCAPE',
        `Closure member escapes the closure root: ${absoluteRealPath}`,
      );
    }
    if (candidates.has(relPath)) {
      return;
    }
    if (stat.size > RUNTIME_CLOSURE_LIMITS.maxFileBytes) {
      throw new HarnessError(
        'CLOSURE_BOUNDS_EXCEEDED',
        `Closure file exceeds per-file byte bound: ${relPath} (${stat.size})`,
      );
    }
    totalBytes += stat.size;
    if (
      candidates.size + 1 > RUNTIME_CLOSURE_LIMITS.maxFiles ||
      totalBytes > RUNTIME_CLOSURE_LIMITS.maxTotalBytes
    ) {
      throw new HarnessError(
        'CLOSURE_BOUNDS_EXCEEDED',
        'Installed runtime closure exceeds configured file/byte bounds.',
      );
    }
    candidates.set(relPath, {
      absolutePath: absoluteRealPath,
      relPath,
      bytes: stat.size,
      executable: (stat.mode & 0o111) !== 0,
    });
    if (path.basename(relPath) === 'package.json') {
      packageJsonRelPaths.push(relPath);
    }
  };

  const recordSymlink = (
    linkAbsolutePath: string,
    targetAbsolutePath: string,
    kind: 'file' | 'dir',
  ): void => {
    if (symlinks.length + 1 > RUNTIME_CLOSURE_LIMITS.maxSymlinks) {
      throw new HarnessError(
        'CLOSURE_BOUNDS_EXCEEDED',
        'Installed runtime closure exceeds the symlink bound.',
      );
    }
    const relPath = toPosix(path.relative(closureRoot, linkAbsolutePath));
    const targetRelPath = toPosix(
      path.relative(closureRoot, targetAbsolutePath),
    );
    if (
      relPath.startsWith('..') ||
      targetRelPath.startsWith('..') ||
      path.isAbsolute(relPath) ||
      path.isAbsolute(targetRelPath)
    ) {
      throw new HarnessError(
        'CLOSURE_PATH_ESCAPE',
        `Closure symlink alias escapes the closure root: ${linkAbsolutePath}`,
      );
    }
    symlinks.push({ relPath, targetRelPath, kind });
  };

  const walkDir = async (
    directoryRealPath: string,
    depth: number,
  ): Promise<void> => {
    if (depth > RUNTIME_CLOSURE_LIMITS.maxDepth) {
      throw new HarnessError(
        'CLOSURE_BOUNDS_EXCEEDED',
        `Installed runtime closure exceeds maximum directory depth at: ${directoryRealPath}`,
      );
    }
    if (visitedDirs.has(directoryRealPath)) {
      return;
    }
    visitedDirs.add(directoryRealPath);

    const entries = await fs.readdir(directoryRealPath, {
      withFileTypes: true,
    });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolute = path.join(directoryRealPath, entry.name);
      const stat = await fs.lstat(absolute);
      if (stat.isSymbolicLink()) {
        const target = await fs.realpath(absolute);
        if (!isInside(closureRoot, target)) {
          throw new HarnessError(
            'CLOSURE_PATH_ESCAPE',
            `Closure symlink target escapes the closure root: ${absolute}`,
          );
        }
        const targetStat = await fs.stat(target);
        if (targetStat.isDirectory()) {
          recordSymlink(absolute, target, 'dir');
          await walkDir(target, depth + 1);
        } else if (targetStat.isFile()) {
          recordSymlink(absolute, target, 'file');
          addFile(target, targetStat);
        } else {
          throw new HarnessError(
            'CLOSURE_SPECIAL_FILE',
            `Closure contains a special file: ${absolute}`,
          );
        }
        continue;
      }
      if (stat.isDirectory()) {
        await walkDir(absolute, depth + 1);
        continue;
      }
      if (stat.isFile()) {
        addFile(absolute, stat);
        continue;
      }
      throw new HarnessError(
        'CLOSURE_SPECIAL_FILE',
        `Closure contains a special file: ${absolute}`,
      );
    }
  };

  for (const root of walkRoots) {
    const stat = await fs.lstat(root);
    if (!stat.isDirectory()) {
      throw new HarnessError(
        'CLOSURE_ROOT_INVALID',
        `Closure walk root is not a directory: ${root}`,
      );
    }
    await walkDir(root, 0);
  }

  symlinks.sort((left, right) => left.relPath.localeCompare(right.relPath));
  return { candidates, packageJsonRelPaths, symlinks };
}

async function readPackageIdentity(
  closureRoot: string,
  packageJsonRelPath: string,
): Promise<{ name: string; version: string } | null> {
  const absolute = path.join(closureRoot, packageJsonRelPath);
  try {
    const raw = await fs.readFile(absolute, 'utf8');
    if (raw.length > 1024 * 1024) {
      return null;
    }
    const parsed = JSON.parse(raw) as { name?: unknown; version?: unknown };
    if (typeof parsed.name === 'string' && typeof parsed.version === 'string') {
      return { name: parsed.name, version: parsed.version };
    }
  } catch {
    // Non-package or unreadable package.json is still hashed as a closure member.
  }
  return null;
}

async function hashCandidates(
  candidates: Map<string, ClosureCandidate>,
): Promise<Map<string, string>> {
  const entries = [...candidates.values()].sort((left, right) =>
    left.relPath.localeCompare(right.relPath),
  );
  const digests = new Map<string, string>();
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= entries.length) {
        return;
      }
      const entry = entries[index];
      digests.set(entry.relPath, await hashRegularFile(entry.absolutePath));
    }
  };

  const width = Math.max(
    1,
    Math.min(RUNTIME_CLOSURE_LIMITS.hashConcurrency, entries.length),
  );
  await Promise.all(Array.from({ length: width }, worker));
  return digests;
}

/**
 * Enumerates and hashes the complete installed runtime closure for an SDK entry module.
 * The whole pinned install tree is covered, including symlink alias topology, so neither
 * dependency bytes nor module resolution can be substituted while a single hash matches.
 */
export async function enumerateInstalledClosure(options: {
  entryModulePath: string;
  excludePaths?: string[];
}): Promise<RuntimeClosure> {
  const resolvedEntry = path.resolve(options.entryModulePath);
  const entryStat = await fs.lstat(resolvedEntry).catch(() => null);
  if (!entryStat || !entryStat.isFile()) {
    throw new HarnessError(
      'SDK_MODULE_NOT_FOUND',
      `Configured SDK module is missing or not a regular file: ${resolvedEntry}`,
    );
  }
  const sdkModulePath = await fs.realpath(resolvedEntry);

  const excludePaths = new Set<string>();
  for (const excluded of options.excludePaths ?? []) {
    const resolved = path.resolve(excluded);
    excludePaths.add(resolved);
    try {
      excludePaths.add(await fs.realpath(resolved));
    } catch {
      // Missing exclusion is still excluded by its configured path.
    }
  }

  const { closureRoot, walkRoots } = await findClosureRoot(sdkModulePath);
  const { candidates, packageJsonRelPaths, symlinks } = await walkClosureTree(
    closureRoot,
    walkRoots,
    excludePaths,
  );

  if (!candidates.has(toPosix(path.relative(closureRoot, sdkModulePath)))) {
    throw new HarnessError(
      'CLOSURE_ENTRY_NOT_ENUMERATED',
      'SDK entry module was not enumerated inside its installed closure.',
    );
  }

  const locks: ClosureLockEntry[] = [];
  for (const lockName of LOCK_FILE_NAMES) {
    const absolute = path.join(closureRoot, lockName);
    const stat = await fs.lstat(absolute).catch(() => null);
    if (!stat?.isFile()) {
      continue;
    }
    const real = await fs.realpath(absolute);
    locks.push({
      relPath: toPosix(path.relative(closureRoot, real)),
      sha256: await hashRegularFile(real),
    });
  }

  const digests = await hashCandidates(candidates);

  const files: ClosureFileEntry[] = [...candidates.values()]
    .map((candidate) => ({
      relPath: candidate.relPath,
      sha256: digests.get(candidate.relPath) ?? '',
      bytes: candidate.bytes,
      executable: candidate.executable,
    }))
    .sort((left, right) => left.relPath.localeCompare(right.relPath));

  const packages: ClosurePackageEntry[] = [];
  for (const relPath of packageJsonRelPaths) {
    const identity = await readPackageIdentity(closureRoot, relPath);
    if (!identity) {
      continue;
    }
    packages.push({
      name: identity.name,
      version: identity.version,
      relPath: toPosix(path.dirname(relPath)),
      packageJsonSha256: digests.get(relPath) ?? '',
    });
  }
  packages.sort((left, right) => left.relPath.localeCompare(right.relPath));

  return {
    closureRoot,
    sdkModulePath,
    sdkModuleSha256:
      digests.get(toPosix(path.relative(closureRoot, sdkModulePath))) ?? '',
    packages,
    locks,
    symlinks,
    files,
  };
}

function parsePackageSpecifier(
  specifier: string,
): { name: string; subpath: string } | null {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('#')
  ) {
    return null;
  }
  const segments = specifier.split('/');
  const name = specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
  if (!name || (specifier.startsWith('@') && segments.length < 2)) {
    return null;
  }
  return {
    name,
    subpath: segments.slice(name.startsWith('@') ? 2 : 1).join('/'),
  };
}

async function resolveFileCandidate(candidate: string): Promise<string | null> {
  const suffixes = [
    '',
    '.js',
    '.mjs',
    '.cjs',
    '.ts',
    '.mts',
    '.cts',
    '.json',
    '/index.js',
    '/index.mjs',
    '/index.cjs',
    '/index.ts',
    '/index.json',
  ];
  for (const suffix of suffixes) {
    const target = `${candidate}${suffix}`;
    const stat = await fs.lstat(target).catch(() => null);
    if (stat?.isFile() && !stat.isSymbolicLink()) {
      return fs.realpath(target);
    }
  }
  return null;
}

async function resolvePackageEntry(
  packageRoot: string,
  subpath: string,
): Promise<string | null> {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  let mainTarget = 'index.js';
  try {
    const raw = await fs.readFile(packageJsonPath, 'utf8');
    if (raw.length <= 1024 * 1024) {
      const parsed = JSON.parse(raw) as {
        main?: unknown;
        module?: unknown;
        exports?: unknown;
      };
      const exportsField = parsed.exports;
      if (typeof exportsField === 'string') {
        mainTarget = exportsField;
      } else if (exportsField && typeof exportsField === 'object') {
        const rootExport = (exportsField as Record<string, unknown>)['.'];
        if (typeof rootExport === 'string') {
          mainTarget = rootExport;
        } else if (rootExport && typeof rootExport === 'object') {
          const importTarget = (rootExport as Record<string, unknown>).import;
          const defaultTarget = (rootExport as Record<string, unknown>).default;
          if (typeof importTarget === 'string') {
            mainTarget = importTarget;
          } else if (typeof defaultTarget === 'string') {
            mainTarget = defaultTarget;
          }
        }
      } else if (typeof parsed.module === 'string') {
        mainTarget = parsed.module;
      } else if (typeof parsed.main === 'string') {
        mainTarget = parsed.main;
      }
    }
  } catch {
    // Fall back to index.js resolution below.
  }
  const target = subpath.length > 0 ? subpath : mainTarget;
  return resolveFileCandidate(path.resolve(packageRoot, target));
}

async function resolveBareSpecifier(
  importerDir: string,
  specifier: string,
): Promise<string | null> {
  const parsed = parsePackageSpecifier(specifier);
  if (!parsed) {
    return null;
  }
  let directory = importerDir;
  for (;;) {
    const packageRoot = path.join(directory, 'node_modules', parsed.name);
    const stat = await fs.lstat(packageRoot).catch(() => null);
    if (stat) {
      const realRoot = await fs.realpath(packageRoot);
      const entry = await resolvePackageEntry(realRoot, parsed.subpath);
      if (entry) {
        return entry;
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return null;
    }
    directory = parent;
  }
}

function extractSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of SPECIFIER_PATTERNS) {
    const expression = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null = expression.exec(source);
    while (match) {
      const specifier = match[1];
      if (specifier && !/[{}$\s]/.test(specifier)) {
        specifiers.add(specifier);
      }
      match = expression.exec(source);
    }
  }
  return [...specifiers].sort();
}

/**
 * Enumerates the emitted worker's own static module graph: relative chunks plus every
 * resolvable bare dependency. Non-literal dynamic imports (the runtime-selected SDK module)
 * stay covered by the installed-closure digest instead.
 */
export async function enumerateWorkerModuleClosure(
  workerPath: string,
): Promise<RuntimeWorkerModuleEntry[]> {
  const workerReal = await fs.realpath(path.resolve(workerPath));
  const workerStat = await fs.lstat(workerReal);
  if (!workerStat.isFile() || workerStat.isSymbolicLink()) {
    throw new HarnessError(
      'WORKER_ASSET_NOT_FOUND',
      `Worker asset is not a regular file: ${workerReal}`,
    );
  }

  const queues: Array<{ filePath: string; specifier?: string; depth: number }> =
    [{ filePath: workerReal, depth: 0 }];
  const seen = new Map<string, RuntimeWorkerModuleEntry>();
  let totalBytes = 0;

  while (queues.length > 0) {
    const current = queues.shift() as {
      filePath: string;
      specifier?: string;
      depth: number;
    };
    const real = await fs.realpath(current.filePath).catch(() => null);
    if (!real || seen.has(real)) {
      continue;
    }
    const stat = await fs.lstat(real).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink()) {
      throw new HarnessError(
        'WORKER_MODULE_UNRESOLVED',
        `Worker module is not a regular file: ${current.filePath}`,
      );
    }
    if (stat.size > WORKER_MODULE_LIMITS.maxFileBytes) {
      throw new HarnessError(
        'WORKER_MODULE_BOUNDS_EXCEEDED',
        `Worker module exceeds per-file bound: ${real}`,
      );
    }
    totalBytes += stat.size;
    if (
      seen.size + 1 > WORKER_MODULE_LIMITS.maxFiles ||
      totalBytes > WORKER_MODULE_LIMITS.maxBytes
    ) {
      throw new HarnessError(
        'WORKER_MODULE_BOUNDS_EXCEEDED',
        'Worker module graph exceeds configured file/byte bounds.',
      );
    }
    const entry: RuntimeWorkerModuleEntry = {
      path: real,
      sha256: await hashRegularFile(real),
      bytes: stat.size,
    };
    if (current.specifier) {
      entry.specifier = current.specifier;
    }
    seen.set(real, entry);

    if (
      !CODE_FILE_PATTERN.test(real) ||
      stat.size > WORKER_MODULE_LIMITS.maxScanFileBytes
    ) {
      continue;
    }
    if (current.depth + 1 > WORKER_MODULE_LIMITS.maxDepth) {
      throw new HarnessError(
        'WORKER_MODULE_BOUNDS_EXCEEDED',
        'Worker module graph exceeds maximum depth.',
      );
    }
    const source = await fs.readFile(real, 'utf8');
    for (const specifier of extractSpecifiers(source)) {
      if (
        specifier.startsWith('node:') ||
        specifier.startsWith('bun:') ||
        NODE_BUILTINS.has(specifier) ||
        NODE_BUILTINS.has(specifier.split('/')[0])
      ) {
        continue;
      }
      let resolved: string | null;
      if (specifier.startsWith('.')) {
        resolved = await resolveFileCandidate(
          path.resolve(path.dirname(real), specifier),
        );
      } else if (specifier.startsWith('/') || specifier.startsWith('#')) {
        resolved = null;
      } else {
        resolved = await resolveBareSpecifier(path.dirname(real), specifier);
      }
      if (!resolved) {
        throw new HarnessError(
          'WORKER_MODULE_UNRESOLVED',
          `Worker module graph has an unresolvable import "${specifier}" in ${real}`,
        );
      }
      queues.push({ filePath: resolved, specifier, depth: current.depth + 1 });
    }
  }

  return [...seen.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

async function readExecutableVersion(commandPath: string): Promise<string> {
  const result = await execFile(commandPath, ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 64 * 1024,
    env: {
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
      LC_ALL: 'C',
      LANG: 'C',
    },
  }).catch((error: unknown) => {
    throw new HarnessError(
      'EXECUTABLE_VERSION_UNREADABLE',
      `Configured runtime executable did not report --version: ${commandPath} (${String(error)})`,
    );
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const firstLine = output
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .find((line) => line.length > 0);
  if (!firstLine) {
    throw new HarnessError(
      'EXECUTABLE_VERSION_UNREADABLE',
      `Configured runtime executable returned an empty version string: ${commandPath}`,
    );
  }
  return firstLine;
}

async function buildExecutableEntry(
  commandPath: string,
): Promise<RuntimeExecutableEntry> {
  const real = await fs.realpath(path.resolve(commandPath)).catch(() => null);
  if (!real) {
    throw new HarnessError(
      'EXECUTABLE_NOT_FOUND',
      `Configured runtime executable does not exist: ${commandPath}`,
    );
  }
  return {
    path: real,
    sha256: await computeFileSha256(real),
    version: await readExecutableVersion(real),
  };
}

/**
 * Generates an operator-pinned installed-closure manifest from configured paths and the
 * actual trusted runner assets. There is no silent recalculation path: generation only
 * happens here, and verification always compares against configured digests.
 */
export async function createRuntimeManifest(
  input: RuntimeManifestInput,
): Promise<{
  manifest: RuntimeClosureManifest;
  runtime: FleetRuntimeConfig;
  manifestDigest: string;
}> {
  const validatedInput = RuntimeManifestInputSchema.parse(input);
  const { expectedSdkDigest, expectedManifestDigest, ...runtimeInput } =
    validatedInput;
  const runtime: Omit<FleetRuntimeConfig, 'sdkDigest' | 'manifestDigest'> =
    runtimeInput;
  const sandboxUser = getSandboxUser();

  if (expectedManifestDigest) {
    const current = await fs
      .readFile(runtime.manifestFile)
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
    if (
      !current ||
      readExistingManifestDigest(current) !== expectedManifestDigest
    ) {
      throw new HarnessError(
        'MANIFEST_DIGEST_MISMATCH',
        'Existing runtime manifest does not match expectedManifestDigest.',
      );
    }
  }
  if (!isPinnedImageDigest(runtime.image)) {
    throw new HarnessError(
      'IMAGE_NOT_PINNED_DIGEST',
      `Docker image must be pinned to an immutable digest: ${runtime.image}`,
    );
  }
  const supervisorAsset = getSupervisorAsset();
  const workerAsset = await readWorkerAsset().catch((error) => {
    throw new HarnessError(
      'RUNTIME_ASSET_UNRESOLVED',
      error instanceof Error
        ? error.message
        : 'Trusted worker asset is unavailable.',
    );
  });
  const workerModules = await enumerateWorkerModuleClosure(
    workerAsset.path,
  ).catch((error) => {
    throw new HarnessError(
      'RUNTIME_ASSET_UNRESOLVED',
      error instanceof Error
        ? error.message
        : 'Trusted worker closure is unresolved.',
    );
  });
  if (
    workerModules.length !== 1 ||
    workerModules[0]?.path !== workerAsset.path
  ) {
    throw new HarnessError(
      'RUNTIME_WORKER_NOT_STANDALONE',
      'Shipped worker must be a single self-contained ESM asset.',
    );
  }

  const closure = await enumerateInstalledClosure({
    entryModulePath: runtime.sdkModule,
    excludePaths: [runtime.manifestFile],
  });

  const sdkPackage = closure.packages
    .map((entry) => ({
      entry,
      entryDirectory:
        entry.relPath === '.'
          ? closure.closureRoot
          : path.join(closure.closureRoot, entry.relPath),
    }))
    .filter(({ entryDirectory }) =>
      closure.sdkModulePath.startsWith(`${entryDirectory}${path.sep}`),
    )
    .sort(
      (left, right) => right.entryDirectory.length - left.entryDirectory.length,
    )[0]?.entry;

  if (
    sdkPackage &&
    runtime.ompVersion &&
    sdkPackage.version !== runtime.ompVersion
  ) {
    throw new HarnessError(
      'SDK_VERSION_MISMATCH',
      `Configured ompVersion ${runtime.ompVersion} does not match installed SDK package version ${sdkPackage.version}.`,
    );
  }

  const sdk: RuntimeClosureManifest['sdk'] = {
    modulePath: closure.sdkModulePath,
    moduleSha256: closure.sdkModuleSha256,
  };
  if (sdkPackage) {
    sdk.packageName = sdkPackage.name;
    sdk.packageVersion = sdkPackage.version;
  }

  const manifestData: Omit<RuntimeClosureManifest, 'runtimeDigest'> = {
    schemaVersion: 3,
    closureRoot: closure.closureRoot,
    sdk,
    packages: closure.packages,
    files: closure.files,
    symlinks: closure.symlinks,
    locks: closure.locks,
    executables: {
      node: await buildExecutableEntry(runtime.nodeCommand),
      bun: await buildExecutableEntry(runtime.bunCommand),
      git: await buildExecutableEntry(runtime.gitCommand),
      docker: await buildExecutableEntry(runtime.dockerCommand),
    },
    assets: {
      supervisor: {
        id: supervisorAsset.id,
        sha256: supervisorAsset.sha256,
        bytes: supervisorAsset.bytes,
      },
      worker: {
        id: workerAsset.id,
        path: workerAsset.path,
        sha256: workerAsset.sha256,
        bytes: workerAsset.bytes,
        modules: workerModules,
      },
    },
    policy: {
      dockerImage: runtime.image,
      allowedToolNames: ['sandbox_exec'],
      network: 'none',
      readOnlyRoot: true,
      capDropAll: true,
      noNewPrivileges: true,
      user: sandboxUser,
    },
  };

  const manifest: RuntimeClosureManifest = {
    ...manifestData,
    runtimeDigest: computeRuntimeManifestDigest(manifestData),
  };
  const current = await fs
    .readFile(runtime.manifestFile)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
  if (current) {
    const existingDigest = readExistingManifestDigest(current);
    if (
      existingDigest !== manifest.runtimeDigest &&
      existingDigest !== expectedManifestDigest
    ) {
      throw new HarnessError(
        'MANIFEST_DIGEST_MISMATCH',
        'Existing runtime manifest differs; expectedManifestDigest is required for replacement.',
      );
    }
  }

  if (expectedSdkDigest && expectedSdkDigest !== closure.sdkModuleSha256) {
    throw new HarnessError(
      'SDK_DIGEST_MISMATCH',
      'Installed SDK digest does not match expectedSdkDigest.',
    );
  }
  const resolvedRuntime: FleetRuntimeConfig = {
    ...runtime,
    sdkDigest: closure.sdkModuleSha256,
    manifestDigest: manifest.runtimeDigest,
  };
  return {
    manifest,
    runtime: resolvedRuntime,
    manifestDigest: manifest.runtimeDigest,
  };
}

export interface RuntimeVerificationResult {
  valid: boolean;
  reasonCodes: string[];
  computedDigest: string;
  manifest?: RuntimeClosureManifest;
}

function compareClosure(
  manifest: RuntimeClosureManifest,
  closure: RuntimeClosure,
  manifestFilesByRelPath: Map<string, { bytes: number; executable: boolean }>,
): string[] {
  const reasonCodes: string[] = [];

  if (manifest.closureRoot !== closure.closureRoot) {
    reasonCodes.push('CLOSURE_ROOT_MISMATCH');
  }
  if (manifest.sdk.modulePath !== closure.sdkModulePath) {
    reasonCodes.push('SDK_MODULE_PATH_MISMATCH');
  }
  if (manifest.sdk.moduleSha256 !== closure.sdkModuleSha256) {
    reasonCodes.push('SDK_MODULE_HASH_MISMATCH');
  }

  const currentFiles = new Map(
    closure.files.map((file) => [file.relPath, file]),
  );
  if (currentFiles.size !== manifestFilesByRelPath.size) {
    reasonCodes.push('CLOSURE_FILE_SET_MISMATCH');
  } else {
    for (const [relPath, metadata] of manifestFilesByRelPath) {
      const current = currentFiles.get(relPath);
      if (
        !current ||
        current.bytes !== metadata.bytes ||
        current.executable !== metadata.executable
      ) {
        reasonCodes.push('CLOSURE_FILE_SET_MISMATCH');
        break;
      }
    }
  }

  const manifestPackages = manifest.packages
    .map((entry) => `${entry.name}@${entry.version}:${entry.relPath}`)
    .sort();
  const currentPackages = closure.packages
    .map((entry) => `${entry.name}@${entry.version}:${entry.relPath}`)
    .sort();
  if (manifestPackages.join('\n') !== currentPackages.join('\n')) {
    reasonCodes.push('CLOSURE_PACKAGE_SET_MISMATCH');
  }

  const manifestSymlinks = manifest.symlinks
    .map((entry) => `${entry.relPath}->${entry.targetRelPath}:${entry.kind}`)
    .sort();
  const currentSymlinks = closure.symlinks
    .map((entry) => `${entry.relPath}->${entry.targetRelPath}:${entry.kind}`)
    .sort();
  if (manifestSymlinks.join('\n') !== currentSymlinks.join('\n')) {
    reasonCodes.push('CLOSURE_SYMLINK_TOPOLOGY_MISMATCH');
  }

  const manifestLocks = manifest.locks
    .map((entry) => `${entry.relPath}:${entry.sha256}`)
    .sort();
  const currentLocks = closure.locks
    .map((entry) => `${entry.relPath}:${entry.sha256}`)
    .sort();
  if (manifestLocks.join('\n') !== currentLocks.join('\n')) {
    reasonCodes.push('CLOSURE_LOCK_SET_MISMATCH');
  }

  return reasonCodes;
}

/**
 * Verifies the configured installed runtime closure, executable identities and trusted
 * asset bytes. No binary is executed until manifest authority, closure bytes, topology and
 * asset bytes have all been verified.
 */
export async function verifyRuntimeManifest(
  manifestPath: string,
  runtime: FleetRuntimeConfig,
  expectedRuntimeDigest?: string,
): Promise<RuntimeVerificationResult> {
  const reasonCodes: string[] = [];
  const resolvedManifestPath = path.resolve(manifestPath);

  let rawContent: string;
  try {
    const stat = await fs.lstat(resolvedManifestPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return {
        valid: false,
        reasonCodes: ['MANIFEST_NOT_REGULAR_FILE'],
        computedDigest: '',
      };
    }
    if (stat.size > RUNTIME_CLOSURE_LIMITS.maxManifestBytes) {
      return {
        valid: false,
        reasonCodes: ['MANIFEST_BOUNDS_EXCEEDED'],
        computedDigest: '',
      };
    }
    rawContent = await fs.readFile(resolvedManifestPath, 'utf8');
  } catch {
    return {
      valid: false,
      reasonCodes: ['MANIFEST_FILE_NOT_FOUND'],
      computedDigest: '',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return {
      valid: false,
      reasonCodes: ['MANIFEST_INVALID_JSON'],
      computedDigest: '',
    };
  }

  const schemaResult = RuntimeClosureManifestSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return {
      valid: false,
      reasonCodes: ['MANIFEST_SCHEMA_INVALID'],
      computedDigest: '',
    };
  }
  const manifest = schemaResult.data;
  try {
    if (manifest.policy.user !== getSandboxUser()) {
      reasonCodes.push('SANDBOX_IDENTITY_MISMATCH');
    }
  } catch {
    reasonCodes.push('SANDBOX_IDENTITY_UNSUPPORTED');
  }

  if (!isPinnedImageDigest(manifest.policy.dockerImage)) {
    reasonCodes.push('IMAGE_NOT_PINNED_DIGEST');
  } else if (manifest.policy.dockerImage !== runtime.image) {
    reasonCodes.push('IMAGE_MISMATCH_WITH_RUNTIME_CONFIG');
  }

  const computedDigest = computeRuntimeManifestDigest(manifest);
  if (manifest.runtimeDigest !== computedDigest) {
    reasonCodes.push('MANIFEST_DIGEST_MISMATCH');
  }
  if (runtime.manifestDigest && runtime.manifestDigest !== computedDigest) {
    reasonCodes.push('CONFIG_MANIFEST_DIGEST_MISMATCH');
  }
  if (expectedRuntimeDigest && expectedRuntimeDigest !== computedDigest) {
    reasonCodes.push('EXPECTED_RUNTIME_DIGEST_MISMATCH');
  }

  // Authority gates first: nothing below may execute a binary until these pass.
  if (reasonCodes.length > 0) {
    return {
      valid: false,
      reasonCodes: [...new Set(reasonCodes)],
      computedDigest,
      manifest,
    };
  }

  const manifestFilesByRelPath = new Map(
    manifest.files.map((file) => [
      file.relPath,
      { bytes: file.bytes, executable: file.executable },
    ]),
  );

  try {
    const closure = await enumerateInstalledClosure({
      entryModulePath: runtime.sdkModule,
      excludePaths: [resolvedManifestPath],
    });
    reasonCodes.push(
      ...compareClosure(manifest, closure, manifestFilesByRelPath),
    );

    const currentDigests = new Map(
      closure.files.map((file) => [file.relPath, file.sha256]),
    );
    let hashMismatch = false;
    for (const file of manifest.files) {
      if (currentDigests.get(file.relPath) !== file.sha256) {
        hashMismatch = true;
        break;
      }
    }
    if (hashMismatch) {
      reasonCodes.push('CLOSURE_FILE_HASH_MISMATCH');
    }
  } catch (error) {
    reasonCodes.push(
      error instanceof HarnessError ? error.code : 'CLOSURE_ENUMERATION_FAILED',
    );
  }

  const supervisorAsset = getSupervisorAsset();
  if (
    manifest.assets.supervisor.sha256 !== supervisorAsset.sha256 ||
    manifest.assets.supervisor.bytes !== supervisorAsset.bytes
  ) {
    reasonCodes.push('SUPERVISOR_ASSET_HASH_MISMATCH');
  }

  try {
    const workerAsset = await readWorkerAsset();
    if (workerAsset.path !== manifest.assets.worker.path) {
      reasonCodes.push('WORKER_ASSET_PATH_MISMATCH');
    }
    if (
      workerAsset.sha256 !== manifest.assets.worker.sha256 ||
      workerAsset.bytes !== manifest.assets.worker.bytes
    ) {
      reasonCodes.push('WORKER_ASSET_HASH_MISMATCH');
    }
    try {
      const currentModules = await enumerateWorkerModuleClosure(
        workerAsset.path,
      );
      const manifestModules = manifest.assets.worker.modules
        .map((entry) => `${entry.path}:${entry.sha256}:${entry.bytes}`)
        .sort();
      const resolvedModules = currentModules
        .map((entry) => `${entry.path}:${entry.sha256}:${entry.bytes}`)
        .sort();
      if (manifestModules.join('\n') !== resolvedModules.join('\n')) {
        reasonCodes.push('WORKER_MODULE_CLOSURE_MISMATCH');
      }
    } catch (error) {
      reasonCodes.push(
        error instanceof HarnessError
          ? error.code
          : 'WORKER_MODULE_CLOSURE_FAILED',
      );
    }
  } catch (error) {
    reasonCodes.push(
      error instanceof HarnessError
        ? error.code
        : 'WORKER_ASSET_VERIFICATION_FAILED',
    );
  }

  const configuredExecutables: Array<{
    key: keyof RuntimeClosureManifest['executables'];
    configured: string;
    mismatchCode: string;
  }> = [
    {
      key: 'node',
      configured: runtime.nodeCommand,
      mismatchCode: 'NODE_BINARY_MISMATCH',
    },
    {
      key: 'bun',
      configured: runtime.bunCommand,
      mismatchCode: 'BUN_BINARY_MISMATCH',
    },
    {
      key: 'git',
      configured: runtime.gitCommand,
      mismatchCode: 'GIT_BINARY_MISMATCH',
    },
    {
      key: 'docker',
      configured: runtime.dockerCommand,
      mismatchCode: 'DOCKER_BINARY_MISMATCH',
    },
  ];

  let executablePathsValid = true;
  for (const check of configuredExecutables) {
    const entry = manifest.executables[check.key];
    const configuredReal = await fs
      .realpath(path.resolve(check.configured))
      .catch(() => null);
    if (!configuredReal) {
      reasonCodes.push(`${check.mismatchCode}_NOT_FOUND`);
      executablePathsValid = false;
      continue;
    }
    if (configuredReal !== entry.path) {
      reasonCodes.push(`${check.mismatchCode}_PATH`);
      executablePathsValid = false;
      continue;
    }
    try {
      if ((await computeFileSha256(entry.path)) !== entry.sha256) {
        reasonCodes.push(`${check.mismatchCode}_HASH`);
        executablePathsValid = false;
      }
    } catch {
      reasonCodes.push(`${check.mismatchCode}_UNREADABLE`);
      executablePathsValid = false;
    }
  }

  // Bytes verified; only now may version probes execute the configured binaries.
  if (executablePathsValid && reasonCodes.length === 0) {
    for (const check of configuredExecutables) {
      const entry = manifest.executables[check.key];
      try {
        if ((await readExecutableVersion(entry.path)) !== entry.version) {
          reasonCodes.push(`${check.mismatchCode}_VERSION`);
        }
      } catch {
        reasonCodes.push(`${check.mismatchCode}_UNREADABLE`);
      }
    }
  }

  const unique = [...new Set(reasonCodes)];
  return {
    valid: unique.length === 0,
    reasonCodes: unique,
    computedDigest,
    manifest,
  };
}
