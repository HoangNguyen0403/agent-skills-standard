import path from "node:path";
import { z } from "zod";
import { RetrospectiveError } from "./errors";
import {
  loadNativeIngress,
  type NativeCursor,
  type NativeDirectory,
  type NativeIngressApi,
} from "./native-ingress";
import { createReadSource, type ReadSource } from "./read-source";
export type AgentRecord = {
  readonly id: string;
  readonly provider: string;
  readonly sessionId: string;
  readonly parentAgentId: string | null;
};

export type AgentRecordRead = {
  readonly records: readonly AgentRecord[];
  readonly directoriesRead: number;
  readonly recordsRead: number;
  readonly entriesVisited: number;
  readonly gaps: number;
  readonly truncated: boolean;
};

export type AgentRecordReadOptions = {
  readonly signal?: AbortSignal;
  readonly maxDirectories?: number;
  readonly maxRecords?: number;
  readonly maxRecordBytes?: number;
  readonly maxEntries?: number;
  readonly nativeIngress?: NativeIngressApi;
};

const AGENT_ID = /^[A-Za-z0-9-]{8,128}$/;
const PROVIDER = /^[A-Za-z0-9._-]{1,32}$/;
const DEFAULT_MAX_DIRECTORIES = 4_096;
const DEFAULT_MAX_RECORDS = 20_000;
const DEFAULT_MAX_RECORD_BYTES = 65_536;
const DIRECTORY_BATCH_SIZE = 64;

const agentRecordSchema = z.object({
  id: z.string().regex(AGENT_ID),
  provider: z.string().regex(PROVIDER),
  persistence: z.object({ sessionId: z.string().regex(AGENT_ID) }),
  labels: z.record(z.string(), z.unknown()),
});

function parseRecord(raw: string, expectedId: string): AgentRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = agentRecordSchema.safeParse(value);
  if (!parsed.success || parsed.data.id !== expectedId) return null;
  const parent = parsed.data.labels["paseo.parent-agent-id"];
  if (parent !== undefined && (typeof parent !== "string" || !AGENT_ID.test(parent))) {
    return null;
  }
  return {
    id: parsed.data.id,
    provider: parsed.data.provider,
    sessionId: parsed.data.persistence.sessionId,
    parentAgentId: typeof parent === "string" ? parent : null,
  };
}


function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new RetrospectiveError("ABORTED", "Agent record scan was aborted");
  }
}

async function loadIngress(
  supplied: NativeIngressApi | undefined,
): Promise<NativeIngressApi> {
  if (supplied) return supplied;
  const result = await loadNativeIngress();
  if (result.state !== "available") {
    throw new RetrospectiveError(result.code, result.message);
  }
  return result.api;
}

async function readRecord(
  api: NativeIngressApi,
  parent: NativeDirectory,
  entryName: string,
  expectedId: string,
  maxBytes: number,
  signal: AbortSignal | undefined,
): Promise<AgentRecord | null> {
  let source: ReadSource | undefined;
  try {
    const fd = await api.openRegularFile(parent, entryName);
    source = createReadSource(fd);
    throwIfAborted(signal);
    const stats = await source.stat();
    if (!stats.isFile() || stats.size <= 0 || stats.size > maxBytes) {
      return null;
    }
    const buffer = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < buffer.length) {
      throwIfAborted(signal);
      const { bytesRead } = await source.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    throwIfAborted(signal);
    return offset === buffer.length
      ? parseRecord(buffer.toString("utf8"), expectedId)
      : null;
  } catch {
    throwIfAborted(signal);
    return null;
  } finally {
    await source?.close().catch(() => undefined);
  }
}

/** Reads only <root>/<directory>/<identifier>.json files and retains four fields. */
export async function readAgentRecords(
  roots: readonly string[],
  options: AgentRecordReadOptions = {},
): Promise<AgentRecordRead> {
  const maxDirectories = options.maxDirectories ?? DEFAULT_MAX_DIRECTORIES;
  const maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
  const maxRecordBytes = options.maxRecordBytes ?? DEFAULT_MAX_RECORD_BYTES;
  const maxEntries = options.maxEntries ?? maxDirectories + maxRecords;
  const recordsById = new Map<string, AgentRecord>();
  let directoriesRead = 0;
  let recordsRead = 0;
  let entriesVisited = 0;
  let gaps = 0;
  let truncated = false;
  const seen = new Set<string>();
  const ambiguousIds = new Set<string>();
  if (roots.length === 0) {
    return {
      records: [],
      directoriesRead,
      recordsRead,
      entriesVisited,
      gaps,
      truncated,
    };
  }

  const api = await loadIngress(options.nativeIngress);
  const processRecords = async (directory: NativeDirectory): Promise<void> => {
    let cursor: NativeCursor | undefined;
    try {
      cursor = await api.openDirectoryStream(directory);
      throwIfAborted(options.signal);
      while (true) {
        if (entriesVisited >= maxEntries || recordsRead >= maxRecords) {
          truncated = true;
          return;
        }
        throwIfAborted(options.signal);
        const limit = Math.min(DIRECTORY_BATCH_SIZE, maxEntries - entriesVisited);
        const batch = await api.readDirectoryBatch(cursor, limit);
        throwIfAborted(options.signal);
        if (
          !Number.isSafeInteger(batch.visited) ||
          batch.visited < batch.entries.length ||
          batch.visited > limit
        ) {
          gaps += 1;
          truncated = true;
          return;
        }
        entriesVisited += batch.visited;
        for (const entry of batch.entries) {
          const match = /^([A-Za-z0-9-]{8,128})\.json$/.exec(entry.name);
          if (!match) continue;
          if (recordsRead >= maxRecords) {
            truncated = true;
            break;
          }
          const id = match[1];
          if (!id) continue;
          const duplicate = seen.has(id);
          seen.add(id);
          recordsRead += 1;
          if (entry.kind === "symlink") {
            gaps += 1;
            if (duplicate) {
              recordsById.delete(id);
              ambiguousIds.add(id);
            }
          } else if (!ambiguousIds.has(id)) {
            if (duplicate && !recordsById.has(id)) {
              gaps += 1;
              ambiguousIds.add(id);
            } else {
              const record = await readRecord(
                api,
                directory,
                entry.name,
                id,
                maxRecordBytes,
                options.signal,
              );
              if (!record) {
                gaps += 1;
                if (duplicate) {
                  recordsById.delete(id);
                  ambiguousIds.add(id);
                }
              } else if (!duplicate) {
                recordsById.set(id, record);
              } else {
                const previous = recordsById.get(id);
                if (
                  !previous ||
                  previous.provider !== record.provider ||
                  previous.sessionId !== record.sessionId ||
                  previous.parentAgentId !== record.parentAgentId
                ) {
                  recordsById.delete(id);
                  ambiguousIds.add(id);
                  gaps += 1;
                }
              }
            }
          }
          if (recordsRead >= maxRecords) {
            truncated = true;
            break;
          }
        }
        if (truncated) return;
        if (batch.done) return;
        if (entriesVisited >= maxEntries) {
          truncated = true;
          return;
        }
      }
    } catch {
      throwIfAborted(options.signal);
      gaps += 1;
    } finally {
      if (cursor) await api.closeCursor(cursor).catch(() => undefined);
    }
  };

  for (const root of roots) {
    if (options.signal?.aborted) {
      truncated = true;
      break;
    }
    if (!path.isAbsolute(root) || root.includes("\\0")) {
      gaps += 1;
      continue;
    }
    let rootDirectory: NativeDirectory | undefined;
    let cursor: NativeCursor | undefined;
    try {
      rootDirectory = await api.openRoot(root);
      throwIfAborted(options.signal);
      cursor = await api.openDirectoryStream(rootDirectory);
      throwIfAborted(options.signal);
      while (true) {
        if (
          entriesVisited >= maxEntries ||
          directoriesRead >= maxDirectories ||
          recordsRead >= maxRecords
        ) {
          truncated = true;
          break;
        }
        throwIfAborted(options.signal);
        const limit = Math.min(DIRECTORY_BATCH_SIZE, maxEntries - entriesVisited);
        const batch = await api.readDirectoryBatch(cursor, limit);
        throwIfAborted(options.signal);
        if (
          !Number.isSafeInteger(batch.visited) ||
          batch.visited < batch.entries.length ||
          batch.visited > limit
        ) {
          gaps += 1;
          truncated = true;
          break;
        }
        entriesVisited += batch.visited;
        for (const entry of batch.entries) {
          if (directoriesRead >= maxDirectories || recordsRead >= maxRecords) {
            truncated = true;
            break;
          }
          if (entry.kind === "unknown") {
            gaps += 1;
            continue;
          }
          if (entry.kind === "symlink") {
            gaps += 1;
            continue;
          }
          if (entry.kind !== "directory") continue;
          directoriesRead += 1;
          let childDirectory: NativeDirectory | undefined;
          try {
            childDirectory = await api.openChildDirectory(
              rootDirectory,
              entry.name,
            );
            throwIfAborted(options.signal);
            await processRecords(childDirectory);
          } catch {
            throwIfAborted(options.signal);
            gaps += 1;
          } finally {
            if (childDirectory) {
              await api.closeDirectory(childDirectory).catch(() => undefined);
            }
          }
          if (truncated) break;
        }
        if (truncated || batch.done) break;
        if (
          entriesVisited >= maxEntries ||
          directoriesRead >= maxDirectories ||
          recordsRead >= maxRecords
        ) {
          truncated = true;
          break;
        }
      }
    } catch (error) {
      throwIfAborted(options.signal);
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "NATIVE_NOT_FOUND"
      ) {
        gaps += 1;
      }
    } finally {
      if (cursor) await api.closeCursor(cursor).catch(() => undefined);
      if (rootDirectory) {
        await api.closeDirectory(rootDirectory).catch(() => undefined);
      }
    }
    if (truncated) break;
  }
  return {
    records: [...recordsById.values()],
    directoriesRead,
    recordsRead,
    entriesVisited,
    gaps,
    truncated,
  };
}
