import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { arch, platform, release } from 'node:os';
import { dirname, join } from 'node:path';

const API_VERSION = 1;
const NAPI_VERSION = 8;
const PACKAGE_NAME = 'agent-skills-standard-mcp';
const packageRequire = createRequire(__filename);
const targets = {
  'darwin-arm64': {
    platform: 'darwin',
    architecture: 'arm64',
    compatibility: { minimumOsVersion: '11.0', minimumGlibcVersion: null, minimumKernelVersion: null },
  },
  'darwin-x64': {
    platform: 'darwin',
    architecture: 'x64',
    compatibility: { minimumOsVersion: '10.15', minimumGlibcVersion: null, minimumKernelVersion: null },
  },
  'linux-arm64-gnu': {
    platform: 'linux',
    architecture: 'arm64',
    compatibility: { minimumOsVersion: null, minimumGlibcVersion: '2.28', minimumKernelVersion: '4.18' },
  },
  'linux-x64-gnu': {
    platform: 'linux',
    architecture: 'x64',
    compatibility: { minimumOsVersion: null, minimumGlibcVersion: '2.28', minimumKernelVersion: '4.18' },
  },
} as const;

type NativeTarget = keyof typeof targets;
type NativeEntryKind = 'file' | 'directory' | 'symlink' | 'other' | 'unknown';

declare const directoryBrand: unique symbol;
declare const cursorBrand: unique symbol;

export interface NativeDirectory {
  readonly [directoryBrand]: true;
}

export interface NativeCursor {
  readonly [cursorBrand]: true;
}

export interface NativeEntry {
  readonly name: string;
  readonly kind: NativeEntryKind;
}

export interface NativeBatch {
  readonly entries: readonly NativeEntry[];
  readonly visited: number;
  readonly done: boolean;
}

export interface NativeIngressApi {
  openRoot(absoluteRoot: string): Promise<NativeDirectory>;
  openChildDirectory(parent: NativeDirectory, component: string): Promise<NativeDirectory>;
  openRegularFile(parent: NativeDirectory, component: string): Promise<number>;
  openDirectoryStream(directory: NativeDirectory): Promise<NativeCursor>;
  readDirectoryBatch(cursor: NativeCursor, maxEntries: number): Promise<NativeBatch>;
  closeDirectory(directory: NativeDirectory): Promise<void>;
  closeCursor(cursor: NativeCursor): Promise<void>;
}

export type NativeIngressOperationErrorCode =
  | 'NATIVE_INVALID_ARGUMENTS'
  | 'NATIVE_INVALID_PATH'
  | 'NATIVE_NOT_FOUND'
  | 'NATIVE_NOT_DIRECTORY'
  | 'NATIVE_ACCESS_DENIED'
  | 'NATIVE_SYMLINK_REJECTED'
  | 'NATIVE_INVALID_COMPONENT'
  | 'NATIVE_INVALID_CAPABILITY'
  | 'NATIVE_CAPABILITY_CLOSED'
  | 'NATIVE_NOT_REGULAR_FILE'
  | 'NATIVE_INVALID_LIMIT'
  | 'NATIVE_FILESYSTEM_ERROR'
  | 'NATIVE_RESOURCE_ERROR'
  | 'NATIVE_ASYNC_ERROR'
  | 'NATIVE_CLOSE_ERROR';

export type NativeIngressUnavailable =
  | { readonly state: 'unsupported-target'; readonly code: 'NATIVE_UNSUPPORTED_TARGET'; readonly message: string }
  | { readonly state: 'artifact-missing'; readonly code: 'NATIVE_ARTIFACT_MISSING'; readonly message: string }
  | { readonly state: 'load-failed'; readonly code: 'NATIVE_LOAD_FAILED'; readonly message: string };

export type NativeIngressLoadResult =
  | { readonly state: 'available'; readonly api: NativeIngressApi }
  | NativeIngressUnavailable;


const messages = {
  unsupported: 'Native retrospective ingress is unsupported on this runtime target',
  missing: 'Native retrospective ingress artifact is missing; install a supported package build',
  failed: 'Native retrospective ingress could not be loaded; install a compatible package build',
} as const;

export function supportsLinuxKernelRelease(value: string): boolean {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?(?:[-+][0-9A-Za-z._+-]+)?$/.exec(value);
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] === undefined ? 0 : Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  return major > 4 || (major === 4 && minor >= 18);
}

function compareVersion(left: string, right: string): number | null {
  const parse = (value: string): number[] | null => {
    const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(value);
    if (match === null) return null;
    const parts = match.slice(1).map((part) => Number(part ?? '0'));
    return parts.every(Number.isSafeInteger) ? parts : null;
  };
  const leftParts = parse(left);
  const rightParts = parse(right);
  if (leftParts === null || rightParts === null) return null;
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function selectNativeTarget(
  systemPlatform: string,
  architecture: string,
  kernelRelease: string,
  glibcVersion: string | null,
): NativeTarget | null {
  if (systemPlatform === 'darwin') {
    if (architecture === 'arm64') return 'darwin-arm64';
    if (architecture === 'x64') return 'darwin-x64';
    return null;
  }
  if (systemPlatform !== 'linux' || !supportsLinuxKernelRelease(kernelRelease)) return null;
  const glibcComparison = compareVersion(glibcVersion ?? '', '2.28');
  if (glibcComparison === null || glibcComparison < 0) return null;
  if (architecture === 'arm64') return 'linux-arm64-gnu';
  if (architecture === 'x64') return 'linux-x64-gnu';
  return null;
}

function runtimeGlibcVersion(): string | null {
  try {
    const report: unknown = process.report?.getReport();
    if (!isRecord(report) || !isRecord(report.header)) return null;
    const version = report.header.glibcVersionRuntime;
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function isSafeLabel(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 &&
    !value.includes('/') && !value.includes('\\') && !value.includes('\0');
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isNativeIngressApi(value: unknown): value is NativeIngressApi {
  if (!isRecord(value) || value.apiVersion !== API_VERSION) return false;
  const methods: readonly (keyof NativeIngressApi)[] = [
    'openRoot', 'openChildDirectory', 'openRegularFile', 'openDirectoryStream',
    'readDirectoryBatch', 'closeDirectory', 'closeCursor',
  ];
  return methods.every((method) => typeof value[method] === 'function');
}

function validateManifest(value: unknown, target: NativeTarget, sourceDigest: string, binaryDigest: string): boolean {
  if (!hasExactKeys(value, [
    'schemaVersion', 'apiVersion', 'napiVersion', 'target', 'sourceSha256', 'binarySha256',
    'compiler', 'sdk', 'compatibility', 'buildFlags',
  ])) return false;
  if (value.schemaVersion !== 1 || value.apiVersion !== API_VERSION ||
      value.napiVersion !== NAPI_VERSION || value.target !== target ||
      value.sourceSha256 !== sourceDigest || value.binarySha256 !== binaryDigest ||
      !isSha256(value.sourceSha256) || !isSha256(value.binarySha256)) return false;
  if (!hasExactKeys(value.compiler, ['name', 'version']) ||
      !isSafeLabel(value.compiler.name) || !isSafeLabel(value.compiler.version) ||
      !hasExactKeys(value.sdk, ['name', 'version']) ||
      !isSafeLabel(value.sdk.name) || !isSafeLabel(value.sdk.version)) return false;
  const expected = targets[target].compatibility;
  const compatibility = value.compatibility;
  if (!hasExactKeys(compatibility, [
    'minimumOsVersion', 'minimumGlibcVersion', 'minimumKernelVersion',
  ])) return false;
  if (Object.entries(expected).some(([key, version]) => compatibility[key] !== version)) return false;
  return Array.isArray(value.buildFlags) && value.buildFlags.every(isSafeLabel);
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

async function readRegularAsset(path: string): Promise<Buffer> {
  const metadata = await lstat(path);
  if (!metadata.isFile()) throw new Error('invalid native asset');
  return readFile(path);
}

function unavailable(state: NativeIngressUnavailable['state']): NativeIngressUnavailable {
  if (state === 'unsupported-target') {
    return { state, code: 'NATIVE_UNSUPPORTED_TARGET', message: messages.unsupported };
  }
  if (state === 'artifact-missing') {
    return { state, code: 'NATIVE_ARTIFACT_MISSING', message: messages.missing };
  }
  return { state, code: 'NATIVE_LOAD_FAILED', message: messages.failed };
}

export async function loadNativeIngress(): Promise<NativeIngressLoadResult> {
  const target = selectNativeTarget(platform(), arch(), release(), runtimeGlibcVersion());
  if (target === null) return unavailable('unsupported-target');
  let packageRoot: string;
  try {
    packageRoot = dirname(packageRequire.resolve(`${PACKAGE_NAME}/package.json`));
  } catch {
    return unavailable('load-failed');
  }
  const assetDirectory = join(packageRoot, 'prebuilds', target);
  const binaryPath = join(assetDirectory, 'secure_ingress.node');
  const manifestPath = join(assetDirectory, 'manifest.json');
  const sourcePath = join(packageRoot, 'native', 'secure-ingress', 'secure_ingress.c');
  let binary: Buffer;
  try {
    binary = await readRegularAsset(binaryPath);
  } catch (error) {
    return unavailable(isMissing(error) ? 'artifact-missing' : 'load-failed');
  }
  try {
    const [manifestBytes, source] = await Promise.all([
      readRegularAsset(manifestPath),
      readRegularAsset(sourcePath),
    ]);
    const manifest: unknown = JSON.parse(manifestBytes.toString('utf8'));
    if (!validateManifest(manifest, target, sha256(source), sha256(binary))) return unavailable('load-failed');
    const nativeModule: unknown = packageRequire(binaryPath);
    if (!isNativeIngressApi(nativeModule)) return unavailable('load-failed');
    return { state: 'available', api: nativeModule };
  } catch {
    return unavailable('load-failed');
  }
}
