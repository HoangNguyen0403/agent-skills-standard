import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptions,
} from "node:child_process";
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
  cause?: unknown;

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

const WINDOWS_HELPER_IDLE_MS = 5_000;
const MAX_HELPER_ITEMS = 64;
const MAX_HELPER_REQUEST_BYTES = 1_048_576;
const MAX_HELPER_RESPONSE_BYTES = 1_048_576;
const MAX_HELPER_DETAIL_BYTES = 4_096;

export type WindowsHelperRequestItem =
  | { readonly path: string; readonly mode: "verify" }
  | {
      readonly path: string;
      readonly mode: "establish";
      readonly itemKind: WindowsItemKind;
    };

export type WindowsHelperResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: "AGS-REPARSE-POINT" | "AGS-ACL-FAILED";
      readonly detail: string;
    };

function malformedHelperResponse(message: string): StoreError {
  return new StoreError("WINDOWS_ACL_FAILED", message);
}

/** Pure request encoder used by the serving helper and its protocol tests. */
export function encodeWindowsHelperRequest(
  id: number,
  items: readonly WindowsHelperRequestItem[],
): string {
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    items.length === 0 ||
    items.length > MAX_HELPER_ITEMS
  )
    throw new StoreError(
      "WINDOWS_HELPER_FAILED",
      "Invalid Windows ACL helper request.",
    );
  const line = JSON.stringify({ id, items });
  if (Buffer.byteLength(line, "utf8") > MAX_HELPER_REQUEST_BYTES)
    throw new StoreError(
      "WINDOWS_HELPER_FAILED",
      "Windows ACL helper request is too large.",
    );
  return `${line}\n`;
}

/**
 * Strict response decoder. One request is in flight at a time, so the id must
 * match, results must stop exactly at the first failure, and a success must
 * account for every item. Anything else poisons the helper at the transport
 * layer rather than being partially trusted.
 */
export function decodeWindowsHelperResponse(
  line: string,
  expectedId: number,
  itemCount: number,
): readonly WindowsHelperResult[] {
  if (Buffer.byteLength(line, "utf8") > MAX_HELPER_RESPONSE_BYTES)
    throw malformedHelperResponse("Windows ACL helper response is too large.");
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw malformedHelperResponse("Windows ACL helper response is not JSON.");
  }
  if (typeof value !== "object" || value === null)
    throw malformedHelperResponse("Windows ACL helper response has no object.");
  const record = value as { id?: unknown; results?: unknown };
  if (record.id !== expectedId)
    throw malformedHelperResponse("Windows ACL helper response id mismatch.");
  if (!Array.isArray(record.results))
    throw malformedHelperResponse(
      "Windows ACL helper response has no results.",
    );
  const rows = record.results;
  if (rows.length === 0 || rows.length > itemCount)
    throw malformedHelperResponse(
      "Windows ACL helper response result count is invalid.",
    );
  let failed = false;
  const results: WindowsHelperResult[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (typeof row !== "object" || row === null)
      throw malformedHelperResponse(
        "Windows ACL helper response result is not an object.",
      );
    const entry = row as { ok?: unknown; code?: unknown; detail?: unknown };
    if (entry.ok === true) {
      if (failed)
        throw malformedHelperResponse(
          "Windows ACL helper response continued after a failure.",
        );
      results.push({ ok: true });
      continue;
    }
    if (entry.ok !== false || failed)
      throw malformedHelperResponse(
        "Windows ACL helper response failure is malformed.",
      );
    if (index !== rows.length - 1)
      throw malformedHelperResponse(
        "Windows ACL helper response continued after a failure.",
      );
    if (entry.code !== "AGS-REPARSE-POINT" && entry.code !== "AGS-ACL-FAILED")
      throw malformedHelperResponse(
        "Windows ACL helper response has an unknown refusal code.",
      );
    const detail = typeof entry.detail === "string" ? entry.detail : "";
    if (Buffer.byteLength(detail, "utf8") > MAX_HELPER_DETAIL_BYTES)
      throw malformedHelperResponse(
        "Windows ACL helper response detail is too large.",
      );
    results.push({ ok: false, code: entry.code, detail });
    failed = true;
  }
  if (!failed && results.length !== itemCount)
    throw malformedHelperResponse("Windows ACL helper response omitted items.");
  return results;
}

type WindowsHelperPending = {
  readonly id: number;
  readonly itemCount: number;
  readonly resolve: () => void;
  readonly reject: (error: StoreError) => void;
  readonly timer: NodeJS.Timeout;
  readonly signal?: AbortSignal;
  readonly onAbort?: () => void;
};

type WindowsHelperProcess = {
  readonly child: ChildProcessWithoutNullStreams;
  buffer: string;
  pending: WindowsHelperPending | null;
  idleTimer: NodeJS.Timeout | null;
  disposed: boolean;
};

let activeWindowsHelper: WindowsHelperProcess | null = null;
let windowsHelperRequestId = 0;
let windowsHelperQueue: Promise<unknown> = Promise.resolve();
let windowsHelperExitHookInstalled = false;

function setHelperRefs(helper: WindowsHelperProcess, active: boolean): void {
  for (const handle of [
    helper.child as unknown as {
      ref?: () => void;
      unref?: () => void;
    },
    helper.child.stdin as unknown as {
      ref?: () => void;
      unref?: () => void;
    },
    helper.child.stdout as unknown as {
      ref?: () => void;
      unref?: () => void;
    },
    helper.child.stderr as unknown as {
      ref?: () => void;
      unref?: () => void;
    },
  ]) {
    if (active) handle.ref?.();
    else handle.unref?.();
  }
}

function clearHelperPending(
  helper: WindowsHelperProcess,
): WindowsHelperPending | null {
  const pending = helper.pending;
  if (!pending) return null;
  helper.pending = null;
  clearTimeout(pending.timer);
  if (pending.signal && pending.onAbort)
    pending.signal.removeEventListener("abort", pending.onAbort);
  return pending;
}

function poisonWindowsHelper(
  helper: WindowsHelperProcess,
  error: StoreError,
): void {
  if (helper.disposed) return;
  helper.disposed = true;
  if (helper.idleTimer) clearTimeout(helper.idleTimer);
  helper.idleTimer = null;
  if (activeWindowsHelper === helper) activeWindowsHelper = null;
  const pending = clearHelperPending(helper);
  pending?.reject(error);
  helper.child.kill();
}

function scheduleHelperIdle(helper: WindowsHelperProcess): void {
  if (helper.disposed || helper.pending) return;
  if (helper.idleTimer) clearTimeout(helper.idleTimer);
  helper.idleTimer = setTimeout(() => {
    helper.idleTimer = null;
    if (!helper.pending)
      poisonWindowsHelper(
        helper,
        new StoreError(
          "WINDOWS_ACL_FAILED",
          "Windows ACL helper idle timeout.",
        ),
      );
  }, WINDOWS_HELPER_IDLE_MS);
  helper.idleTimer.unref?.();
}

function settleWindowsHelper(
  helper: WindowsHelperProcess,
  results: readonly WindowsHelperResult[],
): void {
  const pending = clearHelperPending(helper);
  if (!pending) return;
  setHelperRefs(helper, false);
  scheduleHelperIdle(helper);
  const failure = results.find((result) => !result.ok);
  if (failure && !failure.ok) {
    pending.reject(
      new StoreError(
        failure.code === "AGS-REPARSE-POINT"
          ? "WINDOWS_REPARSE_POINT"
          : "WINDOWS_ACL_FAILED",
        failure.detail || failure.code,
      ),
    );
    return;
  }
  pending.resolve();
}

function onHelperStdout(helper: WindowsHelperProcess, chunk: string): void {
  if (helper.disposed) return;
  helper.buffer += chunk;
  for (;;) {
    const newline = helper.buffer.indexOf("\n");
    if (newline < 0) {
      if (Buffer.byteLength(helper.buffer, "utf8") > MAX_HELPER_RESPONSE_BYTES)
        poisonWindowsHelper(
          helper,
          malformedHelperResponse(
            "Windows ACL helper response line is too large.",
          ),
        );
      return;
    }
    const line = helper.buffer.slice(0, newline).replace(/\r$/, "");
    helper.buffer = helper.buffer.slice(newline + 1);
    const pending = helper.pending;
    if (!pending) {
      poisonWindowsHelper(
        helper,
        malformedHelperResponse(
          "Windows ACL helper sent an unsolicited response.",
        ),
      );
      return;
    }
    let results: readonly WindowsHelperResult[];
    try {
      results = decodeWindowsHelperResponse(
        line,
        pending.id,
        pending.itemCount,
      );
    } catch (error) {
      poisonWindowsHelper(
        helper,
        error instanceof StoreError
          ? error
          : malformedHelperResponse(
              "Windows ACL helper response could not be parsed.",
            ),
      );
      return;
    }
    settleWindowsHelper(helper, results);
  }
}

export type WindowsHelperSpawn = (
  file: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcessWithoutNullStreams;

const defaultWindowsHelperSpawn: WindowsHelperSpawn = (file, args, options) =>
  spawn(file, args, options) as ChildProcessWithoutNullStreams;

let windowsHelperSpawn: WindowsHelperSpawn = defaultWindowsHelperSpawn;
let windowsHelperPathForTests: string | null = null;

/**
 * Internal test seam: replace the child-process factory and, optionally, the
 * literal helper path passed in fixed argv. Pass `null` to restore the real
 * spawn and poison any live helper. Production never calls this; POSIX
 * behavior is unchanged.
 */
export function setWindowsHelperSpawnForTests(
  spawner: WindowsHelperSpawn | null,
  helperPath: string | null = null,
): void {
  windowsHelperSpawn = spawner ?? defaultWindowsHelperSpawn;
  windowsHelperPathForTests = spawner ? helperPath : null;
  const helper = activeWindowsHelper;
  if (helper)
    poisonWindowsHelper(
      helper,
      new StoreError(
        "WINDOWS_ACL_FAILED",
        "Windows ACL helper reset for tests.",
      ),
    );
}

function startWindowsHelper(): WindowsHelperProcess {
  const helperPath = windowsHelperPathForTests ?? resolveWindowsHelperPath();
  const child = windowsHelperSpawn(
    windowsPowerShellPath(process.env.SystemRoot),
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      // Bypass applies only to the fixed module-local helper file below.
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      helperPath,
      "-Serve",
    ],
    {
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: windowsPowerShellEnvironment(process.env),
    },
  );
  const helper: WindowsHelperProcess = {
    child,
    buffer: "",
    pending: null,
    idleTimer: null,
    disposed: false,
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => onHelperStdout(helper, chunk));
  child.stderr.on("data", (chunk: string) => {
    const detail = chunk.trim().slice(0, MAX_HELPER_DETAIL_BYTES);
    poisonWindowsHelper(
      helper,
      new StoreError(
        "WINDOWS_ACL_FAILED",
        detail || "Windows ACL helper wrote to stderr.",
      ),
    );
  });
  child.on("error", (error) => {
    poisonWindowsHelper(
      helper,
      new StoreError("WINDOWS_HELPER_FAILED", error.message),
    );
  });
  const streamError = (error: Error): void => {
    poisonWindowsHelper(
      helper,
      new StoreError("WINDOWS_ACL_FAILED", error.message),
    );
  };
  child.stdin.on("error", streamError);
  child.stdout.on("error", streamError);
  child.stderr.on("error", streamError);
  child.on("close", () => {
    if (!helper.disposed)
      poisonWindowsHelper(
        helper,
        new StoreError("WINDOWS_ACL_FAILED", "Windows ACL helper exited."),
      );
  });
  setHelperRefs(helper, false);
  if (!windowsHelperExitHookInstalled) {
    windowsHelperExitHookInstalled = true;
    process.once("exit", () => {
      activeWindowsHelper?.child.kill();
    });
  }
  return helper;
}

async function executeWindowsHelperRequest(
  items: readonly WindowsHelperRequestItem[],
  bound?: AcquisitionBound,
): Promise<void> {
  assertBound(bound);
  const id = (windowsHelperRequestId += 1);
  const line = encodeWindowsHelperRequest(id, items);
  let helper = activeWindowsHelper;
  if (!helper || helper.disposed) {
    helper = startWindowsHelper();
    activeWindowsHelper = helper;
  }
  const helperProcess = helper;
  if (helperProcess.pending) {
    // Defence in depth: never overwrite an in-flight request. The queue and
    // per-request settlement should make this unreachable.
    const overlap = new StoreError(
      "WINDOWS_ACL_FAILED",
      "Windows ACL helper request overlap.",
    );
    poisonWindowsHelper(helperProcess, overlap);
    throw overlap;
  }
  if (helperProcess.idleTimer) {
    clearTimeout(helperProcess.idleTimer);
    helperProcess.idleTimer = null;
  }
  const remaining = bound
    ? bound.deadline - performance.now()
    : Number.POSITIVE_INFINITY;
  const timeoutMs = Math.min(WINDOWS_HELPER_TIMEOUT_MS, remaining);
  if (timeoutMs <= 0) throw new StoreError("DEADLINE_EXCEEDED");
  const timeoutCode =
    remaining <= WINDOWS_HELPER_TIMEOUT_MS
      ? "DEADLINE_EXCEEDED"
      : "WINDOWS_HELPER_TIMEOUT";
  setHelperRefs(helperProcess, true);
  // ES2022 target: `Promise.withResolvers` is not available.
  await new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      poisonWindowsHelper(helperProcess, new StoreError("ABORTED"));
    };
    const timer = setTimeout(() => {
      poisonWindowsHelper(helperProcess, new StoreError(timeoutCode));
    }, timeoutMs);
    timer.unref?.();
    helperProcess.pending = {
      id,
      itemCount: items.length,
      resolve,
      reject,
      timer,
      ...(bound ? { signal: bound.signal, onAbort } : {}),
    };
    if (bound) {
      if (bound.signal.aborted) {
        onAbort();
        return;
      }
      bound.signal.addEventListener("abort", onAbort, { once: true });
    }
    helperProcess.child.stdin.write(line, (error?: Error | null) => {
      if (error)
        poisonWindowsHelper(
          helperProcess,
          new StoreError("WINDOWS_ACL_FAILED", error.message),
        );
    });
  });
}

async function waitForWindowsHelperTurn(
  predecessor: Promise<unknown>,
  bound?: AcquisitionBound,
): Promise<void> {
  if (!bound) {
    await predecessor;
    return;
  }
  assertBound(bound);
  const remaining = bound.deadline - performance.now();
  if (remaining <= 0) throw new StoreError("DEADLINE_EXCEEDED");
  // ES2022 target: `Promise.withResolvers` is not available.
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: StoreError): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      bound.signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onAbort = (): void => finish(new StoreError("ABORTED"));
    const timer = setTimeout(
      () => finish(new StoreError("DEADLINE_EXCEEDED")),
      remaining,
    );
    timer.unref?.();
    bound.signal.addEventListener("abort", onAbort, { once: true });
    predecessor.then(
      () => finish(),
      () => finish(),
    );
  });
}

function runWindowsHelperItems(
  items: readonly WindowsHelperRequestItem[],
  bound?: AcquisitionBound,
): Promise<void> {
  const predecessor = windowsHelperQueue;
  const run = waitForWindowsHelperTurn(predecessor, bound).then(() =>
    executeWindowsHelperRequest(items, bound),
  );
  // The tail waits for the predecessor as well as this request. A queued
  // caller that gives up must not release the next caller while an earlier
  // request is still in flight on the single helper.
  windowsHelperQueue = Promise.allSettled([predecessor, run]).then(
    () => undefined,
  );
  return run;
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
  await runWindowsHelperItems(
    [{ path: resolved, mode: "establish", itemKind }],
    bound,
  );
}

/**
 * Windows owner-restricted ACL. The helper is a fixed checked-in script:
 * PowerShell receives fixed argv and one JSON request line at a time over the
 * stdio pipes, never interpolated shell source. Missing helper, reparse
 * points, or any failure to establish and verify the DACL is a refusal.
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
  const resolved = resolveRoot(target);
  await runWindowsHelperItems([{ path: resolved, mode: "verify" }], bound);
}

/**
 * Prepare the store root and its layout directories with one helper process.
 * The root is established in its own request first, so a reparse root is
 * refused before any child exists. Missing children are created with exclusive
 * `mkdir`; their establish items are batched ahead of pre-existing verify
 * items. If the batch or planning fails, directories created by this call are
 * removed so a retry cannot inherit an unestablished directory. Existing and
 * raced directories use verify-only, so no pre-existing child is taken over.
 * Called only from the Windows `prepareStore` branch; its filesystem work is
 * platform-neutral so the spawn seam can exercise it on POSIX.
 */
export async function ensureWindowsPrivateStoreLayout(
  root: string,
  directories: readonly string[],
  bound?: AcquisitionBound,
): Promise<string> {
  assertBound(bound);
  const resolved = resolveRoot(root);
  const normalizedDirectories = directories.map((directory) => {
    const candidate = path.normalize(directory);
    const relative = path.relative(resolved, candidate);
    if (
      relative.length === 0 ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      throw new StoreError(
        "UNSAFE_PATH",
        "A store layout directory is outside the store root.",
      );
    return candidate;
  });
  // Root first, on its own request: a junction/reparse root (or ancestor) is
  // refused before any child directory is created under it.
  await runWindowsHelperItems(
    [{ path: resolved, mode: "establish", itemKind: "Directory" }],
    bound,
  );
  const establishItems: WindowsHelperRequestItem[] = [];
  const verifyItems: WindowsHelperRequestItem[] = [];
  const created: Array<{ path: string; identity: DirectoryIdentity }> = [];
  try {
    for (const directory of normalizedDirectories) {
      assertBound(bound);
      const stats = await lstatOrNull(directory);
      if (stats) {
        assertPrivateDirectory(directory, stats);
        verifyItems.push({ path: directory, mode: "verify" });
        continue;
      }
      try {
        await fsp.mkdir(directory, { mode: PRIVATE_DIR_MODE });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const raced = await fsp.lstat(directory);
        assertPrivateDirectory(directory, raced);
        verifyItems.push({ path: directory, mode: "verify" });
        continue;
      }
      const createdStats = await fsp.lstat(directory);
      assertPrivateDirectory(directory, createdStats);
      created.push({ path: directory, identity: identityOf(createdStats) });
      establishItems.push({
        path: directory,
        mode: "establish",
        itemKind: "Directory",
      });
    }
    // Freshly created directories are established before any pre-existing
    // verification can stop the batch.
    if (establishItems.length + verifyItems.length > 0)
      await runWindowsHelperItems([...establishItems, ...verifyItems], bound);
  } catch (error) {
    // Never leave a directory created by this call unestablished: a later
    // prepare would see it as pre-existing and verify-only could lock it out.
    // Remove non-recursively so another process already using the directory is
    // never deleted; a non-empty directory is left in place.
    const cleanupErrors: unknown[] = [];
    for (const entry of created) {
      try {
        const stats = await lstatOrNull(entry.path);
        if (!stats) continue;
        if (
          stats.isSymbolicLink() ||
          !stats.isDirectory() ||
          Number(stats.dev) !== entry.identity.dev ||
          Number(stats.ino) !== entry.identity.ino
        )
          continue;
        await fsp.rmdir(entry.path);
      } catch (cleanupError) {
        const code = (cleanupError as NodeJS.ErrnoException).code;
        if (code === "ENOTEMPTY" || code === "EEXIST" || code === "ENOENT")
          continue;
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      const cause =
        cleanupErrors.length === 1 ? cleanupErrors[0] : cleanupErrors;
      if (error instanceof StoreError) error.cause = cause;
      else if (error !== null && typeof error === "object")
        Object.assign(error, { cause });
    }
    throw error;
  }
  for (const entry of created) {
    const after = await lstatOrNull(entry.path);
    if (
      !after ||
      after.isSymbolicLink() ||
      !after.isDirectory() ||
      Number(after.dev) !== entry.identity.dev ||
      Number(after.ino) !== entry.identity.ino
    )
      throw new StoreError(
        "PATH_CHANGED",
        "Directory identity changed during ACL establishment.",
      );
  }
  return resolved;
}
