import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { readAgentRecords, type AgentRecord } from "./agent-records";
import type { ConsentRecord } from "./consent";
import {
  DEFAULT_LIMITS,
  EVIDENCE_SEMANTICS_REVISION,
  localManifestSchema,
  type LocalManifest,
} from "./contracts";
import { RetrospectiveError } from "./errors";
import {
  loadNativeIngress,
  type NativeCursor,
  type NativeDirectory,
  type NativeIngressApi,
} from "./native-ingress";
import { createReadSource, type ReadSource } from "./read-source";
import {
  SERVER_HOUSEKEEPING_TOOLS,
  extractServerToolName,
} from "./server-tools";

export type ServerObservation = {
  workspace: string;
  toolCalls: Array<{ tool: string; at: string }>;
};

export type Discovery =
  | {
      state: "bound";
      manifest: LocalManifest;
      mainFile: string;
      childFiles: string[];
      /** Linked children with the session id proven by their own header. */
      childSessions: Array<{
        absolutePath: string;
        sessionId: string;
        size: number;
        mtimeMs: number;
      }>;
      /** Observed task/create_agent call counts; not confirmation of success. */
      createdAgentsCount: number;
      taskAgentsCreatedCount: number;
      hostAgentsCreatedCount: number;
      taskAgentsReadCount: number;
      hostAgentsReadCount: number;
      hostAgentsSource: "agent-records" | "call-count";
      hostAgentsTruncated: boolean;
      sourceHandles: ReadonlyMap<string, ReadSource>;
      unlinkedAgents: number;
      rootVerification: "unverified-root";
    }
  | { state: "ambiguous-session"; candidates: number }
  | { state: "child-session" }
  | { state: "no-evidence" };

const TOLERANCE_MS = 250;
const MAX_TRACKED_CALL_IDS = 10_000;
const MTIME_WINDOW_MS = 2_000;
const ABORT_CHECK_LINES = 1_000;
const READ_CHUNK_BYTES = 64 * 1024;
const DEFAULT_MAX_CALLS_PER_FILE = 200_000;
const DEFAULT_MAX_CHILD_FILES = 256;
const MAX_DISCOVERY_ENTRIES = 24_096;
export type DiscoveryLimits = {
  maxCandidateFiles: number;
  maxCandidateBytes: number;
  maxTotalBytes: number;
  maxCallsPerFile: number;
  maxChildFiles: number;
};

export const DEFAULT_DISCOVERY_LIMITS: Readonly<DiscoveryLimits> =
  Object.freeze({
    maxCandidateFiles: 200,
    maxCandidateBytes: 512 * 1024 * 1024,
    maxTotalBytes: 2 * 1024 * 1024 * 1024,
    maxCallsPerFile: DEFAULT_MAX_CALLS_PER_FILE,
    maxChildFiles: DEFAULT_MAX_CHILD_FILES,
  });
const HOUSEKEEPING_TOOLS: Record<string, true> = {};
for (const tool of SERVER_HOUSEKEEPING_TOOLS) {
  HOUSEKEEPING_TOOLS[tool] = true;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new RetrospectiveError("ABORTED", "Session discovery was aborted");
  }
}

function normalizeForPlatform(target: string, isWin: boolean): string {
  if (isWin) {
    return path.win32.normalize(target).replace(/\//g, "\\");
  }
  return path.resolve(target);
}

export function isPathInside(
  targetPath: string,
  rootPath: string,
  isWin: boolean,
): boolean {
  const normTarget = normalizeForPlatform(targetPath, isWin);
  const normRoot = normalizeForPlatform(rootPath, isWin);
  if (isWin) {
    const lowerTarget = normTarget.toLowerCase();
    const lowerRoot = normRoot.toLowerCase();
    const prefix = lowerRoot.endsWith("\\") ? lowerRoot : `${lowerRoot}\\`;
    return lowerTarget === lowerRoot || lowerTarget.startsWith(prefix);
  }
  const prefix = normRoot.endsWith("/") ? normRoot : `${normRoot}/`;
  return normTarget === normRoot || normTarget.startsWith(prefix);
}

function isInsideAllowedRoots(
  targetPath: string,
  allowedRoots: readonly string[],
  isWin: boolean,
): boolean {
  return allowedRoots.some((root) => isPathInside(targetPath, root, isWin));
}
type NativeEntryView = {
  name: string;
  kind: "file" | "directory" | "symlink" | "other" | "unknown";
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
};

type NativeEntryListing = NativeEntryView[] & { visited: number };
function emptyNativeEntryListing(): NativeEntryListing {
  const entries: NativeEntryView[] = [];
  return Object.assign(entries, { visited: 0 });
}

/** Adopts a native fd only after its pending open completes, then checks abort. */
export async function adoptNativeReadSource(
  open: () => Promise<number>,
  signal: AbortSignal | undefined,
): Promise<ReadSource> {
  const source = createReadSource(await open());
  try {
    throwIfAborted(signal);
    return source;
  } catch (error) {
    await source.close().catch(() => undefined);
    throw error;
  }
}

/** Owns a newly opened source until its regular-file check succeeds. */
export async function openRegularReadSource(
  open: () => Promise<ReadSource | null>,
  signal: AbortSignal | undefined,
): Promise<ReadSource | null> {
  let source: ReadSource | null = null;
  let transferred = false;
  let failure: unknown;
  try {
    source = await open();
    if (!source) return null;
    throwIfAborted(signal);
    if (!(await source.stat()).isFile()) return null;
    throwIfAborted(signal);
    transferred = true;
    return source;
  } catch (error) {
    failure = error;
  } finally {
    if (source && !transferred) {
      await source.close().catch(() => undefined);
    }
  }
  throwIfAborted(signal);
  throw failure;
}

type NativePathStat = {
  size: number;
  mtimeMs: number;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
};

class NativeTree {
  private readonly rootCapabilities = new Map<string, NativeDirectory>();
  private entriesVisited = 0;

  constructor(
    private readonly api: NativeIngressApi,
    private readonly roots: readonly string[],
    private readonly isWin: boolean,
    private readonly signal: AbortSignal | undefined,
  ) {}

  async close(): Promise<void> {
    await Promise.all(
      [...this.rootCapabilities.values()].map((directory) =>
        this.api.closeDirectory(directory).catch(() => undefined),
      ),
    );
    this.rootCapabilities.clear();
  }

  async stat(
    target: string,
  ): Promise<
    | { kind: "ok"; stat: NativePathStat }
    | { kind: "missing" }
    | { kind: "failed" }
  > {
    let opened: NativeDirectory[] = [];
    try {
      const directory = await this.openDirectory(target);
      opened = directory.owned;
      return {
        kind: "ok",
        stat: {
          size: 0,
          mtimeMs: 0,
          isFile: () => false,
          isDirectory: () => true,
          isSymbolicLink: () => false,
        },
      };
    } catch (directoryError) {
      throwIfAborted(this.signal);
      await this.closeOwnedDirectories(opened);
      opened = [];
      if (this.isMissing(directoryError)) return { kind: "missing" };
      try {
        const source = await this.openFile(target);
        if (!source) return { kind: "failed" };
        try {
          const stat = await source.stat();
          return {
            kind: "ok",
            stat: {
              size: stat.size,
              mtimeMs: stat.mtimeMs,
              isFile: () => stat.isFile(),
              isDirectory: () => false,
              isSymbolicLink: () => false,
            },
          };
        } finally {
          await source.close().catch(() => undefined);
        }
      } catch (fileError) {
        throwIfAborted(this.signal);
        return this.isMissing(fileError)
          ? { kind: "missing" }
          : { kind: "failed" };
      }
    } finally {
      await this.closeOwnedDirectories(opened);
    }
  }

  async readDirectory(
    target: string,
    maxEntries = MAX_DISCOVERY_ENTRIES,
  ): Promise<NativeEntryListing | null> {
    let opened: NativeDirectory[] = [];
    let cursor: NativeCursor | undefined;
    try {
      const directory = await this.openDirectory(target);
      opened = directory.owned;
      cursor = await this.api.openDirectoryStream(directory.capability);
      const entries = emptyNativeEntryListing();
      while (true) {
        throwIfAborted(this.signal);
        const requested = Math.min(
          64,
          MAX_DISCOVERY_ENTRIES - this.entriesVisited,
          maxEntries - entries.visited,
        );
        if (requested <= 0) return null;
        const batch = await this.api.readDirectoryBatch(cursor, requested);
        throwIfAborted(this.signal);
        if (
          !Number.isSafeInteger(batch.visited) ||
          batch.visited < batch.entries.length ||
          batch.visited > requested
        ) {
          return null;
        }
        this.entriesVisited += batch.visited;
        entries.visited += batch.visited;
        for (const entry of batch.entries) {
          entries.push({
            name: entry.name,
            kind: entry.kind,
            isFile: () => entry.kind === "file" || entry.kind === "unknown",
            isDirectory: () =>
              entry.kind === "directory" || entry.kind === "unknown",
            isSymbolicLink: () => entry.kind === "symlink",
          });
        }
        if (batch.done) return entries;
        if (batch.visited === 0) return null;
      }
    } catch (error) {
      throwIfAborted(this.signal);
      if (this.isMissing(error)) return emptyNativeEntryListing();
      return null;
    } finally {
      if (cursor) await this.api.closeCursor(cursor).catch(() => undefined);
      await this.closeOwnedDirectories(opened);
    }
  }

  async openFile(target: string): Promise<ReadSource | null> {
    let opened: NativeDirectory[] = [];
    let source: ReadSource | null = null;
    let transferred = false;
    let failure: unknown;
    try {
      const parsed = this.resolve(target);
      const parent = await this.openDirectory(parsed.parent);
      opened = parent.owned;
      source = await adoptNativeReadSource(
        () => this.api.openRegularFile(parent.capability, parsed.name),
        this.signal,
      );
      transferred = true;
      return source;
    } catch (error) {
      failure = error;
    } finally {
      if (source && !transferred) {
        await source.close().catch(() => undefined);
      }
      await this.closeOwnedDirectories(opened);
    }
    throwIfAborted(this.signal);
    if (this.isMissing(failure)) return null;
    throw failure;
  }

  private isMissing(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "NATIVE_NOT_FOUND"
    );
  }

  private resolve(target: string): { parent: string; name: string } {
    const absolute = path.resolve(target);
    const root = [...this.roots]
      .filter((candidate) => isPathInside(absolute, candidate, this.isWin))
      .sort((left, right) => right.length - left.length)[0];
    if (!root) throw new Error("Path is outside approved roots");
    const relative = path.relative(root, absolute);
    const components = relative.split(path.sep).filter(Boolean);
    const name = components.pop();
    if (!name) throw new Error("A root directory is not a file");
    return {
      parent: path.join(root, ...components),
      name,
    };
  }

  private async openDirectory(
    target: string,
  ): Promise<{ capability: NativeDirectory; owned: NativeDirectory[] }> {
    const absolute = path.resolve(target);
    const root = [...this.roots]
      .filter((candidate) => isPathInside(absolute, candidate, this.isWin))
      .sort((left, right) => right.length - left.length)[0];
    if (!root) throw new Error("Path is outside approved roots");
    let capability = this.rootCapabilities.get(root);
    if (!capability) {
      throwIfAborted(this.signal);
      capability = await this.api.openRoot(root);
      this.rootCapabilities.set(root, capability);
      if (this.signal?.aborted) {
        await this.close();
        throw new RetrospectiveError(
          "ABORTED",
          "Session discovery was aborted",
        );
      }
    }
    const owned: NativeDirectory[] = [];
    try {
      const relative = path.relative(root, absolute);
      for (const component of relative.split(path.sep).filter(Boolean)) {
        throwIfAborted(this.signal);
        const child = await this.api.openChildDirectory(capability, component);
        owned.push(child);
        capability = child;
        if (this.signal?.aborted) {
          throw new RetrospectiveError(
            "ABORTED",
            "Session discovery was aborted",
          );
        }
      }
      return { capability, owned };
    } catch (error) {
      await this.closeOwnedDirectories(owned);
      throw error;
    }
  }

  private async closeOwnedDirectories(
    directories: readonly NativeDirectory[],
  ): Promise<void> {
    await Promise.all(
      [...directories]
        .reverse()
        .map((directory) =>
          this.api.closeDirectory(directory).catch(() => undefined),
        ),
    );
  }
}

type CandidateCall = {
  tool: string;
  callTs: number;
  resultTs: number | null;
};

type ParsedCandidate = {
  filePath: string;
  sessionId: string;
  sessionIdentity: string | null;
  parentSession: string | null;
  calls: CandidateCall[];
  createdAgentsCount: number;
  taskAgentsCreatedCount: number;
  hostAgentsCreatedCount: number;
  lastSubstantiveEventId: string | null;
  lastEventTimestamp: string | null;
  score: number;
};

type ParseOptions = {
  signal: AbortSignal | undefined;
  lineBytes: number;
  maxCallsPerFile: number;
  maxCandidateBytes: number;
  remainingTotalBytes: number;
};

type ParseOutcome =
  | { kind: "parsed"; candidate: ParsedCandidate; bytes: number }
  | { kind: "not-session" }
  | { kind: "skipped" };

const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/**
 * Streams one candidate through a single descriptor, bounded by the `fstat`
 * size captured after opening. Lines longer than `lineBytes` are dropped
 * without being buffered whole. Returns `skipped` when the file cannot be
 * inspected or exceeds a byte budget; the caller counts that as unscorable.
 */
async function parseCandidateFile(
  filePath: string,
  source: ReadSource,
  options: ParseOptions,
): Promise<ParseOutcome> {
  const stats = await source.stat().catch(() => null);
  if (!stats || !stats.isFile()) return { kind: "skipped" };
  try {
    const size = stats.size;
    if (
      size > options.maxCandidateBytes ||
      size > options.remainingTotalBytes
    ) {
      return { kind: "skipped" };
    }

    let sessionId: string | null = null;
    let parentSession: string | null = null;
    let firstRowSeen = false;
    let headerValid = false;
    let titlePreambleSeen = false;
    let headerConflict = false;
    let lastSubstantiveEventId: string | null = null;
    let lastEventTimestamp: string | null = null;
    let createdAgentsCount = 0;
    let taskAgentsCreatedCount = 0;
    let hostAgentsCreatedCount = 0;

    const calls: CandidateCall[] = [];
    const pendingCalls = new Map<string, CandidateCall>();
    const housekeepingCallIds = new Set<string>();
    const nonHousekeepingCallIds = new Set<string>();

    const processLine = (buffer: Buffer): void => {
      const line = buffer.toString("utf8");
      if (!line.trim()) return;

      let row: Record<string, unknown>;
      try {
        const parsed = JSON.parse(line);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        )
          return;
        row = parsed as Record<string, unknown>;
      } catch {
        return;
      }

      if (!firstRowSeen) {
        if (row.type === "title" && row.v === 1 && !titlePreambleSeen) {
          titlePreambleSeen = true;
          return;
        }
        firstRowSeen = true;
        if (
          row.type === "session" &&
          typeof row.id === "string" &&
          SESSION_ID_PATTERN.test(row.id)
        ) {
          headerValid = true;
          sessionId = row.id;
          parentSession =
            typeof row.parentSession === "string" ? row.parentSession : null;
        }
      } else if (row.type === "session") {
        const rowParent =
          typeof row.parentSession === "string" ? row.parentSession : null;
        if (row.id !== sessionId || rowParent !== parentSession) {
          headerConflict = true;
        }
      }

      let rowTs = NaN;
      if (typeof row.timestamp === "string") {
        rowTs = Date.parse(row.timestamp);
        if (!Number.isNaN(rowTs)) {
          lastEventTimestamp = row.timestamp;
        }
      }

      const rowId = typeof row.id === "string" ? row.id : null;

      if (
        row.type === "message" &&
        typeof row.message === "object" &&
        row.message !== null
      ) {
        const msg = row.message as Record<string, unknown>;
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
          let hasNonHousekeepingToolCall = false;
          for (const item of msg.content) {
            if (
              typeof item === "object" &&
              item !== null &&
              item.type === "toolCall"
            ) {
              const toolName = extractServerToolName(item.name, item.arguments);
              const isHousekeeping =
                toolName !== null && toolName in HOUSEKEEPING_TOOLS;

              if (typeof item.id === "string") {
                if (isHousekeeping) {
                  if (housekeepingCallIds.size < MAX_TRACKED_CALL_IDS) {
                    housekeepingCallIds.add(item.id);
                  }
                } else {
                  hasNonHousekeepingToolCall = true;
                  if (nonHousekeepingCallIds.size < MAX_TRACKED_CALL_IDS) {
                    nonHousekeepingCallIds.add(item.id);
                  }
                }
              } else if (!isHousekeeping) {
                hasNonHousekeepingToolCall = true;
              }

              if (toolName) {
                if (calls.length < options.maxCallsPerFile) {
                  const callRecord: CandidateCall = {
                    tool: toolName,
                    callTs: rowTs,
                    resultTs: null,
                  };
                  calls.push(callRecord);
                  if (
                    typeof item.id === "string" &&
                    pendingCalls.size < MAX_TRACKED_CALL_IDS
                  ) {
                    pendingCalls.set(item.id, callRecord);
                  }
                }
              }
              if (toolName === "create_agent") {
                createdAgentsCount += 1;
                hostAgentsCreatedCount += 1;
              } else if (toolName === "task") {
                const taskCount =
                  typeof item.arguments === "object" &&
                  item.arguments !== null &&
                  "tasks" in item.arguments &&
                  Array.isArray(item.arguments.tasks)
                    ? item.arguments.tasks.length
                    : 1;
                createdAgentsCount += taskCount;
                taskAgentsCreatedCount += taskCount;
              }
            }
          }

          if (hasNonHousekeepingToolCall && rowId !== null) {
            lastSubstantiveEventId = rowId;
          }
        } else if (msg.role === "toolResult") {
          const toolCallId =
            typeof msg.toolCallId === "string" ? msg.toolCallId : null;
          if (toolCallId && pendingCalls.has(toolCallId)) {
            pendingCalls.get(toolCallId)!.resultTs = rowTs;
          }

          if (
            toolCallId !== null &&
            nonHousekeepingCallIds.has(toolCallId) &&
            !housekeepingCallIds.has(toolCallId) &&
            rowId !== null
          ) {
            lastSubstantiveEventId = rowId;
          }
        }
      }
    };

    const lineLimit = options.lineBytes;
    const lineBuffer = Buffer.allocUnsafe(lineLimit);
    let lineLength = 0;
    let tooLong = false;
    let lineCount = 0;
    const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, size));
    let position = 0;

    while (position < size) {
      throwIfAborted(options.signal);
      const { bytesRead } = await source.read(
        chunk,
        0,
        Math.min(chunk.length, size - position),
        position,
      );
      if (bytesRead <= 0) break;
      for (let index = 0; index < bytesRead; index += 1) {
        const byte = chunk[index];
        if (byte === 0x0a) {
          lineCount += 1;
          if (lineCount % ABORT_CHECK_LINES === 0) {
            throwIfAborted(options.signal);
          }
          if (!tooLong) processLine(lineBuffer.subarray(0, lineLength));
          lineLength = 0;
          tooLong = false;
        } else if (!tooLong) {
          if (lineLength === lineLimit) {
            tooLong = true;
            lineLength = 0;
          } else {
            lineBuffer[lineLength] = byte;
            lineLength += 1;
          }
        }
      }
      position += bytesRead;
    }

    if (position !== size) return { kind: "skipped" };
    throwIfAborted(options.signal);
    if (!tooLong && lineLength > 0) {
      processLine(lineBuffer.subarray(0, lineLength));
    }

    if (!headerValid) return { kind: "not-session" };
    if (headerConflict || sessionId === null) return { kind: "skipped" };

    return {
      kind: "parsed",
      candidate: {
        filePath,
        sessionId,
        sessionIdentity: sessionId,
        parentSession,
        calls,
        createdAgentsCount,
        taskAgentsCreatedCount,
        hostAgentsCreatedCount,
        lastSubstantiveEventId,
        lastEventTimestamp,
        score: 0,
      },
      bytes: size,
    };
  } catch {
    throwIfAborted(options.signal);
    return { kind: "skipped" };
  }
}

function computeWorkspaceSlugs(workspace: string): string[] {
  const norm = path.resolve(workspace);
  const home = os.homedir();
  const slugs = new Set<string>();

  const base = path.basename(norm);
  if (base) slugs.add(base);

  const noDrive = norm.replace(/^[a-zA-Z]:/, "");
  const segments = noDrive.split(/[\\/]+/).filter(Boolean);
  if (segments.length > 0) {
    slugs.add(segments.join("-"));
    slugs.add(`-${segments.join("-")}`);
    slugs.add(`--${segments.join("-")}`);
    slugs.add(`--${segments.join("-")}--`);
  }

  if (norm.startsWith(home)) {
    const rel = path.relative(home, norm);
    const relSegments = rel.split(/[\\/]+/).filter(Boolean);
    if (relSegments.length > 0) {
      slugs.add(relSegments.join("-"));
      slugs.add(`-${relSegments.join("-")}`);
      slugs.add(`--${relSegments.join("-")}`);
    }
  }

  return Array.from(slugs);
}

type CandidateScan = {
  files: string[];
  nestedFiles: Set<string>;
  failedScans: number;
};

async function findCandidateFiles(
  tree: NativeTree,
  allowedRoots: string[],
  workspace: string,
  isWin: boolean,
  maxChildFiles: number,
  signal: AbortSignal | undefined,
): Promise<CandidateScan> {
  const candidateFiles = new Set<string>();
  const nestedFiles = new Set<string>();
  let failedScans = 0;
  const slugs = computeWorkspaceSlugs(workspace);

  const collectJsonl = (
    dirPath: string,
    dirents: NativeEntryView[],
    target: Set<string>,
  ): void => {
    for (const entry of dirents) {
      if (!entry.isFile() || entry.isSymbolicLink()) continue;
      if (!entry.name.endsWith(".jsonl")) continue;
      const full = path.join(dirPath, entry.name);
      if (isInsideAllowedRoots(full, allowedRoots, isWin)) target.add(full);
    }
  };

  for (const root of allowedRoots) {
    throwIfAborted(signal);
    if (!isPathInside(root, root, isWin)) continue;
    const rootInfo = await tree.stat(root);
    if (rootInfo.kind === "failed") {
      failedScans += 1;
      continue;
    }
    if (rootInfo.kind === "missing") continue;
    if (!rootInfo.stat.isDirectory() || rootInfo.stat.isSymbolicLink())
      continue;

    const dirents = await tree.readDirectory(root);
    if (dirents === null) {
      failedScans += 1;
      continue;
    }
    collectJsonl(root, dirents, candidateFiles);
    const subdirs = dirents.filter(
      (entry) => entry.isDirectory() && !entry.isSymbolicLink(),
    );

    for (const sub of subdirs) {
      throwIfAborted(signal);
      const subPath = path.join(root, sub.name);
      if (!isInsideAllowedRoots(subPath, allowedRoots, isWin)) continue;
      const matchesSlug = slugs.some(
        (slug) =>
          slug === sub.name ||
          (isWin && slug.toLowerCase() === sub.name.toLowerCase()),
      );
      if (!matchesSlug) continue;
      const subDirents = await tree.readDirectory(subPath);
      if (subDirents === null) {
        failedScans += 1;
        continue;
      }
      collectJsonl(subPath, subDirents, candidateFiles);
    }

    if (candidateFiles.size === 0) {
      for (const sub of subdirs) {
        throwIfAborted(signal);
        const subPath = path.join(root, sub.name);
        if (!isInsideAllowedRoots(subPath, allowedRoots, isWin)) continue;
        const subDirents = await tree.readDirectory(subPath);
        if (subDirents === null) {
          failedScans += 1;
          continue;
        }
        collectJsonl(subPath, subDirents, candidateFiles);
      }
    }
  }

  for (const filePath of Array.from(candidateFiles)) {
    throwIfAborted(signal);
    const siblingDir = filePath.slice(0, filePath.length - ".jsonl".length);
    if (!isInsideAllowedRoots(siblingDir, allowedRoots, isWin)) continue;
    const dirInfo = await tree.stat(siblingDir);
    if (dirInfo.kind === "failed") {
      failedScans += 1;
      continue;
    }
    if (dirInfo.kind === "missing" || !dirInfo.stat.isDirectory()) continue;
    const dirents = await tree.readDirectory(siblingDir);
    if (dirents === null) {
      failedScans += 1;
      continue;
    }
    const nested = dirents
      .filter(
        (entry) =>
          entry.isFile() &&
          !entry.isSymbolicLink() &&
          entry.name.endsWith(".jsonl"),
      )
      .map((entry) => path.join(siblingDir, entry.name))
      .filter((full) => isInsideAllowedRoots(full, allowedRoots, isWin))
      .sort();
    for (const childPath of nested.slice(0, maxChildFiles)) {
      nestedFiles.add(childPath);
      candidateFiles.add(childPath);
    }
  }

  const files: string[] = [];
  for (const filePath of Array.from(candidateFiles).sort()) {
    throwIfAborted(signal);
    if (!isInsideAllowedRoots(filePath, allowedRoots, isWin)) continue;
    const info = await tree.stat(filePath);
    if (info.kind === "missing") continue;
    if (info.kind === "failed") {
      files.push(filePath);
      continue;
    }
    if (info.stat.isFile() && !info.stat.isSymbolicLink()) files.push(filePath);
  }
  return { files, nestedFiles, failedScans };
}

async function resolveSiblingDir(
  tree: NativeTree,
  dirPath: string,
  allowedRoots: string[],
  isWin: boolean,
): Promise<NativeEntryListing | null | undefined> {
  if (!isInsideAllowedRoots(dirPath, allowedRoots, isWin)) return undefined;
  const dirInfo = await tree.stat(dirPath);
  if (dirInfo.kind === "missing") return undefined;
  if (dirInfo.kind === "failed") return null;
  if (!dirInfo.stat.isDirectory() || dirInfo.stat.isSymbolicLink()) {
    return undefined;
  }
  return tree.readDirectory(dirPath);
}

type LinkedAgentSession = {
  readonly record: AgentRecord;
  readonly filePath: string;
  readonly parentSessionId: string;
  readonly handle: ReadSource;
};

type OpenedAgentSession = {
  readonly filePath: string;
  readonly handle: ReadSource;
};

const MAX_AGENT_RECORD_DIRECTORIES = 4_096;
const MAX_AGENT_RECORDS = 20_000;
const MAX_AGENT_DESCENDANTS = 256;
const MAX_AGENT_DEPTH = 16;
const SUPPORTED_HOST_SESSION_PROVIDER = "omp";
const AGENT_SESSION_SUFFIX = /(?:^|_)([A-Za-z0-9-]{8,128})\.jsonl$/;
const MAX_AGENT_SESSION_ENTRIES = 24_096;

async function findAgentSessionFiles(
  tree: NativeTree,
  sessionIds: ReadonlySet<string>,
  allowedRoots: readonly string[],
  isWin: boolean,
  signal: AbortSignal | undefined,
): Promise<{
  files: Map<string, OpenedAgentSession>;
  ambiguousIds: Set<string>;
  truncated: boolean;
}> {
  const files = new Map<string, OpenedAgentSession>();
  const ambiguousIds = new Set<string>();
  let entriesVisited = 0;
  let directoriesRead = 0;
  let truncated = false;

  const recordMatch = async (
    directory: string,
    entry: NativeEntryView,
  ): Promise<void> => {
    const sessionId = AGENT_SESSION_SUFFIX.exec(entry.name)?.[1];
    if (
      !sessionId ||
      !sessionIds.has(sessionId) ||
      ambiguousIds.has(sessionId)
    ) {
      return;
    }
    const filePath = path.join(directory, entry.name);
    if (
      !isInsideAllowedRoots(filePath, allowedRoots, isWin) ||
      entry.isSymbolicLink() ||
      !entry.isFile()
    ) {
      truncated = true;
      return;
    }
    let handle: ReadSource | null;
    try {
      handle = await openRegularReadSource(
        () => tree.openFile(filePath),
        signal,
      );
    } catch {
      throwIfAborted(signal);
      truncated = true;
      return;
    }
    if (!handle) {
      truncated = true;
      return;
    }
    const previous = files.get(sessionId);
    if (previous) {
      await previous.handle.close().catch(() => undefined);
      await handle.close().catch(() => undefined);
      files.delete(sessionId);
      ambiguousIds.add(sessionId);
      return;
    }
    files.set(sessionId, { filePath, handle });
  };

  try {
    for (const root of allowedRoots) {
      throwIfAborted(signal);
      const listing = await tree.readDirectory(
        root,
        MAX_AGENT_SESSION_ENTRIES - entriesVisited,
      );
      if (!listing) {
        truncated = true;
        break;
      }
      entriesVisited += listing.visited;
      for (const entry of listing) {
        throwIfAborted(signal);
        await recordMatch(root, entry);
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          if (directoriesRead >= MAX_AGENT_RECORD_DIRECTORIES) {
            truncated = true;
            break;
          }
          directoriesRead += 1;
          const bucketPath = path.join(root, entry.name);
          const bucket = await tree.readDirectory(
            bucketPath,
            MAX_AGENT_SESSION_ENTRIES - entriesVisited,
          );
          if (!bucket) {
            truncated = true;
            break;
          }
          entriesVisited += bucket.visited;
          for (const child of bucket) {
            throwIfAborted(signal);
            await recordMatch(bucketPath, child);
          }
        }
        if (truncated || entriesVisited >= MAX_AGENT_SESSION_ENTRIES) {
          truncated = true;
          break;
        }
      }
      if (truncated) break;
    }
  } catch (error) {
    await Promise.all(
      [...files.values()].map(({ handle }) =>
        handle.close().catch(() => undefined),
      ),
    );
    files.clear();
    throw error;
  }

  if (truncated) {
    await Promise.all(
      [...files.values()].map(({ handle }) =>
        handle.close().catch(() => undefined),
      ),
    );
    files.clear();
  }
  return { files, ambiguousIds, truncated };
}

async function linkHostAgentSessions(
  tree: NativeTree,
  records: readonly AgentRecord[],
  mainSessionId: string,
  allowedRoots: readonly string[],
  isWin: boolean,
  limits: DiscoveryLimits,
  signal: AbortSignal | undefined,
  recordsTruncated: boolean,
  handleRegistry: Set<ReadSource>,
): Promise<{
  readonly linked: readonly LinkedAgentSession[];
  readonly created: number;
  readonly truncated: boolean;
  readonly rootMatched: boolean;
}> {
  const roots = records.filter((record) => record.sessionId === mainSessionId);
  if (roots.length !== 1) {
    return {
      linked: [],
      created: 0,
      truncated: recordsTruncated || records.length > 0,
      rootMatched: false,
    };
  }
  const root = roots[0];
  if (!root) {
    return {
      linked: [],
      created: 0,
      truncated: true,
      rootMatched: false,
    };
  }
  const byParent = new Map<string, AgentRecord[]>();
  const sessionIdsByAgentId = new Map<string, Set<string>>();
  for (const record of records) {
    const sessionIds = sessionIdsByAgentId.get(record.id) ?? new Set<string>();
    sessionIds.add(record.sessionId);
    sessionIdsByAgentId.set(record.id, sessionIds);
    if (record.parentAgentId === null) continue;
    const children = byParent.get(record.parentAgentId) ?? [];
    children.push(record);
    byParent.set(record.parentAgentId, children);
  }
  for (const children of byParent.values()) {
    children.sort((left, right) => left.id.localeCompare(right.id));
  }

  const queue: Array<{ record: AgentRecord; depth: number }> = [];
  const visited = new Set([root.id]);
  let truncated =
    recordsTruncated ||
    Array.from(sessionIdsByAgentId.values()).some((values) => values.size > 1);
  for (const record of byParent.get(root.id) ?? []) {
    if (visited.has(record.id)) {
      truncated = true;
      continue;
    }
    if (queue.length >= MAX_AGENT_DESCENDANTS) {
      truncated = true;
      continue;
    }
    visited.add(record.id);
    queue.push({ record, depth: 1 });
  }

  for (let index = 0; index < queue.length; index += 1) {
    throwIfAborted(signal);
    const current = queue[index];
    if (!current) continue;
    const children = byParent.get(current.record.id) ?? [];
    if (children.length === 0) continue;
    if (current.depth >= MAX_AGENT_DEPTH) {
      truncated = true;
      continue;
    }
    for (const child of children) {
      if (visited.has(child.id)) {
        truncated = true;
        continue;
      }
      if (queue.length >= MAX_AGENT_DESCENDANTS) {
        truncated = true;
        break;
      }
      visited.add(child.id);
      queue.push({ record: child, depth: current.depth + 1 });
    }
  }

  const created = queue.length;
  const descendants = queue;
  const validSessionIds = new Set(
    descendants
      .filter(
        ({ record }) =>
          sessionIdsByAgentId.get(record.id)?.size === 1 &&
          record.provider === SUPPORTED_HOST_SESSION_PROVIDER &&
          record.sessionId !== mainSessionId,
      )
      .map(({ record }) => record.sessionId),
  );
  if (validSessionIds.size !== descendants.length) truncated = true;
  if (validSessionIds.size === 0) {
    return { linked: [], created, truncated, rootMatched: true };
  }
  const sessionFiles = await findAgentSessionFiles(
    tree,
    validSessionIds,
    allowedRoots,
    isWin,
    signal,
  );
  truncated ||= sessionFiles.truncated;

  const linked: LinkedAgentSession[] = [];
  const linkedSessionIds = new Set([mainSessionId]);
  const linkedAgentSessions = new Map<string, string>();
  let bytesRead = 0;
  try {
    for (const item of descendants) {
      throwIfAborted(signal);
      const parentAgentId = item.record.parentAgentId;
      const openedFile = sessionFiles.files.get(item.record.sessionId);
      if (
        item.record.provider !== SUPPORTED_HOST_SESSION_PROVIDER ||
        sessionIdsByAgentId.get(item.record.id)?.size !== 1 ||
        item.record.sessionId === mainSessionId ||
        !openedFile ||
        linkedSessionIds.has(item.record.sessionId) ||
        (parentAgentId !== root.id &&
          (parentAgentId === null || !linkedAgentSessions.has(parentAgentId)))
      ) {
        truncated = true;
        if (openedFile) {
          sessionFiles.files.delete(item.record.sessionId);
          await openedFile.handle.close().catch(() => undefined);
        }
        continue;
      }
      sessionFiles.files.delete(item.record.sessionId);
      let retained = false;
      try {
        const parsed = await parseCandidateFile(
          openedFile.filePath,
          openedFile.handle,
          {
            signal,
            lineBytes: DEFAULT_LIMITS.lineBytes,
            maxCallsPerFile: limits.maxCallsPerFile,
            maxCandidateBytes: DEFAULT_LIMITS.sourceBytes,
            remainingTotalBytes: Math.max(
              0,
              DEFAULT_LIMITS.sourceBytes - bytesRead,
            ),
          },
        );
        if (
          parsed.kind !== "parsed" ||
          parsed.candidate.sessionIdentity !== item.record.sessionId
        ) {
          truncated = true;
          continue;
        }
        bytesRead += parsed.bytes;
        if (bytesRead > DEFAULT_LIMITS.sourceBytes) {
          truncated = true;
          continue;
        }
        const parentSessionId =
          item.record.parentAgentId === root.id
            ? mainSessionId
            : linkedAgentSessions.get(item.record.parentAgentId ?? "");
        if (!parentSessionId) {
          truncated = true;
          continue;
        }
        linkedSessionIds.add(item.record.sessionId);
        linked.push({
          record: item.record,
          filePath: openedFile.filePath,
          parentSessionId,
          handle: openedFile.handle,
        });
        linkedAgentSessions.set(item.record.id, item.record.sessionId);
        handleRegistry.add(openedFile.handle);
        retained = true;
      } finally {
        if (!retained) await openedFile.handle.close().catch(() => undefined);
      }
    }
  } finally {
    await Promise.all(
      [...sessionFiles.files.values()].map(({ handle }) =>
        handle.close().catch(() => undefined),
      ),
    );
    sessionFiles.files.clear();
  }
  return { linked, created, truncated, rootMatched: true };
}

/**
 * A child file is linked only when its own header names the bound main session
 * as parent — by session id, by main file path, or by the main file's stem.
 * Being inside a sibling directory is a location, not a lineage proof.
 */
function provesDeclaredParent(
  declared: string | null,
  mainSessionId: string,
  mainFilePath: string,
): boolean {
  if (declared === null || declared.length === 0) return false;
  // A bare session id may prove lineage by identity. A path-like value must
  // resolve to exactly the bound main file; a shared basename proves nothing.
  if (SESSION_ID_PATTERN.test(declared) && !/[\\/]/.test(declared)) {
    return declared === mainSessionId;
  }
  return path.isAbsolute(declared)
    ? path.resolve(declared) === path.resolve(mainFilePath)
    : false;
}

export async function discoverSession(
  consent: ConsentRecord,
  observation: ServerObservation,
  clock: () => Date = () => new Date(),
  platform: NodeJS.Platform = process.platform,
  limits?: Partial<DiscoveryLimits>,
  signal?: AbortSignal,
  sourceHandleRegistry?: Set<ReadSource>,
): Promise<Discovery> {
  throwIfAborted(signal);
  if (
    !consent ||
    !Array.isArray(consent.allowedSourceRoots) ||
    consent.allowedSourceRoots.length === 0 ||
    !observation ||
    typeof observation.workspace !== "string"
  ) {
    return { state: "no-evidence" };
  }
  const loaded = await loadNativeIngress();
  if (loaded.state !== "available") {
    throw new RetrospectiveError(loaded.code, loaded.message);
  }
  const isWin = platform === "win32";
  const tree = new NativeTree(
    loaded.api,
    consent.allowedSourceRoots,
    isWin,
    signal,
  );
  const localSources = new Set<ReadSource>();
  let completed = false;
  try {
    const result = await discoverSessionWithTree(
      consent,
      observation,
      clock,
      platform,
      limits,
      signal,
      tree,
      loaded.api,
      localSources,
    );
    const retained =
      result.state === "bound"
        ? new Set(result.sourceHandles.values())
        : new Set<ReadSource>();
    for (const source of localSources) {
      if (retained.has(source) && sourceHandleRegistry) {
        sourceHandleRegistry.add(source);
      } else {
        await source.close().catch(() => undefined);
      }
    }
    completed = true;
    if (result.state === "bound" && !sourceHandleRegistry) {
      return { ...result, sourceHandles: new Map() };
    }
    return result;
  } finally {
    if (!completed) {
      await Promise.all(
        [...localSources].map((source) =>
          source.close().catch(() => undefined),
        ),
      );
    }
    await tree.close();
  }
}

async function discoverSessionWithTree(
  consent: ConsentRecord,
  observation: ServerObservation,
  clock: () => Date,
  platform: NodeJS.Platform,
  limits: Partial<DiscoveryLimits> | undefined,
  signal: AbortSignal | undefined,
  tree: NativeTree,
  nativeIngress: NativeIngressApi,
  sourceHandleRegistry: Set<ReadSource>,
): Promise<Discovery> {
  throwIfAborted(signal);

  if (
    !consent ||
    !Array.isArray(consent.allowedSourceRoots) ||
    consent.allowedSourceRoots.length === 0 ||
    !observation ||
    typeof observation.workspace !== "string"
  ) {
    return { state: "no-evidence" };
  }

  const effectiveLimits: DiscoveryLimits = {
    ...DEFAULT_DISCOVERY_LIMITS,
    ...(limits ?? {}),
  };

  const isWin = platform === "win32";
  const scan = await findCandidateFiles(
    tree,
    consent.allowedSourceRoots,
    observation.workspace,
    isWin,
    effectiveLimits.maxChildFiles,
    signal,
  );
  throwIfAborted(signal);

  const candidateFilePaths = scan.files;
  let unscorableCount = scan.failedScans;

  if (candidateFilePaths.length === 0) {
    if (unscorableCount > 0) {
      return { state: "ambiguous-session", candidates: unscorableCount };
    }
    return { state: "no-evidence" };
  }

  if (candidateFilePaths.length > effectiveLimits.maxCandidateFiles) {
    return {
      state: "ambiguous-session",
      candidates: candidateFilePaths.length,
    };
  }

  const records = observation.toolCalls ?? [];
  let earliestRecordMs = Number.POSITIVE_INFINITY;
  for (const rec of records) {
    const recTime = Date.parse(rec.at);
    if (!Number.isNaN(recTime) && recTime < earliestRecordMs) {
      earliestRecordMs = recTime;
    }
  }
  const mtimeWindowStart = Number.isFinite(earliestRecordMs)
    ? earliestRecordMs - MTIME_WINDOW_MS
    : Number.NEGATIVE_INFINITY;

  let totalCandidateBytes = 0;
  const parsedCandidates: ParsedCandidate[] = [];
  const parsedSources = new Map<string, ReadSource>();

  for (const filePath of candidateFilePaths) {
    throwIfAborted(signal);
    if (!isInsideAllowedRoots(filePath, consent.allowedSourceRoots, isWin)) {
      continue;
    }
    let source: ReadSource | null = null;
    try {
      source = await tree.openFile(filePath);
      if (!source) {
        unscorableCount += 1;
        continue;
      }
      sourceHandleRegistry.add(source);
      const stat = await source.stat();
      if (!stat.isFile()) {
        sourceHandleRegistry.delete(source);
        await source.close().catch(() => undefined);
        continue;
      }
      if (stat.mtimeMs < mtimeWindowStart) {
        sourceHandleRegistry.delete(source);
        await source.close().catch(() => undefined);
        continue;
      }
      const outcome = await parseCandidateFile(filePath, source, {
        signal,
        lineBytes: DEFAULT_LIMITS.lineBytes,
        maxCallsPerFile: effectiveLimits.maxCallsPerFile,
        maxCandidateBytes: effectiveLimits.maxCandidateBytes,
        remainingTotalBytes:
          effectiveLimits.maxTotalBytes - totalCandidateBytes,
      });
      if (outcome.kind === "not-session") {
        sourceHandleRegistry.delete(source);
        await source.close().catch(() => undefined);
        continue;
      }
      if (outcome.kind === "skipped") {
        unscorableCount += 1;
        sourceHandleRegistry.delete(source);
        await source.close().catch(() => undefined);
        continue;
      }
      totalCandidateBytes += outcome.bytes;
      parsedCandidates.push(outcome.candidate);
      parsedSources.set(path.resolve(filePath), source);
    } catch {
      throwIfAborted(signal);
      unscorableCount += 1;
      if (source) {
        sourceHandleRegistry.delete(source);
        await source.close().catch(() => undefined);
      }
    }
  }
  throwIfAborted(signal);

  const sessionIdsSeen = new Set<string>();
  for (const candidate of parsedCandidates) {
    if (sessionIdsSeen.has(candidate.sessionId)) {
      return {
        state: "ambiguous-session",
        candidates: parsedCandidates.length,
      };
    }
    sessionIdsSeen.add(candidate.sessionId);
  }

  if (parsedCandidates.length === 0) {
    if (unscorableCount > 0) {
      return {
        state: "ambiguous-session",
        candidates: unscorableCount,
      };
    }
    return { state: "no-evidence" };
  }

  for (const candidate of parsedCandidates) {
    let score = 0;
    for (const rec of records) {
      const recTime = Date.parse(rec.at);
      if (Number.isNaN(recTime)) continue;

      const hasMatch = candidate.calls.some((call) => {
        if (call.tool !== rec.tool) return false;
        if (Number.isNaN(call.callTs)) return false;
        const start = call.callTs - TOLERANCE_MS;
        const end =
          (call.resultTs !== null && !Number.isNaN(call.resultTs)
            ? call.resultTs
            : call.callTs) + TOLERANCE_MS;
        return recTime >= start && recTime <= end;
      });

      if (hasMatch) {
        score += 1;
      }
    }
    candidate.score = score;
  }

  const maxScore = Math.max(0, ...parsedCandidates.map((c) => c.score));
  const topCandidates =
    maxScore > 0 ? parsedCandidates.filter((c) => c.score === maxScore) : [];

  // Never bound when an unscorable candidate exists, because it might tie or beat the highest score.
  if (unscorableCount > 0) {
    return {
      state: "ambiguous-session",
      candidates: topCandidates.length + unscorableCount,
    };
  }

  if (maxScore === 0) {
    return { state: "no-evidence" };
  }

  if (topCandidates.length > 1) {
    return { state: "ambiguous-session", candidates: topCandidates.length };
  }
  const winner = topCandidates[0];
  if (!winner.sessionIdentity) {
    return { state: "ambiguous-session", candidates: 1 };
  }
  const mainSessionId = winner.sessionIdentity;

  // A nested OMP sub-agent file, or any file whose header claims a parent, is a
  // verified child: the caller is a worker, not the session's root.
  if (winner.parentSession !== null || scan.nestedFiles.has(winner.filePath)) {
    return { state: "child-session" };
  }

  const childFiles: string[] = [];
  const childSessionByPath = new Map<string, string>();
  const taskSessionIds = new Set<string>();
  const seenChildPaths = new Set<string>();
  let unprovenChildren = 0;
  const baseWithoutExt = winner.filePath.replace(/\.jsonl$/i, "");
  const siblingDirsToCheck = [
    baseWithoutExt,
    path.join(path.dirname(winner.filePath), mainSessionId),
  ];
  let taskAgentsReadCount = 0;

  for (const sibDir of siblingDirsToCheck) {
    if (childFiles.length >= effectiveLimits.maxChildFiles) {
      break;
    }
    const dirents = await resolveSiblingDir(
      tree,
      sibDir,
      consent.allowedSourceRoots,
      isWin,
    );
    if (dirents === null) {
      return { state: "ambiguous-session", candidates: 1 };
    }
    if (dirents === undefined) continue;
    const names = dirents
      .filter(
        (entry) =>
          entry.isFile() &&
          !entry.isSymbolicLink() &&
          entry.name.endsWith(".jsonl"),
      )
      .map((entry) => entry.name)
      .sort();
    for (const name of names) {
      if (childFiles.length >= effectiveLimits.maxChildFiles) break;
      const childPath = path.join(sibDir, name);
      if (
        childFiles.includes(childPath) ||
        !isInsideAllowedRoots(childPath, consent.allowedSourceRoots, isWin)
      ) {
        continue;
      }
      if (seenChildPaths.has(childPath)) continue;
      seenChildPaths.add(childPath);
      let source: ReadSource | null = null;
      let child: ParseOutcome = { kind: "skipped" };
      try {
        source = await tree.openFile(childPath);
        if (!source) continue;
        sourceHandleRegistry.add(source);
        const stat = await source.stat();
        if (stat.isFile()) {
          child = await parseCandidateFile(childPath, source, {
            signal,
            lineBytes: DEFAULT_LIMITS.lineBytes,
            maxCallsPerFile: effectiveLimits.maxCallsPerFile,
            maxCandidateBytes: effectiveLimits.maxCandidateBytes,
            remainingTotalBytes:
              effectiveLimits.maxTotalBytes - totalCandidateBytes,
          });
        }
      } catch {
        throwIfAborted(signal);
        child = { kind: "skipped" };
      }
      if (
        child.kind !== "parsed" ||
        !source ||
        child.candidate.sessionIdentity === null ||
        child.candidate.sessionIdentity === mainSessionId ||
        !provesDeclaredParent(
          child.candidate.parentSession,
          mainSessionId,
          winner.filePath,
        )
      ) {
        unprovenChildren += 1;
        if (source) {
          sourceHandleRegistry.delete(source);
          await source.close().catch(() => undefined);
        }
        continue;
      }
      if (taskSessionIds.has(child.candidate.sessionIdentity)) {
        sourceHandleRegistry.delete(source);
        await source.close().catch(() => undefined);
        continue;
      }
      totalCandidateBytes += child.bytes;
      childFiles.push(childPath);
      taskSessionIds.add(child.candidate.sessionIdentity);
      childSessionByPath.set(childPath, child.candidate.sessionIdentity);
      parsedSources.set(path.resolve(childPath), source);
      taskAgentsReadCount += 1;
    }
  }
  childFiles.sort();

  let hostAgentsReadCount = 0;
  let hostAgentsTruncated = false;
  let hostAgentsSource: "agent-records" | "call-count" = "call-count";
  const agentRecordRoots = consent.allowedAgentRecordRoots ?? [];
  const agentRecords = await readAgentRecords(agentRecordRoots, {
    signal,
    maxDirectories: MAX_AGENT_RECORD_DIRECTORIES,
    maxRecords: MAX_AGENT_RECORDS,
    maxRecordBytes: 65_536,
    nativeIngress,
  });
  const hostLinks = await linkHostAgentSessions(
    tree,
    agentRecords.records,
    mainSessionId,
    consent.allowedSourceRoots,
    isWin,
    effectiveLimits,
    signal,
    agentRecords.truncated || agentRecords.gaps > 0,
    sourceHandleRegistry,
  );
  const linkedHostSessionIds = new Set(
    hostLinks.linked.map((link) => link.record.sessionId),
  );
  for (const taskPath of [...childFiles]) {
    const sessionId = childSessionByPath.get(taskPath);
    if (!sessionId || !linkedHostSessionIds.has(sessionId)) continue;
    childFiles.splice(childFiles.indexOf(taskPath), 1);
    childSessionByPath.delete(taskPath);
    taskSessionIds.delete(sessionId);
    const source = parsedSources.get(path.resolve(taskPath));
    if (source) {
      parsedSources.delete(path.resolve(taskPath));
      sourceHandleRegistry.delete(source);
      await source.close().catch(() => undefined);
    }
    taskAgentsReadCount = Math.max(0, taskAgentsReadCount - 1);
  }
  const sourceHandles = new Map<string, ReadSource>();
  const mainSource = parsedSources.get(path.resolve(winner.filePath));
  if (!mainSource) {
    return { state: "ambiguous-session", candidates: 1 };
  }
  sourceHandles.set(path.resolve(winner.filePath), mainSource);
  const hostSourceHandles = new Map<string, ReadSource>();
  if (hostLinks.rootMatched) {
    hostAgentsSource = "agent-records";
    for (const link of hostLinks.linked) {
      if (
        childFiles.length >= effectiveLimits.maxChildFiles ||
        taskSessionIds.has(link.record.sessionId)
      ) {
        hostAgentsTruncated = true;
        if (sourceHandleRegistry.delete(link.handle)) {
          await link.handle.close().catch(() => undefined);
        }
        continue;
      }
      if (childFiles.includes(link.filePath)) {
        if (sourceHandleRegistry.delete(link.handle)) {
          await link.handle.close().catch(() => undefined);
        }
        continue;
      }
      childFiles.push(link.filePath);
      childSessionByPath.set(link.filePath, link.record.sessionId);
      hostSourceHandles.set(path.resolve(link.filePath), link.handle);
      hostAgentsReadCount += 1;
    }
  }
  for (const childPath of childFiles) {
    const absolute = path.resolve(childPath);
    const source =
      hostSourceHandles.get(absolute) ?? parsedSources.get(absolute);
    if (source) sourceHandles.set(absolute, source);
  }

  const hostAgentsCreatedCount = hostLinks.rootMatched
    ? hostLinks.created
    : winner.hostAgentsCreatedCount;
  hostAgentsTruncated ||=
    hostLinks.truncated ||
    hostLinks.linked.length > hostAgentsReadCount ||
    hostAgentsReadCount < hostAgentsCreatedCount ||
    (hostLinks.rootMatched &&
      winner.hostAgentsCreatedCount > hostAgentsCreatedCount);
  const unlinkedAgents =
    Math.max(0, winner.taskAgentsCreatedCount - taskAgentsReadCount) +
    Math.max(0, hostAgentsCreatedCount - hostAgentsReadCount) +
    unprovenChildren;

  const lastSubId = winner.lastSubstantiveEventId ?? mainSessionId;
  const checkpointId = crypto
    .createHash("sha256")
    .update(`${EVIDENCE_SEMANTICS_REVISION}:${mainSessionId}:${lastSubId}`)
    .digest("hex")
    .slice(0, 32);

  const cutoff = clock().toISOString();
  const hostId = "local";
  const manifestNodes: LocalManifest["nodes"] = [
    {
      key: { hostId, sessionId: mainSessionId },
      parent: null,
      disposition: "local-allowed",
      source: {
        format: "omp",
        absolutePath: path.resolve(winner.filePath),
      },
    },
  ];
  for (const childPath of childFiles) {
    const childSessionId = childSessionByPath.get(childPath);
    if (!childSessionId) continue;
    const hostLink = hostLinks.linked.find(
      (link) => link.record.sessionId === childSessionId,
    );
    manifestNodes.push({
      key: { hostId, sessionId: childSessionId },
      parent: {
        hostId,
        sessionId: hostLink?.parentSessionId ?? mainSessionId,
      },
      disposition: "local-allowed",
      source: {
        format: "omp",
        absolutePath: path.resolve(childPath),
      },
    });
  }

  const manifest: LocalManifest = {
    schemaVersion: 1,
    provenance: "host-local",
    main: { hostId, sessionId: mainSessionId },
    checkpointId,
    cutoff,
    nodes: manifestNodes,
  };

  localManifestSchema.parse(manifest);
  const childSessions: Extract<Discovery, { state: "bound" }>["childSessions"] =
    [];
  for (const childPath of childFiles) {
    const absolutePath = path.resolve(childPath);
    const source = sourceHandles.get(absolutePath);
    const sessionId = childSessionByPath.get(childPath);
    if (!source || !sessionId) {
      throw new RetrospectiveError(
        "NATIVE_SOURCE_UNAVAILABLE",
        "Discovered child metadata is unavailable",
      );
    }
    const stat = await source.stat();
    childSessions.push({
      absolutePath,
      sessionId,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }

  return {
    state: "bound",
    manifest,
    mainFile: path.resolve(winner.filePath),
    childFiles: childFiles.map((p) => path.resolve(p)),
    childSessions,
    createdAgentsCount: winner.taskAgentsCreatedCount + hostAgentsCreatedCount,
    taskAgentsCreatedCount: winner.taskAgentsCreatedCount,
    hostAgentsCreatedCount,
    taskAgentsReadCount,
    hostAgentsReadCount,
    hostAgentsSource,
    sourceHandles,
    hostAgentsTruncated,
    unlinkedAgents,
    rootVerification: "unverified-root",
  };
}
