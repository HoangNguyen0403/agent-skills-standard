import { constants, type Stats } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { ConsentRecord } from "./consent";
import {
  DEFAULT_LIMITS,
  localManifestSchema,
  type LocalManifest,
  type NodeKey,
} from "./contracts";
import { isPathInside } from "./discovery";
import { RetrospectiveError } from "./errors";

/**
 * Local, consent-bound ingress for an explicitly authorized session manifest.
 *
 * The manifest is a human declaration of scope, not authenticated host
 * inventory: `provenance` records what the file claims and never upgrades that
 * claim. Only `local-allowed` nodes with an absolute source inside a consented
 * root are read; every other disposition stays a visible, unread gap.
 */

const READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;

/** Read state attached to one declared node. */
export type ResolvedNodeState =
  | "readable"
  | "missing"
  | "restricted"
  | "unavailable"
  | "remote-not-authorized";

export type ResolvedManifestNode = {
  key: NodeKey;
  parent: NodeKey | null;
  disposition: LocalManifest["nodes"][number]["disposition"];
  label: string | null;
  sourceFormat: "omp" | "codex";
  state: ResolvedNodeState;
  /** Canonical absolute path only for a readable local node. */
  absolutePath: string | null;
};

export type ManifestPreparation = {
  manifest: LocalManifest;
  nodes: ResolvedManifestNode[];
  mainFile: string | null;
};

function invalid(code: string, message: string): RetrospectiveError {
  return new RetrospectiveError(code, message);
}

/**
 * `realpath` of the deepest existing ancestor with the remaining segments
 * appended. Only a confirmed absent suffix is allowed to stay lexical; a
 * dangling link, link loop, non-directory component or I/O failure refuses.
 */
async function canonicalOrSelf(target: string): Promise<string> {
  try {
    return await fsp.realpath(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code !== "ENOENT") {
      throw invalid("UNSAFE_SOURCE_PATH", "Source path cannot be resolved");
    }
    let entryExists = true;
    try {
      await fsp.lstat(target);
    } catch (inner) {
      if ((inner as NodeJS.ErrnoException | null)?.code !== "ENOENT") {
        throw invalid("UNSAFE_SOURCE_PATH", "Source path cannot be resolved");
      }
      entryExists = false;
    }
    if (entryExists) {
      throw invalid("UNSAFE_SOURCE_PATH", "Source path cannot be resolved");
    }
    const parent = path.dirname(target);
    if (parent === target) {
      throw invalid("UNSAFE_SOURCE_PATH", "Source path cannot be resolved");
    }
    const parentReal = await canonicalOrSelf(parent);
    return path.join(parentReal, path.basename(target));
  }
}

async function lstatOrNull(target: string): Promise<Stats | null> {
  try {
    return await fsp.lstat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
      return null;
    }
    throw invalid("UNSAFE_SOURCE_PATH", "Source path cannot be inspected");
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw invalid("ABORTED", "Manifest ingress was aborted");
  }
}

/**
 * Reads and validates one explicit manifest file only after proving it lies
 * inside a consented source root, lexically and after canonicalization. The
 * descriptor refuses symlinks and enforces a hard byte ceiling. A manifest
 * claiming host origin is refused: this process cannot authenticate that claim,
 * so accepting it would launder an unproven provenance string into trusted
 * inventory.
 */
export async function readManifestFile(
  manifestPath: string,
  consent: ConsentRecord,
  platform: NodeJS.Platform = process.platform,
  signal?: AbortSignal,
): Promise<LocalManifest> {
  throwIfAborted(signal);
  if (!path.isAbsolute(manifestPath) || manifestPath.includes("\0")) {
    throw invalid("INVALID_MANIFEST_PATH", "Manifest path must be absolute");
  }
  const isWin = platform === "win32";
  if (
    !consent.allowedSourceRoots.some((root) =>
      isPathInside(manifestPath, root, isWin),
    )
  ) {
    throw invalid(
      "UNSAFE_MANIFEST_PATH",
      "Manifest is outside the consented roots",
    );
  }
  const canonicalManifest = await canonicalOrSelf(manifestPath);
  const canonicalRoots: string[] = [];
  for (const root of consent.allowedSourceRoots) {
    canonicalRoots.push(await canonicalOrSelf(root));
  }
  if (
    !canonicalRoots.some((root) => isPathInside(canonicalManifest, root, isWin))
  ) {
    throw invalid(
      "UNSAFE_MANIFEST_PATH",
      "Manifest resolves outside the consented roots",
    );
  }

  const stats = await lstatOrNull(canonicalManifest);
  if (stats === null) {
    throw invalid("MANIFEST_NOT_FOUND", "Manifest file does not exist");
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw invalid("UNSAFE_MANIFEST_PATH", "Manifest must be a regular file");
  }
  if (stats.size > DEFAULT_LIMITS.manifestBytes) {
    throw invalid("MANIFEST_TOO_LARGE", "Manifest exceeds the size limit");
  }

  const handle = await fsp.open(canonicalManifest, READ_FLAGS);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size > DEFAULT_LIMITS.manifestBytes) {
      throw invalid("MANIFEST_TOO_LARGE", "Manifest exceeds the size limit");
    }
    const raw = await handle.readFile("utf8");
    throwIfAborted(signal);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw invalid("INVALID_MANIFEST", "Manifest is not valid JSON");
    }
    const result = localManifestSchema.safeParse(parsed);
    if (!result.success) {
      throw invalid("INVALID_MANIFEST", "Manifest does not match the schema");
    }
    if (result.data.provenance !== "user-supplied") {
      throw invalid(
        "UNVERIFIED_MANIFEST_PROVENANCE",
        "An explicit manifest must declare user-supplied provenance",
      );
    }
    return result.data;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

function parentChainDepth(manifest: LocalManifest, key: NodeKey): number {
  const byKey = new Map<string, LocalManifest["nodes"][number]>();
  for (const node of manifest.nodes) {
    byKey.set(`${node.key.hostId}\u0000${node.key.sessionId}`, node);
  }
  let depth = 0;
  let cursor = byKey.get(`${key.hostId}\u0000${key.sessionId}`);
  while (cursor && cursor.parent !== null) {
    depth += 1;
    cursor = byKey.get(
      `${cursor.parent.hostId}\u0000${cursor.parent.sessionId}`,
    );
  }
  return depth;
}

const MAX_HEADER_BYTES = 65_536;
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

type NativeHeader =
  { kind: "session"; id: string } | { kind: "absent" } | { kind: "invalid" };

/**
 * Reads only the first row to prove the declared source is the declared session
 * in the declared format. Bounded, `O_NOFOLLOW`, never used for aggregation.
 */
async function readNativeHeader(
  sourcePath: string,
  format: "omp" | "codex",
): Promise<NativeHeader> {
  const handle = await fsp.open(sourcePath, READ_FLAGS).catch(() => null);
  if (!handle) return { kind: "absent" };
  try {
    const stats = await handle.stat().catch(() => null);
    if (!stats || !stats.isFile()) return { kind: "absent" };
    const length = Math.min(stats.size, MAX_HEADER_BYTES);
    if (length === 0) return { kind: "absent" };
    const buffer = Buffer.alloc(Number(length));
    const read = await handle.read(buffer, 0, buffer.length, 0);
    const text = buffer.subarray(0, read.bytesRead).toString("utf8");
    const rows = text.split("\n");
    let row: Record<string, unknown> | null = null;
    for (const line of rows) {
      if (line.trim().length === 0) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        return { kind: "invalid" };
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return { kind: "invalid" };
      }
      const candidate = parsed as Record<string, unknown>;
      if (candidate.type === "title" && candidate.v === 1 && row === null) {
        continue;
      }
      row = candidate;
      break;
    }
    if (row === null) return { kind: "absent" };

    // Only the documented structural title-v1 preamble is ignored; its text
    // is never used as session identity or exported.

    if (format === "omp") {
      if (row.type !== "session") return { kind: "invalid" };
      return typeof row.id === "string" && SESSION_ID_PATTERN.test(row.id)
        ? { kind: "session", id: row.id }
        : { kind: "invalid" };
    }
    if (row.type !== "session_meta") return { kind: "invalid" };
    const payload = row.payload;
    if (typeof payload !== "object" || payload === null) {
      return { kind: "invalid" };
    }
    const id = (payload as Record<string, unknown>).id;
    return typeof id === "string" && SESSION_ID_PATTERN.test(id)
      ? { kind: "session", id }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  } finally {
    await handle.close().catch(() => undefined);
  }
}

/**
 * Resolves every declared node against the consented source roots.
 *
 * Fail-closed refusals: a local source outside every consented root, a symlink
 * alias, a duplicate source read twice under two identities, or a canonical
 * path that cannot be established. A confirmed absent source is a recorded
 * `missing` gap, not a read and not a refusal.
 */
export async function resolveManifestNodes(
  manifest: LocalManifest,
  consent: ConsentRecord,
  platform: NodeJS.Platform = process.platform,
  signal?: AbortSignal,
): Promise<ManifestPreparation> {
  throwIfAborted(signal);
  const isWin = platform === "win32";
  const canonicalRoots: string[] = [];
  for (const root of consent.allowedSourceRoots) {
    canonicalRoots.push(await canonicalOrSelf(root));
  }

  const seenSources = new Set<string>();
  const resolved: ResolvedManifestNode[] = [];
  let mainFile: string | null = null;

  for (const node of manifest.nodes) {
    throwIfAborted(signal);
    if (node.disposition !== "local-allowed") {
      resolved.push({
        key: node.key,
        parent: node.parent,
        disposition: node.disposition,
        label: node.label ?? null,
        sourceFormat: node.source?.format ?? "omp",
        state:
          node.disposition === "restricted"
            ? "restricted"
            : node.disposition === "unavailable"
              ? "unavailable"
              : "remote-not-authorized",
        absolutePath: null,
      });
      continue;
    }

    const source = node.source;
    if (source === null) {
      throw invalid("INVALID_MANIFEST", "Local node is missing its source");
    }
    const declared = source.absolutePath;
    const lexicalAllowed = consent.allowedSourceRoots.some((root) =>
      isPathInside(declared, root, isWin),
    );
    if (!lexicalAllowed) {
      throw invalid(
        "UNSAFE_SOURCE_PATH",
        "Declared source is outside the consented roots",
      );
    }

    const canonical = await canonicalOrSelf(declared);
    const canonicalAllowed = canonicalRoots.some((root) =>
      isPathInside(canonical, root, isWin),
    );
    if (!canonicalAllowed) {
      throw invalid(
        "UNSAFE_SOURCE_PATH",
        "Declared source resolves outside the consented roots",
      );
    }
    if (seenSources.has(canonical)) {
      throw invalid(
        "DUPLICATE_SOURCE",
        "Two declared actors name the same source file",
      );
    }
    seenSources.add(canonical);

    if (parentChainDepth(manifest, node.key) > DEFAULT_LIMITS.depth) {
      throw invalid("MANIFEST_TOO_DEEP", "Manifest nesting exceeds the limit");
    }

    const stats = await lstatOrNull(canonical);
    if (stats === null) {
      resolved.push({
        key: node.key,
        parent: node.parent,
        disposition: node.disposition,
        label: node.label ?? null,
        sourceFormat: source.format,
        state: "missing",
        absolutePath: null,
      });
      continue;
    }
    if (stats.isSymbolicLink()) {
      throw invalid("UNSAFE_SOURCE_PATH", "Declared source is a symlink");
    }
    if (!stats.isFile()) {
      resolved.push({
        key: node.key,
        parent: node.parent,
        disposition: node.disposition,
        label: node.label ?? null,
        sourceFormat: source.format,
        state: "unavailable",
        absolutePath: null,
      });
      continue;
    }

    const header = await readNativeHeader(canonical, source.format);
    if (header.kind === "invalid") {
      throw invalid(
        "SESSION_HEADER_INVALID",
        "Declared source is not a native session in the declared format",
      );
    }
    if (header.kind === "absent") {
      resolved.push({
        key: node.key,
        parent: node.parent,
        disposition: node.disposition,
        label: node.label ?? null,
        sourceFormat: source.format,
        state: "unavailable",
        absolutePath: null,
      });
      continue;
    }
    if (header.id !== node.key.sessionId) {
      throw invalid(
        "SESSION_ID_MISMATCH",
        "Declared session id does not match the native header",
      );
    }

    resolved.push({
      key: node.key,
      parent: node.parent,
      disposition: node.disposition,
      label: node.label ?? null,
      sourceFormat: source.format,
      state: "readable",
      absolutePath: canonical,
    });
    if (
      node.key.hostId === manifest.main.hostId &&
      node.key.sessionId === manifest.main.sessionId
    ) {
      mainFile = canonical;
    }
  }

  return { manifest, nodes: resolved, mainFile };
}
