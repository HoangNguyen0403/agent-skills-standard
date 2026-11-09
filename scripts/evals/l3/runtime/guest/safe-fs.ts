/**
 * scripts/evals/l3/runtime/guest/safe-fs.ts
 *
 * Descriptor-anchored, no-follow, bounded reads of candidate-controlled state.
 *
 * Two anchoring strategies are implemented and both are genuinely anchored:
 *
 * - **Descriptor chain (Linux)**: every component is opened relative to the
 *   previous *descriptor* (`<fdRoot>/<fd>/<segment>`), so a renamed or re-pointed
 *   ancestor cannot redirect traversal after it was validated. The final
 *   directory of a listing is opened as a descriptor too — enumerating a parent
 *   descriptor would report the parent's entries, not the target's.
 * - **Path anchor (Darwin)**: `O_NOFOLLOW_ANY` (0x20000000) refuses the open when
 *   *any* component is a symbolic link, which removes the ancestor race without a
 *   second path-based check.
 *
 * Any other platform fails closed: there is no lstat-then-open fallback, because
 * that sequence is racy and would silently downgrade the guarantee.
 *
 * `anchorOptions` exists so the descriptor-chain strategy can be exercised on a
 * development host through its own descriptor root (`/dev/fd` on macOS behaves
 * like `/proc/self/fd` on Linux). It runs the same code the guest runs; only the
 * descriptor root differs. Production callers use the defaults.
 *
 * Reads are bounded three ways: the descriptor must be a regular file (a FIFO or
 * device is refused after `fstat`, which is only reachable because the file is
 * opened `O_NONBLOCK`), the link count must be 1, and the byte count is verified
 * before and after the read so a growing file cannot escape its ceiling.
 */

import { constants, type Dir } from "node:fs";
import { opendir, open, realpath, type FileHandle } from "node:fs/promises";
import path from "node:path";

/** `O_NOFOLLOW_ANY` is not exported by Node's `fs.constants`, so name the constant. */
const DARWIN_O_NOFOLLOW_ANY = 0x2_000_0000;

export interface AnchorOptions {
  /** Anchoring strategy to use. Defaults to the running platform. */
  readonly platform?: "linux" | "darwin";
  /** Descriptor path prefix for the chain strategy. Defaults per platform. */
  readonly fd_root?: string;
  /** Refuse a directory before allocating beyond this many entry facts. */
  readonly max_entries?: number;
}

interface ResolvedAnchor {
  readonly platform: "linux" | "darwin";
  readonly fd_root: string;
}

function resolveAnchor(options: AnchorOptions | undefined): ResolvedAnchor {
  const platform = options?.platform ?? process.platform;
  if (platform !== "linux" && platform !== "darwin") {
    throw new Error(
      `no descriptor-anchored traversal is implemented for platform '${String(platform)}'; refusing to fall back to a racy path walk`,
    );
  }
  const fd_root = options?.fd_root ?? (platform === "linux" ? "/proc/self/fd" : "/dev/fd");
  if (!fd_root.startsWith("/")) throw new Error("fd_root must be an absolute path");
  return { platform, fd_root };
}

function directoryFlags(anchor: ResolvedAnchor): number {
  if (anchor.platform === "darwin") {
    return constants.O_RDONLY | constants.O_NONBLOCK | constants.O_DIRECTORY | DARWIN_O_NOFOLLOW_ANY;
  }
  return constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
}

function fileFlags(anchor: ResolvedAnchor): number {
  if (anchor.platform === "darwin") {
    // O_NOFOLLOW_ANY already implies no-follow on every component; combining it
    // with O_NOFOLLOW is rejected by the kernel (EINVAL).
    return constants.O_RDONLY | constants.O_NONBLOCK | DARWIN_O_NOFOLLOW_ANY;
  }
  return constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
}

function validateSegments(segments: readonly string[]): void {
  if (segments.length === 0) throw new Error("invalid bounded file read");
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      path.isAbsolute(segment) ||
      segment.includes(path.sep) ||
      segment.includes("\u0000")
    ) {
      throw new Error(`unsafe path segment: ${JSON.stringify(segment.slice(0, 64))}`);
    }
  }
}

/**
 * Resolves the *caller-supplied root* once. The root is trusted configuration
 * (the state directory), and on hosts whose temporary directory is itself reached
 * through a symlink a strict no-follow open of the whole path would fail for a
 * reason that has nothing to do with the candidate. Everything below the resolved
 * root stays anchored.
 */
async function resolveRoot(root: string): Promise<string> {
  return await realpath(root);
}

/**
 * Opens the directory named by `segments`, each component anchored to the
 * previous descriptor. The returned handle is the *target* directory.
 */
async function openAnchoredDirectory(
  root: string,
  segments: readonly string[],
  anchor: ResolvedAnchor,
): Promise<FileHandle[]> {
  const handles: FileHandle[] = [];
  try {
    handles.push(await open(await resolveRoot(root), directoryFlags(anchor)));
    if (anchor.platform === "linux") {
      for (const segment of segments) {
        const parent = handles[handles.length - 1];
        if (parent === undefined) throw new Error("directory traversal lost its parent descriptor");
        handles.push(await open(`${anchor.fd_root}/${parent.fd}/${segment}`, directoryFlags(anchor)));
      }
    } else if (segments.length > 0) {
      handles.push(await open(path.join(await resolveRoot(root), ...segments), directoryFlags(anchor)));
    }
    return handles;
  } catch (error) {
    await Promise.all(handles.reverse().map((handle) => handle.close().catch(() => undefined)));
    throw error;
  }
}

async function openFinalFile(
  root: string,
  segments: readonly string[],
  parents: readonly FileHandle[],
  anchor: ResolvedAnchor,
): Promise<FileHandle> {
  const filename = segments[segments.length - 1];
  if (filename === undefined) throw new Error("missing final file segment");
  if (anchor.platform === "linux") {
    const parent = parents[parents.length - 1];
    if (parent === undefined) throw new Error("file traversal lost its parent descriptor");
    return await open(`${anchor.fd_root}/${parent.fd}/${filename}`, fileFlags(anchor));
  }
  return await open(path.join(await resolveRoot(root), ...segments), fileFlags(anchor));
}

async function readBounded(file: FileHandle, maxBytes: number): Promise<Buffer> {
  const info = await file.stat();
  if (!info.isFile()) throw new Error("snapshot target is not a regular file");
  if (info.nlink !== 1) throw new Error("snapshot target has a hard link and is not a frozen snapshot");
  if (info.size <= 0) throw new Error("snapshot target is empty");
  if (info.size > maxBytes) throw new Error(`snapshot target exceeds ${maxBytes} bytes`);
  const body = Buffer.alloc(info.size);
  let totalRead = 0;
  while (totalRead < info.size) {
    const { bytesRead } = await file.read(body, totalRead, info.size - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  if (totalRead !== info.size) throw new Error("snapshot changed size while being read");
  const extra = Buffer.alloc(1);
  const { bytesRead: extraRead } = await file.read(extra, 0, 1, info.size);
  if (extraRead > 0) throw new Error("snapshot grew beyond checked size");
  return body;
}

/** Opens each segment relative to the preceding descriptor; symlinks cannot redirect traversal. */
export async function readRegularFileBeneath(
  root: string,
  segments: readonly string[],
  maxBytes: number,
  options?: AnchorOptions,
): Promise<Buffer> {
  const anchor = resolveAnchor(options);
  validateSegments(segments);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("invalid bounded file read");
  }

  const handles = await openAnchoredDirectory(root, segments.slice(0, -1), anchor);
  try {
    const file = await openFinalFile(root, segments, handles, anchor);
    handles.push(file);
    return await readBounded(file, maxBytes);
  } finally {
    await Promise.all(handles.reverse().map((handle) => handle.close().catch(() => undefined)));
  }
}

export interface DirectoryEntryFact {
  readonly name: string;
  readonly is_file: boolean;
  readonly is_directory: boolean;
}

/**
 * Lists the anchored directory `segments` names (not its parent). `null` means the
 * directory does not exist; a symbolic link entry is refused.
 */
export async function listDirectoryBeneath(
  root: string,
  segments: readonly string[],
  options?: AnchorOptions,
): Promise<readonly DirectoryEntryFact[] | null> {
  const anchor = resolveAnchor(options);
  const maxEntries = options?.max_entries;
  if (maxEntries !== undefined && (!Number.isSafeInteger(maxEntries) || maxEntries <= 0)) {
    throw new Error("max_entries must be a positive safe integer");
  }
  if (segments.length === 0) throw new Error("invalid directory listing");
  validateSegments(segments);

  const entries: DirectoryEntryFact[] = [];
  let handles: FileHandle[] = [];
  let directory: Dir | null = null;
  try {
    handles = await openAnchoredDirectory(root, segments, anchor);
    const target = handles[handles.length - 1];
    if (target === undefined) throw new Error("directory traversal produced no descriptor");
    const info = await target.stat();
    if (!info.isDirectory()) throw new Error("snapshot descriptor is not a directory");
    // Enumerate the *target* descriptor, never its parent.
    directory = await opendir(anchor.platform === "linux" ? `${anchor.fd_root}/${target.fd}` : path.join(await resolveRoot(root), ...segments));
    for await (const entry of directory) {
      if (entry.isSymbolicLink()) {
        throw new Error(`snapshot directory contains a symbolic link entry: ${entry.name}`);
      }
      if (maxEntries !== undefined && entries.length >= maxEntries) {
        throw new Error(`snapshot directory entry count exceeds ${maxEntries}`);
      }
      entries.push({ name: entry.name, is_file: entry.isFile(), is_directory: entry.isDirectory() });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  } finally {
    await directory?.close().catch(() => undefined);
    await Promise.all(handles.reverse().map((handle) => handle.close().catch(() => undefined)));
  }
  return entries;
}
