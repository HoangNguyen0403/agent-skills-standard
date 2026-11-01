import crypto from "node:crypto";
import { constants } from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import type { ConsentRecord } from "./consent";
import { localManifestSchema, type LocalManifest } from "./contracts";

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
      unlinkedAgents: number;
      rootVerification: "unverified-root";
    }
  | { state: "ambiguous-session"; candidates: number }
  | { state: "child-session" }
  | { state: "no-evidence" };

const READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const TOLERANCE_MS = 250;
const MCP_DEVICE_PREFIX = "xd://mcp__agent_skills_standard_";

export type DiscoveryLimits = {
  maxCandidateFiles: number;
  maxCandidateBytes: number;
  maxTotalBytes: number;
};

export const DEFAULT_DISCOVERY_LIMITS: Readonly<DiscoveryLimits> =
  Object.freeze({
    maxCandidateFiles: 200,
    maxCandidateBytes: 512 * 1024 * 1024,
    maxTotalBytes: 2 * 1024 * 1024 * 1024,
  });
const HOUSEKEEPING_TOOLS: Record<string, true> = {
  prepare_retrospective: true,
  get_retrospective_status: true,
};

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

function extractServerToolName(name: unknown, args: unknown): string | null {
  if (typeof name !== "string") return null;
  if (name === "write" && typeof args === "object" && args !== null) {
    if ("path" in args && typeof args.path === "string") {
      const targetPath = args.path;
      if (targetPath.startsWith(MCP_DEVICE_PREFIX)) {
        const toolSuffix = targetPath.slice(MCP_DEVICE_PREFIX.length);
        if (toolSuffix.length > 0 && /^[a-zA-Z0-9_-]+$/.test(toolSuffix)) {
          return toolSuffix;
        }
      }
    }
    return null;
  }
  if (name !== "write") {
    return name;
  }
  return null;
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
  cwd: string | null;
  calls: CandidateCall[];
  createdAgentsCount: number;
  lastSubstantiveEventId: string | null;
  lastEventTimestamp: string | null;
  score: number;
};

async function parseCandidateFile(
  filePath: string,
): Promise<ParsedCandidate | null> {
  const handle = await fsp.open(filePath, READ_FLAGS).catch(() => null);
  if (!handle) return null;

  try {
    const stats = await handle.stat();
    if (!stats.isFile()) return null;

    const stream = handle.createReadStream({ autoClose: false, start: 0 });
    stream.on("error", () => undefined);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let sessionId: string | null = null;
    let parentSession: string | null = null;
    let cwd: string | null = null;
    let lastSubstantiveEventId: string | null = null;
    let lastEventTimestamp: string | null = null;
    let createdAgentsCount = 0;

    const calls: CandidateCall[] = [];
    const pendingCalls = new Map<string, CandidateCall>();

    for await (const line of rl) {
      if (!line.trim()) continue;

      let row: Record<string, unknown>;
      try {
        const parsed = JSON.parse(line);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        )
          continue;
        row = parsed as Record<string, unknown>;
      } catch {
        continue;
      }

      if (row.type === "session") {
        if (typeof row.id === "string") sessionId = row.id;
        if (typeof row.cwd === "string") cwd = row.cwd;
        if (typeof row.parentSession === "string")
          parentSession = row.parentSession;
      } else if (
        row.type === "session_meta" &&
        typeof row.payload === "object" &&
        row.payload !== null
      ) {
        const payload = row.payload as Record<string, unknown>;
        if (typeof payload.id === "string") sessionId = payload.id;
        if (typeof payload.cwd === "string") cwd = payload.cwd;
      }

      let rowTs = NaN;
      if (typeof row.timestamp === "string") {
        rowTs = Date.parse(row.timestamp);
        if (!Number.isNaN(rowTs)) {
          lastEventTimestamp = row.timestamp;
        }
      }

      const rowId = typeof row.id === "string" ? row.id : null;

      let isHousekeeping = false;

      if (
        row.type === "message" &&
        typeof row.message === "object" &&
        row.message !== null
      ) {
        const msg = row.message as Record<string, unknown>;
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
          for (const item of msg.content) {
            if (
              typeof item === "object" &&
              item !== null &&
              item.type === "toolCall"
            ) {
              const toolName = extractServerToolName(item.name, item.arguments);
              if (toolName) {
                if (toolName in HOUSEKEEPING_TOOLS) {
                  isHousekeeping = true;
                }
                const callRecord: CandidateCall = {
                  tool: toolName,
                  callTs: rowTs,
                  resultTs: null,
                };
                calls.push(callRecord);
                if (typeof item.id === "string") {
                  pendingCalls.set(item.id, callRecord);
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
        } else if (msg.role === "toolResult") {
          const toolCallId =
            typeof msg.toolCallId === "string" ? msg.toolCallId : null;
          if (toolCallId && pendingCalls.has(toolCallId)) {
            pendingCalls.get(toolCallId)!.resultTs = rowTs;
          }
        }
      }

      if (rowId !== null && !isHousekeeping && row.type !== "title") {
        lastSubstantiveEventId = rowId;
      }
    }

    const effectiveId =
      sessionId ?? path.basename(filePath).replace(/\.jsonl$/i, "");

    return {
      filePath,
      sessionId: effectiveId,
      parentSession,
      cwd,
      calls,
      createdAgentsCount,
      lastSubstantiveEventId,
      lastEventTimestamp,
      score: 0,
    };
  } finally {
    await handle.close();
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

async function findCandidateFiles(
  allowedRoots: string[],
  workspace: string,
  isWin: boolean,
): Promise<string[]> {
  const candidateFiles = new Set<string>();
  const slugs = computeWorkspaceSlugs(workspace);

  for (const root of allowedRoots) {
    if (!isPathInside(root, root, isWin)) continue;
    const rootStat = await fsp.lstat(root).catch(() => null);
    if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      continue;
    }

    const dirents = await fsp
      .readdir(root, { withFileTypes: true })
      .catch(() => []);

    const directJsonl = dirents.filter(
      (d) => d.isFile() && !d.isSymbolicLink() && d.name.endsWith(".jsonl"),
    );
    if (directJsonl.length > 0) {
      for (const d of directJsonl) {
        const full = path.join(root, d.name);
        if (isInsideAllowedRoots(full, allowedRoots, isWin)) {
          candidateFiles.add(full);
        }
      }
    }

    const subdirs = dirents.filter(
      (d) => d.isDirectory() && !d.isSymbolicLink(),
    );

    for (const sub of subdirs) {
      const subPath = path.join(root, sub.name);
      if (!isInsideAllowedRoots(subPath, allowedRoots, isWin)) continue;

      const matchesSlug = slugs.some(
        (s) =>
          s === sub.name ||
          (isWin && s.toLowerCase() === sub.name.toLowerCase()),
      );

      if (matchesSlug) {
        const subDirents = await fsp
          .readdir(subPath, { withFileTypes: true })
          .catch(() => []);
        for (const file of subDirents) {
          if (
            file.isFile() &&
            !file.isSymbolicLink() &&
            file.name.endsWith(".jsonl")
          ) {
            const full = path.join(subPath, file.name);
            if (isInsideAllowedRoots(full, allowedRoots, isWin)) {
              candidateFiles.add(full);
            }
          }
        }
      }
    }

    if (candidateFiles.size === 0) {
      for (const sub of subdirs) {
        const subPath = path.join(root, sub.name);
        if (!isInsideAllowedRoots(subPath, allowedRoots, isWin)) continue;
        const subDirents = await fsp
          .readdir(subPath, { withFileTypes: true })
          .catch(() => []);
        const jsonlFiles = subDirents.filter(
          (d) => d.isFile() && !d.isSymbolicLink() && d.name.endsWith(".jsonl"),
        );
        for (const file of jsonlFiles) {
          const full = path.join(subPath, file.name);
          if (isInsideAllowedRoots(full, allowedRoots, isWin)) {
            candidateFiles.add(full);
          }
        }
      }
    }
  }

  const result: string[] = [];
  for (const filePath of candidateFiles) {
    if (!isInsideAllowedRoots(filePath, allowedRoots, isWin)) continue;
    const st = await fsp.lstat(filePath).catch(() => null);
    if (st && st.isFile() && !st.isSymbolicLink()) {
      result.push(filePath);
    }
  }

  return result;
}

export async function discoverSession(
  consent: ConsentRecord,
  observation: ServerObservation,
  clock: () => Date = () => new Date(),
  platform: NodeJS.Platform = process.platform,
  limits?: Partial<DiscoveryLimits>,
): Promise<Discovery> {
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
  const candidateFilePaths = await findCandidateFiles(
    consent.allowedSourceRoots,
    observation.workspace,
    isWin,
  );

  if (candidateFilePaths.length === 0) {
    return { state: "no-evidence" };
  }

  if (candidateFilePaths.length > effectiveLimits.maxCandidateFiles) {
    return {
      state: "ambiguous-session",
      candidates: candidateFilePaths.length,
    };
  }

  let totalCandidateBytes = 0;
  let unscorableCount = 0;
  const parsedCandidates: ParsedCandidate[] = [];

  for (const filePath of candidateFilePaths) {
    if (!isInsideAllowedRoots(filePath, consent.allowedSourceRoots, isWin)) {
      continue;
    }
    const st = await fsp.stat(filePath).catch(() => null);
    if (!st || !st.isFile()) {
      continue;
    }
    if (
      st.size > effectiveLimits.maxCandidateBytes ||
      totalCandidateBytes + st.size > effectiveLimits.maxTotalBytes
    ) {
      unscorableCount += 1;
      continue;
    }
    totalCandidateBytes += st.size;
    const parsed = await parseCandidateFile(filePath);
    if (parsed) {
      parsedCandidates.push(parsed);
    }
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

  const records = observation.toolCalls ?? [];
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

  if (winner.parentSession !== null) {
    return { state: "child-session" };
  }

  const childFiles: string[] = [];
  const baseWithoutExt = winner.filePath.replace(/\.jsonl$/i, "");
  const siblingDirsToCheck = [
    baseWithoutExt,
    path.join(path.dirname(winner.filePath), winner.sessionId),
  ];

  for (const sibDir of siblingDirsToCheck) {
    if (!isInsideAllowedRoots(sibDir, consent.allowedSourceRoots, isWin))
      continue;
    const dirStat = await fsp.lstat(sibDir).catch(() => null);
    if (!dirStat || !dirStat.isDirectory() || dirStat.isSymbolicLink()) {
      continue;
    }

    const dirents = await fsp
      .readdir(sibDir, { withFileTypes: true })
      .catch(() => []);
    for (const d of dirents) {
      if (d.isFile() && !d.isSymbolicLink() && d.name.endsWith(".jsonl")) {
        const fullChild = path.join(sibDir, d.name);
        if (
          isInsideAllowedRoots(fullChild, consent.allowedSourceRoots, isWin)
        ) {
          const st = await fsp.lstat(fullChild).catch(() => null);
          if (st && st.isFile() && !st.isSymbolicLink()) {
            if (!childFiles.includes(fullChild)) {
              childFiles.push(fullChild);
            }
          }
        }
      }
    }
  }

  childFiles.sort();

  const unlinkedAgents = Math.max(
    0,
    winner.createdAgentsCount - childFiles.length,
  );

  const mainSessionId = winner.sessionId;
  const lastSubId = winner.lastSubstantiveEventId ?? mainSessionId;
  const checkpointId = crypto
    .createHash("sha256")
    .update(`${mainSessionId}:${lastSubId}`)
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
    const childName = path.basename(childPath, ".jsonl");
    manifestNodes.push({
      key: { hostId, sessionId: childName },
      parent: { hostId, sessionId: mainSessionId },
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

  return {
    state: "bound",
    manifest,
    mainFile: path.resolve(winner.filePath),
    childFiles: childFiles.map((p) => path.resolve(p)),
    unlinkedAgents,
    rootVerification: "unverified-root",
  };
}
