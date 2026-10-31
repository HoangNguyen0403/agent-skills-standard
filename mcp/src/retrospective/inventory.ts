import { randomUUID } from "node:crypto";
import {
  DEFAULT_LIMITS,
  inventoryEntrySchema,
  nodeKeyId,
  prepareRequestSchema,
  safeEventSchema,
  sameNodeKey,
  type EvidencePacket,
  type EvidenceSource,
  type NodeKey,
  type PrepareRequest,
  type SafeEvent,
} from "./contracts";
import { EvidenceBudget, EvidenceLimitError, byteSize } from "./budget";

const DEFAULT_CURSOR_GUARD = 10_000;
const GLOBAL_LIMITS: Record<string, true> = {
  "source-byte-limit": true,
  "event-limit": true,
  "output-limit": true,
  deadline: true,
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}
async function* interruptible<T>(
  iterable: AsyncIterable<T>,
  signal: AbortSignal,
): AsyncGenerator<T> {
  const iterator = iterable[Symbol.asyncIterator]();
  let rejectAbort: ((reason: unknown) => void) | undefined;
  const onAbort = (): void => rejectAbort?.(signal.reason);
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    while (true) {
      signal.throwIfAborted();
      const step = await Promise.race([iterator.next(), aborted]);
      if (step.done) return;
      yield step.value;
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
    rejectAbort = undefined;
    if (signal.aborted) {
      const closing = iterator.return?.();
      if (closing) void closing.catch(() => undefined);
    } else {
      await iterator.return?.();
    }
  }
}

export async function collectEvidence(
  request: PrepareRequest,
  source: EvidenceSource,
  signal: AbortSignal,
): Promise<EvidencePacket> {
  const parsed = prepareRequestSchema.parse(request);
  signal.throwIfAborted();
  const controller = new AbortController();
  const abortFromCaller = (): void => controller.abort(signal.reason);
  signal.addEventListener("abort", abortFromCaller, { once: true });
  const deadlineTimer = setTimeout(
    () => controller.abort(new EvidenceLimitError("deadline")),
    DEFAULT_LIMITS.elapsedMs,
  );
  const cleanup = (): void => {
    clearTimeout(deadlineTimer);
    signal.removeEventListener("abort", abortFromCaller);
  };
  deadlineTimer.unref?.();
  const runId = randomUUID();
  const budget = new EvidenceBudget(controller.signal);
  const cutoffMs = Date.parse(parsed.cutoff);
  const nodes: EvidencePacket["nodes"] = [];
  const events: SafeEvent[] = [];
  const gaps: EvidencePacket["gaps"] = [];
  budget.takeOutputBytes(
    byteSize({
      schemaVersion: 1,
      runId,
      main: parsed.main,
      cutoff: parsed.cutoff,
      nodes: [],
      events: [],
      gaps: [],
    }),
  );
  budget.reserveTerminalOutput(350);
  const records = new Map<
    string,
    { entry: EvidencePacket["nodes"][number]; depth: number }
  >();
  const visited = new Set<string>();
  let mainSeen = false;
  let globalExhaustedCode: string | null = null;

  let terminalGapWritten = false;
  const recordGap = (code: string, node?: NodeKey): void => {
    const gap = node ? { code, node: { ...node } } : { code };
    const gapBytes = byteSize(gap) + (gaps.length > 0 ? 1 : 0);
    try {
      budget.takeOutputBytes(gapBytes);
      gaps.push(gap);
    } catch (error) {
      if (!(error instanceof EvidenceLimitError) || terminalGapWritten) return;
      globalExhaustedCode = "output-limit";
      terminalGapWritten = true;
      const terminal = { code: "output-limit" };
      budget.takeOutputBytes(
        byteSize(terminal) + (gaps.length > 0 ? 1 : 0),
        true,
      );
      gaps.push(terminal);
    }
  };

  const appendValidatedEvent = (
    candidate: unknown,
    nodeKey: NodeKey,
  ): "accepted" | "future" | "invalid" => {
    const eventResult = safeEventSchema.safeParse(candidate);
    if (!eventResult.success) {
      recordGap("invalid-event", nodeKey);
      return "invalid";
    }
    const event = eventResult.data;
    if (!sameNodeKey(event.node, nodeKey)) {
      recordGap("invalid-event", nodeKey);
      return "invalid";
    }
    const at = Date.parse(event.at);
    if (!Number.isFinite(at)) {
      recordGap("invalid-event", nodeKey);
      return "invalid";
    }
    if (at > cutoffMs) return "future";
    budget.takeEvent(event, events.length > 0 ? 1 : 0);
    events.push(event);
    return "accepted";
  };

  try {
    inventory: for await (const candidate of interruptible(
      source.inventory(parsed.main, parsed.cutoff, controller.signal),
      controller.signal,
    )) {
      const entryResult = inventoryEntrySchema.safeParse(candidate);
      if (!entryResult.success) {
        recordGap("invalid-inventory");
        continue;
      }
      const entry = entryResult.data;
      const keyId = nodeKeyId(entry.key);
      if (visited.has(keyId)) {
        recordGap("duplicate-node", entry.key);
        continue;
      }
      if (sameNodeKey(entry.key, parsed.main)) {
        mainSeen = true;
        if (entry.parent !== null) recordGap("invalid-main", entry.key);
      } else if (entry.parent === null) {
        recordGap("unexpected-root", entry.key);
      }

      let cyclic = false;
      let cursor = entry.parent;
      let guard = 0;
      while (cursor !== null && guard <= DEFAULT_CURSOR_GUARD) {
        const cursorId = nodeKeyId(cursor);
        if (cursorId === keyId) {
          cyclic = true;
          break;
        }
        const known = records.get(cursorId);
        if (!known) break;
        cursor = known.entry.parent;
        guard += 1;
      }
      if (cyclic) {
        visited.add(keyId);
        recordGap("cycle", entry.key);
        continue;
      }

      let depth = 0;
      if (entry.parent !== null) {
        const parent = records.get(nodeKeyId(entry.parent));
        if (!parent) {
          recordGap("unknown-parent", entry.key);
          depth = 1;
        } else {
          depth = parent.depth + 1;
        }
      }

      try {
        budget.takeNode(depth);
      } catch (error) {
        if (!(error instanceof EvidenceLimitError)) throw error;
        visited.add(keyId);
        recordGap(error.code, entry.key);
        if (error.code === "node-limit") break inventory;
        if (GLOBAL_LIMITS[error.code] === true)
          globalExhaustedCode = error.code;
        continue;
      }

      const coverage =
        entry.disposition === "local-allowed"
          ? "structured-events"
          : entry.disposition === "restricted"
            ? "restricted"
            : "unavailable";
      const nodeEntry: EvidencePacket["nodes"][number] = {
        key: { ...entry.key },
        parent: entry.parent === null ? null : { ...entry.parent },
        disposition: entry.disposition,
        coverage,
      };
      try {
        budget.takeOutputBytes(
          byteSize(nodeEntry) + (nodes.length > 0 ? 1 : 0),
        );
      } catch (error) {
        if (!(error instanceof EvidenceLimitError)) throw error;
        recordGap(error.code, entry.key);
        break inventory;
      }
      nodes.push(nodeEntry);
      records.set(keyId, { entry: nodeEntry, depth });
      visited.add(keyId);

      if (entry.disposition !== "local-allowed") {
        recordGap(entry.disposition, entry.key);
        continue;
      }
      if (globalExhaustedCode !== null) {
        nodeEntry.coverage = "partial";
        recordGap(globalExhaustedCode, entry.key);
        continue;
      }

      let sawInvalid = false;
      try {
        for await (const event of interruptible(
          source.read(entry.key, controller.signal),
          controller.signal,
        )) {
          budget.checkpoint();
          if (appendValidatedEvent(event, entry.key) === "invalid")
            sawInvalid = true;
        }
        nodeEntry.coverage = sawInvalid ? "partial" : "structured-events";
      } catch (error) {
        if (signal.aborted) {
          cleanup();
          signal.throwIfAborted();
        }
        if (isAbortError(error)) {
          cleanup();
          throw error;
        }
        nodeEntry.coverage = "partial";
        if (error instanceof EvidenceLimitError) {
          recordGap(error.code, entry.key);
          if (GLOBAL_LIMITS[error.code] === true)
            globalExhaustedCode = error.code;
        } else {
          recordGap("read-error", entry.key);
        }
      }
    }
  } catch (error) {
    if (signal.aborted) {
      cleanup();
      signal.throwIfAborted();
    }
    if (
      controller.signal.aborted &&
      controller.signal.reason instanceof EvidenceLimitError &&
      controller.signal.reason.code === "deadline"
    ) {
      recordGap("deadline");
    } else {
      cleanup();
      throw error;
    }
  }

  if (!mainSeen) recordGap("missing-main");
  cleanup();
  return {
    schemaVersion: 1,
    runId,
    main: { ...parsed.main },
    cutoff: parsed.cutoff,
    nodes,
    events,
    gaps,
  };
}
