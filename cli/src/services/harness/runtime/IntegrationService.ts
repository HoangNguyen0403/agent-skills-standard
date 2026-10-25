import crypto from 'crypto';
import { execFile as nodeExecFile } from 'child_process';
import { constants as fsConstants } from 'fs';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import {
  getProjectCheckoutPaths,
  HarnessDiscoveryService,
  isValidWorkspaceId,
  isValidWorkspacePath,
} from '../HarnessDiscoveryService';
import type { HarnessInventory } from '../HarnessDiscoveryService';
import { HarnessConfig, HarnessSetupService } from '../HarnessSetupService';
import {
  FleetPolicyService,
  resolveLogicalProjectId,
} from './FleetPolicyService';
import { ReleaseService } from './ReleaseService';
import { RuntimeStore } from './RuntimeStore';
import { FleetConfig, FleetProject, HarnessError } from './RuntimeTypes';

const execFileAsync = promisify(nodeExecFile);

const MAX_PASEO_CONFIG_BYTES = 4 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
const JOURNAL_UNINSTALL_PHASE_HEADROOM_BYTES =
  Buffer.byteLength('uninstall', 'utf8') - Buffer.byteLength('install', 'utf8');
function assertSerializedStateSize(
  content: string,
  label: string,
  reservedBytes = 0,
): void {
  const byteLength = Buffer.byteLength(content, 'utf8');
  const allowedBytes = MAX_RECEIPT_BYTES - reservedBytes;
  if (byteLength > allowedBytes) {
    throw new HarnessError(
      'INTEGRATION_STATE_TOO_LARGE',
      `Serialized integration ${label} exceeds the ${allowedBytes}-byte state limit`,
    );
  }
}
const MAX_EXECUTABLE_PROBE_MS = 5000;
const MAX_SESSIONS = 256;
const OMP_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const SEMVER_SEARCH = /(\d+\.\d+\.\d+)/;
const OWNED_WRAPPER_FILENAME = /^omp-wrapper-[0-9a-f]{8}\.sh$/;
const LOADER_FILENAME = 'omp-harness-loader.mjs';
const RECEIPT_FILENAME = 'integration-receipt.json';
const JOURNAL_FILENAME = 'integration-journal.json';
const LOCK_FILENAME = 'integration.lock';

export interface IntegrationPlanOptions {
  paseoHome?: string;
  targetConfigPath?: string;
  ompBinary?: string;
  cliPath?: string;
  nodeCommand?: string;
  ompRuntimeCommand?: string;
  platform?: string;
  ompVersion?: string;
  stateDir?: string;
  /** Test/operator seam: resolves the installed OMP version without spawning. */
  ompVersionResolver?: (targetBinary: string) => Promise<string>;
}

export interface IntegrationInstallOptions extends IntegrationPlanOptions {
  apply?: boolean;
}

export interface IntegrationUninstallOptions {
  apply?: boolean;
  targetConfigPath?: string;
}

export interface IntegrationPointerChange {
  pointer: string;
  previousValue?: unknown;
  plannedValue: unknown;
}

export interface IntegrationWrapperPlan {
  path: string;
  sha256: string;
  targetOmpBin: string;
  pointers: string[];
}

export type AuxiliaryRuntimeKind = 'node' | 'bun';
export interface OmpTargetInterpreter {
  targetBinary: string;
  kind: AuxiliaryRuntimeKind;
  path: string;
}

export interface IntegrationLauncherPlan {
  nodeCommand: string;
  cliPath: string;
  stateDir: string;
  platform: string;
  ompVersion: string;
  ompVersionSource: 'option' | 'receipt' | 'binary';
  auxiliaryRuntimeKind: AuxiliaryRuntimeKind;
  auxiliaryRuntimePath: string;
  ompInterpreters: Array<{ kind: AuxiliaryRuntimeKind; path: string }>;
  ompTargetInterpreters: OmpTargetInterpreter[];
  auxiliaryHome: string;
  paseoHome: string;
}

export interface IntegrationCoverage {
  terminalProfiles: string[];
  providers: string[];
  /** Providers that inherit an already-wrapped ancestor command and are left untouched. */
  inheritedProviders: string[];
  synthesizedProviderOverride: boolean;
  excludedProviders: string[];
}

export interface IntegrationPlan {
  status: 'plan';
  targetConfigPath: string;
  targetConfigSha256: string;
  targetConfigMode: number;
  launcher: IntegrationLauncherPlan;
  loaderPath: string;
  loaderSha256: string;
  wrappers: IntegrationWrapperPlan[];
  jsonPointers: IntegrationPointerChange[];
  coverage: IntegrationCoverage;
  daemonReloadRequired: true;
  filesToCreate: Array<{
    path: string;
    sha256: string;
    mode: number;
  }>;
}

export interface IntegrationReceiptPointer {
  pointer: string;
  previousValue?: unknown;
  installedValue: unknown;
}

export interface IntegrationReceiptWrapper {
  path: string;
  sha256: string;
  targetOmpBin: string;
  pointers: string[];
}

export interface IntegrationReceipt {
  schemaVersion: 3;
  owner: 'agent-skills-standard/integration';
  installedAt: number;
  targetConfigPath: string;
  targetConfigSha256Before: string;
  targetConfigSha256After: string;
  targetConfigMode: number;
  nodeCommand: string;
  cliPath: string;
  stateDir: string;
  platform: string;
  ompVersion: string;
  auxiliaryRuntimeKind: AuxiliaryRuntimeKind;
  auxiliaryRuntimePath: string;
  ompInterpreters: Array<{ kind: AuxiliaryRuntimeKind; path: string }>;
  auxiliaryHome: string;
  paseoHome: string;
  loaderPath: string;
  loaderSha256: string;
  wrappers: IntegrationReceiptWrapper[];
  backupPath: string;
  backupSha256: string;
  jsonPointers: IntegrationReceiptPointer[];
}

export interface IntegrationJournal {
  schemaVersion: 3;
  owner: 'agent-skills-standard/integration-journal';
  phase: 'install' | 'uninstall';
  createdAt: number;
  targetConfigPath: string;
  expectedBeforeSha256: string;
  expectedAfterSha256: string;
  receipt: IntegrationReceipt;
}

export interface IntegrationInstallResult {
  applied: boolean;
  saved?: boolean;
  daemonReloadRequired?: boolean;
  alreadyInstalled?: boolean;
  installedAt?: number;
  receiptPath?: string;
  targetConfigPath?: string;
  loaderPath?: string;
  wrapperPaths?: string[];
  backupPath?: string;
  jsonPointers?: IntegrationPointerChange[];
  recovered?: boolean;
  plan?: IntegrationPlan;
  pendingRecovery?: boolean;
  recoveryPhase?: 'install' | 'uninstall';
}

export interface IntegrationUninstallResult {
  applied: boolean;
  saved?: boolean;
  daemonReloadRequired?: boolean;
  uninstalledAt?: number;
  targetConfigPath?: string;
  restoredPointers?: Array<{
    pointer: string;
    previousValue: unknown;
  }>;
  removedFiles?: string[];
  recovered?: boolean;
  /** Read-only dry run found a pending journaled transition and reports it. */
  pendingRecovery?: boolean;
  recoveryPhase?: 'install' | 'uninstall';
}

/** Canonical local launch scope identity resolved without reading release pins. */
export interface FleetContextScope {
  hostId: string;
  projectId: string;
  logicalProjectId: string;
  rootPath: string;
}

export interface IntegrationServiceOptions {
  paseoHome?: string;
  policyService?: FleetPolicyService;
  releaseService?: ReleaseService;
  discoveryService?: HarnessDiscoveryService;
  setupService?: HarnessSetupService;
  ompBinary?: string;
  cliPath?: string;
  nodeCommand?: string;
  ompRuntimeCommand?: string;
  /** Operator-configured version pin used when a plan does not override it. */
  ompVersion?: string;
}

const sha256Hex = (value: string | Buffer): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const containsControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
};

const assertNoControlChars = (label: string, value: string): void => {
  if (containsControlChars(value)) {
    throw new HarnessError(
      'INVALID_PATH',
      `${label} must not contain control characters`,
    );
  }
};

const isSemverTriplet = (value: string): boolean =>
  OMP_VERSION_PATTERN.test(value);

/**
 * Shell-escapes a string using POSIX single-quote escaping.
 * Safe against command injection, spaces, $, quotes, and backticks.
 */
export function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function buildAuxiliaryPath(
  runtimePath: string,
  ompInterpreters: Array<{ kind: AuxiliaryRuntimeKind; path: string }>,
): string {
  if (process.platform === 'win32') {
    throw new HarnessError(
      'AUXILIARY_PLATFORM_UNSUPPORTED',
      'Automatic OMP guidance is unsupported on Windows without a trusted SystemRoot source',
    );
  }
  if (!path.isAbsolute(runtimePath)) {
    throw new HarnessError(
      'TRUSTED_RUNTIME_NOT_FOUND',
      'Auxiliary runtime directory must be absolute',
    );
  }
  return Array.from(
    new Set([
      ...ompInterpreters.map((interpreter) => path.dirname(interpreter.path)),
      path.resolve(runtimePath),
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ]),
  ).join(path.delimiter);
}
interface AuxiliaryEnvironment {
  [key: string]: string;
  HOME: string;
  PATH: string;
  PASEO_HOME: string;
  LANG: 'C';
  LC_ALL: 'C';
}

function createAuxiliaryEnvironment(
  home: string,
  paseoHome: string,
  runtimePath: string,
  ompInterpreters: Array<{ kind: AuxiliaryRuntimeKind; path: string }> = [],
): AuxiliaryEnvironment {
  return {
    HOME: home,
    PATH: buildAuxiliaryPath(runtimePath, ompInterpreters),
    PASEO_HOME: paseoHome,
    LANG: 'C',
    LC_ALL: 'C',
  };
}

async function resolveTrustedUserHome(): Promise<string> {
  let home: string;
  try {
    home = os.userInfo().homedir;
  } catch {
    throw new HarnessError(
      'TRUSTED_HOME_UNAVAILABLE',
      'Could not resolve the current operating-system user home directory',
    );
  }
  if (!path.isAbsolute(home)) {
    throw new HarnessError(
      'TRUSTED_HOME_UNAVAILABLE',
      'The current operating-system user home directory is not absolute',
    );
  }
  try {
    const stat = await fs.promises.lstat(home);
    const canonical = await fs.promises.realpath(home);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      canonical !== path.resolve(home)
    ) {
      throw new Error('home is not a canonical directory');
    }
    return canonical;
  } catch {
    throw new HarnessError(
      'TRUSTED_HOME_UNAVAILABLE',
      'The current operating-system user home directory is missing or non-canonical',
    );
  }
}

const AUXILIARY_RUNTIME_PROBE =
  'process.stdout.write(JSON.stringify({releaseName:process.release&&process.release.name,bunVersion:typeof Bun==="undefined"?null:Bun.version}));';

async function probeAuxiliaryRuntimeKind(
  executable: string,
  cwd: string,
  env: AuxiliaryEnvironment,
): Promise<AuxiliaryRuntimeKind> {
  const runProbe = async (
    args: string[],
  ): Promise<{ releaseName?: string; bunVersion?: string | null }> => {
    await assertCanonicalStateDirectory(cwd);
    try {
      const { stdout } = await execFileAsync(executable, args, {
        cwd,
        env,
        encoding: 'utf8',
        timeout: MAX_EXECUTABLE_PROBE_MS,
        maxBuffer: 64 * 1024,
        windowsHide: true,
      });
      const parsed = JSON.parse(String(stdout).trim()) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid runtime probe result');
      }
      const result = parsed as { releaseName?: unknown; bunVersion?: unknown };
      return {
        releaseName:
          typeof result.releaseName === 'string'
            ? result.releaseName
            : undefined,
        bunVersion:
          typeof result.bunVersion === 'string' ? result.bunVersion : null,
      };
    } catch {
      throw new HarnessError(
        'AUX_RUNTIME_UNRESOLVED',
        'Could not identify the selected auxiliary Node/Bun runtime safely',
      );
    }
  };

  const identity = await runProbe(['-e', AUXILIARY_RUNTIME_PROBE]);
  if (identity.bunVersion) {
    const bunFlagsIdentity = await runProbe([
      '--no-install',
      '--no-env-file',
      '-e',
      AUXILIARY_RUNTIME_PROBE,
    ]);
    if (!bunFlagsIdentity.bunVersion) {
      throw new HarnessError(
        'AUX_RUNTIME_FLAGS_UNSUPPORTED',
        'The selected Bun runtime does not support the required isolated metadata flags',
      );
    }
    return 'bun';
  }
  if (identity.releaseName === 'node') {
    return 'node';
  }
  throw new HarnessError(
    'AUX_RUNTIME_UNRESOLVED',
    'The selected auxiliary executable is neither a verified Node nor Bun runtime',
  );
}
async function readShebangLine(targetBinary: string): Promise<string | null> {
  let handle: fs.promises.FileHandle;
  try {
    handle = await fs.promises.open(
      targetBinary,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
  } catch {
    throw new HarnessError(
      'OMP_BINARY_NOT_FOUND',
      'Could not safely inspect the pinned OMP executable',
    );
  }
  try {
    if (!(await handle.stat()).isFile()) {
      throw new HarnessError(
        'UNKNOWN_CUSTOM_COMMAND',
        'Pinned OMP target is not a regular file',
      );
    }
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const firstLine = buffer
      .subarray(0, bytesRead)
      .toString('utf8')
      .split(/\r?\n/, 1)[0];
    return firstLine.startsWith('#!') ? firstLine.slice(2).trim() : null;
  } finally {
    await handle.close();
  }
}

function envShebangRuntimeKind(
  line: string | null,
): AuxiliaryRuntimeKind | null {
  if (!line) return null;
  const match = /^(\S+)(?:\s+(.*))?$/.exec(line);
  if (!match || path.basename(match[1]) !== 'env') return null;
  const parts = (match[2] ?? '').trim().split(/\s+/).filter(Boolean);
  const commandIndex =
    parts[0] === '-S' || parts[0] === '--split-string' ? 1 : 0;
  const command = parts[commandIndex];
  if (
    !command ||
    command.startsWith('-') ||
    command.startsWith('"') ||
    command.startsWith("'")
  ) {
    throw new HarnessError(
      'OMP_INTERPRETER_UNRESOLVED',
      'OMP env shebang uses an unsupported interpreter form; use a direct Node/Bun shebang or a simple env Node/Bun shebang',
    );
  }
  if (parts.length !== commandIndex + 1) {
    throw new HarnessError(
      'OMP_INTERPRETER_UNRESOLVED',
      'OMP env shebang includes interpreter arguments that cannot be pinned safely',
    );
  }
  const basename = path.basename(command);
  return basename === 'node' ? 'node' : basename === 'bun' ? 'bun' : null;
}

async function resolveOmpInterpreterBindings(
  targetBinaries: string[],
  selected: { path: string; kind: AuxiliaryRuntimeKind },
  explicitCommands: string[],
  cwd: string,
  env: AuxiliaryEnvironment,
): Promise<{
  ompInterpreters: Array<{ kind: AuxiliaryRuntimeKind; path: string }>;
  ompTargetInterpreters: OmpTargetInterpreter[];
}> {
  const targetKinds = new Map<string, AuxiliaryRuntimeKind>();
  for (const target of targetBinaries) {
    const kind = envShebangRuntimeKind(await readShebangLine(target));
    if (kind) targetKinds.set(target, kind);
  }
  const required = new Set(targetKinds.values());
  if (required.size === 0)
    return { ompInterpreters: [], ompTargetInterpreters: [] };

  const explicit: string[] = [];
  for (const command of explicitCommands) {
    if (!path.isAbsolute(command)) {
      throw new HarnessError(
        'TRUSTED_RUNTIME_NOT_FOUND',
        'OMP runtime command must be an absolute path',
      );
    }
    const inputPath = path.resolve(command);
    assertNoControlChars('OMP runtime command', inputPath);
    explicit.push(inputPath);
  }

  const interpreters: Array<{ kind: AuxiliaryRuntimeKind; path: string }> = [];
  const resolved = new Map<AuxiliaryRuntimeKind, string>();
  for (const kind of required) {
    let interpreterPath: string | null = null;
    if (selected.kind === kind) {
      interpreterPath = await fs.promises.realpath(selected.path);
    } else {
      const processInputPath = path.resolve(process.execPath);
      if (processInputPath !== selected.path) {
        const processPath = await fs.promises
          .realpath(processInputPath)
          .catch(() => null);
        if (processPath) {
          try {
            await assertExecutableInput(
              processInputPath,
              'TRUSTED_RUNTIME_NOT_FOUND',
              true,
            );
            if (
              (await probeAuxiliaryRuntimeKind(processPath, cwd, env)) === kind
            ) {
              interpreterPath = processPath;
            }
          } catch {
            // A non-Node/Bun installer executable is not a usable interpreter candidate.
          }
        }
      }
    }

    if (!interpreterPath) {
      for (const inputPath of explicit) {
        await assertExecutableInput(
          inputPath,
          'TRUSTED_RUNTIME_NOT_FOUND',
          true,
        );
        const canonicalPath = await fs.promises.realpath(inputPath);
        if (
          (await probeAuxiliaryRuntimeKind(canonicalPath, cwd, env)) === kind
        ) {
          interpreterPath = canonicalPath;
          break;
        }
      }
    }
    if (!interpreterPath) {
      throw new HarnessError(
        explicit.length > 0
          ? 'TRUSTED_RUNTIME_NOT_FOUND'
          : 'OMP_INTERPRETER_UNRESOLVED',
        `OMP target requires a verified ${kind} interpreter; select it with --node-command or --omp-runtime-command`,
      );
    }

    resolved.set(kind, interpreterPath);
    interpreters.push({ kind, path: interpreterPath });
  }

  return {
    ompInterpreters: interpreters,
    ompTargetInterpreters: Array.from(targetKinds, ([targetBinary, kind]) => ({
      targetBinary,
      kind,
      path: resolved.get(kind)!,
    })),
  };
}

/**
 * Generates the trusted ESM extension loaded into Oh My Pi via `-e`.
 * OMP v18.12.6 loads extension entries as ES modules and invokes the default
 * export factory with ExtensionAPI; `before_agent_start` handlers may return a
 * replacement `systemPrompt: string[]`. Guidance is frozen per actual session
 * and canonical project scope, re-read only on a real scope transition, and
 * gated by a launch-time check of every pinned target binary's actual version.
 */
export function generateOmpLoaderScript(options: {
  cliPath: string;
  nodeCommand: string;
  stateDir: string;
  platform: string;
  ompVersion: string;
  targetBinaries: string[];
  auxiliaryRuntimeKind: AuxiliaryRuntimeKind;
  auxiliaryRuntimePath: string;
  ompInterpreters?: Array<{ kind: AuxiliaryRuntimeKind; path: string }>;
  ompTargetInterpreters?: OmpTargetInterpreter[];
  auxiliaryHome: string;
  paseoHome: string;
}): string {
  const ompInterpreters = options.ompInterpreters ?? [];
  const auxiliaryPath = buildAuxiliaryPath(
    options.auxiliaryRuntimePath,
    ompInterpreters,
  );
  const literals = {
    cliPath: JSON.stringify(options.cliPath),
    nodeCommand: JSON.stringify(options.nodeCommand),
    stateDir: JSON.stringify(options.stateDir),
    platform: JSON.stringify(options.platform),
    ompVersion: JSON.stringify(options.ompVersion),
    targetBinaries: JSON.stringify(options.targetBinaries),
    auxiliaryRuntimeKind: JSON.stringify(options.auxiliaryRuntimeKind),
    auxiliaryRuntimePath: JSON.stringify(options.auxiliaryRuntimePath),
    ompInterpreters: JSON.stringify(ompInterpreters),
    ompTargetInterpreters: JSON.stringify(options.ompTargetInterpreters ?? []),
    auxiliaryHome: JSON.stringify(options.auxiliaryHome),
    paseoHome: JSON.stringify(options.paseoHome),
    auxiliaryPath: JSON.stringify(auxiliaryPath),
  };

  return `/**
 * Agent Skills Standard - Trusted Fleet Harness Loader for Oh My Pi
 * Generated by \`ags harness fleet install\`. Owned file: do not edit.
 */
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const CLI_PATH = ${literals.cliPath};
const NODE_COMMAND = ${literals.nodeCommand};
const STATE_DIR = ${literals.stateDir};
const PLATFORM = ${literals.platform};
const OMP_VERSION = ${literals.ompVersion};
const TARGET_BINARIES = ${literals.targetBinaries};
const AUXILIARY_RUNTIME_KIND = ${literals.auxiliaryRuntimeKind};
const AUXILIARY_RUNTIME_PATH = ${literals.auxiliaryRuntimePath};
const OMP_INTERPRETERS = ${literals.ompInterpreters};
const TARGET_INTERPRETERS = ${literals.ompTargetInterpreters};
const AUXILIARY_HOME = ${literals.auxiliaryHome};
const PASEO_HOME = ${literals.paseoHome};
const AUXILIARY_ENV = Object.freeze({
  HOME: AUXILIARY_HOME,
  PATH: ${literals.auxiliaryPath},
  PASEO_HOME,
  LANG: 'C',
  LC_ALL: 'C',
});
const VERSION_PATTERN = /(\\d+)\\.(\\d+)\\.(\\d+)/;
const MAX_SESSIONS = ${MAX_SESSIONS};

// session id -> { byCwd: Map<canonical cwd, identity|null>, byScope: Map<physical scope key, entry|null> }
// Frozen per actual session and canonical physical project scope: pin changes apply to new sessions only.
const sessionScopes = new Map();

function trustedDirectory(directory, privateDirectory) {
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return false;
  }
  if (privateDirectory && (stat.mode & 0o077) !== 0) {
    return false;
  }
  const canonical = realpathSync(directory);
  const lexical = path.resolve(directory);
  const darwinAlias =
    process.platform === 'darwin' &&
    ['/var', '/tmp', '/etc'].some(
      (root) =>
        (lexical === root || lexical.startsWith(root + path.sep)) &&
        canonical === '/private' + lexical,
    );
  return canonical === lexical || darwinAlias;
}

function auxiliaryDirectoriesReady() {
  if (process.platform === 'win32' || !AUXILIARY_RUNTIME_KIND) {
    return false;
  }
  try {
    return (
      trustedDirectory(STATE_DIR, true) &&
      trustedDirectory(AUXILIARY_RUNTIME_PATH, false) &&
      OMP_INTERPRETERS.every((interpreter) =>
        trustedDirectory(path.dirname(interpreter.path), false),
      ) &&
      trustedDirectory(AUXILIARY_HOME, false) &&
      trustedDirectory(PASEO_HOME, false)
    );
  } catch {
    return false;
  }
}

function runContextCli(extraArgs) {
  if (!auxiliaryDirectoriesReady()) {
    return null;
  }
  const runtimeArgs = AUXILIARY_RUNTIME_KIND === 'bun'
    ? ['--no-install', '--no-env-file', CLI_PATH, 'harness', 'fleet', 'context', ...extraArgs]
    : [CLI_PATH, 'harness', 'fleet', 'context', ...extraArgs];
  const res = spawnSync(NODE_COMMAND, runtimeArgs, {
    cwd: STATE_DIR,
    env: AUXILIARY_ENV,
    encoding: 'utf8',
    timeout: 5000,
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
  const text = String((res && res.stdout) || '');
  if ((res && res.status) !== 0 || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function canonicalCwd(cwd) {
  try {
    return realpathSync(cwd);
  } catch {
    return null;
  }
}

function scopeIdentity(scope) {
  if (
    !scope ||
    typeof scope.hostId !== 'string' ||
    !scope.hostId ||
    typeof scope.projectId !== 'string' ||
    !scope.projectId ||
    typeof scope.logicalProjectId !== 'string' ||
    !scope.logicalProjectId ||
    typeof scope.rootPath !== 'string' ||
    !scope.rootPath
  ) {
    return null;
  }
  return JSON.stringify([scope.hostId, scope.projectId, scope.logicalProjectId, scope.rootPath]);
}

/** Metadata-only canonical scope lookup: never reads current release pins. */
function resolveScope(cwd) {
  const parsed = runContextCli(['--cwd', cwd, '--state-dir', STATE_DIR, '--scope-only']);
  const scope = parsed && parsed.scope;
  const key = scopeIdentity(scope);
  return key ? { key, scope } : null;
}

function resolveGuidance(cwd, expectedScopeKey) {
  const parsed = runContextCli([
    '--cwd',
    cwd,
    '--platform',
    PLATFORM,
    '--omp-version',
    OMP_VERSION,
    '--state-dir',
    STATE_DIR,
  ]);
  const context = parsed && parsed.context;
  if (
    !context ||
    typeof context.guidance !== 'string' ||
    !context.guidance ||
    scopeIdentity(context.scope) !== expectedScopeKey
  ) {
    return null;
  }
  return {
    digest: typeof context.releaseDigest === 'string' ? context.releaseDigest : '',
    guidance: context.guidance,
  };
}

// Launch-time compatibility: a replaced or upgraded target binary must not
// receive guidance approved for the recorded version. Ordinary OMP launch is
// never blocked; only guidance injection stops.
let runtimeVersionState = null;
function runtimeVersionCompatible() {
  if (runtimeVersionState !== null) {
    return runtimeVersionState;
  }
  runtimeVersionState = false;
  if (
    !auxiliaryDirectoriesReady() ||
    !Array.isArray(TARGET_BINARIES) ||
    TARGET_BINARIES.length === 0
  ) {
    return false;
  }
  for (const binary of TARGET_BINARIES) {
    if (!auxiliaryDirectoriesReady()) {
      return false;
    }
    const targetInterpreter = TARGET_INTERPRETERS.find((entry) => entry.targetBinary === binary);
    const versionCommand = targetInterpreter ? targetInterpreter.path : binary;
    const versionArgs = targetInterpreter
      ? targetInterpreter.kind === 'bun'
        ? ['--no-install', '--no-env-file', binary, '--version']
        : [binary, '--version']
      : ['--version'];
    const res = spawnSync(versionCommand, versionArgs, {
      cwd: STATE_DIR,
      env: AUXILIARY_ENV,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    if (res.status !== 0) {
      return false;
    }
    const match = VERSION_PATTERN.exec(String(res.stdout || ''));
    if (!match || match[1] + '.' + match[2] + '.' + match[3] !== OMP_VERSION) {
      return false;
    }
  }
  runtimeVersionState = true;
  return true;
}

function sessionIdentity(ctx) {
  const manager = ctx && ctx.sessionManager;
  if (!manager || typeof manager.getSessionId !== 'function') {
    return null;
  }
  try {
    const id = manager.getSessionId();
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function sessionState(sessionId) {
  let state = sessionScopes.get(sessionId);
  if (state) {
    return state;
  }
  if (sessionScopes.size >= MAX_SESSIONS) {
    // Bound admission; existing frozen contexts are never discarded.
    return null;
  }
  state = { byCwd: new Map(), byScope: new Map() };
  sessionScopes.set(sessionId, state);
  return state;
}

export default function agsHarnessLoader(pi) {
  if (!pi || typeof pi.on !== 'function') {
    return;
  }

  pi.on('session_shutdown', function (event, ctx) {
    try {
      const sessionId = sessionIdentity(ctx);
      if (sessionId) {
        sessionScopes.delete(sessionId);
      }
    } catch {
      // Teardown cleanup must never disturb shutdown
    }
  });

  pi.on('before_agent_start', async function (event, ctx) {
    try {
      if (!runtimeVersionCompatible()) {
        return undefined;
      }
      const cwd = ctx && typeof ctx.cwd === 'string' ? ctx.cwd : null;
      const sessionId = sessionIdentity(ctx);
      if (!cwd || !sessionId) {
        return undefined;
      }
      const physicalCwd = canonicalCwd(cwd);
      if (!physicalCwd) {
        return undefined;
      }
      const state = sessionState(sessionId);
      if (!state) {
        return undefined;
      }

      let scope = state.byCwd.get(physicalCwd);
      if (scope === undefined) {
        scope = resolveScope(physicalCwd);
        state.byCwd.set(physicalCwd, scope);
      }
      if (!scope) {
        return undefined;
      }

      let entry;
      if (state.byScope.has(scope.key)) {
        // Preserve cached guidance or null for this exact physical scope.
        entry = state.byScope.get(scope.key);
      } else {
        entry = resolveGuidance(physicalCwd, scope.key);
        state.byScope.set(scope.key, entry);
      }
      if (!entry || !entry.guidance) {
        return undefined;
      }

      const previous = Array.isArray(event && event.systemPrompt) ? event.systemPrompt : [];
      if (previous.includes(entry.guidance)) {
        return undefined;
      }
      // Reapply the session-cached text to each fresh prepared prompt.
      return { systemPrompt: [...previous, entry.guidance] };
    } catch {
      // Fail closed and silent: never disrupt standard interactive sessions
      return undefined;
    }
  });
}
`;
}

/**
 * Generates the trusted POSIX shell wrapper for one pinned OMP binary.
 * Static literals are single-quote escaped so shell metacharacters in owned
 * state paths are inert. No environment variable can replace the pinned target.
 * `exec` preserves argv, stdin, stdout, stderr, signals, and exit status.
 */
export function generateOmpWrapperScript(options: {
  targetOmpBin: string;
  loaderPath: string;
}): string {
  const escapedTarget = shellEscape(path.resolve(options.targetOmpBin));
  const escapedLoader = shellEscape(path.resolve(options.loaderPath));

  return `#!/bin/sh
# Agent Skills Standard - Trusted OMP Fleet Launcher (owned file: do not edit)
# Pinned OMP target and loader; argv/stdin/stdout/stderr/signals/exit preserved.
exec ${escapedTarget} -e ${escapedLoader} "$@"
`;
}

/**
 * Helper to get value at a JSON pointer (e.g. "/daemon/terminalProfiles/0/command").
 */
export function getJsonPointerValue(doc: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) {
    throw new HarnessError(
      'INVALID_POINTER',
      `Invalid JSON pointer: "${pointer}"`,
    );
  }
  const parts = pointer
    .slice(1)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = doc;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Helper to set value at a JSON pointer in an object.
 */
export function setJsonPointerValue(
  doc: unknown,
  pointer: string,
  value: unknown,
): void {
  if (!pointer.startsWith('/')) {
    throw new HarnessError(
      'INVALID_POINTER',
      `Invalid JSON pointer: "${pointer}"`,
    );
  }
  const parts = pointer
    .slice(1)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: Record<string, unknown> = doc as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (next === undefined || next === null || typeof next !== 'object') {
      const created: Record<string, unknown> = {};
      current[part] = created;
      current = created;
    } else {
      current = next as Record<string, unknown>;
    }
  }
  const last = parts[parts.length - 1];
  current[last] = value;
}

/**
 * Helper to deep-compare values for CAS checks.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((val, idx) => valuesEqual(val, b[idx]));
  }
  if (
    typeof a === 'object' &&
    a !== null &&
    typeof b === 'object' &&
    b !== null
  ) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

const absolutePathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => path.isAbsolute(value), 'must be an absolute path')
  .refine(
    (value) => !containsControlChars(value),
    'must not contain control characters',
  );

const digestSchema = z.string().regex(/^[0-9a-f]{64}$/);

const IntegrationReceiptSchema = z
  .object({
    schemaVersion: z.literal(3),
    owner: z.literal('agent-skills-standard/integration'),
    loaderPath: absolutePathSchema,
    installedAt: z.number().int().nonnegative(),
    targetConfigPath: absolutePathSchema,
    targetConfigSha256Before: digestSchema,
    targetConfigSha256After: digestSchema,
    targetConfigMode: z.number().int().min(0).max(0o777),
    nodeCommand: absolutePathSchema,
    cliPath: absolutePathSchema,
    stateDir: absolutePathSchema,
    platform: z.string().min(1).max(64),
    ompVersion: z.string().regex(OMP_VERSION_PATTERN),
    auxiliaryRuntimeKind: z.enum(['node', 'bun']),
    auxiliaryRuntimePath: absolutePathSchema,
    ompInterpreters: z
      .array(
        z
          .object({
            kind: z.enum(['node', 'bun']),
            path: absolutePathSchema,
          })
          .strict(),
      )
      .max(2),
    auxiliaryHome: absolutePathSchema,
    paseoHome: absolutePathSchema,
    loaderSha256: digestSchema,
    wrappers: z
      .array(
        z
          .object({
            path: absolutePathSchema,
            sha256: digestSchema,
            targetOmpBin: absolutePathSchema,
            pointers: z.array(z.string().regex(/^\//)).min(1),
          })
          .strict(),
      )
      .min(1),
    backupPath: absolutePathSchema,
    backupSha256: digestSchema,
    jsonPointers: z
      .array(
        z
          .object({
            pointer: z.string().regex(/^\//),
            previousValue: z.unknown().optional(),
            installedValue: z.unknown(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const IntegrationJournalSchema = z
  .object({
    schemaVersion: z.literal(3),
    owner: z.literal('agent-skills-standard/integration-journal'),
    phase: z.enum(['install', 'uninstall']),
    createdAt: z.number().int().nonnegative(),
    targetConfigPath: absolutePathSchema,
    expectedBeforeSha256: digestSchema,
    expectedAfterSha256: digestSchema,
    receipt: IntegrationReceiptSchema,
  })
  .strict();

interface LaunchEntry {
  pointer: string;
  kind: 'terminal' | 'provider';
  /** Original argv prefix (binary + arguments) that the wrapper must preserve. */
  originalArgv: string[];
  /** True when the entry had no configured command and fell back to a default. */
  usesDefaultBinary: boolean;
  currentValue: unknown;
}

interface PaseoConfigDocument {
  daemon?: Record<string, unknown>;
  agents?: Record<string, unknown>;
  [key: string]: unknown;
}

export function isDarwinSystemAliasPath(
  lexical: string,
  canonical: string,
): boolean {
  if (process.platform !== 'darwin') {
    return false;
  }
  const normalized = path.resolve(lexical);
  return ['/var', '/tmp', '/etc'].some(
    (root) =>
      (normalized === root || normalized.startsWith(`${root}${path.sep}`)) &&
      canonical === `/private${normalized}`,
  );
}

async function fsyncDirectory(dirPath: string): Promise<void> {
  const handle = await fs.promises.open(dirPath, fsConstants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Reads a bounded regular file without following symlinks. FIFOs/sockets are
 * rejected from the opened descriptor's own metadata, so a swapped path cannot
 * block or stream unbounded input.
 */
async function readBoundedRegularFile(
  filePath: string,
  maxBytes: number,
  notFound: { code: string; message: string },
  invalid: { code: string; message: string },
  tooLargeCode: string,
  expectedMode?: number,
): Promise<Buffer> {
  let handle: fs.promises.FileHandle;
  try {
    // O_NONBLOCK makes a FIFO open return immediately; the descriptor type check
    // below then rejects it before any read can block.
    handle = await fs.promises.open(
      filePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
  } catch (err: unknown) {
    const code =
      isPlainObject(err) && typeof err.code === 'string' ? err.code : '';
    if (code === 'ENOENT') {
      throw new HarnessError(notFound.code, notFound.message);
    }
    throw new HarnessError(invalid.code, invalid.message);
  }
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) {
      throw new HarnessError(invalid.code, invalid.message);
    }
    if (expectedMode !== undefined && (stat.mode & 0o777) !== expectedMode) {
      throw new HarnessError(invalid.code, invalid.message);
    }
    if (stat.size > maxBytes) {
      throw new HarnessError(
        tooLargeCode,
        `File "${filePath}" exceeds the bounded limit of ${maxBytes} bytes`,
      );
    }
    const chunks: Buffer[] = [];
    let total = 0;
    const buffer = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1));
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) {
        break;
      }
      total += bytesRead;
      if (total > maxBytes) {
        throw new HarnessError(
          tooLargeCode,
          `File "${filePath}" exceeds the bounded limit of ${maxBytes} bytes`,
        );
      }
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }
    return Buffer.concat(chunks, total);
  } finally {
    await handle.close();
  }
}

async function assertCanonicalStateDirectory(dirPath: string): Promise<void> {
  let stat: fs.Stats | null;
  try {
    stat = await fs.promises.lstat(dirPath);
  } catch {
    stat = null;
  }
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    throw new HarnessError(
      'UNSAFE_INTEGRATION_DIR',
      `Harness state directory "${dirPath}" must be a real directory`,
    );
  }
  const canonical = await fs.promises.realpath(dirPath).catch(() => null);
  if (
    canonical !== path.resolve(dirPath) &&
    !(canonical && isDarwinSystemAliasPath(dirPath, canonical))
  ) {
    throw new HarnessError(
      'UNSAFE_INTEGRATION_DIR',
      `Harness state directory "${dirPath}" resolves through a symlink; configure canonical paths only`,
    );
  }
}

async function ensureOwnedDirectory(dirPath: string): Promise<void> {
  let stat: fs.Stats;
  try {
    stat = await fs.promises.lstat(dirPath);
  } catch (err: unknown) {
    const code =
      isPlainObject(err) && typeof err.code === 'string' ? err.code : '';
    if (code !== 'ENOENT') {
      throw err;
    }
    await fs.promises.mkdir(dirPath, { mode: 0o700 });
    await fsyncDirectory(path.dirname(dirPath));
    return;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new HarnessError(
      'UNSAFE_INTEGRATION_DIR',
      `Integration path "${dirPath}" must be a real directory, not a symlink or special file`,
    );
  }
  const canonical = await fs.promises.realpath(dirPath).catch(() => null);
  if (
    canonical !== path.resolve(dirPath) &&
    !(canonical && isDarwinSystemAliasPath(dirPath, canonical))
  ) {
    throw new HarnessError(
      'UNSAFE_INTEGRATION_DIR',
      `Integration path "${dirPath}" resolves through a symlink; configure canonical paths only`,
    );
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new HarnessError(
      'UNSAFE_PERMISSIONS',
      `Integration directory "${dirPath}" has group/world permissions; refusing to relax or overwrite it`,
    );
  }
}
async function validateOwnedDirectoryIfPresent(dirPath: string): Promise<void> {
  try {
    await fs.promises.lstat(dirPath);
  } catch (err: unknown) {
    const code =
      isPlainObject(err) && typeof err.code === 'string' ? err.code : '';
    if (code === 'ENOENT') {
      return;
    }
    throw err;
  }
  await ensureOwnedDirectory(dirPath);
}

async function writeExclusiveFile(
  filePath: string,
  content: string | Buffer,
  mode: number,
): Promise<void> {
  const handle = await fs.promises.open(
    filePath,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL,
    mode,
  );
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsyncDirectory(path.dirname(filePath));
}

async function writeAtomicReplace(
  targetPath: string,
  content: string | Buffer,
  mode: number,
  verifyBeforeRename?: () => Promise<void>,
): Promise<void> {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(
    dir,
    `.${path.basename(targetPath)}.ags-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  try {
    await writeExclusiveFile(tempPath, content, mode);
    // Revalidate the external expectation at the actual commit boundary, after
    // every staging await that could have raced a cooperating editor.
    if (verifyBeforeRename) {
      await verifyBeforeRename();
    }
    await fs.promises.rename(tempPath, targetPath);
    await fsyncDirectory(dir);
  } catch (err) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
    throw err;
  }
}

/**
 * Rejects changes through symlinked ancestors of the external Paseo config.
 * Same-user administrators remain trusted; this only prevents accidental
 * writes through a symmetrically edited path.
 */
async function assertCanonicalExternalPath(targetPath: string): Promise<void> {
  let canonical: string;
  try {
    canonical = await fs.promises.realpath(targetPath);
  } catch {
    throw new HarnessError(
      'PASEO_CONFIG_NOT_FOUND',
      `Paseo configuration not found at "${targetPath}". Initialize Paseo or verify the path.`,
    );
  }
  const lexical = path.resolve(targetPath);
  if (canonical !== lexical && !isDarwinSystemAliasPath(lexical, canonical)) {
    throw new HarnessError(
      'UNSAFE_TARGET_PATH',
      `Paseo configuration path "${targetPath}" resolves through a symlink to "${canonical}"; configure the canonical path`,
    );
  }
}

function assertTouchedPaseoConfigShape(document: PaseoConfigDocument): void {
  const agents = document.agents;
  if (agents !== undefined) {
    if (!isPlainObject(agents)) {
      throw new HarnessError(
        'INVALID_PASEO_CONFIG',
        'agents must be an object',
      );
    }
    const providers = agents.providers;
    if (providers !== undefined) {
      if (!isPlainObject(providers)) {
        throw new HarnessError(
          'INVALID_PASEO_CONFIG',
          'agents.providers must be an object',
        );
      }
      for (const [providerId, providerValue] of Object.entries(providers)) {
        if (!isPlainObject(providerValue)) {
          throw new HarnessError(
            'INVALID_PASEO_CONFIG',
            `agents.providers.${providerId} must be an object`,
          );
        }
        const command = providerValue.command;
        if (command !== undefined) {
          const valid =
            Array.isArray(command) &&
            command.length > 0 &&
            command.every((arg) => typeof arg === 'string' && arg.length > 0);
          if (!valid) {
            throw new HarnessError(
              'INVALID_PASEO_CONFIG',
              `agents.providers.${providerId}.command must be a non-empty string[] command prefix`,
            );
          }
        }
        if (
          providerValue.extends !== undefined &&
          typeof providerValue.extends !== 'string'
        ) {
          throw new HarnessError(
            'INVALID_PASEO_CONFIG',
            `agents.providers.${providerId}.extends must be a string`,
          );
        }
      }
    }
  }

  const daemon = document.daemon;
  if (daemon !== undefined) {
    if (!isPlainObject(daemon)) {
      throw new HarnessError(
        'INVALID_PASEO_CONFIG',
        'daemon must be an object',
      );
    }
    const profiles = daemon.terminalProfiles;
    if (profiles !== undefined) {
      if (!Array.isArray(profiles)) {
        throw new HarnessError(
          'INVALID_PASEO_CONFIG',
          'daemon.terminalProfiles must be an array',
        );
      }
      profiles.forEach((profile, index) => {
        if (!isPlainObject(profile)) {
          throw new HarnessError(
            'INVALID_PASEO_CONFIG',
            `daemon.terminalProfiles[${index}] must be an object`,
          );
        }
        if (
          profile.command !== undefined &&
          typeof profile.command !== 'string'
        ) {
          throw new HarnessError(
            'INVALID_PASEO_CONFIG',
            `daemon.terminalProfiles[${index}].command must be a string`,
          );
        }
        if (profile.args !== undefined) {
          const valid =
            Array.isArray(profile.args) &&
            profile.args.every((arg) => typeof arg === 'string');
          if (!valid) {
            throw new HarnessError(
              'INVALID_PASEO_CONFIG',
              `daemon.terminalProfiles[${index}].args must be string[]`,
            );
          }
        }
      });
    }
  }
}

export class IntegrationService {
  readonly store: RuntimeStore;
  readonly policyService: FleetPolicyService;
  readonly releaseService: ReleaseService;
  readonly discoveryService: HarnessDiscoveryService;
  readonly setupService: HarnessSetupService;
  private readonly defaultPaseoHome: string;
  private readonly defaultOmpBinary: string;
  private readonly defaultCliPath: string;
  private readonly defaultNodeCommand: string;
  private readonly defaultOmpVersion?: string;
  private readonly defaultOmpRuntimeCommand?: string;

  constructor(store: RuntimeStore, options?: IntegrationServiceOptions) {
    this.store = store;
    this.setupService =
      options?.setupService ?? new HarnessSetupService(this.store.stateDir);
    this.policyService =
      options?.policyService ?? new FleetPolicyService(this.store);
    this.releaseService =
      options?.releaseService ?? new ReleaseService(this.store);
    this.discoveryService =
      options?.discoveryService ?? new HarnessDiscoveryService();

    if (options?.paseoHome) {
      this.defaultPaseoHome = path.resolve(options.paseoHome);
    } else if (process.env.PASEO_HOME) {
      this.defaultPaseoHome = path.resolve(process.env.PASEO_HOME);
    } else {
      this.defaultPaseoHome = path.resolve(os.homedir(), '.paseo');
    }

    this.defaultOmpBinary = options?.ompBinary ?? 'omp';
    // Bundled distribution: this module is inlined into the shipped entrypoint,
    // so __filename is the package's real built CLI file. Source/test execution
    // resolves to a .ts file and therefore cannot silently guess an entrypoint.
    // ESM source execution has no __filename; an empty value keeps the
    // installer refusing instead of guessing a cwd-relative executable.
    this.defaultCliPath =
      options?.cliPath ?? (typeof __filename === 'string' ? __filename : '');
    this.defaultNodeCommand = options?.nodeCommand ?? process.execPath;
    this.defaultOmpVersion = options?.ompVersion;
    this.defaultOmpRuntimeCommand = options?.ompRuntimeCommand;
  }

  private get integrationDir(): string {
    return path.join(this.store.stateDir, 'integration');
  }

  private get backupsDir(): string {
    return path.join(this.store.stateDir, 'backups');
  }

  private get receiptPath(): string {
    return path.join(this.store.stateDir, RECEIPT_FILENAME);
  }

  private get journalPath(): string {
    return path.join(this.store.stateDir, JOURNAL_FILENAME);
  }

  private get lockPath(): string {
    return path.join(this.store.stateDir, LOCK_FILENAME);
  }

  /**
   * Plans the global Paseo OMP integration using compare-and-swap semantics.
   * Validates the touched Paseo v0.13 config families (terminal profile string
   * commands, agent provider string[] prefixes) before and after the planned
   * edit, resolves every original launch prefix to a real executable, and pins
   * an absolute trusted CLI/node/state/version tuple for the generated loader.
   */
  async plan(options?: IntegrationPlanOptions): Promise<IntegrationPlan> {
    const paseoHome = options?.paseoHome
      ? path.resolve(options.paseoHome)
      : this.defaultPaseoHome;
    const targetConfigPath = options?.targetConfigPath
      ? path.resolve(options.targetConfigPath)
      : path.join(paseoHome, 'config.json');

    const rawConfig = await this.readConfigBytes(targetConfigPath);
    await assertCanonicalExternalPath(targetConfigPath);
    const canonicalPaseoHome = path.dirname(
      await fs.promises.realpath(targetConfigPath),
    );

    const targetConfigSha256 = sha256Hex(rawConfig);
    const targetConfigMode =
      (await fs.promises.stat(targetConfigPath)).mode & 0o777;
    let parsedConfig: PaseoConfigDocument;
    try {
      const parsed = JSON.parse(rawConfig.toString('utf8')) as unknown;
      if (!isPlainObject(parsed)) {
        throw new Error('not an object');
      }
      parsedConfig = parsed;
    } catch {
      throw new HarnessError(
        'PASEO_CONFIG_CORRUPT',
        `Paseo configuration at "${targetConfigPath}" is not a valid JSON object`,
      );
    }
    assertTouchedPaseoConfigShape(parsedConfig);

    const receipt = await this.readReceiptIfPresent();
    const { entries, synthesizedProviderOverride, inheritedProviders } =
      this.collectLaunchEntries(parsedConfig, receipt);
    const wrapperTargets = new Map<string, IntegrationWrapperPlan>();
    const entryTargets = new Map<string, string>();

    for (const entry of entries) {
      const targetOmpBin = await this.resolveEntryTarget(entry, options);
      entryTargets.set(entry.pointer, targetOmpBin);
      const wrapperPath = path.join(
        this.integrationDir,
        `omp-wrapper-${sha256Hex(targetOmpBin).slice(0, 8)}.sh`,
      );
      let wrapper = wrapperTargets.get(targetOmpBin);
      if (!wrapper) {
        const wrapperContent = generateOmpWrapperScript({
          targetOmpBin,
          loaderPath: path.join(this.integrationDir, LOADER_FILENAME),
        });
        wrapper = {
          path: wrapperPath,
          sha256: sha256Hex(wrapperContent),
          targetOmpBin,
          pointers: [],
        };
        wrapperTargets.set(targetOmpBin, wrapper);
      }
      wrapper.pointers.push(entry.pointer);
    }

    const wrappers = Array.from(wrapperTargets.values());
    const launcher = await this.resolveLauncher(
      options,
      receipt,
      wrappers.map((wrapper) => wrapper.targetOmpBin),
      canonicalPaseoHome,
    );
    const jsonPointers: IntegrationPointerChange[] = entries.map((entry) => {
      const wrapper = wrappers.find((candidate) =>
        candidate.pointers.includes(entry.pointer),
      );
      const targetOmpBin = entryTargets.get(entry.pointer);
      if (!wrapper || !targetOmpBin) {
        throw new HarnessError(
          'INTEGRATION_PLAN_INCONSISTENT',
          `No owned wrapper planned for pointer "${entry.pointer}"`,
        );
      }
      return {
        pointer: entry.pointer,
        previousValue: entry.currentValue,
        plannedValue:
          entry.kind === 'terminal'
            ? wrapper.path
            : [wrapper.path, ...entry.originalArgv.slice(1)],
      };
    });

    const loaderPath = path.join(this.integrationDir, LOADER_FILENAME);
    const loaderContent = generateOmpLoaderScript({
      cliPath: launcher.cliPath,
      nodeCommand: launcher.nodeCommand,
      stateDir: launcher.stateDir,
      platform: launcher.platform,
      ompVersion: launcher.ompVersion,
      targetBinaries: wrappers.map((wrapper) => wrapper.targetOmpBin),
      auxiliaryRuntimeKind: launcher.auxiliaryRuntimeKind,
      auxiliaryRuntimePath: launcher.auxiliaryRuntimePath,
      ompInterpreters: launcher.ompInterpreters,
      ompTargetInterpreters: launcher.ompTargetInterpreters,
      auxiliaryHome: launcher.auxiliaryHome,
      paseoHome: launcher.paseoHome,
    });
    const loaderSha256 = sha256Hex(loaderContent);

    const updatedDocument = JSON.parse(
      JSON.stringify(parsedConfig),
    ) as PaseoConfigDocument;
    for (const pointer of jsonPointers) {
      setJsonPointerValue(
        updatedDocument,
        pointer.pointer,
        pointer.plannedValue,
      );
    }
    assertTouchedPaseoConfigShape(updatedDocument);

    const excludedProviders = this.listExcludedProviders(parsedConfig);

    return {
      status: 'plan',
      targetConfigPath,
      targetConfigSha256,
      targetConfigMode,
      launcher,
      loaderPath,
      loaderSha256,
      wrappers,
      jsonPointers,
      coverage: {
        terminalProfiles: jsonPointers
          .filter((pointer) =>
            pointer.pointer.startsWith('/daemon/terminalProfiles/'),
          )
          .map((pointer) => pointer.pointer),
        providers: jsonPointers
          .filter((pointer) => pointer.pointer.startsWith('/agents/providers/'))
          .map((pointer) => pointer.pointer),
        synthesizedProviderOverride,
        inheritedProviders,
        excludedProviders,
      },
      daemonReloadRequired: true,
      filesToCreate: [
        { path: loaderPath, sha256: loaderSha256, mode: 0o600 },
        ...wrappers.map((wrapper) => ({
          path: wrapper.path,
          sha256: wrapper.sha256,
          mode: 0o700,
        })),
      ],
    };
  }

  /**
   * Installs the global OMP integration with compare-and-swap checks.
   * Default is a read-only dry run unless options.apply === true.
   * Installation is serialized by an owned lock, stages owned artifacts first,
   * writes a durable journal, and commits config + receipt before clearing it.
   */
  async install(
    options?: IntegrationInstallOptions,
  ): Promise<IntegrationInstallResult> {
    if (options?.apply !== true) {
      const plan = await this.plan(options);
      return { applied: false, saved: false, plan };
    }

    await this.setupService.load();
    await assertCanonicalStateDirectory(this.store.stateDir);
    return this.withLock(async () => {
      await validateOwnedDirectoryIfPresent(this.integrationDir);
      await validateOwnedDirectoryIfPresent(this.backupsDir);
      const recovered = await this.recoverInterrupted();
      const currentPlan = await this.plan(options);
      const existingReceipt = await this.readReceiptIfPresent();

      if (existingReceipt) {
        if (await this.matchesInstalledState(existingReceipt, currentPlan)) {
          return {
            applied: true,
            saved: true,
            daemonReloadRequired: true,
            alreadyInstalled: true,
            installedAt: existingReceipt.installedAt,
            receiptPath: this.receiptPath,
            targetConfigPath: existingReceipt.targetConfigPath,
            loaderPath: existingReceipt.loaderPath,
            wrapperPaths: existingReceipt.wrappers.map(
              (wrapper) => wrapper.path,
            ),
            backupPath: existingReceipt.backupPath,
            jsonPointers: existingReceipt.jsonPointers.map((pointer) => ({
              pointer: pointer.pointer,
              previousValue: pointer.previousValue,
              plannedValue: pointer.installedValue,
            })),
            recovered,
          };
        }
        throw new HarnessError(
          'OWNERSHIP_DRIFT',
          'Existing integration receipt no longer matches the installed pointers or owned files. Run uninstall or reconcile manually; refusing to overwrite.',
        );
      }

      const currentRaw = await this.readConfigBytes(
        currentPlan.targetConfigPath,
      );
      if (sha256Hex(currentRaw) !== currentPlan.targetConfigSha256) {
        throw new HarnessError(
          'CAS_MISMATCH',
          `Paseo configuration changed concurrently (expected SHA-256 ${currentPlan.targetConfigSha256}, found ${sha256Hex(currentRaw)}). Install aborted.`,
        );
      }

      const currentDocument = JSON.parse(
        currentRaw.toString('utf8'),
      ) as PaseoConfigDocument;
      for (const pointer of currentPlan.jsonPointers) {
        const currentValue = getJsonPointerValue(
          currentDocument,
          pointer.pointer,
        );
        if (!valuesEqual(currentValue, pointer.previousValue)) {
          throw new HarnessError(
            'CAS_MISMATCH',
            `Paseo config value at pointer "${pointer.pointer}" changed concurrently. Install aborted.`,
          );
        }
      }

      const updatedDocument = JSON.parse(
        currentRaw.toString('utf8'),
      ) as PaseoConfigDocument;
      for (const pointer of currentPlan.jsonPointers) {
        setJsonPointerValue(
          updatedDocument,
          pointer.pointer,
          pointer.plannedValue,
        );
      }
      assertTouchedPaseoConfigShape(updatedDocument);
      const updatedRaw = JSON.stringify(updatedDocument, null, 2) + '\n';
      const targetConfigSha256After = sha256Hex(updatedRaw);
      const backupPath = path.join(
        this.backupsDir,
        `paseo-config-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
      );

      const installedAt = Date.now();
      const receipt: IntegrationReceipt = {
        schemaVersion: 3,
        owner: 'agent-skills-standard/integration',
        installedAt,
        targetConfigPath: currentPlan.targetConfigPath,
        targetConfigSha256Before: currentPlan.targetConfigSha256,
        targetConfigSha256After,
        targetConfigMode: currentPlan.targetConfigMode,
        nodeCommand: currentPlan.launcher.nodeCommand,
        cliPath: currentPlan.launcher.cliPath,
        stateDir: currentPlan.launcher.stateDir,
        platform: currentPlan.launcher.platform,
        ompVersion: currentPlan.launcher.ompVersion,
        auxiliaryRuntimeKind: currentPlan.launcher.auxiliaryRuntimeKind,
        auxiliaryRuntimePath: currentPlan.launcher.auxiliaryRuntimePath,
        ompInterpreters: currentPlan.launcher.ompInterpreters,
        auxiliaryHome: currentPlan.launcher.auxiliaryHome,
        paseoHome: currentPlan.launcher.paseoHome,
        loaderPath: currentPlan.loaderPath,
        loaderSha256: currentPlan.loaderSha256,
        wrappers: currentPlan.wrappers.map((wrapper) => ({
          path: wrapper.path,
          sha256: wrapper.sha256,
          targetOmpBin: wrapper.targetOmpBin,
          pointers: wrapper.pointers,
        })),
        backupPath,
        backupSha256: currentPlan.targetConfigSha256,
        jsonPointers: currentPlan.jsonPointers.map((pointer) => ({
          pointer: pointer.pointer,
          ...(pointer.previousValue !== undefined
            ? { previousValue: pointer.previousValue }
            : {}),
          installedValue: pointer.plannedValue,
        })),
      };

      const journal: IntegrationJournal = {
        schemaVersion: 3,
        owner: 'agent-skills-standard/integration-journal',
        phase: 'install',
        createdAt: installedAt,
        targetConfigPath: currentPlan.targetConfigPath,
        expectedBeforeSha256: currentPlan.targetConfigSha256,
        expectedAfterSha256: targetConfigSha256After,
        receipt,
      };
      const receiptRaw = JSON.stringify(receipt, null, 2) + '\n';
      const receiptValidation = IntegrationReceiptSchema.safeParse(
        JSON.parse(receiptRaw),
      );
      if (!receiptValidation.success) {
        throw new HarnessError(
          'STATE_CORRUPT',
          'Generated integration receipt failed validation',
        );
      }
      const journalRaw = JSON.stringify(journal, null, 2) + '\n';
      const journalValidation = IntegrationJournalSchema.safeParse(
        JSON.parse(journalRaw),
      );
      if (!journalValidation.success) {
        throw new HarnessError(
          'STATE_CORRUPT',
          'Generated integration journal failed validation',
        );
      }
      assertSerializedStateSize(receiptRaw, 'receipt');
      assertSerializedStateSize(
        journalRaw,
        'journal',
        JOURNAL_UNINSTALL_PHASE_HEADROOM_BYTES,
      );

      await ensureOwnedDirectory(this.integrationDir);
      await ensureOwnedDirectory(this.backupsDir);
      await this.stageOwnedFile(
        currentPlan.loaderPath,
        this.renderLoaderContent(
          currentPlan.launcher,
          currentPlan.wrappers.map((wrapper) => wrapper.targetOmpBin),
        ),
        0o600,
        currentPlan.loaderSha256,
      );
      for (const wrapper of currentPlan.wrappers) {
        await this.stageOwnedFile(
          wrapper.path,
          generateOmpWrapperScript({
            targetOmpBin: wrapper.targetOmpBin,
            loaderPath: currentPlan.loaderPath,
          }),
          0o700,
          wrapper.sha256,
        );
      }
      await writeExclusiveFile(backupPath, currentRaw, 0o600);
      await writeAtomicReplace(this.journalPath, journalRaw, 0o600);

      await writeAtomicReplace(
        currentPlan.targetConfigPath,
        updatedRaw,
        currentPlan.targetConfigMode,
        () =>
          this.assertConfigSha(
            currentPlan.targetConfigPath,
            currentPlan.targetConfigSha256,
            'Paseo configuration changed immediately before commit. Install aborted.',
          ),
      );
      await writeAtomicReplace(this.receiptPath, receiptRaw, 0o600);
      await fs.promises.rm(this.journalPath, { force: true });
      await fsyncDirectory(this.store.stateDir);

      return {
        applied: true,
        saved: true,
        daemonReloadRequired: true,
        installedAt,
        receiptPath: this.receiptPath,
        targetConfigPath: currentPlan.targetConfigPath,
        loaderPath: currentPlan.loaderPath,
        wrapperPaths: currentPlan.wrappers.map((wrapper) => wrapper.path),
        backupPath,
        jsonPointers: currentPlan.jsonPointers,
        recovered,
      };
    });
  }

  /**
   * Uninstalls the global OMP integration, restoring only owned pointers and
   * removing only files whose bytes still match the recorded ownership digests.
   * Refuses on any pointer, owned artifact, or backup drift.
   */
  async uninstall(
    options?: IntegrationUninstallOptions,
  ): Promise<IntegrationUninstallResult> {
    if (options?.apply !== true) {
      return this.inspectUninstall(options);
    }

    return this.withLock(async () => {
      const stateDirStat = await fs.promises
        .lstat(this.store.stateDir)
        .catch(() => null);
      if (stateDirStat) {
        await assertCanonicalStateDirectory(this.store.stateDir);
      }
      for (const dir of [this.integrationDir, this.backupsDir]) {
        const stat = await fs.promises.lstat(dir).catch(() => null);
        if (stat) {
          await ensureOwnedDirectory(dir);
        }
      }
      const recovered = await this.recoverInterrupted();
      const currentReceipt = await this.readReceiptIfPresent();
      if (!currentReceipt) {
        if (recovered) {
          // A journaled uninstall was completed by this recovery pass.
          return {
            applied: true,
            saved: true,
            daemonReloadRequired: true,
            uninstalledAt: Date.now(),
            targetConfigPath: options?.targetConfigPath,
            recovered,
          };
        }
        throw new HarnessError(
          'INTEGRATION_NOT_INSTALLED',
          `No integration receipt found at "${this.receiptPath}". Integration is not installed.`,
        );
      }
      this.assertUninstallTarget(currentReceipt, options);
      const preview = await this.buildUninstallPreview(currentReceipt);

      const journal: IntegrationJournal = {
        schemaVersion: 3,
        owner: 'agent-skills-standard/integration-journal',
        phase: 'uninstall',
        createdAt: Date.now(),
        targetConfigPath: currentReceipt.targetConfigPath,
        expectedBeforeSha256: currentReceipt.targetConfigSha256After,
        expectedAfterSha256: preview.restoredSha256,
        receipt: currentReceipt,
      };
      const journalRaw = JSON.stringify(journal, null, 2) + '\n';
      assertSerializedStateSize(journalRaw, 'journal');
      await writeAtomicReplace(this.journalPath, journalRaw, 0o600);

      await writeAtomicReplace(
        currentReceipt.targetConfigPath,
        preview.restoredRaw,
        currentReceipt.targetConfigMode,
        () =>
          this.assertConfigSha(
            currentReceipt.targetConfigPath,
            currentReceipt.targetConfigSha256After,
            'Paseo configuration changed immediately before uninstall commit. Aborted.',
          ),
      );
      await this.removeOwnedArtifacts(currentReceipt);
      await fs.promises.rm(this.receiptPath, { force: true });
      await fsyncDirectory(this.store.stateDir);
      await fs.promises.rm(this.journalPath, { force: true });
      await fsyncDirectory(this.store.stateDir);

      await this.pruneEmptyOwnedDirectories();

      return {
        applied: true,
        saved: true,
        daemonReloadRequired: true,
        uninstalledAt: Date.now(),
        targetConfigPath: currentReceipt.targetConfigPath,
        restoredPointers: preview.restoredPointers,
        removedFiles: preview.removedFiles,
        recovered,
      };
    });
  }

  /**
   * Read-only uninstall inspection. Never acquires the mutation lock, writes a
   * journal, recovers a transition, or deletes an artifact.
   */
  private async inspectUninstall(
    options?: IntegrationUninstallOptions,
  ): Promise<IntegrationUninstallResult> {
    const journal = await this.inspectJournal();
    const receipt = await this.readReceiptIfPresent();

    if (!receipt) {
      if (journal) {
        return {
          applied: false,
          saved: false,
          pendingRecovery: true,
          recoveryPhase: journal.phase,
          targetConfigPath: journal.targetConfigPath,
        };
      }
      throw new HarnessError(
        'INTEGRATION_NOT_INSTALLED',
        `No integration receipt found at "${this.receiptPath}". Integration is not installed.`,
      );
    }

    this.assertUninstallTarget(receipt, options);
    const preview = await this.buildUninstallPreview(receipt);
    return {
      applied: false,
      saved: false,
      pendingRecovery: journal !== null,
      recoveryPhase: journal?.phase,
      targetConfigPath: receipt.targetConfigPath,
      restoredPointers: preview.restoredPointers,
      removedFiles: preview.removedFiles,
    };
  }

  private assertUninstallTarget(
    receipt: IntegrationReceipt,
    options?: IntegrationUninstallOptions,
  ): void {
    if (
      options?.targetConfigPath !== undefined &&
      path.resolve(options.targetConfigPath) !== receipt.targetConfigPath
    ) {
      throw new HarnessError(
        'TARGET_CONFIG_MISMATCH',
        `Uninstall target "${options.targetConfigPath}" does not match the owned receipt target "${receipt.targetConfigPath}"`,
      );
    }
  }

  private async buildUninstallPreview(receipt: IntegrationReceipt): Promise<{
    restoredRaw: string;
    restoredSha256: string;
    restoredPointers: Array<{ pointer: string; previousValue: unknown }>;
    removedFiles: string[];
  }> {
    await this.verifyInstalledPointers(receipt);
    await this.verifyOwnedArtifacts(receipt);

    const currentRaw = await this.readConfigBytes(receipt.targetConfigPath);
    if (sha256Hex(currentRaw) !== receipt.targetConfigSha256After) {
      throw new HarnessError(
        'USER_EDITS_DETECTED',
        'Paseo configuration changed outside owned pointers since installation. Refusing to overwrite unrelated user edits.',
      );
    }

    const restoredDocument = JSON.parse(
      currentRaw.toString('utf8'),
    ) as PaseoConfigDocument;
    for (const pointer of receipt.jsonPointers) {
      if (pointer.previousValue === undefined) {
        deleteJsonPointerValue(restoredDocument, pointer.pointer);
      } else {
        setJsonPointerValue(
          restoredDocument,
          pointer.pointer,
          pointer.previousValue,
        );
      }
    }
    assertTouchedPaseoConfigShape(restoredDocument);
    const restoredRaw = JSON.stringify(restoredDocument, null, 2) + '\n';

    return {
      restoredRaw,
      restoredSha256: sha256Hex(restoredRaw),
      restoredPointers: receipt.jsonPointers.map((pointer) => ({
        pointer: pointer.pointer,
        previousValue: pointer.previousValue,
      })),
      removedFiles: [
        ...receipt.wrappers.map((wrapper) => wrapper.path),
        receipt.loaderPath,
        receipt.backupPath,
      ],
    };
  }

  /**
   * Metadata-only local scope identity for a launching session. Runs fresh
   * read-only inventory and policy resolution, but never reads release pins and
   * never performs model work. Unknown, remote-origin, or ambiguous scopes
   * return null.
   */
  async resolveScope(cwd: string): Promise<FleetContextScope | null> {
    const project = await this.resolveLocalProject(cwd);
    if (!project) {
      return null;
    }
    return {
      hostId: project.hostId,
      projectId: project.projectId,
      logicalProjectId: project.logicalProjectId,
      rootPath: project.rootPath,
    };
  }

  /**
   * Resolves approved execution guidance for a launching OMP session.
   * Canonicalizes local cwd, requires the fresh inventory's origin record to be
   * reachable, error-free, and identified by an authoritative server ID, matches
   * only that host's canonical local roots, and resolves policy/logical identity
   * before looking up approved compatible release guidance. Any doubt returns null.
   */
  async context(
    cwd: string,
    platform: string,
    ompVersion: string,
  ): Promise<{
    releaseDigest: string;
    guidance: string;
    scope: FleetContextScope;
  } | null> {
    if (
      typeof platform !== 'string' ||
      platform.length === 0 ||
      platform.length > 64
    ) {
      return null;
    }
    if (typeof ompVersion !== 'string' || !isSemverTriplet(ompVersion)) {
      return null;
    }

    const fleetProject = await this.resolveLocalProject(cwd);
    if (!fleetProject) {
      return null;
    }

    try {
      const releaseContext = await this.releaseService.context(
        fleetProject,
        platform,
        ompVersion,
      );
      if (!releaseContext) {
        return null;
      }
      return {
        releaseDigest: releaseContext.releaseDigest,
        guidance: releaseContext.guidance,
        scope: {
          hostId: fleetProject.hostId,
          projectId: fleetProject.projectId,
          logicalProjectId: fleetProject.logicalProjectId,
          rootPath: fleetProject.rootPath,
        },
      };
    } catch {
      return null;
    }
  }

  private async resolveLocalProject(cwd: string): Promise<FleetProject | null> {
    if (!cwd || typeof cwd !== 'string') {
      return null;
    }

    let canonicalCwd: string;
    try {
      const stat = await fs.promises.stat(cwd);
      if (!stat.isDirectory()) {
        return null;
      }
      canonicalCwd = await fs.promises.realpath(cwd);
    } catch {
      return null;
    }

    let harnessConfig: HarnessConfig;
    try {
      harnessConfig = await this.setupService.load();
    } catch {
      return null;
    }
    // A remote Paseo origin cannot canonicalize this machine's local roots.
    if (harnessConfig.origin !== undefined) {
      return null;
    }

    let inventory: HarnessInventory;
    try {
      inventory = await this.discoveryService.discover(harnessConfig);
    } catch {
      return null;
    }
    // Remote-host failures do not make the local origin's project list partial;
    // only the matched origin record must be complete and authoritative.
    const originHostKey = harnessConfig.origin ?? 'local';
    const originHosts = (inventory.hosts ?? []).filter(
      (host) => host.hostKey === originHostKey,
    );
    if (originHosts.length !== 1) {
      return null;
    }
    const originHost = originHosts[0];
    if (originHost.status !== 'reachable' || originHost.error !== undefined) {
      return null;
    }
    const hostId =
      typeof originHost.serverId === 'string' ? originHost.serverId.trim() : '';
    if (!hostId) {
      return null;
    }

    let config: FleetConfig;
    try {
      config = await this.policyService.load();
    } catch {
      return null;
    }

    type ProjectRootMatch = { projectId: string; canonicalRoot: string };
    const matches: ProjectRootMatch[] = [];
    for (const project of originHost.projects ?? []) {
      if (!project.projectId) {
        continue;
      }

      const checkouts = project.checkouts;
      if (checkouts !== undefined && !Array.isArray(checkouts)) {
        return null;
      }
      for (const checkout of checkouts ?? []) {
        if (
          !checkout ||
          !isValidWorkspaceId(checkout.workspaceId) ||
          !isValidWorkspacePath(checkout.path) ||
          !path.isAbsolute(checkout.path) ||
          (checkout.kind !== undefined &&
            !['worktree', 'checkout', 'local_checkout', 'directory'].includes(
              checkout.kind,
            ))
        ) {
          return null;
        }
      }

      const roots = getProjectCheckoutPaths(project).map((rootPath, index) => ({
        path: rootPath,
        checkout: index > 0,
      }));
      const canonicalRootsByPath = new Map<string, string>();
      for (const root of roots) {
        if (
          typeof root.path !== 'string' ||
          !root.path ||
          !path.isAbsolute(root.path)
        ) {
          if (root.checkout) {
            return null;
          }
          continue;
        }

        let canonicalRoot: string;
        try {
          const stat = await fs.promises.stat(root.path);
          if (!stat.isDirectory()) {
            if (root.checkout) {
              return null;
            }
            continue;
          }
          canonicalRoot = await fs.promises.realpath(root.path);
        } catch {
          if (root.checkout) {
            return null;
          }
          continue;
        }
        canonicalRootsByPath.set(root.path, canonicalRoot);
        if (isPathInside(canonicalCwd, canonicalRoot)) {
          matches.push({ projectId: project.projectId, canonicalRoot });
        }
      }

      const workspaceRoots = new Map<string, string>();
      for (const checkout of checkouts ?? []) {
        const canonicalRoot = canonicalRootsByPath.get(checkout.path);
        if (!canonicalRoot) {
          return null;
        }
        const previousRoot = workspaceRoots.get(checkout.workspaceId);
        if (previousRoot !== undefined && previousRoot !== canonicalRoot) {
          return null;
        }
        workspaceRoots.set(checkout.workspaceId, canonicalRoot);
      }
    }

    const matchesByIdentity = new Map<string, ProjectRootMatch>();
    for (const match of matches) {
      matchesByIdentity.set(
        `${match.projectId}\0${match.canonicalRoot}`,
        match,
      );
    }
    const uniqueMatches = [...matchesByIdentity.values()];
    if (uniqueMatches.length === 0) {
      return null;
    }
    uniqueMatches.sort(
      (a, b) => b.canonicalRoot.length - a.canonicalRoot.length,
    );
    const best = uniqueMatches[0];
    if (
      uniqueMatches.filter(
        (match) => match.canonicalRoot.length === best.canonicalRoot.length,
      ).length > 1
    ) {
      return null;
    }

    const baseProject: FleetProject = {
      hostId,
      projectId: best.projectId,
      rootPath: best.canonicalRoot,
      logicalProjectId: `${hostId}:${best.projectId}`,
    };
    const fleetProject: FleetProject = {
      ...baseProject,
      logicalProjectId: resolveLogicalProjectId(baseProject, config),
    };

    try {
      await this.policyService.resolve(fleetProject);
    } catch {
      return null;
    }

    return fleetProject;
  }

  private async readConfigBytes(targetConfigPath: string): Promise<Buffer> {
    return readBoundedRegularFile(
      targetConfigPath,
      MAX_PASEO_CONFIG_BYTES,
      {
        code: 'PASEO_CONFIG_NOT_FOUND',
        message: `Paseo configuration not found at "${targetConfigPath}". Initialize Paseo or verify the path.`,
      },
      {
        code: 'INVALID_TARGET_CONFIG',
        message: `Paseo configuration at "${targetConfigPath}" must be a regular file (no symlinks, FIFOs, or sockets)`,
      },
      'PASEO_CONFIG_TOO_LARGE',
    );
  }

  private async assertConfigSha(
    targetConfigPath: string,
    expectedSha256: string,
    message: string,
  ): Promise<void> {
    const raw = await this.readConfigBytes(targetConfigPath);
    if (sha256Hex(raw) !== expectedSha256) {
      throw new HarnessError('CAS_MISMATCH', message);
    }
  }

  private listExcludedProviders(document: PaseoConfigDocument): string[] {
    const providers = document.agents?.providers;
    if (!isPlainObject(providers)) {
      return [];
    }
    return Object.entries(providers)
      .filter(([providerId, value]) => {
        if (!isPlainObject(value)) {
          return false;
        }
        return !(providerId === 'omp' || value.extends === 'omp');
      })
      .map(([providerId]) => providerId);
  }

  private collectLaunchEntries(
    document: PaseoConfigDocument,
    receipt: IntegrationReceipt | null,
  ): {
    entries: LaunchEntry[];
    synthesizedProviderOverride: boolean;
    inheritedProviders: string[];
  } {
    const entries: LaunchEntry[] = [];
    const ownedWrapperPaths = new Set(
      (receipt?.wrappers ?? []).map((wrapper) => wrapper.path),
    );

    const readInstalledValue = (
      pointer: string,
      currentValue: unknown,
    ): unknown => {
      if (!receipt) {
        return currentValue;
      }
      const recorded = receipt.jsonPointers.find(
        (entry) => entry.pointer === pointer,
      );
      if (!recorded) {
        throw new HarnessError(
          'RECEIPT_POINTER_MISMATCH',
          `Pointer "${pointer}" is not owned by the existing receipt; run uninstall before changing OMP launch entries.`,
        );
      }
      if (!valuesEqual(currentValue, recorded.installedValue)) {
        throw new HarnessError(
          'USER_EDITS_DETECTED',
          `Paseo configuration at "${pointer}" was modified after installation. Refusing to reinstall over user edits.`,
        );
      }
      return recorded.previousValue;
    };

    const profiles = document.daemon?.terminalProfiles;
    if (Array.isArray(profiles)) {
      profiles.forEach((profile, index) => {
        if (!isPlainObject(profile)) {
          return;
        }
        const pointer = `/daemon/terminalProfiles/${index}/command`;
        const command = profile.command;
        if (!this.isOmpTerminalProfile(profile, ownedWrapperPaths)) {
          return;
        }
        const original = readInstalledValue(pointer, command);
        const configured = typeof original === 'string' && original.length > 0;
        entries.push({
          pointer,
          kind: 'terminal',
          originalArgv: configured ? [original] : [this.defaultOmpBinary],
          usesDefaultBinary: !configured,
          currentValue: command,
        });
      });
    }

    const providers = document.agents?.providers;
    const inheritedProviders: string[] = [];
    let baseProviderWrapped = false;

    if (isPlainObject(providers)) {
      const providerIds = Object.keys(providers).filter((providerId) =>
        isPlainObject(providers[providerId]),
      );

      const hasOmpAncestor = (
        providerId: string,
        seen: Set<string>,
      ): boolean => {
        if (providerId === 'omp') {
          return true;
        }
        if (seen.has(providerId)) {
          return false;
        }
        seen.add(providerId);
        const providerValue = providers[providerId];
        if (!isPlainObject(providerValue)) {
          return false;
        }
        const parent =
          typeof providerValue.extends === 'string'
            ? providerValue.extends
            : undefined;
        return parent ? hasOmpAncestor(parent, seen) : false;
      };

      const includedProviders = providerIds.filter(
        (providerId) =>
          providerId === 'omp' || hasOmpAncestor(providerId, new Set()),
      );

      for (const providerId of includedProviders) {
        const providerValue = providers[providerId] as Record<string, unknown>;
        const pointer = `/agents/providers/${escapeJsonPointerSegment(providerId)}/command`;
        const command = providerValue.command;
        const isBaseProvider = providerId === 'omp';

        if (Array.isArray(command) && command.length > 0) {
          const original = readInstalledValue(pointer, command);
          const configured = Array.isArray(original) && original.length > 0;
          if (isBaseProvider) {
            baseProviderWrapped = true;
          }
          entries.push({
            pointer,
            kind: 'provider',
            originalArgv: configured
              ? original.map((arg) => String(arg))
              : [this.defaultOmpBinary],
            usesDefaultBinary: !configured,
            currentValue: command,
          });
          continue;
        }

        if (isBaseProvider) {
          // Base provider with no explicit command: wrap the default launch so
          // inherited aliases receive the loader through inheritance.
          baseProviderWrapped = true;
          entries.push({
            pointer,
            kind: 'provider',
            originalArgv: [this.defaultOmpBinary],
            usesDefaultBinary: true,
            currentValue: command,
          });
          continue;
        }

        // Derived provider without its own command inherits its ancestor's
        // effective command. The ancestor is wrapped by this same plan, so the
        // derived command pointer stays absent and is never substituted.
        const inherited = this.findInheritedProviderCommand(
          providers,
          providerId,
        );
        if (!inherited) {
          throw new HarnessError(
            'INHERITED_PROVIDER_UNRESOLVED',
            `Provider "${providerId}" extends an unresolved parent chain; refusing to substitute a default OMP command`,
          );
        }
        inheritedProviders.push(providerId);
      }
    }

    const synthesizedProviderOverride = !baseProviderWrapped;
    if (synthesizedProviderOverride) {
      entries.push({
        pointer: '/agents/providers/omp/command',
        kind: 'provider',
        originalArgv: [this.defaultOmpBinary],
        usesDefaultBinary: true,
        currentValue: undefined,
      });
    }

    return { entries, synthesizedProviderOverride, inheritedProviders };
  }

  /**
   * Confirms a derived provider resolves to an ancestor command that this plan
   * also wraps (directly or through an explicit ancestor override). Returns null
   * when the chain is broken, cyclic, or unrelated, so the caller refuses rather
   * than substituting a default binary.
   */
  private findInheritedProviderCommand(
    providers: Record<string, unknown>,
    providerId: string,
  ): { kind: 'command' | 'default' } | null {
    const seen = new Set<string>([providerId]);
    let currentValue: unknown = providers[providerId];
    let currentId = providerId;

    while (isPlainObject(currentValue)) {
      const parent =
        typeof currentValue.extends === 'string'
          ? currentValue.extends
          : undefined;
      if (!parent) {
        break;
      }
      if (seen.has(parent)) {
        return null;
      }
      seen.add(parent);
      const parentValue = providers[parent];
      if (!isPlainObject(parentValue)) {
        return parent === 'omp' ? { kind: 'default' } : null;
      }
      if (
        Array.isArray(parentValue.command) &&
        parentValue.command.length > 0
      ) {
        return { kind: 'command' };
      }
      currentValue = parentValue;
      currentId = parent;
    }

    return currentId === 'omp' ? { kind: 'default' } : null;
  }

  private isOmpTerminalProfile(
    profile: Record<string, unknown>,
    ownedWrapperPaths: Set<string>,
  ): boolean {
    const command =
      typeof profile.command === 'string' ? profile.command : null;
    if (command) {
      if (ownedWrapperPaths.has(command)) {
        return true;
      }
      const insideIntegrationDir =
        path.dirname(command) === this.integrationDir &&
        OWNED_WRAPPER_FILENAME.test(path.basename(command));
      if (insideIntegrationDir) {
        return true;
      }
      const base = path.basename(command);
      if (base === 'omp' || base === 'omp.exe') {
        return true;
      }
    }
    if (profile.id === 'omp') {
      return true;
    }
    const name =
      typeof profile.name === 'string' ? profile.name.toLowerCase() : '';
    return name.includes('oh my pi') || name.includes('oh-my-pi');
  }

  private async resolveEntryTarget(
    entry: LaunchEntry,
    options: IntegrationPlanOptions | undefined,
  ): Promise<string> {
    const binary = entry.originalArgv[0];
    if (!binary) {
      throw new HarnessError(
        'UNKNOWN_CUSTOM_COMMAND',
        `Launch entry "${entry.pointer}" has no command binary`,
      );
    }
    // An operator override only replaces a default fallback binary; a
    // configured launch command must resolve to its own executable identity.
    const explicit =
      entry.usesDefaultBinary && options?.ompBinary
        ? path.resolve(options.ompBinary)
        : undefined;
    const resolved = await resolveOmpExecutable(binary, explicit);
    const ownedDir =
      (await fs.promises.realpath(this.integrationDir).catch(() => null)) ??
      path.resolve(this.integrationDir);
    if (
      path.dirname(resolved) === path.resolve(this.integrationDir) ||
      path.dirname(resolved) === ownedDir
    ) {
      throw new HarnessError(
        'UNKNOWN_CUSTOM_COMMAND',
        'Refusing to use an owned integration artifact as the launch target',
      );
    }
    return resolved;
  }

  private renderLoaderContent(
    launcher: IntegrationLauncherPlan,
    targetBinaries: string[],
  ): string {
    return generateOmpLoaderScript({
      cliPath: launcher.cliPath,
      nodeCommand: launcher.nodeCommand,
      stateDir: launcher.stateDir,
      platform: launcher.platform,
      ompVersion: launcher.ompVersion,
      targetBinaries,
      auxiliaryRuntimeKind: launcher.auxiliaryRuntimeKind,
      auxiliaryRuntimePath: launcher.auxiliaryRuntimePath,
      ompInterpreters: launcher.ompInterpreters,
      ompTargetInterpreters: launcher.ompTargetInterpreters,
      auxiliaryHome: launcher.auxiliaryHome,
      paseoHome: launcher.paseoHome,
    });
  }

  private async resolveLauncher(
    options: IntegrationPlanOptions | undefined,
    receipt: IntegrationReceipt | null,
    targetBinaries: string[],
    paseoHome: string,
  ): Promise<IntegrationLauncherPlan> {
    if (
      options?.stateDir !== undefined &&
      path.resolve(options.stateDir) !== this.store.stateDir
    ) {
      throw new HarnessError(
        'STATE_DIR_MISMATCH',
        `Integration state directory "${options.stateDir}" does not match the runtime store "${this.store.stateDir}"`,
      );
    }
    await this.setupService.load();
    await assertCanonicalStateDirectory(this.store.stateDir);

    const cliPath = path.resolve(
      options?.cliPath ?? receipt?.cliPath ?? this.defaultCliPath,
    );
    assertNoControlChars('Trusted CLI entrypoint', cliPath);
    if (!['.js', '.cjs', '.mjs'].includes(path.extname(cliPath))) {
      throw new HarnessError(
        'TRUSTED_CLI_NOT_FOUND',
        `Trusted CLI entrypoint must be a built JavaScript file, got "${cliPath}". Run integration from the packaged CLI or pass --cli-path explicitly.`,
      );
    }
    await assertExecutableInput(cliPath, 'TRUSTED_CLI_NOT_FOUND', false);

    const nodeCommand = path.resolve(
      options?.nodeCommand ?? receipt?.nodeCommand ?? this.defaultNodeCommand,
    );
    assertNoControlChars('Node runtime', nodeCommand);
    await assertExecutableInput(nodeCommand, 'TRUSTED_RUNTIME_NOT_FOUND', true);
    const runtimeBase = path.basename(nodeCommand);
    if (!['node', 'node.exe', 'bun', 'bun.exe'].includes(runtimeBase)) {
      throw new HarnessError(
        'TRUSTED_RUNTIME_NOT_FOUND',
        `Loader runtime "${nodeCommand}" is not a supported Node/Bun executable; pass --node-command explicitly`,
      );
    }

    const platform = options?.platform ?? receipt?.platform ?? process.platform;
    if (
      typeof platform !== 'string' ||
      platform.length === 0 ||
      platform.length > 64
    ) {
      throw new HarnessError(
        'INVALID_CONTEXT_INPUT',
        'Platform must be a non-empty short string',
      );
    }

    const auxiliaryHome = await resolveTrustedUserHome();
    const auxiliaryRuntimePath = await fs.promises.realpath(
      path.dirname(nodeCommand),
    );
    if (
      !path.isAbsolute(paseoHome) ||
      (await fs.promises.realpath(paseoHome)) !== paseoHome
    ) {
      throw new HarnessError(
        'UNSAFE_TARGET_PATH',
        'Paseo home must be a canonical absolute directory',
      );
    }
    const auxiliaryEnv = createAuxiliaryEnvironment(
      auxiliaryHome,
      paseoHome,
      auxiliaryRuntimePath,
    );
    const auxiliaryRuntimeKind = await probeAuxiliaryRuntimeKind(
      nodeCommand,
      this.store.stateDir,
      auxiliaryEnv,
    );
    const ompRuntimeCommand =
      options?.ompRuntimeCommand ?? this.defaultOmpRuntimeCommand;
    const ompRuntimeCommands = Array.from(
      new Set([
        ...(ompRuntimeCommand ? [ompRuntimeCommand] : []),
        ...(receipt?.ompInterpreters.map((interpreter) => interpreter.path) ??
          []),
      ]),
    );
    const { ompInterpreters, ompTargetInterpreters } =
      await resolveOmpInterpreterBindings(
        targetBinaries,
        { path: nodeCommand, kind: auxiliaryRuntimeKind },
        ompRuntimeCommands,
        this.store.stateDir,
        auxiliaryEnv,
      );
    const versionEnvironment = createAuxiliaryEnvironment(
      auxiliaryHome,
      paseoHome,
      auxiliaryRuntimePath,
      ompInterpreters,
    );
    const ompVersion = await this.resolveActualOmpVersion(
      options,
      receipt,
      targetBinaries,
      ompTargetInterpreters,
      versionEnvironment,
    );
    const ompVersionSource: IntegrationLauncherPlan['ompVersionSource'] =
      (options?.ompVersion ?? this.defaultOmpVersion) !== undefined
        ? 'option'
        : receipt
          ? 'receipt'
          : 'binary';

    return {
      nodeCommand,
      cliPath,
      stateDir: this.store.stateDir,
      platform,
      ompVersion,
      ompVersionSource,
      auxiliaryRuntimeKind,
      auxiliaryRuntimePath,
      ompInterpreters,
      ompTargetInterpreters,
      auxiliaryHome,
      paseoHome,
    };
  }

  /**
   * Establishes the OMP version actually shipped by every configured launch
   * target. `--omp-version` is an EXPECTATION checked against those actual
   * targets, never an unverified override. One version is required because one
   * loader serves all entries; differing or unidentifiable targets refuse.
   */
  private async resolveActualOmpVersion(
    options: IntegrationPlanOptions | undefined,
    receipt: IntegrationReceipt | null,
    targetBinaries: string[],
    ompTargetInterpreters: OmpTargetInterpreter[],
    auxiliaryEnv: AuxiliaryEnvironment,
  ): Promise<string> {
    const expectedVersion = options?.ompVersion ?? this.defaultOmpVersion;
    if (expectedVersion !== undefined && !isSemverTriplet(expectedVersion)) {
      throw new HarnessError(
        'INVALID_OMP_VERSION',
        `OMP version must be a triple such as 18.12.6, got "${expectedVersion}"`,
      );
    }
    if (targetBinaries.length === 0) {
      throw new HarnessError(
        'OMP_VERSION_UNRESOLVED',
        'No OMP launch target is available to establish the installed runtime version',
      );
    }

    const observed = new Map<string, string>();
    for (const binary of targetBinaries) {
      const targetInterpreter = ompTargetInterpreters.find(
        (entry) => entry.targetBinary === binary,
      );
      const version = options?.ompVersionResolver
        ? await options.ompVersionResolver(binary)
        : await defaultOmpVersionResolver(
            binary,
            this.store.stateDir,
            auxiliaryEnv,
            targetInterpreter,
          );
      if (!isSemverTriplet(version)) {
        throw new HarnessError(
          'OMP_VERSION_UNRESOLVED',
          `Could not establish the installed OMP version from "${binary}"`,
        );
      }
      observed.set(binary, version);
    }
    const versions = new Set(observed.values());
    if (versions.size > 1) {
      throw new HarnessError(
        'OMP_VERSION_AMBIGUOUS',
        `Configured OMP launch targets report different versions (${Array.from(
          observed.entries(),
        )
          .map(([binary, version]) => `${binary}=${version}`)
          .join(', ')}); refusing to authorize guidance for one version`,
      );
    }
    const actualVersion = Array.from(versions)[0];

    if (expectedVersion !== undefined && expectedVersion !== actualVersion) {
      throw new HarnessError(
        'OMP_VERSION_MISMATCH',
        `--omp-version ${expectedVersion} does not match the actual target version ${actualVersion}; refusing to authorize guidance for an unverified version`,
      );
    }
    if (receipt && receipt.ompVersion !== actualVersion) {
      throw new HarnessError(
        'OMP_VERSION_DRIFT',
        `Installed OMP targets now report ${actualVersion} but the ownership receipt pins ${receipt.ompVersion}; uninstall before changing OMP versions`,
      );
    }

    return actualVersion;
  }

  private async stageOwnedFile(
    filePath: string,
    content: string,
    mode: number,
    expectedSha256: string,
  ): Promise<void> {
    if (sha256Hex(content) !== expectedSha256) {
      throw new HarnessError(
        'INTEGRATION_PLAN_INCONSISTENT',
        `Planned content digest mismatch for "${filePath}"`,
      );
    }
    let existingStat: fs.Stats | null = null;
    try {
      existingStat = await fs.promises.lstat(filePath);
    } catch (err: unknown) {
      const code =
        isPlainObject(err) && typeof err.code === 'string' ? err.code : '';
      if (code !== 'ENOENT') {
        throw err;
      }
    }
    if (!existingStat) {
      await writeExclusiveFile(filePath, content, mode);
      return;
    }
    if (!existingStat.isFile() || existingStat.isSymbolicLink()) {
      throw new HarnessError(
        'UNSAFE_EXISTING_FILE',
        `Owned path "${filePath}" must be a regular file (no symlinks or special files)`,
      );
    }
    if ((existingStat.mode & 0o777) !== mode) {
      throw new HarnessError(
        'UNSAFE_EXISTING_FILE',
        `Existing file "${filePath}" has permissions ${(existingStat.mode & 0o777).toString(8)}; expected ${mode.toString(8)} and refusing to adopt it`,
      );
    }
    const existing = await readBoundedRegularFile(
      filePath,
      MAX_PASEO_CONFIG_BYTES,
      {
        code: 'UNSAFE_EXISTING_FILE',
        message: `Owned file missing: "${filePath}"`,
      },
      {
        code: 'UNSAFE_EXISTING_FILE',
        message: `Owned path "${filePath}" must be a regular file with mode ${mode.toString(8)} (no symlinks or special files)`,
      },
      'UNSAFE_EXISTING_FILE',
      mode,
    );
    if (sha256Hex(existing) !== expectedSha256) {
      throw new HarnessError(
        'UNSAFE_EXISTING_FILE',
        `Existing file "${filePath}" is not the expected owned artifact; refusing to overwrite it`,
      );
    }
  }

  private async readReceiptIfPresent(
    explicitPath?: string,
  ): Promise<IntegrationReceipt | null> {
    const receiptPath = explicitPath ?? this.receiptPath;
    let raw: Buffer;
    try {
      raw = await readBoundedRegularFile(
        receiptPath,
        MAX_RECEIPT_BYTES,
        { code: 'ENOENT', message: 'missing' },
        {
          code: 'STATE_CORRUPT',
          message: `Integration receipt "${receiptPath}" must be a regular file with private 0600 permissions`,
        },
        'STATE_CORRUPT',
        0o600,
      );
    } catch (err: unknown) {
      if (err instanceof HarnessError && err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new HarnessError(
        'STATE_CORRUPT',
        'integration-receipt.json is corrupted',
      );
    }
    const result = IntegrationReceiptSchema.safeParse(parsed);
    if (!result.success) {
      throw new HarnessError(
        'STATE_CORRUPT',
        'integration-receipt.json has an invalid ownership schema',
      );
    }
    const receipt = result.data as IntegrationReceipt;
    this.assertOwnedReceiptPaths(receipt);
    return receipt;
  }

  private assertOwnedReceiptPaths(receipt: IntegrationReceipt): void {
    const allowedRoots = [this.integrationDir, this.backupsDir];
    const owned = [
      receipt.loaderPath,
      receipt.backupPath,
      ...receipt.wrappers.map((wrapper) => wrapper.path),
    ];
    for (const filePath of owned) {
      const inside = allowedRoots.some(
        (root) =>
          path.dirname(filePath) === root ||
          filePath.startsWith(`${root}${path.sep}`),
      );
      if (!inside || !path.isAbsolute(filePath)) {
        throw new HarnessError(
          'STATE_CORRUPT',
          `Receipt-owned path "${filePath}" is outside the integration state directories`,
        );
      }
    }
    if (receipt.stateDir !== this.store.stateDir) {
      throw new HarnessError(
        'STATE_CORRUPT',
        'Receipt state directory does not match the current runtime store',
      );
    }
  }

  private async matchesInstalledState(
    receipt: IntegrationReceipt,
    plan: IntegrationPlan,
  ): Promise<boolean> {
    if (receipt.loaderSha256 !== plan.loaderSha256) {
      return false;
    }
    const plannedWrappers = new Map(
      plan.wrappers.map((wrapper) => [wrapper.targetOmpBin, wrapper]),
    );
    if (receipt.wrappers.length !== plannedWrappers.size) {
      return false;
    }
    for (const wrapper of receipt.wrappers) {
      const planned = plannedWrappers.get(wrapper.targetOmpBin);
      if (
        !planned ||
        planned.sha256 !== wrapper.sha256 ||
        planned.path !== wrapper.path
      ) {
        return false;
      }
    }
    const receiptPointers = receipt.jsonPointers
      .map((pointer) => pointer.pointer)
      .sort();
    const planPointers = plan.jsonPointers
      .map((pointer) => pointer.pointer)
      .sort();
    if (!valuesEqual(receiptPointers, planPointers)) {
      return false;
    }
    try {
      const currentRaw = await this.readConfigBytes(receipt.targetConfigPath);
      if (sha256Hex(currentRaw) !== receipt.targetConfigSha256After) {
        return false;
      }
      await this.verifyOwnedArtifacts(receipt);
    } catch {
      return false;
    }
    return true;
  }

  private async verifyInstalledPointers(
    receipt: IntegrationReceipt,
  ): Promise<void> {
    const raw = await this.readConfigBytes(receipt.targetConfigPath);
    let document: PaseoConfigDocument;
    try {
      const parsed = JSON.parse(raw.toString('utf8')) as unknown;
      if (!isPlainObject(parsed)) {
        throw new Error('not an object');
      }
      document = parsed;
    } catch {
      throw new HarnessError(
        'PASEO_CONFIG_CORRUPT',
        'Paseo configuration is not a valid JSON object',
      );
    }
    for (const pointer of receipt.jsonPointers) {
      const currentValue = getJsonPointerValue(document, pointer.pointer);
      if (!valuesEqual(currentValue, pointer.installedValue)) {
        throw new HarnessError(
          'USER_EDITS_DETECTED',
          `Paseo configuration was modified by user at pointer "${pointer.pointer}". Refusing to overwrite user modifications.`,
        );
      }
    }
  }

  private async verifyOwnedArtifacts(
    receipt: IntegrationReceipt,
  ): Promise<void> {
    await this.verifyOneOwnedFile(
      receipt.loaderPath,
      receipt.loaderSha256,
      'Loader file',
      0o600,
    );
    for (const wrapper of receipt.wrappers) {
      await this.verifyOneOwnedFile(
        wrapper.path,
        wrapper.sha256,
        'Wrapper file',
        0o700,
      );
    }
    await this.verifyOneOwnedFile(
      receipt.backupPath,
      receipt.backupSha256,
      'Backup file',
      0o600,
    );
  }

  private async verifyOneOwnedFile(
    filePath: string,
    expectedSha256: string,
    label: string,
    expectedMode: number,
  ): Promise<void> {
    let stat: fs.Stats;
    try {
      stat = await fs.promises.lstat(filePath);
    } catch {
      throw new HarnessError(
        'OWNERSHIP_DRIFT',
        `${label} "${filePath}" is missing; refusing destructive cleanup`,
      );
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new HarnessError(
        'OWNERSHIP_DRIFT',
        `${label} "${filePath}" must be a regular file (no symlinks or special files)`,
      );
    }
    if ((stat.mode & 0o777) !== expectedMode) {
      throw new HarnessError(
        'USER_EDITS_DETECTED',
        `${label} "${filePath}" has unexpected permissions ${(stat.mode & 0o777).toString(8)}; refusing destructive cleanup`,
      );
    }
    const raw = await readBoundedRegularFile(
      filePath,
      MAX_PASEO_CONFIG_BYTES,
      { code: 'OWNERSHIP_DRIFT', message: `${label} "${filePath}" is missing` },
      {
        code: 'OWNERSHIP_DRIFT',
        message: `${label} "${filePath}" must be a regular file`,
      },
      'OWNERSHIP_DRIFT',
    );
    if (sha256Hex(raw) !== expectedSha256) {
      throw new HarnessError(
        'USER_EDITS_DETECTED',
        `${label} "${filePath}" was modified after installation. Refusing to delete or overwrite it.`,
      );
    }
  }

  private ownedArtifactList(
    receipt: IntegrationReceipt,
  ): Array<{ path: string; sha256: string; mode: number; label: string }> {
    return [
      ...receipt.wrappers.map((wrapper) => ({
        path: wrapper.path,
        sha256: wrapper.sha256,
        mode: 0o700,
        label: 'Wrapper file',
      })),
      {
        path: receipt.loaderPath,
        sha256: receipt.loaderSha256,
        mode: 0o600,
        label: 'Loader file',
      },
      {
        path: receipt.backupPath,
        sha256: receipt.backupSha256,
        mode: 0o600,
        label: 'Backup file',
      },
    ];
  }

  /**
   * Removes owned artifacts that are absent or still match the recorded digest.
   * A drifted file refuses recovery instead of being deleted.
   */
  private async removeVerifiedOrMissing(
    files: Array<{ path: string; sha256: string; mode: number; label: string }>,
  ): Promise<void> {
    for (const file of files) {
      const stat = await fs.promises.lstat(file.path).catch(() => null);
      if (!stat) {
        continue;
      }
      await this.verifyOneOwnedFile(
        file.path,
        file.sha256,
        file.label,
        file.mode,
      );
      await fs.promises.rm(file.path, { force: true });
    }
  }

  private async removeOwnedArtifacts(
    receipt: IntegrationReceipt,
  ): Promise<void> {
    for (const wrapper of receipt.wrappers) {
      await fs.promises.rm(wrapper.path, { force: true });
    }
    await fs.promises.rm(receipt.loaderPath, { force: true });
    await fs.promises.rm(receipt.backupPath, { force: true });
    for (const dir of [this.integrationDir, this.backupsDir]) {
      if (await fs.pathExists(dir)) {
        await fsyncDirectory(dir);
      }
    }
  }

  private async pruneEmptyOwnedDirectories(): Promise<void> {
    for (const dir of [this.integrationDir, this.backupsDir]) {
      try {
        await fs.promises.rmdir(dir);
        await fsyncDirectory(path.dirname(dir));
      } catch {
        // Non-empty or already removed: leaving owned directories is safe.
      }
    }
  }

  /**
   * Recovers a journaled install/uninstall transition after a crash.
   * Only exact before/after config bytes are reconciled; anything else refuses.
   */
  private async inspectJournal(): Promise<{
    phase: 'install' | 'uninstall';
    targetConfigPath: string;
  } | null> {
    let journalRaw: Buffer;
    try {
      journalRaw = await readBoundedRegularFile(
        this.journalPath,
        MAX_RECEIPT_BYTES,
        { code: 'ENOENT', message: 'missing' },
        {
          code: 'STATE_CORRUPT',
          message:
            'Integration journal must be a regular file with private 0600 permissions',
        },
        'STATE_CORRUPT',
        0o600,
      );
    } catch (err: unknown) {
      if (err instanceof HarnessError && err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
    try {
      const parsed = JSON.parse(journalRaw.toString('utf8'));
      const result = IntegrationJournalSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error('invalid');
      }
      return {
        phase: result.data.phase,
        targetConfigPath: result.data.targetConfigPath,
      };
    } catch {
      throw new HarnessError(
        'RECOVERY_REQUIRED',
        `Integration journal "${this.journalPath}" is unreadable; manual reconciliation required`,
      );
    }
  }

  private async recoverInterrupted(): Promise<boolean> {
    let journalRaw: Buffer;
    try {
      journalRaw = await readBoundedRegularFile(
        this.journalPath,
        MAX_RECEIPT_BYTES,
        { code: 'ENOENT', message: 'missing' },
        {
          code: 'STATE_CORRUPT',
          message:
            'Integration journal must be a regular file with private 0600 permissions',
        },
        'STATE_CORRUPT',
        0o600,
      );
    } catch (err: unknown) {
      if (err instanceof HarnessError && err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
    let journal: IntegrationJournal;
    try {
      const parsed = JSON.parse(journalRaw.toString('utf8'));
      const result = IntegrationJournalSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error('invalid');
      }
      journal = result.data as IntegrationJournal;
    } catch {
      throw new HarnessError(
        'RECOVERY_REQUIRED',
        `Integration journal "${this.journalPath}" is unreadable; manual reconciliation required`,
      );
    }
    this.assertOwnedReceiptPaths(journal.receipt);

    let currentRaw: Buffer;
    try {
      currentRaw = await this.readConfigBytes(journal.targetConfigPath);
    } catch {
      throw new HarnessError(
        'RECOVERY_REQUIRED',
        `Paseo configuration at "${journal.targetConfigPath}" is missing or unsafe during recovery; manual reconciliation required`,
      );
    }
    const currentSha256 = sha256Hex(currentRaw);

    if (currentSha256 === journal.expectedAfterSha256) {
      if (journal.phase === 'install') {
        const receiptRaw = JSON.stringify(journal.receipt, null, 2) + '\n';
        assertSerializedStateSize(receiptRaw, 'receipt');
        await writeAtomicReplace(this.receiptPath, receiptRaw, 0o600);
      } else {
        await this.removeVerifiedOrMissing(
          this.ownedArtifactList(journal.receipt),
        );
        await fs.promises.rm(this.receiptPath, { force: true });
        await fsyncDirectory(this.store.stateDir);
      }
      await fs.promises.rm(this.journalPath, { force: true });
      await fsyncDirectory(this.store.stateDir);
      return true;
    }

    if (currentSha256 === journal.expectedBeforeSha256) {
      if (journal.phase === 'install') {
        await this.removeVerifiedOrMissing(
          this.ownedArtifactList(journal.receipt),
        );
      }
      await fs.promises.rm(this.journalPath, { force: true });
      await fsyncDirectory(this.store.stateDir);
      return true;
    }

    throw new HarnessError(
      'RECOVERY_REQUIRED',
      'Paseo configuration matches neither journaled transition state. Inspect the journal and restore the original configuration manually.',
    );
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    let handle: fs.promises.FileHandle | null = null;
    try {
      handle = await fs.promises.open(
        this.lockPath,
        fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL,
        0o600,
      );
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
      );
      await handle.sync();
    } catch (err: unknown) {
      if (handle) {
        await handle.close().catch(() => undefined);
      }
      const code =
        isPlainObject(err) && typeof err.code === 'string' ? err.code : '';
      if (code === 'EEXIST') {
        throw new HarnessError(
          'LOCK_HELD',
          `Another integration mutation holds "${this.lockPath}". Stale locks require manual removal; locks are never auto-stolen.`,
        );
      }
      throw err;
    }

    try {
      return await operation();
    } finally {
      if (handle) {
        await handle.close().catch(() => undefined);
      }
      await fs.promises
        .rm(this.lockPath, { force: true })
        .catch(() => undefined);
    }
  }
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Deletes a pointer and prunes objects that become empty, so a synthesized
 * provider override disappears instead of leaving `{}` residue behind.
 */
function deleteJsonPointerValue(document: unknown, pointer: string): void {
  if (!pointer.startsWith('/')) {
    throw new HarnessError(
      'INVALID_POINTER',
      `Invalid JSON pointer: "${pointer}"`,
    );
  }
  const parts = pointer
    .slice(1)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  const ancestors: Array<{ parent: Record<string, unknown>; key: string }> = [];
  let current: unknown = document;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isPlainObject(current)) {
      return;
    }
    ancestors.push({ parent: current, key: parts[i] });
    current = current[parts[i]];
  }
  if (!isPlainObject(current)) {
    return;
  }
  delete current[parts[parts.length - 1]];

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const { parent, key } = ancestors[i];
    const child = parent[key];
    if (isPlainObject(child) && Object.keys(child).length === 0) {
      delete parent[key];
      continue;
    }
    break;
  }
}

function isPathInside(targetPath: string, rootPath: string): boolean {
  if (targetPath === rootPath) {
    return true;
  }
  const normalizedRoot = rootPath.endsWith(path.sep)
    ? rootPath
    : `${rootPath}${path.sep}`;
  return targetPath.startsWith(normalizedRoot);
}

async function assertExecutableInput(
  filePath: string,
  errorCode: string,
  requireExecutableBit: boolean,
): Promise<void> {
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    throw new HarnessError(
      errorCode,
      `Required trusted file "${filePath}" does not exist`,
    );
  }
  const canonical = await fs.promises.realpath(filePath).catch(() => null);
  if (
    !canonical ||
    (canonical !== path.resolve(filePath) &&
      !isDarwinSystemAliasPath(filePath, canonical))
  ) {
    throw new HarnessError(
      errorCode,
      `Trusted file "${filePath}" must be a canonical path without symlinks`,
    );
  }
  if (!stat.isFile()) {
    throw new HarnessError(
      errorCode,
      `Trusted file "${filePath}" must be a regular file`,
    );
  }
  if (requireExecutableBit && (stat.mode & 0o111) === 0) {
    throw new HarnessError(
      errorCode,
      `Trusted runtime "${filePath}" is not executable`,
    );
  }
}

const OMP_BINARY_NAMES = new Set(['omp', 'omp.exe']);
const MAX_PACKAGE_MANIFEST_BYTES = 1024 * 1024;

/**
 * Proves that a canonical executable is the package-declared `omp` bin target.
 * Node/Bun package installs symlink `omp` onto a package's JS entry (for OMP,
 * `dist/cli.js`), so the canonical basename alone cannot prove identity.
 */
async function hasDeclaredOmpBin(canonicalPath: string): Promise<boolean> {
  let dir = path.dirname(canonicalPath);
  for (let depth = 0; depth < 8; depth += 1) {
    const manifestPath = path.join(dir, 'package.json');
    let raw: Buffer | null;
    try {
      raw = await readBoundedRegularFile(
        manifestPath,
        MAX_PACKAGE_MANIFEST_BYTES,
        { code: 'ENOENT', message: 'missing' },
        { code: 'ENOENT', message: 'missing' },
        'ENOENT',
      );
    } catch {
      raw = null;
    }
    if (raw) {
      let manifest: unknown;
      try {
        manifest = JSON.parse(raw.toString('utf8'));
      } catch {
        return false;
      }
      if (!isPlainObject(manifest) || !isPlainObject(manifest.bin)) {
        return false;
      }
      const declared = manifest.bin.omp;
      if (typeof declared !== 'string' || declared.length === 0) {
        return false;
      }
      const declaredTarget = await fs.promises
        .realpath(path.resolve(dir, declared))
        .catch(() => null);
      if (!declaredTarget) {
        return false;
      }
      const packageRoot = await fs.promises.realpath(dir).catch(() => null);
      if (!packageRoot || !isPathInside(declaredTarget, `${packageRoot}`)) {
        return false;
      }
      return declaredTarget === canonicalPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return false;
    }
    dir = parent;
  }
  return false;
}

/**
 * Resolves a configured OMP launch binary to a canonical executable path.
 * Bare names resolve against PATH; the lexical configured name, the resolved
 * name, or a verified package-declared `omp` bin target must identify the
 * executable. Relative paths and unknown custom wrappers are refused.
 */
export async function resolveOmpExecutable(
  binary: string,
  explicitOverride?: string,
): Promise<string> {
  assertNoControlChars('OMP binary', binary);
  const configuredName = path.basename(binary);
  const candidate = explicitOverride ?? binary;

  let resolved: string | null = null;
  if (path.isAbsolute(candidate)) {
    resolved = candidate;
  } else if (candidate.includes('/') || candidate.includes('\\')) {
    throw new HarnessError(
      'UNKNOWN_CUSTOM_COMMAND',
      `OMP binary must be absolute or a bare name resolved from PATH, got "${candidate}"`,
    );
  } else {
    const pathEnv = process.env.PATH ?? '';
    for (const dirEnv of pathEnv.split(path.delimiter)) {
      if (!dirEnv || !path.isAbsolute(dirEnv)) {
        continue;
      }
      const attempt = path.join(dirEnv, candidate);
      const stat = await fs.promises.stat(attempt).catch(() => null);
      if (stat && stat.isFile() && (stat.mode & 0o111) !== 0) {
        resolved = attempt;
        break;
      }
    }
    if (!resolved) {
      throw new HarnessError(
        'OMP_BINARY_NOT_FOUND',
        `OMP binary "${candidate}" was not found on PATH; configure an explicit trusted binary`,
      );
    }
  }

  const canonical = await fs.promises.realpath(resolved).catch(() => null);
  if (!canonical) {
    throw new HarnessError(
      'OMP_BINARY_NOT_FOUND',
      `OMP binary "${resolved}" does not exist`,
    );
  }
  const stat = await fs.promises.stat(canonical);
  if (!stat.isFile() || (stat.mode & 0o111) === 0) {
    throw new HarnessError(
      'UNKNOWN_CUSTOM_COMMAND',
      `OMP binary "${resolved}" must be an executable regular file`,
    );
  }

  const named =
    OMP_BINARY_NAMES.has(path.basename(canonical)) ||
    (OMP_BINARY_NAMES.has(configuredName) &&
      !(await fs.promises.lstat(resolved)).isSymbolicLink()) ||
    OMP_BINARY_NAMES.has(path.basename(resolved));
  if (named || (await hasDeclaredOmpBin(canonical))) {
    return canonical;
  }

  throw new HarnessError(
    'UNKNOWN_CUSTOM_COMMAND',
    `Unrecognized OMP launch binary "${canonical}"; refusing to wrap unknown custom executables`,
  );
}

async function defaultOmpVersionResolver(
  binary: string,
  cwd: string,
  env: AuxiliaryEnvironment,
  interpreter?: OmpTargetInterpreter,
): Promise<string> {
  try {
    await assertCanonicalStateDirectory(cwd);
    const command = interpreter?.path ?? binary;
    const args = interpreter
      ? interpreter.kind === 'bun'
        ? ['--no-install', '--no-env-file', binary, '--version']
        : [binary, '--version']
      : ['--version'];
    const { stdout } = await execFileAsync(command, args, {
      cwd,
      timeout: MAX_EXECUTABLE_PROBE_MS,
      encoding: 'utf8',
      maxBuffer: 64 * 1024,
      env,
      windowsHide: true,
    });
    const match = SEMVER_SEARCH.exec(String(stdout));
    return match ? match[1] : '';
  } catch {
    return '';
  }
}
