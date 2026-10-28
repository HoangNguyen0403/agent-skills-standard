// scripts/test-assurance/io.ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Artifact, ValidationIssue } from "./types";

export const MAX_JSON_BYTES = 1024 * 1024; // 1 MiB
export const MAX_EVIDENCE_ARTIFACT_BYTES = 1024 * 1024; // 1 MiB
export const MAX_REPO_INPUT_BYTES = 16 * 1024 * 1024; // 16 MiB

// Per-snapshot bounds across all groups (SRS §6 Addendum)
export const MAX_SELECTED_ROOTS_PER_SNAPSHOT = 128;
export const MAX_INPUT_FILES_PER_SNAPSHOT = 10000;
export const MAX_VISITED_ENTRIES_PER_SNAPSHOT = 20000;
export const MAX_DIRECTORY_DEPTH = 64;

export const MAX_EXECUTION_ARTIFACTS = 32;

export type ReadResult =
  | { ok: true; buffer: Buffer; stat: fs.Stats }
  | { ok: false; code: "ENOENT" | "UNSAFE_PATH" | "INPUT_TOO_LARGE" | "IO_ERROR" };

export function compareLexicographical(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function isSha256(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{64}$/.test(val);
}

export function isCommitHex(val: unknown): val is string {
  return typeof val === "string" && (/^[0-9a-f]{40}$/.test(val) || /^[0-9a-f]{64}$/.test(val));
}

export function isEnoentError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}

export function sameFileIdentity(left: fs.BigIntStats, right: fs.BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

const DIAGNOSTIC_PATH_MAX_LENGTH = 512;

// SEC-4: control characters (newline, ESC, C0/C1) are never valid in emitted text
export function hasControlCharacters(value: string): boolean {
  return /[\x00-\x1f\x7f-\x9f]/.test(value);
}

// SEC-4: filesystem-derived names enter diagnostics only encoded and bounded
export function sanitizeDiagnosticPath(value: string): string {
  const encoded = value.replace(/[\x00-\x1f\x7f-\x9f]/g, (ch) =>
    "\\x" + ch.charCodeAt(0).toString(16).padStart(2, "0"),
  );
  return encoded.length > DIAGNOSTIC_PATH_MAX_LENGTH
    ? encoded.slice(0, DIAGNOSTIC_PATH_MAX_LENGTH) + "…"
    : encoded;
}

export function validateRelativePathSecurity(relPath: string): { ok: true } | { ok: false; code: "UNSAFE_PATH" } {
  if (typeof relPath !== "string" || relPath.length === 0) {
    return { ok: false, code: "UNSAFE_PATH" };
  }
  // Reject NUL and control characters (newline, CR, ESC, tabs, C0/C1)
  if (
    hasControlCharacters(relPath) ||
    relPath.includes("\\") ||
    relPath.startsWith("/") ||
    /^[A-Za-z]:/.test(relPath) ||
    relPath.includes("%") ||
    relPath.includes("?") ||
    relPath.includes("#")
  ) {
    return { ok: false, code: "UNSAFE_PATH" };
  }
  const segments = relPath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return { ok: false, code: "UNSAFE_PATH" };
  }
  return { ok: true };
}

export function inspectContainedPath(
  authorityRoot: string,
  relPath: string,
  expectedKind: "file" | "dir" | "any" = "any",
): { ok: true; canonical: string; stat: fs.Stats } | { ok: false; code: "ENOENT" | "UNSAFE_PATH" | "IO_ERROR" } {
  const pathCheck = validateRelativePathSecurity(relPath);
  if (!pathCheck.ok) return { ok: false, code: "UNSAFE_PATH" };

  const segments = relPath.split("/");
  let current = path.resolve(authorityRoot);
  try {
    for (let i = 0; i < segments.length; i++) {
      current = path.join(current, segments[i]);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(current);
      } catch (err: unknown) {
        if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
        return { ok: false, code: "IO_ERROR" };
      }
      if (stat.isSymbolicLink()) {
        return { ok: false, code: "UNSAFE_PATH" };
      }
      // SEC-2: Reject special files (FIFOs, sockets, devices) without opening
      if (!stat.isFile() && !stat.isDirectory()) {
        return { ok: false, code: "UNSAFE_PATH" };
      }
      const isLeaf = i === segments.length - 1;
      if (!isLeaf && !stat.isDirectory()) {
        return { ok: false, code: "UNSAFE_PATH" };
      }
      if (isLeaf) {
        if (expectedKind === "file" && !stat.isFile()) return { ok: false, code: "UNSAFE_PATH" };
        if (expectedKind === "dir" && !stat.isDirectory()) return { ok: false, code: "UNSAFE_PATH" };
      }
    }
    const canonical = fs.realpathSync(current);
    const resolvedAuth = fs.realpathSync(authorityRoot);
    const relCheck = path.relative(resolvedAuth, canonical);
    if (relCheck.startsWith(`..${path.sep}`) || relCheck === ".." || path.isAbsolute(relCheck)) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    return { ok: true, canonical, stat: fs.lstatSync(current) };
  } catch (err: unknown) {
    if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
    return { ok: false, code: "IO_ERROR" };
  }
}

export function readContainedRegularFile(
  authorityRoot: string,
  relPath: string,
  maxBytes: number,
): ReadResult {
  const inspected = inspectContainedPath(authorityRoot, relPath, "file");
  if (!inspected.ok) return inspected;

  const targetPath = inspected.canonical;
  let fd: number | undefined;
  try {
    const noFollow = fs.constants.O_NOFOLLOW;
    const nonBlocking = fs.constants.O_NONBLOCK;
    const beforeStat = fs.lstatSync(targetPath, { bigint: true });
    if (beforeStat.isSymbolicLink() || !beforeStat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (beforeStat.size > BigInt(maxBytes)) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }

    fd = fs.openSync(targetPath, fs.constants.O_RDONLY | noFollow | nonBlocking);
    const openedStat = fs.fstatSync(fd, { bigint: true });
    if (!openedStat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (openedStat.size > BigInt(maxBytes)) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }
    if (!sameFileIdentity(beforeStat, openedStat)) {
      return { ok: false, code: "IO_ERROR" };
    }

    const expectedSize = Number(openedStat.size);
    const buffer = Buffer.alloc(expectedSize + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(fd, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > maxBytes) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }
    if (bytesRead !== expectedSize) {
      return { ok: false, code: "IO_ERROR" };
    }

    const afterDescriptor = fs.fstatSync(fd, { bigint: true });
    const afterStat = fs.lstatSync(targetPath, { bigint: true });
    if (!sameFileIdentity(openedStat, afterDescriptor) || !sameFileIdentity(openedStat, afterStat)) {
      return { ok: false, code: "IO_ERROR" };
    }

    return { ok: true, buffer: buffer.subarray(0, bytesRead), stat: fs.lstatSync(targetPath) };
  } catch (err: unknown) {
    if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
    return { ok: false, code: "IO_ERROR" };
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

// SEC-5: Caller-selected JSON read with pre- and post-read descriptor and path identity checks
export function readCallerRegularFile(filePath: string, maxBytes: number): ReadResult {
  const absPath = path.resolve(filePath);
  let fd: number | undefined;
  try {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(absPath);
    } catch (err: unknown) {
      if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
      return { ok: false, code: "IO_ERROR" };
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (stat.size > maxBytes) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }

    const beforeStat = fs.lstatSync(absPath, { bigint: true });
    fd = fs.openSync(absPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const openedStat = fs.fstatSync(fd, { bigint: true });
    if (!openedStat.isFile() || !sameFileIdentity(beforeStat, openedStat)) {
      return { ok: false, code: "IO_ERROR" };
    }
    if (openedStat.size > BigInt(maxBytes)) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }

    const expectedSize = Number(openedStat.size);
    const buffer = Buffer.alloc(expectedSize + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(fd, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > maxBytes) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }
    if (bytesRead !== expectedSize) {
      return { ok: false, code: "IO_ERROR" };
    }

    // SEC-5 post-read identity checks
    const afterDescriptor = fs.fstatSync(fd, { bigint: true });
    let afterStat: fs.BigIntStats;
    try {
      afterStat = fs.lstatSync(absPath, { bigint: true });
    } catch {
      return { ok: false, code: "IO_ERROR" };
    }
    if (afterStat.isSymbolicLink() || !afterStat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (!sameFileIdentity(openedStat, afterDescriptor) || !sameFileIdentity(openedStat, afterStat)) {
      return { ok: false, code: "IO_ERROR" };
    }

    return { ok: true, buffer: buffer.subarray(0, bytesRead), stat };
  } catch (err: unknown) {
    if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
    return { ok: false, code: "IO_ERROR" };
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

// SEC-1-R2: component-aware ancestor test. A raw lexicographic adjacency scan misses
// overlaps hidden behind an interleaved sibling (["src","src-aux","src/nested"]).
// Every root here is already a validated relative slash path (no empty segments), so
// each "/" boundary defines a real path component boundary. Roots are pre-bounded to
// MAX_SELECTED_ROOTS_PER_SNAPSHOT and the whole JSON document to 1 MiB, so the total
// prefix work is linear in document size.
export function hasOverlappingRoots(roots: string[]): boolean {
  if (roots.length <= 1) return false;
  const rootSet = new Set(roots);
  if (rootSet.size !== roots.length) {
    return true;
  }
  for (const root of rootSet) {
    let boundary = root.indexOf("/");
    while (boundary !== -1) {
      if (rootSet.has(root.slice(0, boundary))) {
        return true;
      }
      boundary = root.indexOf("/", boundary + 1);
    }
  }
  return false;
}

export type TraversalBudget = {
  visitedEntries: number;
  files: number;
};

export function recomputeRepositoryCategoryInventory(
  repoRoot: string,
  roots: string[],
  budget: TraversalBudget,
  issues: ValidationIssue[],
  visitedPaths: Set<string>,
): { ok: true; files: Artifact[] } | { ok: false; isStale: boolean; isInvalid: boolean } {
  const resultFiles: Artifact[] = [];

  for (const rootRel of roots) {
    const depth = rootRel.split("/").length;
    if (depth > MAX_DIRECTORY_DEPTH) {
      issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Directory depth exceeded bound" });
      return { ok: false, isStale: false, isInvalid: true };
    }

    budget.visitedEntries++;
    if (budget.visitedEntries > MAX_VISITED_ENTRIES_PER_SNAPSHOT) {
      issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Visited filesystem entries exceeded bound" });
      return { ok: false, isStale: false, isInvalid: true };
    }

    const inspected = inspectContainedPath(repoRoot, rootRel, "any");
    if (!inspected.ok) {
      if (inspected.code === "ENOENT") {
        return { ok: false, isStale: true, isInvalid: false };
      }
      issues.push({
        code: inspected.code === "UNSAFE_PATH" ? "UNSAFE_PATH" : "UNREADABLE_INPUT",
        path: sanitizeDiagnosticPath(rootRel),
        message: "Unsafe or unreadable root path in repository",
      });
      return { ok: false, isStale: false, isInvalid: true };
    }

    if (inspected.stat.isFile()) {
      if (!visitedPaths.has(rootRel)) {
        visitedPaths.add(rootRel);
        budget.files++;
        if (budget.files > MAX_INPUT_FILES_PER_SNAPSHOT) {
          issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Total input files exceeded bound" });
          return { ok: false, isStale: false, isInvalid: true };
        }
        const readRes = readContainedRegularFile(repoRoot, rootRel, MAX_REPO_INPUT_BYTES);
        if (!readRes.ok) {
          if (readRes.code === "ENOENT") return { ok: false, isStale: true, isInvalid: false };
          issues.push({
            code: readRes.code === "INPUT_TOO_LARGE" ? "INPUT_TOO_LARGE" : "UNREADABLE_INPUT",
            path: sanitizeDiagnosticPath(rootRel),
            message: "Cannot read repository input file",
          });
          return { ok: false, isStale: false, isInvalid: true };
        }
        resultFiles.push({ path: rootRel, sha256: computeSha256(readRes.buffer) });
      }
    } else if (inspected.stat.isDirectory()) {
      // Incremental directory enumeration using opendirSync
      const stack: { rel: string; depth: number }[] = [{ rel: rootRel, depth }];

      while (stack.length > 0) {
        const current = stack.pop()!;
        const dirInspected = inspectContainedPath(repoRoot, current.rel, "dir");
        if (!dirInspected.ok) {
          if (dirInspected.code === "ENOENT") return { ok: false, isStale: true, isInvalid: false };
          issues.push({ code: "UNREADABLE_INPUT", path: sanitizeDiagnosticPath(current.rel), message: "Directory traversal failed" });
          return { ok: false, isStale: false, isInvalid: true };
        }

        let dir: fs.Dir | null = null;
        try {
          dir = fs.opendirSync(dirInspected.canonical);
          let dirent: fs.Dirent | null = null;
          while ((dirent = dir.readSync()) !== null) {
            budget.visitedEntries++;
            if (budget.visitedEntries > MAX_VISITED_ENTRIES_PER_SNAPSHOT) {
              issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Visited filesystem entries exceeded bound" });
              return { ok: false, isStale: false, isInvalid: true };
            }

            const entryRel = `${current.rel}/${dirent.name}`;
            if (dirent.isSymbolicLink()) {
              issues.push({ code: "UNSAFE_PATH", path: sanitizeDiagnosticPath(entryRel), message: "Symlink encountered in repository tree" });
              return { ok: false, isStale: false, isInvalid: true };
            }

            // SEC-2: Reject special files (FIFOs, sockets, block/char devices)
            if (!dirent.isFile() && !dirent.isDirectory()) {
              issues.push({ code: "UNSAFE_PATH", path: sanitizeDiagnosticPath(entryRel), message: "Special file encountered in repository tree" });
              return { ok: false, isStale: false, isInvalid: true };
            }

            if (dirent.isDirectory()) {
              const childDepth = current.depth + 1;
              if (childDepth > MAX_DIRECTORY_DEPTH) {
                issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Directory depth exceeded bound" });
                return { ok: false, isStale: false, isInvalid: true };
              }
              stack.push({ rel: entryRel, depth: childDepth });
            } else if (dirent.isFile()) {
              if (!visitedPaths.has(entryRel)) {
                visitedPaths.add(entryRel);
                budget.files++;
                if (budget.files > MAX_INPUT_FILES_PER_SNAPSHOT) {
                  issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Total input files exceeded bound" });
                  return { ok: false, isStale: false, isInvalid: true };
                }
                const fileRead = readContainedRegularFile(repoRoot, entryRel, MAX_REPO_INPUT_BYTES);
                if (!fileRead.ok) {
                  if (fileRead.code === "ENOENT") return { ok: false, isStale: true, isInvalid: false };
                  issues.push({
                    code: fileRead.code === "INPUT_TOO_LARGE" ? "INPUT_TOO_LARGE" : "UNREADABLE_INPUT",
                    path: sanitizeDiagnosticPath(entryRel),
                    message: "Repository file read failed or exceeded limit",
                  });
                  return { ok: false, isStale: false, isInvalid: true };
                }
                resultFiles.push({ path: entryRel, sha256: computeSha256(fileRead.buffer) });
              }
            }
          }
        } catch {
          issues.push({ code: "UNREADABLE_INPUT", path: sanitizeDiagnosticPath(current.rel), message: "Directory enumeration failed" });
          return { ok: false, isStale: false, isInvalid: true };
        } finally {
          if (dir !== null) {
            try {
              dir.closeSync();
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  resultFiles.sort((a, b) => compareLexicographical(a.path, b.path));
  return { ok: true, files: resultFiles };
}
