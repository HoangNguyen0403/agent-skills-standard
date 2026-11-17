import crypto from "node:crypto";
import { constants, type Dirent, type ReadStream, type Stats } from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ConsentRecord } from "./consent";
import {
  DEFAULT_LIMITS,
  EVIDENCE_SEMANTICS_REVISION,
  localManifestSchema,
  type LocalManifest,
} from "./contracts";
import { RetrospectiveError } from "./errors";
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
      unlinkedAgents: number;
      rootVerification: "unverified-root";
    }
  | { state: "ambiguous-session"; candidates: number }
  | { state: "child-session" }
  | { state: "no-evidence" };

const READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const TOLERANCE_MS = 250;
const MAX_TRACKED_CALL_IDS = 10_000;
const MTIME_WINDOW_MS = 2_000;
const ABORT_CHECK_LINES = 1_000;
const DEFAULT_MAX_CALLS_PER_FILE = 200_000;
const DEFAULT_MAX_CHILD_FILES = 256;
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
  allowedRoots: string[],
  isWin: boolean,
): boolean {
  return allowedRoots.some((root) => isPathInside(targetPath, root, isWin));
}

type StatOutcome =
  { kind: "ok"; stat: Stats } | { kind: "missing" } | { kind: "failed" };

async function lstatPath(target: string): Promise<StatOutcome> {
  try {
    return { kind: "ok", stat: await fsp.lstat(target) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return { kind: "missing" };
    return { kind: "failed" };
  }
}

/**
 * Reads a directory listing. A missing (or non-directory) path is an empty
 * listing; any other failure is `null` so the caller can fail closed instead of
 * silently dropping candidates.
 */
async function readDirectory(dirPath: string): Promise<Dirent[] | null> {
  try {
    return await fsp.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    return null;
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
  parentSession: string | null;
  calls: CandidateCall[];
  createdAgentsCount: number;
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
  options: ParseOptions,
): Promise<ParseOutcome> {
  const handle = await fsp.open(filePath, READ_FLAGS).catch(() => null);
  if (!handle) return { kind: "skipped" };

  let stream: ReadStream | undefined;
  try {
    const stats = await handle.stat().catch(() => null);
    if (!stats || !stats.isFile()) return { kind: "skipped" };

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
              if (item.name === "create_agent") {
                createdAgentsCount += 1;
              } else if (item.name === "task") {
                if (
                  typeof item.arguments === "object" &&
                  item.arguments !== null &&
                  "tasks" in item.arguments &&
                  Array.isArray(item.arguments.tasks)
                ) {
                  createdAgentsCount += item.arguments.tasks.length;
                } else {
                  createdAgentsCount += 1;
                }
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

    if (size > 0) {
      stream = handle.createReadStream({
        autoClose: false,
        start: 0,
        end: size - 1,
      });
      stream.on("error", () => undefined);

      const lineLimit = options.lineBytes;
      let parts: Buffer[] = [];
      let currentLength = 0;
      let tooLong = false;
      let lineCount = 0;

      for await (const chunk of stream) {
        throwIfAborted(options.signal);
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

        let start = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          if (buffer[index] !== 0x0a) continue;
          const segment = buffer.subarray(start, index);
          start = index + 1;

          lineCount += 1;
          if (lineCount % ABORT_CHECK_LINES === 0) {
            throwIfAborted(options.signal);
          }

          if (tooLong) {
            tooLong = false;
            parts = [];
            currentLength = 0;
            continue;
          }

          if (currentLength + segment.length > lineLimit) {
            tooLong = false;
            parts = [];
            currentLength = 0;
            continue;
          }

          parts.push(segment);
          const lineBuf = parts.length === 1 ? parts[0] : Buffer.concat(parts);
          parts = [];
          currentLength = 0;
          processLine(lineBuf);
        }

        if (start < buffer.length) {
          const remainder = buffer.subarray(start);
          if (!tooLong) {
            if (currentLength + remainder.length > lineLimit) {
              tooLong = true;
              parts = [];
              currentLength = 0;
            } else {
              parts.push(remainder);
              currentLength += remainder.length;
            }
          }
        }
      }

      throwIfAborted(options.signal);

      if (!tooLong && parts.length > 0) {
        const lineBuf = parts.length === 1 ? parts[0] : Buffer.concat(parts);
        processLine(lineBuf);
      }
    }

    if (!headerValid) return { kind: "not-session" };
    if (headerConflict || sessionId === null) return { kind: "skipped" };

    return {
      kind: "parsed",
      candidate: {
        filePath,
        sessionId,
        parentSession,
        calls,
        createdAgentsCount,
        lastSubstantiveEventId,
        lastEventTimestamp,
        score: 0,
      },
      bytes: size,
    };
  } finally {
    if (stream) stream.destroy();
    await handle.close().catch(() => undefined);
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
    dirents: Dirent[],
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
    const rootInfo = await lstatPath(root);
    if (rootInfo.kind === "failed") {
      failedScans += 1;
      continue;
    }
    if (rootInfo.kind === "missing") continue;
    if (!rootInfo.stat.isDirectory() || rootInfo.stat.isSymbolicLink()) {
      continue;
    }

    const dirents = await readDirectory(root);
    if (dirents === null) {
      failedScans += 1;
      continue;
    }

    collectJsonl(root, dirents, candidateFiles);

    const subdirs = dirents.filter(
      (d) => d.isDirectory() && !d.isSymbolicLink(),
    );

    for (const sub of subdirs) {
      throwIfAborted(signal);
      const subPath = path.join(root, sub.name);
      if (!isInsideAllowedRoots(subPath, allowedRoots, isWin)) continue;

      const matchesSlug = slugs.some(
        (s) =>
          s === sub.name ||
          (isWin && s.toLowerCase() === sub.name.toLowerCase()),
      );
      if (!matchesSlug) continue;

      const subDirents = await readDirectory(subPath);
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
        const subDirents = await readDirectory(subPath);
        if (subDirents === null) {
          failedScans += 1;
          continue;
        }
        collectJsonl(subPath, subDirents, candidateFiles);
      }
    }
  }

  // OMP nests `task` sub-agent transcripts one level below a sibling directory
  // named after the parent session file (without its extension). Those nested
  // files are candidates in their own right: a worker calls the server itself.
  for (const filePath of Array.from(candidateFiles)) {
    throwIfAborted(signal);
    if (!filePath.endsWith(".jsonl")) continue;
    const siblingDir = filePath.slice(0, filePath.length - ".jsonl".length);
    if (!isInsideAllowedRoots(siblingDir, allowedRoots, isWin)) continue;

    const dirInfo = await lstatPath(siblingDir);
    if (dirInfo.kind === "failed") {
      failedScans += 1;
      continue;
    }
    if (dirInfo.kind === "missing") continue;
    if (!dirInfo.stat.isDirectory() || dirInfo.stat.isSymbolicLink()) continue;

    const dirents = await readDirectory(siblingDir);
    if (dirents === null) {
      failedScans += 1;
      continue;
    }

    const nested = dirents
      .filter(
        (d) => d.isFile() && !d.isSymbolicLink() && d.name.endsWith(".jsonl"),
      )
      .map((d) => path.join(siblingDir, d.name))
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
    const info = await lstatPath(filePath);
    if (info.kind === "missing") continue;
    if (info.kind === "failed") {
      // Kept so the scan loop can count it as unscorable instead of binding.
      files.push(filePath);
      continue;
    }
    if (!info.stat.isFile() || info.stat.isSymbolicLink()) continue;
    files.push(filePath);
  }

  return { files, nestedFiles, failedScans };
}

async function resolveSiblingDir(
  dirPath: string,
  allowedRoots: string[],
  isWin: boolean,
): Promise<Dirent[] | null | undefined> {
  if (!isInsideAllowedRoots(dirPath, allowedRoots, isWin)) return undefined;
  const dirInfo = await lstatPath(dirPath);
  if (dirInfo.kind === "missing") return undefined;
  if (dirInfo.kind === "failed") return null;
  if (!dirInfo.stat.isDirectory() || dirInfo.stat.isSymbolicLink()) {
    return undefined;
  }
  return readDirectory(dirPath);
}

const MAX_HEADER_BYTES = 65_536;

/**
 * Reads only the first row of a candidate child to learn its declared header.
 * Bounded, `O_NOFOLLOW`, and never used for aggregation. A file without a valid
 * native session header yields no lineage.
 */
async function readSessionHeader(filePath: string): Promise<{
  valid: boolean;
  sessionId: string | null;
  parentSession: string | null;
}> {
  const handle = await fsp.open(filePath, READ_FLAGS).catch(() => null);
  if (!handle) return { valid: false, sessionId: null, parentSession: null };
  try {
    const stats = await handle.stat().catch(() => null);
    if (!stats || !stats.isFile())
      return { valid: false, sessionId: null, parentSession: null };
    const length = Math.min(stats.size, MAX_HEADER_BYTES);
    if (length === 0)
      return { valid: false, sessionId: null, parentSession: null };
    const buffer = Buffer.alloc(Number(length));
    const read = await handle.read(buffer, 0, buffer.length, 0);
    const text = buffer.subarray(0, read.bytesRead).toString("utf8");
    let row: Record<string, unknown> | null = null;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      const parsed: unknown = JSON.parse(line);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return { valid: false, sessionId: null, parentSession: null };
      }
      const candidate = parsed as Record<string, unknown>;
      if (candidate.type === "title" && candidate.v === 1 && row === null) {
        continue;
      }
      row = candidate;
      break;
    }
    if (
      row === null ||
      row.type !== "session" ||
      typeof row.id !== "string" ||
      !SESSION_ID_PATTERN.test(row.id)
    ) {
      return { valid: false, sessionId: null, parentSession: null };
    }
    return {
      valid: true,
      sessionId: row.id,
      parentSession:
        typeof row.parentSession === "string" ? row.parentSession : null,
    };
  } catch {
    return { valid: false, sessionId: null, parentSession: null };
  } finally {
    await handle.close().catch(() => undefined);
  }
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

  for (const filePath of candidateFilePaths) {
    throwIfAborted(signal);
    if (!isInsideAllowedRoots(filePath, consent.allowedSourceRoots, isWin)) {
      continue;
    }

    const info = await lstatPath(filePath);
    if (info.kind !== "ok") {
      unscorableCount += 1;
      continue;
    }
    if (!info.stat.isFile() || info.stat.isSymbolicLink()) {
      continue;
    }
    if (info.stat.mtimeMs < mtimeWindowStart) {
      // Last modified before the earliest observed record: it cannot hold the
      // call that record describes, so it is never opened.
      continue;
    }

    const outcome = await parseCandidateFile(filePath, {
      signal,
      lineBytes: DEFAULT_LIMITS.lineBytes,
      maxCallsPerFile: effectiveLimits.maxCallsPerFile,
      maxCandidateBytes: effectiveLimits.maxCandidateBytes,
      remainingTotalBytes: effectiveLimits.maxTotalBytes - totalCandidateBytes,
    });

    if (outcome.kind === "not-session") {
      continue;
    }
    if (outcome.kind === "skipped") {
      unscorableCount += 1;
      continue;
    }
    totalCandidateBytes += outcome.bytes;
    parsedCandidates.push(outcome.candidate);
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

  // A nested OMP sub-agent file, or any file whose header claims a parent, is a
  // verified child: the caller is a worker, not the session's root.
  if (winner.parentSession !== null || scan.nestedFiles.has(winner.filePath)) {
    return { state: "child-session" };
  }

  const childFiles: string[] = [];
  const childSessions: Array<{
    absolutePath: string;
    sessionId: string;
    size: number;
    mtimeMs: number;
  }> = [];
  const childKeys = new Set<string>();
  const seenChildPaths = new Set<string>();
  let unprovenChildren = 0;
  const baseWithoutExt = winner.filePath.replace(/\.jsonl$/i, "");
  const siblingDirsToCheck = [
    baseWithoutExt,
    path.join(path.dirname(winner.filePath), winner.sessionId),
  ];

  for (const sibDir of siblingDirsToCheck) {
    if (childFiles.length >= effectiveLimits.maxChildFiles) break;
    const dirents = await resolveSiblingDir(
      sibDir,
      consent.allowedSourceRoots,
      isWin,
    );
    if (dirents === null) {
      // The directory exists but cannot be listed: children are unknowable.
      return { state: "ambiguous-session", candidates: 1 };
    }
    if (dirents === undefined) continue;

    const names = dirents
      .filter(
        (d) => d.isFile() && !d.isSymbolicLink() && d.name.endsWith(".jsonl"),
      )
      .map((d) => d.name)
      .sort();

    for (const name of names) {
      if (childFiles.length >= effectiveLimits.maxChildFiles) break;
      const fullChild = path.join(sibDir, name);
      if (!isInsideAllowedRoots(fullChild, consent.allowedSourceRoots, isWin)) {
        continue;
      }
      const st = await lstatPath(fullChild);
      if (st.kind !== "ok" || !st.stat.isFile() || st.stat.isSymbolicLink()) {
        continue;
      }
      if (seenChildPaths.has(fullChild)) continue;
      seenChildPaths.add(fullChild);
      const header = await readSessionHeader(fullChild);
      if (
        !header.valid ||
        header.sessionId === null ||
        header.sessionId === winner.sessionId ||
        !provesDeclaredParent(
          header.parentSession,
          winner.sessionId,
          winner.filePath,
        )
      ) {
        // Directory proximity is not parentage. Keep the actor out of the
        // linked set so coverage stays partial instead of inventing lineage.
        unprovenChildren += 1;
        continue;
      }
      if (childKeys.has(header.sessionId)) {
        continue;
      }
      childKeys.add(header.sessionId);
      childSessions.push({
        absolutePath: fullChild,
        sessionId: header.sessionId,
        size: Number(st.stat.size),
        mtimeMs: st.stat.mtimeMs,
      });
      if (!childFiles.includes(fullChild)) {
        childFiles.push(fullChild);
      }
    }
  }

  childSessions.sort((left, right) =>
    left.absolutePath < right.absolutePath
      ? -1
      : left.absolutePath > right.absolutePath
        ? 1
        : 0,
  );
  childFiles.length = 0;
  for (const child of childSessions) {
    childFiles.push(path.resolve(child.absolutePath));
  }

  const unlinkedAgents =
    Math.max(0, winner.createdAgentsCount - childSessions.length) +
    unprovenChildren;

  const mainSessionId = winner.sessionId;
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

  for (const child of childSessions) {
    manifestNodes.push({
      key: { hostId, sessionId: child.sessionId },
      parent: { hostId, sessionId: mainSessionId },
      disposition: "local-allowed",
      source: {
        format: "omp",
        absolutePath: path.resolve(child.absolutePath),
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

  return {
    state: "bound",
    manifest,
    mainFile: path.resolve(winner.filePath),
    childFiles: childFiles.map((p) => path.resolve(p)),
    childSessions: childSessions.map((child) => ({
      absolutePath: path.resolve(child.absolutePath),
      sessionId: child.sessionId,
      size: child.size,
      mtimeMs: child.mtimeMs,
    })),
    unlinkedAgents,
    rootVerification: "unverified-root",
  };
}
