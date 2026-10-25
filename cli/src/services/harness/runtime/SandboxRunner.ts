import { execFile as nodeExecFile } from 'child_process';
import { constants as fsConstants } from 'fs';
import crypto from 'crypto';
import fs from 'fs-extra';
import nodeFs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import {
  ContainerInstanceRecord,
  getRuntimeStateReceiptPath,
  getTerminationReceiptPath,
  getWorkerBootId,
  getWorkerCompletionReceiptPath,
  LocalSupervisor,
  ReadonlyMount,
  WorkerCompletionReceiptSchema,
  type RuntimeStateReceipt,
  type WorkerCompletionReceipt,
  type WorkerTerminationReceipt,
} from './LocalSupervisor';
import { isPinnedImageDigest, verifyRuntimeManifest } from './RuntimeManifest';
import {
  canonicalDigest,
  ExecutionContext,
  FleetRuntimeConfig,
  FleetTask,
  HarnessError,
  TerminationEvidence,
  TerminationEvidenceSchema,
} from './RuntimeTypes';
export interface ModelWorkerProof {
  kind: 'completion' | 'termination';
  digest: string;
  attemptId: string;
  generation: number;
  role: 'task';
  runtimeDigest: string;
  workerBootId: string;
  exitCode: number | null;
  confirmed: boolean;
}

export interface RoleStopProof {
  context: {
    attemptId: string;
    generation: number;
    role: 'task' | 'evaluator';
    runtimeDigest: string;
  };
  termination: TerminationEvidence;
  runtimeState: RuntimeStateReceipt;
  modelWorker: ModelWorkerProof | null;
  wholeGroupStopped: boolean;
}

const execFile = promisify(nodeExecFile);

const SAFE_COMMAND_ENV: NodeJS.ProcessEnv = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  LC_ALL: 'C',
  LANG: 'C',
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '/bin/true',
  SSH_ASKPASS: '/bin/true',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_ATTR_NOSYSTEM: '1',
  GIT_NO_LAZY_FETCH: '1',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_PROTOCOL_FROM_USER: '0',
  GIT_ALLOW_PROTOCOL: '',
};

const GIT_CONFIG_OVERRIDES = [
  '-c',
  'core.hooksPath=/dev/null',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.symlinks=false',
  '-c',
  'core.askPass=/bin/true',
  '-c',
  'credential.helper=',
  '-c',
  'protocol.allow=never',
  '-c',
  'protocol.file.allow=never',
  '-c',
  'gc.auto=0',
  '-c',
  'fetch.recurseSubmodules=false',
  '-c',
  'submodule.recurse=false',
];

export const SNAPSHOT_LIMITS = {
  MAX_FILES: 10000,
  MAX_DIRECTORIES: 20000,
  MAX_TOTAL_BYTES: 100 * 1024 * 1024,
  MAX_BLOB_BYTES: 20 * 1024 * 1024,
  MAX_STDOUT_BYTES: 5 * 1024 * 1024,
  MAX_STDERR_BYTES: 5 * 1024 * 1024,
  MAX_DEPTH: 32,
  MAX_READONLY_PATHS: 16,
  MAX_ARGV_ENTRIES: 128,
  MAX_ARGV_LENGTH: 4096,
  MAX_ENV_ENTRIES: 32,
  IMPORT_DEADLINE_MS: 30000,
} as const;

export const EVALUATION_WORKSPACE_DIRNAME = 'workspace';
export const EVALUATION_VERIFIER_DIRNAME = 'verifier';
export const EVALUATION_VERIFIER_MOUNT = '/readonly/verifier';
export const EVALUATION_RECEIPT_FILENAME = 'evaluation-receipt.json';
export const DELETION_MARKER_FILENAME = '.ags-fleet-deletions.json';

const DENIED_CONTAINER_ENV = [
  'NODE_OPTIONS',
  'BUN_OPTIONS',
  'BUN_INSTALL',
  'LD_PRELOAD',
  'LD_LIBRARY_PATH',
  'DYLD_INSERT_LIBRARIES',
  'DYLD_LIBRARY_PATH',
  'NODE_PATH',
  'DOCKER_HOST',
];

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

/**
 * Durable evaluator preparation receipt. It binds the exact verifier file digests and the
 * fixed container mount path so execution cannot silently use a writable workspace copy.
 */
export const EvaluationPreparationReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    workspace: z.literal(EVALUATION_WORKSPACE_DIRNAME),
    verifier: z.literal(EVALUATION_VERIFIER_DIRNAME),
    verifierMount: z.literal(EVALUATION_VERIFIER_MOUNT),
    verifierFiles: z
      .array(
        z
          .object({
            relPath: z.string().min(1).max(4096),
            sha256: sha256Schema,
          })
          .strict(),
      )
      .max(SNAPSHOT_LIMITS.MAX_FILES),
    verifierDigest: sha256Schema,
    verifierArgv: z.array(z.string().min(1).max(4096)).min(1).max(64),
    deletionMarkers: z
      .array(z.string().min(1).max(4096))
      .max(SNAPSHOT_LIMITS.MAX_FILES),
    preparedAt: z.number().int().positive(),
  })
  .strict();

export type EvaluationPreparationReceipt = z.infer<
  typeof EvaluationPreparationReceiptSchema
>;

export function getEvaluationWorkspacePath(destination: string): string {
  return path.join(path.resolve(destination), EVALUATION_WORKSPACE_DIRNAME);
}

export function getEvaluationVerifierPath(destination: string): string {
  return path.join(path.resolve(destination), EVALUATION_VERIFIER_DIRNAME);
}

function getEvaluationReceiptPath(destination: string): string {
  return path.join(path.resolve(destination), EVALUATION_RECEIPT_FILENAME);
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function isOverlapping(first: string, second: string): boolean {
  return isInside(first, second) || isInside(second, first);
}

function digestJson(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value), 'utf8')
    .digest('hex');
}

function assertSafeRelativePath(relPath: string, code: string): void {
  if (
    relPath.length === 0 ||
    relPath.length > 4096 ||
    relPath.startsWith('/') ||
    relPath.includes('\\') ||
    relPath.includes('\0') ||
    relPath.split('/').some((segment) => segment === '..' || segment === '.')
  ) {
    throw new HarnessError(code, `Unsafe relative path rejected: ${relPath}`);
  }
}

async function canonicalizeProspectivePath(target: string): Promise<string> {
  const resolved = path.resolve(target);
  let existing = resolved;
  const suffix: string[] = [];
  for (;;) {
    try {
      const stat = await fs.lstat(existing);
      if (stat.isSymbolicLink()) {
        throw new HarnessError(
          'DESTINATION_SYMLINK_FORBIDDEN',
          `Destination path traverses a symbolic link: ${existing}`,
        );
      }
      const real = await fs.realpath(existing);
      return path.join(real, ...suffix.reverse());
    } catch (error) {
      if (error instanceof HarnessError) {
        throw error;
      }
      const parent = path.dirname(existing);
      if (parent === existing) {
        throw new HarnessError(
          'DESTINATION_UNRESOLVABLE',
          `Unable to resolve destination path: ${resolved}`,
        );
      }
      suffix.push(path.basename(existing));
      existing = parent;
    }
  }
}

async function assertFreshOwnedDirectory(
  target: string,
  disallowedRoots: string[],
): Promise<string> {
  const canonical = await canonicalizeProspectivePath(target);
  for (const disallowed of disallowedRoots) {
    if (isOverlapping(canonical, disallowed)) {
      throw new HarnessError(
        'DESTINATION_OVERLAP_FORBIDDEN',
        `Destination overlaps an input or project root: ${canonical}`,
      );
    }
  }
  const stat = await fs.lstat(canonical).catch(() => null);
  if (stat) {
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new HarnessError(
        'DESTINATION_NOT_DIRECTORY',
        `Destination must be a regular directory: ${canonical}`,
      );
    }
    const entries = await fs.readdir(canonical);
    if (entries.length > 0) {
      throw new HarnessError(
        'DESTINATION_NOT_EMPTY',
        `Refusing destructive preparation of a non-empty destination: ${canonical}`,
      );
    }
  }
  await fs.ensureDir(canonical, 0o700);
  return canonical;
}

async function assertRegularDirectory(
  target: string,
  code: string,
): Promise<string> {
  const resolved = path.resolve(target);
  const stat = await fs.lstat(resolved).catch(() => null);
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new HarnessError(
      code,
      `Path must be a regular directory: ${resolved}`,
    );
  }
  return fs.realpath(resolved);
}

function validateContainerArgv(argv: string[]): string[] {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new HarnessError(
      'INVALID_ARGV',
      'Container argv must be a non-empty array.',
    );
  }
  if (argv.length > SNAPSHOT_LIMITS.MAX_ARGV_ENTRIES) {
    throw new HarnessError(
      'INVALID_ARGV',
      `Container argv exceeds ${SNAPSHOT_LIMITS.MAX_ARGV_ENTRIES} entries.`,
    );
  }
  return argv.map((entry) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new HarnessError(
        'INVALID_ARGV',
        'Container argv entries must be non-empty strings.',
      );
    }
    if (
      entry.length > SNAPSHOT_LIMITS.MAX_ARGV_LENGTH ||
      entry.includes('\0')
    ) {
      throw new HarnessError(
        'INVALID_ARGV',
        'Container argv entry exceeds bounds or contains a NUL byte.',
      );
    }
    return entry;
  });
}

/**
 * Evaluator argv must reference the protected verifier mount, never a writable workspace
 * copy of a protected verifier file.
 */
function resolveTrustedVerifierArgv(
  argv: string[],
  verifierRelPaths: string[],
): string[] {
  const files = new Set(verifierRelPaths);
  if (files.size === 0 || argv.length === 0) {
    throw new HarnessError(
      'EVALUATOR_CONTRACT_INVALID',
      'A frozen verifier script is required.',
    );
  }
  const interpreters: Record<string, true> = {
    node: true,
    python3: true,
    sh: true,
    bash: true,
    bun: true,
  };
  const interpreter = Object.hasOwn(interpreters, argv[0]);
  const scriptIndex = interpreter ? 1 : 0;
  if (argv.length <= scriptIndex || argv[scriptIndex].startsWith('-')) {
    throw new HarnessError(
      'EVALUATOR_CONTRACT_INVALID',
      'Verifier argv must name a frozen script.',
    );
  }
  const script = argv[scriptIndex];
  let relative = script;
  const mountPrefix = `${EVALUATION_VERIFIER_MOUNT}/`;
  if (script.startsWith(mountPrefix))
    relative = script.slice(mountPrefix.length);
  else if (path.isAbsolute(script) || script.includes(':')) {
    throw new HarnessError(
      'EVALUATOR_CONTRACT_INVALID',
      'Verifier script path must be relative.',
    );
  }
  assertSafeRelativePath(relative, 'EVALUATOR_CONTRACT_INVALID');
  if (!files.has(relative)) {
    throw new HarnessError(
      'EVALUATOR_CONTRACT_INVALID',
      `Verifier script is not part of the frozen verifier: ${relative}`,
    );
  }
  const resolved = `${EVALUATION_VERIFIER_MOUNT}/${relative}`;
  return interpreter
    ? [argv[0], resolved, ...argv.slice(scriptIndex + 1)]
    : [resolved, ...argv.slice(scriptIndex + 1)];
}

function validateEvaluatorArgv(
  argv: string[],
  workspaceReal: string,
  verifierRelPaths: string[],
): void {
  if (verifierRelPaths.length === 0) {
    return;
  }
  const protectedPaths = new Set(verifierRelPaths);
  const referencesVerifier = argv.some((entry) =>
    entry.startsWith(`${EVALUATION_VERIFIER_MOUNT}/`),
  );
  if (!referencesVerifier) {
    throw new HarnessError(
      'EVALUATOR_ARGV_VERIFIER_UNREFERENCED',
      `Evaluator argv must reference the trusted verifier mount ${EVALUATION_VERIFIER_MOUNT}/.`,
    );
  }
  for (const entry of argv) {
    if (entry.startsWith(`${EVALUATION_VERIFIER_MOUNT}/`)) {
      const relative = entry.slice(EVALUATION_VERIFIER_MOUNT.length + 1);
      assertSafeRelativePath(relative, 'EVALUATOR_ARGV_INVALID');
      if (!protectedPaths.has(relative)) {
        throw new HarnessError(
          'EVALUATOR_ARGV_UNKNOWN_VERIFIER_FILE',
          `Evaluator argv references a verifier file that was not prepared: ${relative}`,
        );
      }
      continue;
    }
    let workspaceRelative: string | null = null;
    if (entry === '/workspace' || entry.startsWith('/workspace/')) {
      workspaceRelative = entry.slice('/workspace/'.length);
    } else if (path.isAbsolute(entry)) {
      if (isInside(workspaceReal, entry)) {
        workspaceRelative = path
          .relative(workspaceReal, entry)
          .split(path.sep)
          .join('/');
      }
    } else if (!entry.startsWith('-')) {
      workspaceRelative = path
        .resolve('/workspace', entry)
        .slice('/workspace/'.length)
        .split(path.sep)
        .join('/');
    }
    if (workspaceRelative && protectedPaths.has(workspaceRelative)) {
      throw new HarnessError(
        'EVALUATOR_ARGV_SHADOWS_VERIFIER',
        `Evaluator argv would execute a candidate-controlled workspace copy of a protected verifier file: ${workspaceRelative}`,
      );
    }
  }
}

function validateContainerEnv(
  env?: Record<string, string>,
): Record<string, string> {
  if (!env) {
    return {};
  }
  const keys = Object.keys(env);
  if (keys.length > SNAPSHOT_LIMITS.MAX_ENV_ENTRIES) {
    throw new HarnessError(
      'INVALID_ENV',
      `Container environment exceeds ${SNAPSHOT_LIMITS.MAX_ENV_ENTRIES} entries.`,
    );
  }
  const output: Record<string, string> = {};
  for (const key of keys) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(key)) {
      throw new HarnessError(
        'INVALID_ENV',
        `Invalid container environment key: ${key}`,
      );
    }
    if (DENIED_CONTAINER_ENV.includes(key)) {
      throw new HarnessError(
        'INVALID_ENV',
        `Injection-sensitive container environment key is forbidden: ${key}`,
      );
    }
    const value = env[key];
    if (typeof value !== 'string' || value.includes('\0')) {
      throw new HarnessError(
        'INVALID_ENV',
        `Invalid container environment value: ${key}`,
      );
    }
    output[key] = value;
  }
  return output;
}

async function validateReadonlyPaths(
  workspaceReal: string,
  candidates: string[],
): Promise<string[]> {
  if (candidates.length > SNAPSHOT_LIMITS.MAX_READONLY_PATHS) {
    throw new HarnessError(
      'INVALID_READONLY_PATH',
      `Read-only mount count exceeds ${SNAPSHOT_LIMITS.MAX_READONLY_PATHS}.`,
    );
  }
  const validated: string[] = [];
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate)) {
      throw new HarnessError(
        'INVALID_READONLY_PATH',
        `Read-only mount path must be absolute: ${candidate}`,
      );
    }
    const resolved = path.resolve(candidate);
    const stat = await fs.lstat(resolved).catch(() => null);
    if (!stat || stat.isSymbolicLink()) {
      throw new HarnessError(
        'INVALID_READONLY_PATH',
        `Read-only mount path must exist and must not be a symbolic link: ${resolved}`,
      );
    }
    if (!stat.isDirectory() && !stat.isFile()) {
      throw new HarnessError(
        'INVALID_READONLY_PATH',
        `Read-only mount path must be a regular file or directory: ${resolved}`,
      );
    }
    const real = await fs.realpath(resolved);
    if (real !== resolved) {
      throw new HarnessError(
        'INVALID_READONLY_PATH',
        `Read-only mount path resolves through a symbolic link: ${resolved}`,
      );
    }
    if (isOverlapping(real, workspaceReal)) {
      throw new HarnessError(
        'INVALID_READONLY_PATH',
        `Read-only mount path overlaps the writable workspace: ${real}`,
      );
    }
    validated.push(real);
  }
  return [...new Set(validated)];
}

interface TreeCopyResult {
  files: number;
  bytes: number;
  directories: number;
  relPaths: string[];
}

async function copyRegularFileFrozen(
  sourcePath: string,
  destinationPath: string,
  flag: 'wx' | 'w',
  mode: number,
): Promise<void> {
  const before = await fs.lstat(sourcePath);
  if (before.isSymbolicLink() || !before.isFile() || before.nlink > 1) {
    throw new HarnessError(
      'COPY_SOURCE_NOT_REGULAR',
      `Copy source is not an owned regular file: ${sourcePath}`,
    );
  }
  const handle = await nodeFs.open(
    sourcePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const opened = await handle.stat();
    if (
      !opened.isFile() ||
      opened.ino !== before.ino ||
      opened.size !== before.size
    ) {
      throw new HarnessError(
        'COPY_SOURCE_CHANGED',
        `Copy source changed between validation and open: ${sourcePath}`,
      );
    }
    const content = await handle.readFile();
    const after = await handle.stat();
    if (
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeMs !== opened.mtimeMs
    ) {
      throw new HarnessError(
        'COPY_SOURCE_CHANGED',
        `Copy source changed during read: ${sourcePath}`,
      );
    }
    await fs.writeFile(destinationPath, content, { flag, mode });
  } finally {
    await handle.close();
  }
}

async function boundedCopyRegularTree(
  sourceRoot: string,
  destinationRoot: string,
  options: {
    maxFiles: number;
    maxDirectories: number;
    maxBytes: number;
    maxDepth: number;
    deadlineMs: number;
    skipNames?: string[];
    overwrite?: boolean;
  },
): Promise<TreeCopyResult> {
  const skipNames = new Set(options.skipNames ?? []);
  const deadline = Date.now() + options.deadlineMs;
  const relPaths: string[] = [];
  let files = 0;
  let bytes = 0;
  let directories = 0;

  const walk = async (relativeDir: string, depth: number): Promise<void> => {
    if (Date.now() > deadline) {
      throw new HarnessError(
        'COPY_DEADLINE_EXCEEDED',
        'Copy traversal exceeded its bounded deadline.',
      );
    }
    if (depth > options.maxDepth) {
      throw new HarnessError(
        'COPY_BOUNDS_EXCEEDED',
        `Directory depth exceeds ${options.maxDepth} under ${sourceRoot}`,
      );
    }
    const sourceDir = path.join(sourceRoot, relativeDir);
    const entries = await fs.readdir(sourceDir);
    for (const name of entries.sort()) {
      if (skipNames.has(name)) {
        continue;
      }
      if (Date.now() > deadline) {
        throw new HarnessError(
          'COPY_DEADLINE_EXCEEDED',
          'Copy traversal exceeded its bounded deadline.',
        );
      }
      const relative = path.join(relativeDir, name);
      const sourcePath = path.join(sourceRoot, relative);
      const stat = await fs.lstat(sourcePath);
      if (stat.isSymbolicLink()) {
        throw new HarnessError(
          'COPY_SYMLINK_FORBIDDEN',
          `Copy source contains a symbolic link: ${sourcePath}`,
        );
      }
      if (stat.isDirectory()) {
        directories += 1;
        if (directories > options.maxDirectories) {
          throw new HarnessError(
            'COPY_BOUNDS_EXCEEDED',
            'Copy source exceeds the directory bound.',
          );
        }
        await fs.ensureDir(path.join(destinationRoot, relative), 0o700);
        await walk(relative, depth + 1);
        continue;
      }
      if (!stat.isFile()) {
        throw new HarnessError(
          'COPY_SPECIAL_FILE_FORBIDDEN',
          `Copy source contains a special file: ${sourcePath}`,
        );
      }
      if (stat.nlink > 1) {
        throw new HarnessError(
          'COPY_HARDLINK_FORBIDDEN',
          `Copy source contains a hardlink: ${sourcePath} (nlink=${stat.nlink})`,
        );
      }
      files += 1;
      bytes += stat.size;
      if (files > options.maxFiles || bytes > options.maxBytes) {
        throw new HarnessError(
          'COPY_BOUNDS_EXCEEDED',
          'Copy source exceeds configured file/byte bounds.',
        );
      }
      const destinationPath = path.join(destinationRoot, relative);
      await fs.ensureDir(path.dirname(destinationPath), 0o700);
      let flag: 'wx' | 'w' = 'wx';
      if (options.overwrite) {
        const existing = await fs.lstat(destinationPath).catch(() => null);
        if (existing && (existing.isSymbolicLink() || !existing.isFile())) {
          throw new HarnessError(
            'COPY_DESTINATION_NOT_REGULAR',
            `Refusing to overwrite a non-regular destination entry: ${destinationPath}`,
          );
        }
        flag = 'w';
      }
      await copyRegularFileFrozen(
        sourcePath,
        destinationPath,
        flag,
        (stat.mode & 0o111) !== 0 ? 0o755 : 0o644,
      );
      relPaths.push(relative.split(path.sep).join('/'));
    }
  };

  await walk('', 0);
  return { files, bytes, directories, relPaths: relPaths.sort() };
}

async function listTreeRelPaths(
  root: string,
): Promise<{ files: string[]; directories: number }> {
  const files: string[] = [];
  let directories = 0;
  const walk = async (relativeDir: string, depth: number): Promise<void> => {
    if (depth > SNAPSHOT_LIMITS.MAX_DEPTH) {
      throw new HarnessError(
        'COPY_BOUNDS_EXCEEDED',
        `Directory depth exceeds ${SNAPSHOT_LIMITS.MAX_DEPTH} under ${root}`,
      );
    }
    const directory = path.join(root, relativeDir);
    const entries = await fs.readdir(directory);
    for (const name of entries.sort()) {
      const relative = path.join(relativeDir, name);
      const stat = await fs.lstat(path.join(root, relative));
      if (stat.isSymbolicLink()) {
        throw new HarnessError(
          'COPY_SYMLINK_FORBIDDEN',
          `Tree contains a symbolic link: ${path.join(root, relative)}`,
        );
      }
      if (stat.isDirectory()) {
        directories += 1;
        if (directories > SNAPSHOT_LIMITS.MAX_DIRECTORIES) {
          throw new HarnessError(
            'COPY_BOUNDS_EXCEEDED',
            'Tree exceeds the directory bound.',
          );
        }
        await walk(relative, depth + 1);
      } else if (stat.isFile()) {
        files.push(relative.split(path.sep).join('/'));
      } else {
        throw new HarnessError(
          'COPY_SPECIAL_FILE_FORBIDDEN',
          `Tree contains a special file: ${path.join(root, relative)}`,
        );
      }
    }
  };
  await walk('', 0);
  return { files: files.sort(), directories };
}

export class SandboxRunner {
  readonly runtime: FleetRuntimeConfig;
  private readonly supervisor: LocalSupervisor;

  constructor(runtime: FleetRuntimeConfig) {
    this.runtime = runtime;
    this.supervisor = new LocalSupervisor(runtime.dockerCommand, runtime.image);
  }
  validateVerification(verification: FleetTask['verification']): {
    ok: boolean;
    reasonCodes: string[];
  } {
    const reasons: string[] = [];
    if (
      !verification ||
      !verification.files ||
      typeof verification.files !== 'object' ||
      !Array.isArray(verification.argv) ||
      verification.argv.length === 0 ||
      verification.argv.length > 64 ||
      Object.keys(verification.files ?? {}).length === 0 ||
      Object.keys(verification.files ?? {}).length > 256
    ) {
      return { ok: false, reasonCodes: ['VERIFIER_SCRIPT_REQUIRED'] };
    }
    for (const entry of verification.argv) {
      if (
        typeof entry !== 'string' ||
        entry.length === 0 ||
        entry.length > SNAPSHOT_LIMITS.MAX_ARGV_LENGTH ||
        entry.includes('\0')
      ) {
        reasons.push('VERIFIER_ARGV_INVALID');
      }
    }
    for (const [relative, content] of Object.entries(verification.files)) {
      try {
        assertSafeRelativePath(relative, 'VERIFIER_PATH_TRAVERSAL');
      } catch {
        reasons.push('VERIFIER_PATH_TRAVERSAL');
      }
      if (
        typeof content !== 'string' ||
        Buffer.byteLength(content, 'utf8') > 200_000
      ) {
        reasons.push('VERIFIER_CONTENT_INVALID');
      }
    }
    if (reasons.length === 0) {
      try {
        resolveTrustedVerifierArgv(
          verification.argv,
          Object.keys(verification.files),
        );
      } catch {
        reasons.push('VERIFIER_ENTRYPOINT_INVALID');
      }
    }
    return { ok: reasons.length === 0, reasonCodes: [...new Set(reasons)] };
  }
  async inspectRole(context: ExecutionContext): Promise<RoleStopProof> {
    const [runtimeState, termination, workerTermination, workerCompletion] =
      await Promise.all([
        this.readRoleReceipt<RuntimeStateReceipt>(
          getRuntimeStateReceiptPath(context),
        ),
        this.readRoleReceipt<TerminationEvidence>(
          getTerminationReceiptPath(context),
        ),
        this.supervisor.readWorkerTermination(context),
        this.readWorkerCompletion(context),
      ]);
    const workerGroupStopped =
      workerTermination?.confirmed === true ||
      (await this.evaluatorHasNoWorker(
        context,
        workerTermination,
        workerCompletion,
      ));
    if (
      !runtimeState ||
      !termination ||
      !TerminationEvidenceSchema.safeParse(termination).success ||
      !workerGroupStopped
    ) {
      throw new HarnessError(
        'RUNNER_STOP_PROOF_UNAVAILABLE',
        'Durable whole-group stop receipts are unavailable or unconfirmed.',
      );
    }
    return this.buildRoleStopProof(
      context,
      runtimeState,
      termination,
      workerTermination,
      workerCompletion,
      workerGroupStopped,
    );
  }

  async stopRole(context: ExecutionContext): Promise<RoleStopProof> {
    await this.supervisor.writeFence(context, 'ROLE_STOP_REQUESTED');
    const workerTermination =
      (await this.supervisor.terminateWorker(context)) ??
      (await this.supervisor.readWorkerTermination(context));
    const termination = await this.supervisor.terminate(context);
    const [runtimeState, workerCompletion] = await Promise.all([
      this.readRoleReceipt<RuntimeStateReceipt>(
        getRuntimeStateReceiptPath(context),
      ),
      this.readWorkerCompletion(context),
    ]);
    const workerGroupStopped =
      workerTermination?.confirmed === true ||
      (await this.evaluatorHasNoWorker(
        context,
        workerTermination,
        workerCompletion,
      ));
    if (!runtimeState || !workerGroupStopped) {
      throw new HarnessError(
        'RUNNER_STOP_PROOF_UNAVAILABLE',
        'Whole-group stop could not be proven; attempt ownership remains unknown.',
      );
    }
    return this.buildRoleStopProof(
      context,
      runtimeState,
      termination,
      workerTermination,
      workerCompletion,
      workerGroupStopped,
    );
  }

  private async readWorkerCompletion(
    context: ExecutionContext,
  ): Promise<WorkerCompletionReceipt | null> {
    const raw = await this.readRoleReceipt<unknown>(
      getWorkerCompletionReceiptPath(context),
    );
    if (raw === null) return null;
    const parsed = WorkerCompletionReceiptSchema.safeParse(raw);
    if (
      !parsed.success ||
      parsed.data.attemptId !== context.attemptId ||
      parsed.data.generation !== context.generation ||
      parsed.data.role !== context.role ||
      parsed.data.runtimeDigest !== context.runtimeDigest
    ) {
      throw new HarnessError(
        'RUNNER_RECEIPT_INVALID',
        'Worker completion receipt is malformed or belongs to another execution.',
      );
    }
    return parsed.data;
  }

  private async evaluatorHasNoWorker(
    context: ExecutionContext,
    workerTermination: WorkerTerminationReceipt | null,
    workerCompletion: WorkerCompletionReceipt | null,
  ): Promise<boolean> {
    if (context.role !== 'evaluator' || workerTermination || workerCompletion) {
      return false;
    }
    const [record, intent] = await Promise.all([
      this.supervisor.readWorkerRecord(context),
      this.supervisor.readWorkerLaunchIntent(context),
    ]);
    return record === null && intent === null;
  }

  private async readRoleReceipt<T>(filePath: string): Promise<T | null> {
    const stat = await fs.lstat(filePath).catch(() => null);
    if (!stat) return null;
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size > 4 * 1024 * 1024
    ) {
      throw new HarnessError(
        'RUNNER_RECEIPT_INVALID',
        'Role stop receipt is not a bounded regular file.',
      );
    }
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
    } catch {
      throw new HarnessError(
        'RUNNER_RECEIPT_INVALID',
        'Role stop receipt is invalid JSON.',
      );
    }
  }

  private buildRoleStopProof(
    context: ExecutionContext,
    runtimeState: RuntimeStateReceipt,
    termination: TerminationEvidence,
    workerTermination: WorkerTerminationReceipt | null,
    workerCompletion: WorkerCompletionReceipt | null,
    workerGroupStopped: boolean,
  ): RoleStopProof {
    const wholeGroupStopped =
      termination.confirmed &&
      workerGroupStopped &&
      runtimeState.attemptId === context.attemptId &&
      runtimeState.generation === context.generation &&
      runtimeState.role === context.role &&
      runtimeState.runtimeDigest === context.runtimeDigest &&
      canonicalDigest(runtimeState.termination) ===
        canonicalDigest(termination) &&
      (!workerTermination ||
        (workerTermination.confirmed &&
          workerTermination.attemptId === context.attemptId &&
          workerTermination.generation === context.generation &&
          workerTermination.role === context.role &&
          workerTermination.runtimeDigest === context.runtimeDigest));
    const completionMatches =
      workerTermination &&
      workerCompletion !== null &&
      workerCompletion.attemptId === context.attemptId &&
      workerCompletion.generation === context.generation &&
      workerCompletion.role === 'task' &&
      workerCompletion.runtimeDigest === context.runtimeDigest &&
      workerCompletion.workerBootId === workerTermination.workerBootId &&
      workerCompletion.pid === workerTermination.pid &&
      workerCompletion.pgid === workerTermination.pgid
        ? workerCompletion
        : null;
    const modelWorker: ModelWorkerProof | null =
      context.role !== 'task' || !workerTermination
        ? null
        : completionMatches
          ? {
              kind: 'completion',
              digest: canonicalDigest(completionMatches),
              attemptId: completionMatches.attemptId,
              generation: completionMatches.generation,
              role: 'task',
              runtimeDigest: completionMatches.runtimeDigest,
              workerBootId: completionMatches.workerBootId,
              exitCode: completionMatches.exitCode,
              confirmed:
                workerTermination.confirmed && completionMatches.exitCode === 0,
            }
          : {
              kind: 'termination',
              digest: canonicalDigest(workerTermination),
              attemptId: workerTermination.attemptId,
              generation: workerTermination.generation,
              role: 'task',
              runtimeDigest: workerTermination.runtimeDigest,
              workerBootId: workerTermination.workerBootId,
              exitCode: null,
              confirmed: workerTermination.confirmed,
            };
    return {
      context: {
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
      },
      termination,
      runtimeState,
      modelWorker,
      wholeGroupStopped,
    };
  }

  /**
   * Verifies the installed runtime closure and trusted assets before any sandbox, Git or
   * supervisor operation.
   */
  async verifyRuntime(expectedRuntimeDigest?: string): Promise<void> {
    const result = await verifyRuntimeManifest(
      this.runtime.manifestFile,
      this.runtime,
      expectedRuntimeDigest,
    );
    if (!result.valid) {
      throw new HarnessError(
        'RUNTIME_CLOSURE_UNVERIFIED',
        `Installed runtime closure failed verification: ${result.reasonCodes.join(', ')}`,
      );
    }
  }

  /**
   * Health and capability check. Integrity failure short-circuits: no executable probe runs
   * against an unauthorized manifest or changed Docker binary.
   */
  async doctor(): Promise<{ supported: boolean; reasonCodes: string[] }> {
    try {
      await this.verifyRuntime(this.runtime.manifestDigest);
    } catch (error) {
      return {
        supported: false,
        reasonCodes: [
          error instanceof HarnessError
            ? error.code
            : 'RUNTIME_CLOSURE_UNVERIFIED',
        ],
      };
    }
    return this.dockerHealth();
  }

  private async dockerHealth(): Promise<{
    supported: boolean;
    reasonCodes: string[];
  }> {
    const reasonCodes: string[] = [];

    if (!isPinnedImageDigest(this.runtime.image)) {
      reasonCodes.push('IMAGE_NOT_PINNED_DIGEST');
    }

    try {
      const { stdout } = await execFile(
        this.runtime.dockerCommand,
        ['--version'],
        {
          encoding: 'utf8',
          timeout: 5000,
          env: SAFE_COMMAND_ENV,
        },
      );
      if (!stdout || !stdout.toLowerCase().includes('docker')) {
        reasonCodes.push('DOCKER_VERSION_UNEXPECTED');
      }
    } catch {
      reasonCodes.push('DOCKER_UNAVAILABLE');
      return { supported: false, reasonCodes: [...new Set(reasonCodes)] };
    }

    try {
      await execFile(this.runtime.dockerCommand, ['info'], {
        encoding: 'utf8',
        timeout: 10000,
        env: SAFE_COMMAND_ENV,
      });
    } catch {
      reasonCodes.push('DOCKER_DAEMON_NOT_RUNNING');
    }

    const unique = [...new Set(reasonCodes)];
    return { supported: unique.length === 0, reasonCodes: unique };
  }

  /**
   * Creates an immutable, bounded, filter-free Git snapshot from sourceRef.
   */
  async snapshot(
    projectRoot: string,
    sourceRef: string,
    destination: string,
  ): Promise<string> {
    await this.verifyRuntime(this.runtime.manifestDigest);

    const projectReal = await assertRegularDirectory(
      projectRoot,
      'INVALID_PROJECT_ROOT',
    );
    if (
      typeof sourceRef !== 'string' ||
      sourceRef.length === 0 ||
      sourceRef.length > 256
    ) {
      throw new HarnessError(
        'INVALID_SOURCE_REF',
        'sourceRef must be a bounded non-empty string.',
      );
    }
    const destinationReal = await assertFreshOwnedDirectory(destination, [
      projectReal,
    ]);

    const gitCmd = this.runtime.gitCommand;
    const gitEnv: NodeJS.ProcessEnv = {
      ...SAFE_COMMAND_ENV,
      GIT_CEILING_DIRECTORIES: path.dirname(projectReal),
    };

    const runGit = async (
      args: string[],
      maxBuffer: number,
      timeout: number,
    ): Promise<Buffer> => {
      const { stdout } = await execFile(
        gitCmd,
        ['-C', projectReal, ...GIT_CONFIG_OVERRIDES, ...args],
        {
          encoding: 'buffer',
          maxBuffer,
          timeout,
          env: gitEnv,
        },
      );
      return stdout;
    };

    let commitSha: string;
    try {
      const stdout = await runGit(
        ['rev-parse', '--verify', '--end-of-options', `${sourceRef}^{commit}`],
        64 * 1024,
        15000,
      );
      commitSha = stdout.toString('utf8').trim();
    } catch (error) {
      throw new HarnessError(
        'SOURCE_REF_RESOLVE_FAILED',
        `Failed to resolve sourceRef to a local commit: ${String(error)}`,
      );
    }
    if (!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(commitSha)) {
      throw new HarnessError(
        'INVALID_COMMIT_SHA',
        `Resolved source ref is not an immutable commit SHA: ${commitSha}`,
      );
    }

    let lsTreeStdout: Buffer;
    try {
      lsTreeStdout = await runGit(
        ['ls-tree', '-r', '-z', '--full-tree', commitSha],
        32 * 1024 * 1024,
        30000,
      );
    } catch (error) {
      throw new HarnessError(
        'GIT_LS_TREE_FAILED',
        `Failed to list git tree for commit ${commitSha}: ${String(error)}`,
      );
    }

    interface TreeEntry {
      mode: string;
      type: string;
      sha: string;
      relPath: string;
    }

    const entries: TreeEntry[] = [];
    for (const rawEntry of lsTreeStdout.toString('utf8').split('\0')) {
      if (!rawEntry) {
        continue;
      }
      const match = rawEntry.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/s);
      if (!match) {
        throw new HarnessError(
          'GIT_SNAPSHOT_PARSE_ERROR',
          'Malformed ls-tree output entry.',
        );
      }
      const [, mode, type, sha, relPath] = match;
      if (type !== 'blob') {
        throw new HarnessError(
          'GIT_SNAPSHOT_ENTRY_TYPE_FORBIDDEN',
          `Only regular blob entries may be extracted; found ${type} at ${relPath}`,
        );
      }
      if (mode !== '100644' && mode !== '100755') {
        throw new HarnessError(
          'GIT_SNAPSHOT_MODE_FORBIDDEN',
          `Unsupported git entry mode ${mode} at ${relPath}`,
        );
      }
      assertSafeRelativePath(relPath, 'GIT_SNAPSHOT_PATH_TRAVERSAL');
      entries.push({ mode, type, sha, relPath });
    }

    if (entries.length > SNAPSHOT_LIMITS.MAX_FILES) {
      throw new HarnessError(
        'GIT_SNAPSHOT_BOUNDS_EXCEEDED',
        `Repository file count exceeds limit of ${SNAPSHOT_LIMITS.MAX_FILES}`,
      );
    }

    let totalBytes = 0;
    for (const entry of entries) {
      const relativeDepth = entry.relPath.split('/').length;
      if (relativeDepth > SNAPSHOT_LIMITS.MAX_DEPTH) {
        throw new HarnessError(
          'GIT_SNAPSHOT_BOUNDS_EXCEEDED',
          `Repository path depth exceeds limit at ${entry.relPath}`,
        );
      }
      let blobContent: Buffer;
      try {
        blobContent = await runGit(
          ['cat-file', 'blob', entry.sha],
          SNAPSHOT_LIMITS.MAX_BLOB_BYTES,
          15000,
        );
      } catch (error) {
        throw new HarnessError(
          'GIT_BLOB_EXTRACTION_FAILED',
          `Local blob extraction failed for ${entry.relPath} (object unavailable or unbounded): ${String(error)}`,
        );
      }
      totalBytes += blobContent.length;
      if (totalBytes > SNAPSHOT_LIMITS.MAX_TOTAL_BYTES) {
        throw new HarnessError(
          'GIT_SNAPSHOT_BOUNDS_EXCEEDED',
          `Total snapshot size exceeds limit of ${SNAPSHOT_LIMITS.MAX_TOTAL_BYTES} bytes`,
        );
      }
      const targetFilePath = path.join(destinationReal, entry.relPath);
      if (!isInside(destinationReal, targetFilePath)) {
        throw new HarnessError(
          'GIT_SNAPSHOT_PATH_TRAVERSAL',
          `Target path escaped snapshot root: ${entry.relPath}`,
        );
      }
      await fs.ensureDir(path.dirname(targetFilePath), 0o700);
      await fs.writeFile(targetFilePath, blobContent, {
        flag: 'wx',
        mode: entry.mode === '100755' ? 0o755 : 0o644,
      });
    }

    return commitSha;
  }

  /**
   * Prepares a fresh evaluator destination:
   * - `workspace/` is the writable copy of the trusted snapshot plus the candidate deliverable
   *   tree, with an explicit complete-tree diff (files absent from the deliverable are deleted).
   * - `verifier/` is a separate host-owned read-only tree mounted at EVALUATION_VERIFIER_MOUNT.
   * A receipt binds every verifier digest and the fixed mount path.
   */
  async prepareEvaluation(
    snapshotDir: string,
    deliverableDir: string,
    verification: FleetTask['verification'],
    destination: string,
    taskStopProof: RoleStopProof,
  ): Promise<void> {
    const verified = this.validateVerification(verification);
    if (!verified.ok) {
      throw new HarnessError(
        'EVALUATOR_CONTRACT_INVALID',
        `Trusted verifier contract invalid: ${verified.reasonCodes.join(', ')}`,
      );
    }
    const proofContext = taskStopProof?.context;
    if (
      !proofContext ||
      proofContext.role !== 'task' ||
      !proofContext.attemptId ||
      !Number.isSafeInteger(proofContext.generation) ||
      proofContext.generation <= 0 ||
      proofContext.runtimeDigest !== this.runtime.manifestDigest ||
      !taskStopProof.wholeGroupStopped ||
      !TerminationEvidenceSchema.safeParse(taskStopProof.termination).success ||
      !taskStopProof.termination.confirmed ||
      taskStopProof.termination.attemptId !== proofContext.attemptId ||
      taskStopProof.termination.generation !== proofContext.generation ||
      taskStopProof.runtimeState?.attemptId !== proofContext.attemptId ||
      taskStopProof.runtimeState?.generation !== proofContext.generation ||
      taskStopProof.runtimeState?.role !== 'task' ||
      taskStopProof.runtimeState?.runtimeDigest !==
        proofContext.runtimeDigest ||
      canonicalDigest(taskStopProof.runtimeState.termination) !==
        canonicalDigest(taskStopProof.termination) ||
      !taskStopProof.modelWorker?.confirmed ||
      taskStopProof.modelWorker.role !== 'task' ||
      taskStopProof.modelWorker.attemptId !== proofContext.attemptId ||
      taskStopProof.modelWorker.generation !== proofContext.generation ||
      taskStopProof.modelWorker.runtimeDigest !== proofContext.runtimeDigest ||
      !/^[a-f0-9]{64}$/.test(taskStopProof.modelWorker.digest)
    ) {
      throw new HarnessError(
        'EVALUATOR_PREP_PROOF_REJECTED',
        'Task writer stop proof is missing, unconfirmed, or not bound to this runtime.',
      );
    }
    const preparedVerifierArgv = resolveTrustedVerifierArgv(
      verification.argv,
      Object.keys(verification.files),
    );
    const executableVerifierRelPath = [
      'node',
      'python3',
      'sh',
      'bash',
      'bun',
    ].includes(verification.argv[0])
      ? null
      : preparedVerifierArgv[0].slice(`${EVALUATION_VERIFIER_MOUNT}/`.length);

    const snapshotReal = await assertRegularDirectory(
      snapshotDir,
      'SNAPSHOT_NOT_FOUND',
    );
    const deliverableReal = await assertRegularDirectory(
      deliverableDir,
      'DELIVERABLE_NOT_FOUND',
    );
    const destinationReal = await assertFreshOwnedDirectory(destination, [
      snapshotReal,
      deliverableReal,
    ]);
    if (isOverlapping(snapshotReal, deliverableReal)) {
      throw new HarnessError(
        'DELIVERABLE_OVERLAP_FORBIDDEN',
        'Deliverable and snapshot roots must be disjoint.',
      );
    }

    const workspacePath = getEvaluationWorkspacePath(destinationReal);
    const verifierPath = getEvaluationVerifierPath(destinationReal);
    await fs.ensureDir(workspacePath, 0o700);
    await fs.ensureDir(verifierPath, 0o700);

    const snapshotCopy = await boundedCopyRegularTree(
      snapshotReal,
      workspacePath,
      {
        maxFiles: SNAPSHOT_LIMITS.MAX_FILES,
        maxDirectories: SNAPSHOT_LIMITS.MAX_DIRECTORIES,
        maxBytes: SNAPSHOT_LIMITS.MAX_TOTAL_BYTES,
        maxDepth: SNAPSHOT_LIMITS.MAX_DEPTH,
        deadlineMs: SNAPSHOT_LIMITS.IMPORT_DEADLINE_MS,
      },
    );

    const deliverableCopy = await boundedCopyRegularTree(
      deliverableReal,
      workspacePath,
      {
        maxFiles: SNAPSHOT_LIMITS.MAX_FILES,
        maxDirectories: SNAPSHOT_LIMITS.MAX_DIRECTORIES,
        maxBytes: SNAPSHOT_LIMITS.MAX_TOTAL_BYTES,
        maxDepth: SNAPSHOT_LIMITS.MAX_DEPTH,
        deadlineMs: SNAPSHOT_LIMITS.IMPORT_DEADLINE_MS,
        skipNames: [DELETION_MARKER_FILENAME],
        overwrite: true,
      },
    );

    // Freeze detection: both inputs must be unchanged between copy and verification.
    const snapshotAfter = await listTreeRelPaths(snapshotReal);
    if (snapshotAfter.files.join('\n') !== snapshotCopy.relPaths.join('\n')) {
      throw new HarnessError(
        'SNAPSHOT_CHANGED_DURING_PREPARATION',
        'Trusted snapshot changed while the evaluation workspace was prepared.',
      );
    }
    const deliverableAfter = await listTreeRelPaths(deliverableReal);
    const deliverableRelPaths = deliverableAfter.files.filter(
      (relPath) => relPath !== DELETION_MARKER_FILENAME,
    );
    if (
      deliverableRelPaths.join('\n') !== deliverableCopy.relPaths.join('\n')
    ) {
      throw new HarnessError(
        'DELIVERABLE_CHANGED_DURING_PREPARATION',
        'Deliverable tree changed while it was imported.',
      );
    }

    const deletionMarkers = new Set<string>();
    const markerPath = path.join(deliverableReal, DELETION_MARKER_FILENAME);
    const markerStat = await fs.lstat(markerPath).catch(() => null);
    if (markerStat) {
      if (
        !markerStat.isFile() ||
        markerStat.isSymbolicLink() ||
        markerStat.size > 1024 * 1024
      ) {
        throw new HarnessError(
          'DELETION_MARKER_INVALID',
          'Deletion marker must be a bounded regular file.',
        );
      }
      let parsedMarker: unknown;
      try {
        parsedMarker = JSON.parse(await fs.readFile(markerPath, 'utf8'));
      } catch {
        throw new HarnessError(
          'DELETION_MARKER_INVALID',
          'Deletion marker is not valid JSON.',
        );
      }
      if (
        !Array.isArray(parsedMarker) ||
        parsedMarker.length > SNAPSHOT_LIMITS.MAX_FILES
      ) {
        throw new HarnessError(
          'DELETION_MARKER_INVALID',
          'Deletion marker must be a bounded array of relative paths.',
        );
      }
      for (const entry of parsedMarker) {
        if (typeof entry !== 'string') {
          throw new HarnessError(
            'DELETION_MARKER_INVALID',
            'Deletion marker entries must be strings.',
          );
        }
        assertSafeRelativePath(entry, 'DELETION_MARKER_INVALID');
        deletionMarkers.add(entry);
      }
    }

    // Complete-tree diff: the deliverable is authoritative. Any trusted snapshot file the
    // candidate tree no longer contains is deleted (ordinary `rm` semantics), and the marker
    // can only add deletions, never resurrect baseline content.
    const deliverableSet = new Set(deliverableRelPaths);
    for (const snapshotFile of snapshotCopy.relPaths) {
      if (!deliverableSet.has(snapshotFile)) {
        deletionMarkers.add(snapshotFile);
      }
    }

    for (const relative of deletionMarkers) {
      const target = path.join(workspacePath, relative);
      if (!isInside(workspacePath, target) || target === workspacePath) {
        throw new HarnessError(
          'DELETION_MARKER_INVALID',
          `Deletion target escapes the evaluation workspace: ${relative}`,
        );
      }
      await fs.remove(target);
    }

    const verifierFiles: Array<{ relPath: string; sha256: string }> = [];
    for (const relPath of Object.keys(verification.files).sort()) {
      assertSafeRelativePath(relPath, 'VERIFIER_PATH_TRAVERSAL');
      const content = verification.files[relPath];
      if (typeof content !== 'string' || content.length > 200_000) {
        throw new HarnessError(
          'VERIFIER_CONTENT_INVALID',
          `Verification file content is invalid or unbounded: ${relPath}`,
        );
      }
      const targetPath = path.join(verifierPath, relPath);
      if (!isInside(verifierPath, targetPath) || targetPath === verifierPath) {
        throw new HarnessError(
          'VERIFIER_PATH_TRAVERSAL',
          `Verification file path escapes the verifier tree: ${relPath}`,
        );
      }
      await fs.ensureDir(path.dirname(targetPath), 0o700);
      await fs.writeFile(targetPath, content, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o400,
      });
      verifierFiles.push({
        relPath,
        sha256: crypto
          .createHash('sha256')
          .update(content, 'utf8')
          .digest('hex'),
      });
    }

    const sealReadOnly = async (directory: string): Promise<void> => {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await sealReadOnly(entryPath);
        } else if (entry.isFile()) {
          await fs.chmod(
            entryPath,
            executableVerifierRelPath ===
              path.relative(verifierPath, entryPath).split(path.sep).join('/')
              ? 0o555
              : 0o444,
          );
        } else {
          throw new HarnessError(
            'VERIFIER_SPECIAL_FILE_FORBIDDEN',
            `Verifier tree contains a non-regular entry: ${entryPath}`,
          );
        }
      }
      await fs.chmod(directory, 0o555);
    };
    await sealReadOnly(verifierPath);

    const receipt: EvaluationPreparationReceipt = {
      schemaVersion: 1,
      workspace: EVALUATION_WORKSPACE_DIRNAME,
      verifier: EVALUATION_VERIFIER_DIRNAME,
      verifierMount: EVALUATION_VERIFIER_MOUNT,
      verifierFiles,
      verifierDigest: digestJson(verifierFiles),
      verifierArgv: preparedVerifierArgv,
      deletionMarkers: [...deletionMarkers].sort(),
      preparedAt: Date.now(),
    };
    await fs.writeFile(
      getEvaluationReceiptPath(destinationReal),
      JSON.stringify(receipt, null, 2),
      {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      },
    );
  }

  private async readEvaluationReceipt(
    workspaceReal: string,
  ): Promise<{ receipt: EvaluationPreparationReceipt; verifierReal: string }> {
    const destination = path.dirname(workspaceReal);
    if (path.basename(workspaceReal) !== EVALUATION_WORKSPACE_DIRNAME) {
      throw new HarnessError(
        'EVALUATOR_WORKSPACE_LAYOUT_INVALID',
        `Evaluator workspace must be named ${EVALUATION_WORKSPACE_DIRNAME}/ inside its destination.`,
      );
    }
    const receiptPath = getEvaluationReceiptPath(destination);
    const stat = await fs.lstat(receiptPath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) {
      throw new HarnessError(
        'EVALUATOR_RECEIPT_MISSING',
        'Evaluator preparation receipt is missing or invalid.',
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
    } catch {
      throw new HarnessError(
        'EVALUATOR_RECEIPT_MISSING',
        'Evaluator preparation receipt is not valid JSON.',
      );
    }
    const receipt = EvaluationPreparationReceiptSchema.safeParse(parsed);
    if (!receipt.success) {
      throw new HarnessError(
        'EVALUATOR_RECEIPT_MISSING',
        'Evaluator preparation receipt failed strict validation.',
      );
    }
    if (
      receipt.data.verifierDigest !== digestJson(receipt.data.verifierFiles)
    ) {
      throw new HarnessError(
        'EVALUATOR_RECEIPT_TAMPERED',
        'Evaluator receipt verifier digest does not match its file list.',
      );
    }

    const verifierReal = await assertRegularDirectory(
      getEvaluationVerifierPath(destination),
      'EVALUATOR_VERIFIER_TREE_MISSING',
    );
    const tree = await listTreeRelPaths(verifierReal);
    const receiptFiles = receipt.data.verifierFiles
      .map((entry) => entry.relPath)
      .sort();
    if (tree.files.join('\n') !== receiptFiles.join('\n')) {
      throw new HarnessError(
        'EVALUATOR_VERIFIER_TREE_MISMATCH',
        'Verifier tree contents do not match the preparation receipt.',
      );
    }
    for (const entry of receipt.data.verifierFiles) {
      const filePath = path.join(verifierReal, entry.relPath);
      const fileStat = await fs.lstat(filePath);
      if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
        throw new HarnessError(
          'EVALUATOR_VERIFIER_TREE_MISMATCH',
          `Verifier entry is not a regular file: ${entry.relPath}`,
        );
      }
      if ((fileStat.mode & 0o222) !== 0) {
        throw new HarnessError(
          'EVALUATOR_VERIFIER_TREE_WRITABLE',
          `Verifier entry is writable: ${entry.relPath}`,
        );
      }
      if ((await computeSha256(filePath)) !== entry.sha256) {
        throw new HarnessError(
          'EVALUATOR_VERIFIER_TREE_MISMATCH',
          `Verifier entry digest mismatch: ${entry.relPath}`,
        );
      }
    }
    return { receipt: receipt.data, verifierReal };
  }

  private async resolveReadonlyMounts(
    workspaceReal: string,
    role: ExecutionContext['role'],
    callerPaths: string[],
  ): Promise<{
    mounts: ReadonlyMount[];
    verifierRelPaths: string[];
    preparedVerifierArgv: string[] | null;
  }> {
    const validated = await validateReadonlyPaths(workspaceReal, callerPaths);
    const mounts: ReadonlyMount[] = validated.map((hostPath) => ({
      hostPath,
      containerPath: hostPath,
    }));
    if (role !== 'evaluator') {
      return { mounts, verifierRelPaths: [], preparedVerifierArgv: null };
    }
    const { receipt, verifierReal } =
      await this.readEvaluationReceipt(workspaceReal);
    mounts.push({
      hostPath: verifierReal,
      containerPath: EVALUATION_VERIFIER_MOUNT,
    });
    return {
      mounts,
      verifierRelPaths: receipt.verifierFiles.map((entry) => entry.relPath),
      preparedVerifierArgv: receipt.verifierArgv,
    };
  }

  /**
   * Executes argv inside a pinned, hardened Docker sandbox with a durable
   * intent/create/inspect/start lifecycle owned by the detached supervisor.
   */
  async execute(
    workspace: string,
    argv: string[],
    options: {
      context: ExecutionContext;
      deadline: number;
      signal?: AbortSignal;
      readonlyPaths?: string[];
      env?: Record<string, string>;
    },
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const { context, signal } = options;
    const deadline = Math.min(options.deadline, context.deadline);

    await this.verifyRuntime(context.runtimeDigest);

    if (signal?.aborted) {
      throw new HarnessError(
        'EXECUTION_SIGNAL_ABORTED',
        'Execution aborted before start.',
      );
    }
    if (Date.now() >= deadline) {
      throw new HarnessError(
        'DEADLINE_EXCEEDED',
        'Execution deadline already elapsed.',
      );
    }

    let containerArgv = validateContainerArgv(argv);
    const workspaceReal = await assertRegularDirectory(
      workspace,
      'INVALID_WORKSPACE',
    );
    const { mounts, verifierRelPaths, preparedVerifierArgv } =
      await this.resolveReadonlyMounts(
        workspaceReal,
        context.role,
        options.readonlyPaths ?? [],
      );
    if (context.role === 'evaluator') {
      containerArgv = resolveTrustedVerifierArgv(
        containerArgv,
        verifierRelPaths,
      );
    }
    validateEvaluatorArgv(containerArgv, workspaceReal, verifierRelPaths);
    if (
      context.role === 'evaluator' &&
      (!preparedVerifierArgv ||
        JSON.stringify(containerArgv) !== JSON.stringify(preparedVerifierArgv))
    ) {
      throw new HarnessError(
        'EVALUATOR_ARGV_PREPARATION_MISMATCH',
        'Evaluator argv does not match the exact prepared verifier entry and arguments.',
      );
    }
    const env = validateContainerEnv(options.env);

    const docker = await this.dockerHealth();
    if (!docker.supported) {
      throw new HarnessError(
        'DOCKER_UNAVAILABLE',
        `Docker sandbox is unavailable on this host: ${docker.reasonCodes.join(', ')}`,
      );
    }

    await getWorkerBootId(context.stateDir);
    await this.supervisor.ensureSupervisor(context, {
      nodeCommand: this.runtime.nodeCommand,
      deadline,
    });

    if (signal?.aborted || Date.now() >= deadline) {
      await this.supervisor.requestSupervisorStop(context);
      throw new HarnessError(
        signal?.aborted ? 'EXECUTION_SIGNAL_ABORTED' : 'DEADLINE_EXCEEDED',
        'Execution aborted or expired while the detached supervisor armed; no container started.',
      );
    }

    const record = await this.supervisor.createInstanceRecord(context);
    let created: ContainerInstanceRecord | null = null;
    let timedOut = false;
    let aborted = false;
    const abortListener = (): void => {
      aborted = true;
      void this.supervisor.writeFence(context, 'EXECUTION_ABORTED');
      if (created) void this.supervisor.terminateInstance(context, created);
    };
    if (signal) signal.addEventListener('abort', abortListener, { once: true });
    const timer = setTimeout(
      () => {
        timedOut = true;
        void this.supervisor.writeFence(context, 'EXECUTION_DEADLINE_EXCEEDED');
        if (created) void this.supervisor.terminateInstance(context, created);
      },
      Math.max(0, deadline - Date.now()),
    );

    try {
      const instance = await this.supervisor.createContainer(
        context,
        record,
        containerArgv,
        workspaceReal,
        mounts,
        env,
      );
      created = instance;
      if (signal?.aborted || timedOut || Date.now() >= deadline) {
        aborted = signal?.aborted ?? false;
        timedOut ||= Date.now() >= deadline;
        const evidence = await this.supervisor.terminateInstance(
          context,
          instance,
        );
        if (!evidence.confirmed) {
          throw new HarnessError(
            'SANDBOX_TERMINATION_UNCONFIRMED',
            'Sandbox create completed after cancellation, but stop could not be confirmed.',
          );
        }
        throw new HarnessError(
          aborted ? 'EXECUTION_SIGNAL_ABORTED' : 'DEADLINE_EXCEEDED',
          'Execution was cancelled while Docker created the container.',
        );
      }
      const attach = await this.supervisor.startContainer(context, instance, {
        maxStdoutBytes: SNAPSHOT_LIMITS.MAX_STDOUT_BYTES,
        maxStderrBytes: SNAPSHOT_LIMITS.MAX_STDERR_BYTES,
      });
      if (attach.attachTimedOut) {
        await this.supervisor.terminateInstance(context, created);
        return {
          exitCode: 124,
          stdout: attach.stdout,
          stderr: `${attach.stderr}\n[SandboxRunner] Sandbox attach exceeded its bounded lifetime.`,
        };
      }
      if (attach.truncated) {
        const evidence = await this.supervisor.terminateInstance(
          context,
          created,
        );
        if (!evidence.confirmed) {
          throw new HarnessError(
            'SANDBOX_TERMINATION_UNCONFIRMED',
            `Sandbox termination could not be authoritatively confirmed: ${evidence.errorCode ?? 'UNKNOWN'}`,
          );
        }
        throw new HarnessError(
          'SANDBOX_OUTPUT_LIMIT_EXCEEDED',
          'Sandbox output exceeded the bounded capture limit.',
        );
      }
      const status =
        timedOut || aborted
          ? { observed: false, exitCode: null }
          : await this.supervisor.readExitStatus(created);
      const evidence = await this.supervisor.terminateInstance(
        context,
        created,
      );
      if (!evidence.confirmed) {
        throw new HarnessError(
          'SANDBOX_TERMINATION_UNCONFIRMED',
          `Sandbox termination could not be authoritatively confirmed: ${evidence.errorCode ?? 'UNKNOWN'}`,
        );
      }
      if (timedOut) {
        return {
          exitCode: 124,
          stdout: attach.stdout,
          stderr: `${attach.stderr}\n[SandboxRunner] Execution deadline exceeded`,
        };
      }
      if (aborted) {
        return {
          exitCode: 130,
          stdout: attach.stdout,
          stderr: `${attach.stderr}\n[SandboxRunner] Execution aborted by signal`,
        };
      }
      if (!status.observed || status.exitCode === null) {
        throw new HarnessError(
          'DOCKER_EXIT_STATUS_UNKNOWN',
          'Container exit status could not be authoritatively observed.',
        );
      }
      return {
        exitCode: status.exitCode,
        stdout: attach.stdout,
        stderr: attach.stderr,
      };
    } finally {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', abortListener);
      }
    }
  }

  /**
   * Authoritatively terminates and reconciles every owned container instance.
   */
  async terminate(context: ExecutionContext): Promise<TerminationEvidence> {
    return this.supervisor.terminate(context);
  }

  /**
   * Authoritatively inspects owned container presence/state without mutating it.
   */
  async inspect(context: ExecutionContext): Promise<TerminationEvidence> {
    return this.supervisor.inspect(context);
  }

  async writeFence(context: ExecutionContext, reason: string): Promise<void> {
    await this.supervisor.writeFence(context, reason);
  }

  get supervisorHandle(): LocalSupervisor {
    return this.supervisor;
  }
}

async function computeSha256(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
