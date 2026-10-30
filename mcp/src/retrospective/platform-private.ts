import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

export type DirectoryIdentity = { dev: number; ino: number };

/**
 * Absolute monotonic budget shared by bounded observation paths. The deadline
 * is `performance.now()`-based so wall-clock jumps cannot extend a wait; the
 * signal aborts lock retries, sleeps, file reads, and helper processes.
 */
export type AcquisitionBound = {
  readonly deadline: number;
  readonly signal: AbortSignal;
};

/**
 * Store and platform refusals. Codes are stable and asserted by tests.
 * A refusal never degrades into a weaker protection: callers either fix the
 * filesystem or stop.
 */
export class StoreError extends Error {
  generationId?: string;

  constructor(
    readonly code: string,
    message: string = code,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

function assertBound(bound?: AcquisitionBound): void {
  if (!bound) return;
  if (bound.signal.aborted) throw new StoreError("ABORTED");
  if (!Number.isFinite(bound.deadline) || performance.now() >= bound.deadline)
    throw new StoreError("DEADLINE_EXCEEDED");
}

const PRIVATE_DIR_MODE = 0o700;
export const PRIVATE_FILE_MODE = 0o600;
export const NOFOLLOW_FLAG: number = fs.constants.O_NOFOLLOW ?? 0;

const MAX_ROOT_PATH = 4_096;
const MAX_LOCK_BYTES = 4_096;
const WINDOWS_HELPER_TIMEOUT_MS = 30_000;
const WINDOWS_OUTPUT_BYTES = 8_192;
const O_DIRECTORY = fs.constants.O_DIRECTORY ?? 0;
const WINDOWS_HELPER_NAME = "windows-private.ps1";

/**
 * The helper is a fixed, checked-in resource beside this module (source tree or
 * packaged `dist`). There is deliberately no cwd or PATH-anchored fallback: a
 * `windows-private.ps1` planted in the caller's working directory must never
 * become the trust root. The optional directory exists for direct path tests.
 */
export function resolveWindowsHelperPath(
  moduleDirectory: string = typeof __dirname === "string" ? __dirname : "",
): string {
  if (moduleDirectory.length === 0)
    throw new StoreError("WINDOWS_HELPER_MISSING");
  const helper = path.join(moduleDirectory, WINDOWS_HELPER_NAME);
  if (!fs.existsSync(helper)) throw new StoreError("WINDOWS_HELPER_MISSING");
  return helper;
}

function currentUid(): number | null {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function identityOf(stats: fs.Stats): DirectoryIdentity {
  return { dev: Number(stats.dev), ino: Number(stats.ino) };
}

async function lstatOrNull(target: string): Promise<fs.Stats | null> {
  try {
    return await fsp.lstat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function resolveRoot(candidate: string): string {
  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.length > MAX_ROOT_PATH ||
    candidate.includes("\0")
  )
    throw new StoreError("INVALID_ROOT_PATH");
  if (!path.isAbsolute(candidate)) throw new StoreError("INVALID_ROOT_PATH");
  const resolved = path.normalize(candidate);
  if (resolved === path.parse(resolved).root)
    throw new StoreError("INVALID_ROOT_PATH");
  return resolved;
}

export function assertPrivateDirectory(
  target: string,
  stats: fs.Stats,
  code = "UNSAFE_PATH",
): void {
  if (stats.isSymbolicLink() || !stats.isDirectory())
    throw new StoreError(code, `Not a real directory: ${target}`);
  const uid = currentUid();
  if (uid !== null && process.platform !== "win32" && stats.uid !== uid)
    throw new StoreError("PRIVATE_OWNER_MISMATCH", "Owner mismatch.");
  if (process.platform !== "win32" && (stats.mode & 0o077) !== 0)
    throw new StoreError("PRIVATE_MODE", "Directory is not owner-private.");
}

export function assertPrivateFile(target: string, stats: fs.Stats): void {
  if (stats.isSymbolicLink() || !stats.isFile())
    throw new StoreError("UNSAFE_PATH", `Not a regular file: ${target}`);
  if (process.platform !== "win32" && (stats.mode & 0o077) !== 0)
    throw new StoreError("PRIVATE_MODE", "File is not owner-private.");
}

/**
 * Create or validate an owner-private root. POSIX: every existing component is
 * a real directory (no symlinks), the final root is owned by the current user
 * with no group/other permission bits, and missing components are created 0700.
 * Windows: delegates to the fixed checked-in PowerShell helper, which applies
 * and verifies an owner-restricted DACL. There is no chmod fallback.
 */
export async function ensurePrivateRoot(
  candidate: string,
  bound?: AcquisitionBound,
): Promise<string> {
  assertBound(bound);
  const resolved = resolveRoot(candidate);
  if (process.platform === "win32") {
    await ensureWindowsPrivateRoot(resolved, bound);
    return resolved;
  }
  const root = path.parse(resolved).root;
  const segments = resolved
    .slice(root.length)
    .split(path.sep)
    .filter((segment) => segment.length > 0);
  let current = root;
  const validateComponent = (stats: fs.Stats, isRoot: boolean): void => {
    if (stats.isSymbolicLink())
      throw new StoreError("ROOT_SYMLINK", "Root path contains a symlink.");
    if (!stats.isDirectory())
      throw new StoreError(
        "ROOT_NOT_DIRECTORY",
        "Root path is not a directory.",
      );
    if (!isRoot) return;
    const uid = currentUid();
    if (uid !== null && stats.uid !== uid)
      throw new StoreError(
        "ROOT_OWNER_MISMATCH",
        "Root is owned by another user.",
      );
    if ((stats.mode & 0o077) !== 0)
      throw new StoreError(
        "ROOT_PERMISSIVE",
        "Root has group/other permissions.",
      );
  };
  for (let index = 0; index < segments.length; index += 1) {
    assertBound(bound);
    current = path.join(current, segments[index]);
    const isRoot = index === segments.length - 1;
    const stats = await lstatOrNull(current);
    if (stats === null) {
      try {
        await createPrivateDirectory(current, bound);
        continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        validateComponent(await fsp.lstat(current), isRoot);
        continue;
      }
    }
    validateComponent(stats, isRoot);
  }
  return resolved;
}

/** Non-creating validation used before reading an existing store. */
export async function verifyPrivateRoot(
  candidate: string,
  bound?: AcquisitionBound,
): Promise<string> {
  assertBound(bound);
  const resolved = resolveRoot(candidate);
  if (process.platform === "win32") {
    await ensureWindowsPrivateRoot(resolved, bound);
    return resolved;
  }
  const stats = await lstatOrNull(resolved);
  if (!stats) throw new StoreError("ROOT_MISSING");
  if (stats.isSymbolicLink())
    throw new StoreError("ROOT_SYMLINK", "Root is a symlink.");
  if (!stats.isDirectory())
    throw new StoreError("ROOT_NOT_DIRECTORY", "Root is not a directory.");
  const uid = currentUid();
  if (uid !== null && stats.uid !== uid)
    throw new StoreError(
      "ROOT_OWNER_MISMATCH",
      "Root is owned by another user.",
    );
  if ((stats.mode & 0o077) !== 0)
    throw new StoreError(
      "ROOT_PERMISSIVE",
      "Root has group/other permissions.",
    );
  return resolved;
}

export async function createPrivateDirectory(
  target: string,
  bound?: AcquisitionBound,
): Promise<DirectoryIdentity> {
  assertBound(bound);
  if (process.platform === "win32") {
    await fsp.mkdir(target, { mode: PRIVATE_DIR_MODE });
    const createdStats = await fsp.lstat(target);
    assertPrivateDirectory(target, createdStats);
    const created = identityOf(createdStats);
    // The newly created directory's default owner may be the token's group
    // SID under elevation; establish the exact owner/private ACL, then detect
    // path substitution across the path-based helper call.
    await establishWindowsPrivateAcl(target, "Directory", bound);
    const verifiedStats = await fsp.lstat(target);
    if (
      verifiedStats.isSymbolicLink() ||
      !verifiedStats.isDirectory() ||
      Number(verifiedStats.dev) !== created.dev ||
      Number(verifiedStats.ino) !== created.ino
    )
      throw new StoreError(
        "PATH_CHANGED",
        "Directory identity changed during ACL establishment.",
      );
    return identityOf(verifiedStats);
  }
  await fsp.mkdir(target, { mode: PRIVATE_DIR_MODE });
  const stats = await fsp.lstat(target);
  assertPrivateDirectory(target, stats);
  return identityOf(stats);
}

export async function ensurePrivateDirectory(
  target: string,
  bound?: AcquisitionBound,
): Promise<DirectoryIdentity> {
  assertBound(bound);
  const stats = await lstatOrNull(target);
  if (stats) {
    assertPrivateDirectory(target, stats);
    if (process.platform === "win32")
      await verifyWindowsPrivatePath(target, bound);
    return identityOf(stats);
  }
  try {
    return await createPrivateDirectory(target, bound);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const raced = await fsp.lstat(target);
    assertPrivateDirectory(target, raced);
    if (process.platform === "win32")
      await verifyWindowsPrivatePath(target, bound);
    return identityOf(raced);
  }
}

export async function assertDirectoryIdentity(
  target: string,
  expected: DirectoryIdentity,
  bound?: AcquisitionBound,
): Promise<void> {
  assertBound(bound);
  const stats = await lstatOrNull(target);
  if (!stats) throw new StoreError("UNSAFE_PATH", "Directory disappeared.");
  assertPrivateDirectory(target, stats);
  if (process.platform === "win32")
    await verifyWindowsPrivatePath(target, bound);
  if (Number(stats.dev) !== expected.dev || Number(stats.ino) !== expected.ino)
    throw new StoreError("PATH_CHANGED", "Directory identity changed.");
}

export async function syncDirectory(directory: string): Promise<void> {
  if (process.platform === "win32") return;
  const handle = await fsp.open(directory, fs.constants.O_RDONLY | O_DIRECTORY);
  try {
    await handle.sync();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EINVAL" && code !== "EBADF") throw error;
  } finally {
    await handle.close();
  }
}

export async function writePrivateFileExclusive(
  target: string,
  data: string | Uint8Array,
  options: { durable?: boolean } = {},
): Promise<number> {
  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    NOFOLLOW_FLAG;
  let handle: FileHandle;
  try {
    handle = await fsp.open(target, flags, PRIVATE_FILE_MODE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new StoreError(
        "FILE_EXISTS",
        "Refusing to overwrite an existing file.",
      );
    throw error;
  }
  let created: DirectoryIdentity | undefined;
  try {
    await handle.writeFile(data);
    if (options.durable !== false) await handle.sync();
    const stats = await handle.stat();
    assertPrivateFile(target, stats);
    created = identityOf(stats);
  } finally {
    await handle.close();
  }
  if (process.platform === "win32") {
    if (!created)
      throw new StoreError(
        "PATH_CHANGED",
        "File identity was not captured before ACL establishment.",
      );
    // A fresh Windows file takes the token's default owner, which may be a
    // group SID under elevation. Establish the exact owner/private ACL only
    // for this exclusively created file, then detect substitution.
    await establishWindowsPrivateAcl(target, "File");
    const verifiedStats = await lstatOrNull(target);
    if (
      !verifiedStats ||
      verifiedStats.isSymbolicLink() ||
      !verifiedStats.isFile() ||
      Number(verifiedStats.dev) !== created.dev ||
      Number(verifiedStats.ino) !== created.ino
    )
      throw new StoreError(
        "PATH_CHANGED",
        "File identity changed during ACL establishment.",
      );
  }
  return typeof data === "string"
    ? Buffer.byteLength(data, "utf8")
    : data.byteLength;
}

async function readPrivateFile(
  target: string,
  maxBytes: number,
  bound?: AcquisitionBound,
): Promise<Buffer> {
  assertBound(bound);
  const handle = await fsp.open(target, fs.constants.O_RDONLY | NOFOLLOW_FLAG);
  try {
    assertBound(bound);
    const stats = await handle.stat();
    assertPrivateFile(target, stats);
    if (process.platform === "win32")
      await verifyWindowsPrivatePath(target, bound);
    if (stats.size > maxBytes) throw new StoreError("FILE_TOO_LARGE");
    const buffer = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < buffer.length) {
      assertBound(bound);
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== buffer.length)
      throw new StoreError("FILE_CHANGED", "File changed while reading.");
    assertBound(bound);
    return buffer;
  } finally {
    await handle.close();
  }
}

export async function readPrivateFileOptional(
  target: string,
  maxBytes: number,
  bound?: AcquisitionBound,
): Promise<Buffer | null> {
  try {
    return await readPrivateFile(target, maxBytes, bound);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function writePrivateFileAtomic(
  target: string,
  data: string | Uint8Array,
): Promise<void> {
  const directory = path.dirname(target);
  const temporary = path.join(
    directory,
    `.tmp-${process.pid}-${Date.now().toString(36)}-${Math.random()
      .toString(16)
      .slice(2)}`,
  );
  try {
    await writePrivateFileExclusive(temporary, data);
    await fsp.rename(temporary, target);
    if (process.platform === "win32") await verifyWindowsPrivatePath(target);
    await syncDirectory(directory);
  } finally {
    await fsp.rm(temporary, { force: true }).catch(() => undefined);
  }
}

/** Write only when bytes differ; returns true when a write happened. */
export async function writePrivateFileAtomicIfChanged(
  target: string,
  data: string | Uint8Array,
  maxBytes = 4_194_304,
): Promise<boolean> {
  const next =
    typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  const existing = await readPrivateFileOptional(target, maxBytes);
  if (existing && existing.equals(next)) return false;
  await writePrivateFileAtomic(target, next);
  return true;
}

export async function removePrivateTree(
  target: string,
  expected?: DirectoryIdentity,
): Promise<void> {
  const stats = await lstatOrNull(target);
  if (!stats) return;
  if (stats.isSymbolicLink() || !stats.isDirectory())
    throw new StoreError("UNSAFE_PATH", "Refusing to remove a non-directory.");
  if (
    expected &&
    (Number(stats.dev) !== expected.dev || Number(stats.ino) !== expected.ino)
  )
    throw new StoreError("PATH_CHANGED", "Directory identity changed.");
  await fsp.rm(target, { recursive: true, force: true });
}

export async function removePrivateFile(
  target: string,
  maxBytes = MAX_LOCK_BYTES,
): Promise<void> {
  const stats = await lstatOrNull(target);
  if (!stats) return;
  if (stats.isDirectory() && !stats.isSymbolicLink())
    throw new StoreError("UNSAFE_PATH", "Refusing to unlink a directory.");
  if (!stats.isSymbolicLink() && stats.size > maxBytes)
    throw new StoreError("FILE_TOO_LARGE");
  await fsp.rm(target, { force: true });
}

export { lstatOrNull };

/**
 * PowerShell is spawned by absolute system path derived from `SystemRoot`, so a
 * planted `powershell.exe` earlier in the working directory or `PATH` cannot
 * run. A missing or non-absolute `SystemRoot` is a refusal, not a fallback.
 */
export function windowsPowerShellPath(systemRoot: string | undefined): string {
  if (
    typeof systemRoot !== "string" ||
    systemRoot.length === 0 ||
    systemRoot.includes("\0") ||
    !path.isAbsolute(systemRoot)
  )
    throw new StoreError("WINDOWS_HELPER_MISSING");
  return path.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

type WindowsItemKind = "Directory" | "File";

type WindowsHelperMode =
  | { readonly verifyOnly: true }
  | { readonly verifyOnly: false; readonly itemKind: WindowsItemKind };

/**
 * Fixed argv for the checked-in helper. `-ExecutionPolicy Bypass` applies only
 * to that single module-local `-File` path; no caller-supplied script runs.
 * Establish mode always names the item kind so the helper can refuse a
 * directory/file mismatch before mutating any ACL.
 */
function windowsHelperArgs(
  helper: string,
  target: string,
  mode: WindowsHelperMode,
): string[] {
  return [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    helper,
    "-Path",
    target,
    ...(mode.verifyOnly ? ["-VerifyOnly"] : ["-ItemKind", mode.itemKind]),
  ];
}

/**
 * Windows PowerShell 5.1 constructs its own `PSModulePath` at startup only
 * when the variable is absent. Node is an intermediate process: launched from
 * PowerShell 7, it inherits the PS7 module paths, which precede the 5.1 system
 * path and can bind shared modules (for example
 * `Microsoft.PowerShell.Security`) to PS7 builds that 5.1 cannot load. Per
 * Microsoft `about_PSModulePath`, the documented compatibility fix is to
 * remove every case-insensitive `PSModulePath` entry from the child
 * environment (never from `process.env`) so 5.1 rebuilds its defaults.
 *
 * Trust limit: the rebuilt defaults include user-writable module directories,
 * so ambient module shadowing by the same user remains outside this store's
 * protection guarantee.
 */
export function windowsPowerShellEnvironment(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const childEnvironment: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(environment)) {
    if (key.toLowerCase() === "psmodulepath") continue;
    childEnvironment[key] = value;
  }
  return childEnvironment;
}

function runFixedProcess(
  file: string,
  args: string[],
  timeoutMs: number,
  bound?: AcquisitionBound,
): Promise<{ code: number; stdout: string; stderr: string }> {
  // `Promise.withResolvers` is ES2024; this project compiles against ES2022.
  return new Promise((resolve, reject) => {
    try {
      assertBound(bound);
    } catch (error) {
      reject(error);
      return;
    }
    const remaining = bound
      ? bound.deadline - performance.now()
      : Number.POSITIVE_INFINITY;
    if (remaining <= 0) {
      reject(new StoreError("DEADLINE_EXCEEDED"));
      return;
    }
    const child = spawn(file, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: windowsPowerShellEnvironment(process.env),
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < WINDOWS_OUTPUT_BYTES)
        stdout += chunk
          .toString("utf8")
          .slice(0, WINDOWS_OUTPUT_BYTES - stdout.length);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < WINDOWS_OUTPUT_BYTES)
        stderr += chunk
          .toString("utf8")
          .slice(0, WINDOWS_OUTPUT_BYTES - stderr.length);
    });
    const effectiveTimeout = Math.min(timeoutMs, remaining);
    const timeoutCode =
      remaining < timeoutMs ? "DEADLINE_EXCEEDED" : "WINDOWS_HELPER_TIMEOUT";
    const finish = (): void => {
      clearTimeout(timer);
      bound?.signal.removeEventListener("abort", onAbort);
    };
    const onAbort = (): void => {
      finish();
      child.kill();
      reject(new StoreError("ABORTED"));
    };
    bound?.signal.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => {
      finish();
      child.kill();
      reject(new StoreError(timeoutCode));
    }, effectiveTimeout);
    timer.unref?.();
    child.on("error", (error) => {
      finish();
      reject(new StoreError("WINDOWS_HELPER_FAILED", error.message));
    });
    child.on("close", (code) => {
      finish();
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * Establish the protected owner+SYSTEM ACL on a path the store owns. Fresh
 * directories and fresh files are the only normal callers; the intentional
 * exception is store-root initialization through `ensureWindowsPrivateRoot`,
 * which establishes or repairs the root directory itself. Existing children,
 * raced paths and `EEXIST` branches never call this and stay verify-only.
 * The item kind is explicit so the helper refuses a directory/file mismatch
 * before mutating any ACL.
 */
async function establishWindowsPrivateAcl(
  target: string,
  itemKind: WindowsItemKind,
  bound?: AcquisitionBound,
): Promise<void> {
  assertBound(bound);
  if (process.platform !== "win32")
    throw new StoreError(
      "WINDOWS_HELPER_UNSUPPORTED_PLATFORM",
      "The Windows ACL helper only runs on Windows.",
    );
  const resolved = resolveRoot(target);
  const helper = resolveWindowsHelperPath();
  const result = await runFixedProcess(
    windowsPowerShellPath(process.env.SystemRoot),
    windowsHelperArgs(helper, resolved, {
      verifyOnly: false,
      itemKind,
    }),
    WINDOWS_HELPER_TIMEOUT_MS,
    bound,
  );
  if (result.code !== 0) {
    const detail = result.stderr.trim();
    const code = detail.includes("AGS-REPARSE-POINT")
      ? "WINDOWS_REPARSE_POINT"
      : "WINDOWS_ACL_FAILED";
    throw new StoreError(code, detail || `PowerShell exited ${result.code}`);
  }
}

/**
 * Windows owner-restricted ACL. The helper is a fixed checked-in script:
 * PowerShell receives the path as one literal argv value, never as
 * interpolated shell source. Missing helper, reparse points, or any failure to
 * establish and verify the DACL is a refusal, not a chmod substitute.
 */
export async function ensureWindowsPrivateRoot(
  root: string,
  bound?: AcquisitionBound,
): Promise<void> {
  await establishWindowsPrivateAcl(root, "Directory", bound);
}
export async function verifyWindowsPrivatePath(
  target: string,
  bound?: AcquisitionBound,
): Promise<void> {
  assertBound(bound);
  if (process.platform !== "win32")
    throw new StoreError(
      "WINDOWS_HELPER_UNSUPPORTED_PLATFORM",
      "The Windows ACL helper only runs on Windows.",
    );
  const helper = resolveWindowsHelperPath();
  const resolved = resolveRoot(target);
  const result = await runFixedProcess(
    windowsPowerShellPath(process.env.SystemRoot),
    windowsHelperArgs(helper, resolved, { verifyOnly: true }),
    WINDOWS_HELPER_TIMEOUT_MS,
    bound,
  );
  if (result.code !== 0) {
    const detail = result.stderr.trim();
    const code = detail.includes("AGS-REPARSE-POINT")
      ? "WINDOWS_REPARSE_POINT"
      : "WINDOWS_ACL_FAILED";
    throw new StoreError(code, detail || `PowerShell exited ${result.code}`);
  }
}
