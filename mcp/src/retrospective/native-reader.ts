import { constants, createReadStream, type BigIntStats } from "node:fs";
import { lstat, open, type FileHandle } from "node:fs/promises";
import type { Readable } from "node:stream";
import {
  DEFAULT_LIMITS,
  localManifestSchema,
  timestampSchema,
  nodeKeyId,
  sameNodeKey,
  type Disposition,
  type EvidenceLimits,
  type EvidenceSource,
  type LocalManifest,
  type NodeKey,
  type SafeEvent,
  type SourceRef,
} from "./contracts";
import { EvidenceBudget, EvidenceLimitError } from "./budget";

export type NativeReaderLimits = Pick<
  EvidenceLimits,
  "sourceBytes" | "lineBytes"
>;

export type NativeSourceOptions = { limits?: NativeReaderLimits };

function cappedLimit(requested: number | undefined, ceiling: number): number {
  if (requested === undefined) return ceiling;
  if (!Number.isSafeInteger(requested) || requested < 1) return ceiling;
  return Math.min(requested, ceiling);
}

type ManifestNode = LocalManifest["nodes"][number];

const READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/+@-]{0,127}$/;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): string | null {
  return typeof value === "string" && IDENTIFIER.test(value) ? value : null;
}

function modelIdentifier(value: unknown): string | null {
  return typeof value === "string" && MODEL.test(value) ? value : null;
}

function optionalModel(value: unknown): string | undefined {
  return modelIdentifier(value) ?? undefined;
}

function timestamp(value: unknown): string | null {
  const parsed = timestampSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function sourceRef(node: NodeKey, eventId: string, line: number): SourceRef {
  return { node: { ...node }, eventId, line };
}

type UsageCounts = NonNullable<SafeEvent["counts"]>;

function usageCounts(value: unknown): UsageCounts | null {
  if (!object(value)) return null;
  const inputTokens = value.input;
  const outputTokens = value.output;
  if (
    typeof inputTokens !== "number" ||
    !Number.isSafeInteger(inputTokens) ||
    inputTokens < 0 ||
    typeof outputTokens !== "number" ||
    !Number.isSafeInteger(outputTokens) ||
    outputTokens < 0
  )
    return null;
  let cost: number | null = null;
  if (value.cost !== undefined) {
    if (!object(value.cost) || typeof value.cost.total !== "number")
      return null;
    if (!Number.isFinite(value.cost.total) || value.cost.total < 0) return null;
    cost = value.cost.total;
  }
  return { inputTokens, outputTokens, cost, currency: null };
}

function codexCounters(value: unknown): {
  input: number;
  output: number;
} | null {
  if (!object(value)) return null;
  const input = value.input_tokens;
  const output = value.output_tokens;
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 0 ||
    typeof output !== "number" ||
    !Number.isSafeInteger(output) ||
    output < 0
  )
    return null;
  return { input, output };
}

class NativeEventProjector {
  private headerSeen = false;
  private malformedCode: string | null = null;
  private model: string | undefined;
  private previousTotal: { input: number; output: number } | null = null;
  private lastOnlySinceTotal = { input: 0, output: 0 };

  constructor(
    private readonly node: NodeKey,
    private readonly format: "omp" | "codex",
  ) {}

  mark(code: string): void {
    this.malformedCode ??= code;
  }

  finish(): string | null {
    return this.malformedCode ?? (this.headerSeen ? null : "identity-missing");
  }

  project(row: unknown, line: number): SafeEvent[] {
    if (!object(row)) {
      this.mark("malformed-record");
      return [];
    }
    if (!this.headerSeen) return this.projectHeader(row, line);
    return this.format === "omp"
      ? this.projectOmp(row, line)
      : this.projectCodex(row, line);
  }

  private projectHeader(
    row: Record<string, unknown>,
    line: number,
  ): SafeEvent[] {
    const at = timestamp(row.timestamp);
    if (this.format === "omp") {
      if (row.type === "title") return [];
      if (row.type !== "session" || row.version !== 3)
        throw new Error("Native OMP session header is missing or invalid.");
      const id = identifier(row.id);
      if (id === null || id !== this.node.sessionId)
        throw new Error("Native OMP session identity does not match its node.");
      if (at === null)
        throw new Error("Native OMP session header has no valid timestamp.");
      this.headerSeen = true;
      return [
        {
          id,
          node: { ...this.node },
          at,
          kind: "launch",
          source: sourceRef(this.node, id, line),
        },
      ];
    }
    if (row.type !== "session_meta" || !object(row.payload))
      throw new Error("Native Codex session header is missing or invalid.");
    const id = identifier(row.payload.id);
    if (id === null || id !== this.node.sessionId)
      throw new Error("Native Codex session identity does not match its node.");
    if (at === null)
      throw new Error("Native Codex session header has no valid timestamp.");
    this.headerSeen = true;
    return [
      {
        id,
        node: { ...this.node },
        at,
        kind: "launch",
        source: sourceRef(this.node, id, line),
      },
    ];
  }

  private projectOmp(row: Record<string, unknown>, line: number): SafeEvent[] {
    const at = timestamp(row.timestamp);
    if (row.type === "model_change") {
      const model = modelIdentifier(row.model);
      const id = identifier(row.id);
      if (model === null || id === null || at === null) {
        this.mark("malformed-record");
        return [];
      }
      return [
        {
          id,
          node: { ...this.node },
          at,
          kind: "launch",
          model,
          source: sourceRef(this.node, id, line),
        },
      ];
    }
    if (row.type === "model_usage") {
      const id = identifier(row.id);
      const counts = usageCounts(row.usage);
      if (id === null || counts === null || at === null) {
        this.mark("malformed-record");
        return [];
      }
      const event: SafeEvent = {
        id,
        node: { ...this.node },
        at,
        kind: "usage",
        counts,
        source: sourceRef(this.node, id, line),
      };
      const provider = optionalModel(row.provider);
      const model = optionalModel(row.model);
      if (provider !== undefined) event.provider = provider;
      if (model !== undefined) event.model = model;
      return [event];
    }
    if (row.type !== "message" || !object(row.message)) return [];
    const message = row.message;
    const id = identifier(row.id);
    if (id === null || at === null) {
      this.mark("malformed-record");
      return [];
    }
    if (message.role === "assistant") {
      const counts = usageCounts(message.usage);
      if (counts === null) {
        if (message.usage !== undefined) this.mark("malformed-record");
        return [];
      }
      const event: SafeEvent = {
        id,
        node: { ...this.node },
        at,
        kind: "usage",
        counts,
        source: sourceRef(this.node, id, line),
      };
      const provider = optionalModel(message.provider);
      const model = optionalModel(message.model);
      if (provider !== undefined) event.provider = provider;
      if (model !== undefined) event.model = model;
      return [event];
    }
    if (message.role === "toolResult") {
      const tool = identifier(message.toolName);
      if (tool === null || typeof message.isError !== "boolean") {
        this.mark("malformed-record");
        return [];
      }
      // A typed tool result is an execution outcome only. It never asserts
      // that the task, criteria, or a review passed.
      return [
        {
          id,
          node: { ...this.node },
          at,
          kind: "check",
          outcome: message.isError ? "failed" : "passed",
          tool,
          source: sourceRef(this.node, id, line),
        },
      ];
    }
    return [];
  }

  private projectCodex(
    row: Record<string, unknown>,
    line: number,
  ): SafeEvent[] {
    const at = timestamp(row.timestamp);
    if (row.type === "turn_context" && object(row.payload)) {
      const model = modelIdentifier(row.payload.model);
      if (model === null || at === null) return [];
      this.model = model;
      const id = `model:${line}`;
      return [
        {
          id,
          node: { ...this.node },
          at,
          kind: "launch",
          model,
          source: sourceRef(this.node, id, line),
        },
      ];
    }
    if (row.type !== "event_msg" || !object(row.payload)) return [];
    const payload = row.payload;
    if (payload.type === "turn_aborted") {
      if (at === null) return [];
      const id = `aborted:${line}`;
      return [
        {
          id,
          node: { ...this.node },
          at,
          kind: "completion",
          outcome: "canceled",
          source: sourceRef(this.node, id, line),
        },
      ];
    }
    if (payload.type !== "token_count" || !object(payload.info)) return [];
    if (at === null) {
      this.mark("malformed-record");
      return [];
    }
    const info = payload.info;
    const last = info.last_token_usage;
    const totalRaw = info.total_token_usage;
    const lastCounters = last === undefined ? null : codexCounters(last);
    const total = totalRaw === undefined ? null : codexCounters(totalRaw);
    if (
      (last !== undefined && lastCounters === null) ||
      (totalRaw !== undefined && total === null) ||
      (lastCounters === null && total === null)
    ) {
      this.mark("malformed-record");
      return [];
    }
    let counters: { input: number; output: number };
    if (total !== null) {
      const previous = this.previousTotal;
      if (
        previous !== null &&
        (total.input < previous.input || total.output < previous.output)
      ) {
        this.mark("malformed-record");
        return [];
      }
      const delta =
        previous === null
          ? total
          : {
              input: total.input - previous.input,
              output: total.output - previous.output,
            };
      if (
        this.lastOnlySinceTotal.input > delta.input ||
        this.lastOnlySinceTotal.output > delta.output
      ) {
        this.mark("malformed-record");
        return [];
      }
      counters = {
        input: delta.input - this.lastOnlySinceTotal.input,
        output: delta.output - this.lastOnlySinceTotal.output,
      };
      this.previousTotal = total;
      this.lastOnlySinceTotal = { input: 0, output: 0 };
    } else if (lastCounters !== null) {
      counters = lastCounters;
      const input = this.lastOnlySinceTotal.input + counters.input;
      const output = this.lastOnlySinceTotal.output + counters.output;
      if (!Number.isSafeInteger(input) || !Number.isSafeInteger(output)) {
        this.mark("malformed-record");
        return [];
      }
      this.lastOnlySinceTotal = { input, output };
    } else {
      this.mark("malformed-record");
      return [];
    }
    if (counters === null) {
      this.mark("malformed-record");
      return [];
    }
    const id = `tokens:${line}`;
    const event: SafeEvent = {
      id,
      node: { ...this.node },
      at,
      kind: "usage",
      counts: {
        inputTokens: counters.input,
        outputTokens: counters.output,
        cost: null,
        currency: null,
      },
      source: sourceRef(this.node, id, line),
    };
    if (this.model !== undefined) event.model = this.model;
    return [event];
  }
}

let sourceStatForTests:
  ((target: string) => Promise<BigIntStats | null>) | undefined;

/** Narrow test seam mirrored on the existing Windows helper spawn seam. */
export function setNativeReaderSourceStatForTests(
  stat: ((target: string) => Promise<BigIntStats | null>) | undefined,
): void {
  sourceStatForTests = stat;
}

async function classifySource(
  absolutePath: string,
): Promise<BigIntStats | null> {
  try {
    const stats = sourceStatForTests
      ? await sourceStatForTests(absolutePath)
      : await lstat(absolutePath, { bigint: true });
    return stats && stats.isFile() && !stats.isSymbolicLink() ? stats : null;
  } catch {
    return null;
  }
}

async function* boundedLines(
  stream: Readable,
  budget: EvidenceBudget,
  lineBytes: number,
  signal: AbortSignal,
): AsyncGenerator<{ text: string; number: number; tooLong: boolean }> {
  let parts: Buffer[] = [];
  let length = 0;
  let tooLong = false;
  let number = 0;
  const append = (segment: Buffer): void => {
    if (tooLong) return;
    if (length + segment.length > lineBytes) {
      tooLong = true;
      parts = [];
      length += segment.length;
      return;
    }
    parts.push(segment);
    length += segment.length;
  };
  const emit = (): { text: string; number: number; tooLong: boolean } => {
    const wasTooLong = tooLong;
    number += 1;
    const text = wasTooLong ? "" : Buffer.concat(parts).toString("utf8");
    parts = [];
    length = 0;
    tooLong = false;
    return { text, number, tooLong: wasTooLong };
  };
  const abort = (): void => {
    const reason = signal.reason;
    stream.destroy(
      reason instanceof Error ? reason : new Error("Evidence read aborted."),
    );
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for await (const chunk of stream) {
      signal.throwIfAborted();
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      budget.takeSourceBytes(buffer.length);
      let start = 0;
      for (let index = 0; index < buffer.length; index += 1) {
        if (index % 4096 === 0) signal.throwIfAborted();
        if (buffer[index] !== 0x0a) continue;
        append(buffer.subarray(start, index));
        yield emit();
        start = index + 1;
      }
      if (start < buffer.length) append(buffer.subarray(start));
    }
    if (length > 0 || tooLong) yield emit();
  } finally {
    signal.removeEventListener("abort", abort);
    stream.destroy();
  }
}

export async function loadLocalManifest(
  manifestPath: string,
): Promise<LocalManifest> {
  const handle = await open(manifestPath, READ_FLAGS).catch(() => null);
  if (!handle)
    throw new Error("Local retrospective manifest could not be opened.");
  try {
    const stats = await handle.stat();
    if (!stats.isFile())
      throw new Error("Local retrospective manifest must be a regular file.");
    if (stats.size > DEFAULT_LIMITS.manifestBytes)
      throw new Error("Local retrospective manifest exceeds its byte limit.");
    const buffer = Buffer.alloc(DEFAULT_LIMITS.manifestBytes + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > DEFAULT_LIMITS.manifestBytes)
      throw new Error("Local retrospective manifest exceeds its byte limit.");
    let raw: string;
    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(
        buffer.subarray(0, offset),
      );
    } catch {
      throw new Error("Local retrospective manifest is not valid UTF-8.");
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error("Local retrospective manifest is not valid JSON.");
    }
    return localManifestSchema.parse(value);
  } finally {
    await handle.close();
  }
}

export function createManifestEvidenceSource(
  manifestValue: LocalManifest,
  options: NativeSourceOptions = {},
): EvidenceSource {
  const manifest = localManifestSchema.parse(manifestValue);
  const sourceBytes = cappedLimit(
    options.limits?.sourceBytes,
    DEFAULT_LIMITS.sourceBytes,
  );
  const lineBytes = cappedLimit(
    options.limits?.lineBytes,
    DEFAULT_LIMITS.lineBytes,
  );
  const sourceBudget = new EvidenceBudget(new AbortController().signal, {
    ...DEFAULT_LIMITS,
    sourceBytes,
  });
  const records = new Map<string, ManifestNode>(
    manifest.nodes.map((node) => [nodeKeyId(node.key), node]),
  );
  const children = new Map<string, ManifestNode[]>();
  for (const node of manifest.nodes) {
    if (node.parent === null) continue;
    const parentId = nodeKeyId(node.parent);
    const group = children.get(parentId);
    if (group) group.push(node);
    else children.set(parentId, [node]);
  }

  const expectedFiles = new Map<string, { dev: bigint; ino: bigint }>();
  const entryFor = async (
    node: ManifestNode,
    signal: AbortSignal,
  ): Promise<{
    key: NodeKey;
    parent: NodeKey | null;
    disposition: Disposition;
  }> => {
    signal.throwIfAborted();
    let disposition = node.disposition;
    if (disposition === "local-allowed") {
      if (node.source === null)
        throw new Error("Local-allowed manifest node has no source.");
      const stats = await classifySource(node.source.absolutePath);
      disposition = stats === null ? "unavailable" : "local-allowed";
      if (stats !== null)
        expectedFiles.set(nodeKeyId(node.key), {
          dev: stats.dev,
          ino: stats.ino,
        });
    }
    return {
      key: { ...node.key },
      parent: node.parent === null ? null : { ...node.parent },
      disposition,
    };
  };

  return {
    async *inventory(main, cutoff, signal) {
      signal.throwIfAborted();
      if (!sameNodeKey(main, manifest.main))
        throw new Error("Requested main session is not the manifest main.");
      if (cutoff !== manifest.cutoff)
        throw new Error("Requested cutoff does not match the manifest.");
      const root = records.get(nodeKeyId(manifest.main));
      if (!root) throw new Error("Manifest main session is missing.");
      const visited = new Set<string>();
      const queue: ManifestNode[] = [root];
      while (queue.length > 0) {
        signal.throwIfAborted();
        const node = queue.shift();
        if (!node) break;
        const key = nodeKeyId(node.key);
        if (visited.has(key)) continue;
        visited.add(key);
        yield await entryFor(node, signal);
        const descendants = children.get(key) ?? [];
        for (const child of descendants) queue.push(child);
      }
      for (const node of manifest.nodes) {
        signal.throwIfAborted();
        const key = nodeKeyId(node.key);
        if (visited.has(key)) continue;
        visited.add(key);
        yield await entryFor(node, signal);
      }
    },

    async *read(node, signal) {
      signal.throwIfAborted();
      const record = records.get(nodeKeyId(node));
      if (!record)
        throw new Error("Node is not present in the local manifest.");
      if (record.disposition !== "local-allowed" || record.source === null)
        throw new Error("Node is not authorized for local reading.");
      const identity = expectedFiles.get(nodeKeyId(node));
      if (identity === undefined)
        throw new EvidenceLimitError("source-unavailable");
      let handle: FileHandle | undefined;
      try {
        handle = await open(record.source.absolutePath, READ_FLAGS);
        signal.throwIfAborted();
        const stats = sourceStatForTests
          ? await sourceStatForTests(record.source.absolutePath)
          : await handle.stat({ bigint: true });
        if (
          !stats ||
          !stats.isFile() ||
          stats.dev !== identity.dev ||
          stats.ino !== identity.ino
        )
          throw new EvidenceLimitError("source-unavailable");
        signal.throwIfAborted();
        const stream = createReadStream(record.source.absolutePath, {
          fd: handle.fd,
          autoClose: false,
        });
        const projector = new NativeEventProjector(
          record.key,
          record.source.format,
        );
        for await (const line of boundedLines(
          stream,
          sourceBudget,
          lineBytes,
          signal,
        )) {
          signal.throwIfAborted();
          if (line.tooLong) {
            projector.mark("line-limit");
            continue;
          }
          if (!line.text.trim()) continue;
          let row: unknown;
          try {
            row = JSON.parse(line.text);
          } catch {
            projector.mark("malformed-record");
            continue;
          }
          for (const event of projector.project(row, line.number)) yield event;
        }
        const failure = projector.finish();
        if (failure !== null) throw new EvidenceLimitError(failure);
      } catch (error) {
        if (error instanceof EvidenceLimitError) throw error;
        signal.throwIfAborted();
        throw new EvidenceLimitError("source-unavailable");
      } finally {
        await handle?.close().catch(() => undefined);
      }
    },
  };
}
