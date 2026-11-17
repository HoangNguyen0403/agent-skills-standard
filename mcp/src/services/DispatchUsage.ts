import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  boundedLines,
  collectSessionJournal,
  nativeSessionHeader,
  type NativeSessionHeader,
  type SessionManifest,
  type SessionUsageGroup,
} from "./SessionJournal";
import { createPaseoOmpAdapter } from "./hosts/paseoOmp";
import {
  readOrchestratorTrace,
  SUPERVISION_METHOD_REF,
  type TraceUsage,
} from "./OrchestratorTrace";

/**
 * Dispatch usage importer (SRS-007, SRS-008 inventory, SRS-010 importer side).
 *
 * Two rules shape this file:
 * - usage is measured, never priced: token counters and the host's recorded cost
 *   are copied from host records, and anything the host did not report is null;
 * - every emitted string is a reference string or a closed-vocabulary literal, so
 *   no title, prompt or path reaches output, events or errors.
 *
 * This package must not depend on `scripts/metrics` (dependency direction CMP-4),
 * so the emitted event shapes and the two kinds' write-time rules are declared
 * here. `scripts/metrics` stays the authoritative reader; the reader acceptance
 * test is the parity proof.
 */

/** Attribution rule for worker usage: the session journal, bounded to the window. */
export const WORKER_METHOD_REF = "journal-window-v1";

export type DispatchActor = "worker" | "supervision";
export type UnavailableCode = "no-adapter" | "unresolved" | "identity-mismatch";

/** A transcript the adapter resolved for one dispatch or orchestrator. */
export interface HostBinding {
  transcriptPath: string;
  /** The native identity the transcript must report, or the binding is a mismatch. */
  expectedSessionId: string;
}

/** Host-specific resolution. A host without an adapter reports usage unavailable. */
export interface HostAdapter {
  readonly name: string;
  resolveWorker(dispatchId: string): Promise<HostBinding | null>;
  resolveOrchestrator(orchestratorRef: string): Promise<HostBinding | null>;
}

export interface MeasuredUsage {
  turns: number | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  recordedCost: number | null;
}

/** The `dispatch` event fields this importer reads (SRS-001). */
export interface RecordedDispatch {
  kind: "dispatch";
  id: string;
  change_id: string;
  revision: string;
  observed_at: string;
  dispatch_id: string;
  orchestrator_ref: string;
}

export interface DispatchUsageEvent {
  kind: "dispatch-usage";
  id: string;
  change_id: string;
  revision: string;
  observed_at: string;
  source_ref: string;
  dispatch_id: string;
  actor: DispatchActor;
  window_from: string;
  window_to: string;
  turns: number | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  cache_write_tokens: number | null;
  output_tokens: number | null;
  recorded_cost: number | null;
  cost_basis: "host-recorded-estimate";
  coverage_complete: boolean;
  method_ref: string;
  unavailable_code?: UnavailableCode;
}

export interface DispatchInventoryEvent {
  kind: "dispatch-inventory";
  id: string;
  change_id: string;
  revision: string;
  observed_at: string;
  source_ref: string;
  orchestrator_ref: string;
  window_from: string;
  window_to: string;
  unrecorded_count: number;
}

export type EmittedEvent = DispatchUsageEvent | DispatchInventoryEvent;

/** A sum over components the host reported, plus how many components it did not. */
export interface UsageTotal {
  known: number;
  unknown: number;
}

export interface UnattributedUsage {
  orchestrators: number;
  turns: UsageTotal;
  inputTokens: UsageTotal;
  cachedInputTokens: UsageTotal;
  cacheWriteTokens: UsageTotal;
  outputTokens: UsageTotal;
  recordedCost: UsageTotal;
}

export interface DispatchUsagePlan {
  events: DispatchUsageEvent[];
  inventory: DispatchInventoryEvent[];
  /** Pointer-less supervision, reported but never written as an event. */
  unattributed: UnattributedUsage;
  limitations: string[];
}

export interface ImportOptions {
  observationsPath: string;
  /** Window start, inclusive. */
  from: string;
  /** Window end, exclusive. */
  to: string;
  host: string;
  paseoHome?: string;
  /** Import time recorded as `observed_at`; defaults to now. */
  now?: string;
  adapter?: HostAdapter | null;
}

interface ObservationFile {
  schema_version: 1;
  source_kind: "host-export" | "operator-recorded";
  coverage: unknown[];
  events: Array<Record<string, unknown>>;
}

const REFERENCE_STRING = /^[A-Za-z0-9][A-Za-z0-9._:@#-]{0,127}$/;
const ACTORS: readonly DispatchActor[] = ["worker", "supervision"];
const LIMITATIONS = [
  "Worker usage is aggregated from the host session journal bounded to the window; recorded cost is copied, never computed from a price.",
  `Supervision charges each orchestrator turn whole to the dispatch it last addressed or was last notified by (${SUPERVISION_METHOD_REF}); turns with no pointer are reported unattributed and never assigned.`,
  "Inventory counts the host agents an orchestrator created in the window that have no dispatch event; the count is identical across every change that orchestrator served.",
];

const UNKNOWN_USAGE: MeasuredUsage = {
  turns: null,
  inputTokens: null,
  cachedInputTokens: null,
  cacheWriteTokens: null,
  outputTokens: null,
  recordedCost: null,
};

type TotalKey =
  | "turns"
  | "inputTokens"
  | "cachedInputTokens"
  | "cacheWriteTokens"
  | "outputTokens"
  | "recordedCost";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reference(value: unknown): value is string {
  // Anchors do not reject a trailing newline in JavaScript, and the contract
  // requires a full match, so the newline is excluded explicitly.
  return (
    typeof value === "string" &&
    value.length <= 128 &&
    REFERENCE_STRING.test(value) &&
    !value.endsWith("\n")
  );
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

/** Identity → event id: `<kind>#<32 hex of SHA-256 over the identity key>` (shared writer contract). */
export function eventId(kind: string, identity: string): string {
  return `${kind}#${createHash("sha256").update(identity, "utf8").digest("hex").slice(0, 32)}`;
}

export function usageIdentity(
  dispatchId: string,
  actor: DispatchActor,
  windowFrom: string,
  windowTo: string,
): string {
  return `dispatch-usage|${dispatchId}|${actor}|${windowFrom}|${windowTo}`;
}

export function inventoryIdentity(
  changeId: string,
  orchestratorRef: string,
  windowFrom: string,
  windowTo: string,
): string {
  return `dispatch-inventory|${changeId}|${orchestratorRef}|${windowFrom}|${windowTo}`;
}

/** Adapter selection: only the one host this slice implements has one (SRS-007 failure). */
export function adapterForHost(
  host: string,
  paseoHome: string | undefined,
): HostAdapter | null {
  if (host !== "paseo-omp" || !paseoHome) return null;
  return createPaseoOmpAdapter(paseoHome);
}

// ---------------------------------------------------------------------------
// Session journal aggregation (SRS-007 "Worker usage")
// ---------------------------------------------------------------------------

function sumKnown(values: Array<number | null>): number | null {
  let total = 0;
  for (const value of values) {
    if (value === null) return null;
    total += value;
  }
  return total;
}

function summarizeGroups(groups: readonly SessionUsageGroup[]): MeasuredUsage {
  return {
    turns: groups.reduce((total, group) => total + group.messages, 0),
    inputTokens: sumKnown(groups.map((group) => group.uncachedInputTokens)),
    cachedInputTokens: sumKnown(groups.map((group) => group.cachedInputTokens)),
    cacheWriteTokens: sumKnown(groups.map((group) => group.cacheWriteTokens)),
    outputTokens: sumKnown(groups.map((group) => group.outputTokens)),
    recordedCost: sumKnown(groups.map((group) => group.recordedCostEstimate)),
  };
}

async function readTranscriptHeader(
  transcriptPath: string,
): Promise<NativeSessionHeader | null> {
  const stream = createReadStream(transcriptPath);
  try {
    for await (const { line, tooLong } of boundedLines(stream)) {
      if (tooLong) return null;
      if (line === null || !line.trim()) continue;
      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch {
        return null;
      }
      if (object(row) && row.type === "title") continue;
      try {
        return nativeSessionHeader(row, "omp");
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    stream.destroy();
  }
}

interface WorkerMember {
  dispatchId: string;
  transcriptPath: string;
  workspace: string;
  sessionId: string;
}

interface WorkerMeasurement {
  usage: MeasuredUsage;
  coverageComplete: boolean;
}

/**
 * One session journal per native workspace, one session per dispatch, each bound
 * to its own expected native identity, so a swapped transcript cannot contribute
 * usage (SRS-010). A dispatch the journal cannot measure maps to `null`.
 */
async function collectWorkerUsage(
  members: readonly WorkerMember[],
  options: ImportOptions,
  limitations: string[],
): Promise<Map<string, WorkerMeasurement | null>> {
  const byWorkspace = new Map<string, WorkerMember[]>();
  for (const member of members) {
    const group = byWorkspace.get(member.workspace) ?? [];
    group.push(member);
    byWorkspace.set(member.workspace, group);
  }

  const measurements = new Map<string, WorkerMeasurement | null>();
  const temporaryRoots: string[] = [];
  try {
    for (const [workspace, group] of byWorkspace) {
      const root = await mkdtemp(path.join(os.tmpdir(), "ags-dispatch-"));
      temporaryRoots.push(root);
      const sessions: SessionManifest["sessions"] = group.map(
        (member, index) => ({
          path: member.transcriptPath,
          format: "omp",
          role: "implementation",
          attemptOutcome: "completed",
          // `taskId` is how a journal group is traced back to its dispatch. It is a
          // local label, never a native identifier (the role and outcome are local
          // labels too: nothing downstream reads them for a dispatch).
          taskId: `session-${index}`,
          expectedSessionId: member.sessionId,
        }),
      );
      const manifest: SessionManifest = {
        workspace,
        startedAt: options.from,
        completedAt: options.to,
        sessions,
        expectedSessionIds: sessions.map(
          (session) => session.expectedSessionId ?? "",
        ),
        phaseWindows: [],
      };
      const manifestPath = path.join(root, "manifest.json");
      writeFileSync(manifestPath, JSON.stringify(manifest));
      let journal;
      try {
        journal = await collectSessionJournal(manifestPath);
      } catch {
        for (const member of group) measurements.set(member.dispatchId, null);
        continue;
      }
      for (const [index, member] of group.entries()) {
        // A session that resolved but contributed no in-window row is a measured
        // zero with the journal's coverage, never an unresolved failure.
        const groups = journal.groups.filter(
          (entry) => entry.taskId === `session-${index}`,
        );
        measurements.set(member.dispatchId, {
          usage: summarizeGroups(groups),
          coverageComplete: journal.coverage.complete,
        });
      }
    }
  } finally {
    for (const root of temporaryRoots)
      await rm(root, { recursive: true, force: true });
  }
  limitations.push(
    "Worker usage covers only dispatches whose transcript the host adapter resolved and whose native identity matched its own record.",
  );
  return measurements;
}

// ---------------------------------------------------------------------------
// Event construction
// ---------------------------------------------------------------------------

function observedAt(dispatch: RecordedDispatch, now: string): string {
  return new Date(
    Math.max(Date.parse(now), Date.parse(dispatch.observed_at)),
  ).toISOString();
}

function usageEvent(input: {
  dispatch: RecordedDispatch;
  actor: DispatchActor;
  windowFrom: string;
  windowTo: string;
  now: string;
  methodRef: string;
  usage: MeasuredUsage;
  coverageComplete: boolean;
  unavailableCode?: UnavailableCode;
}): DispatchUsageEvent {
  const unavailable = input.unavailableCode !== undefined;
  return {
    kind: "dispatch-usage",
    id: eventId(
      "dispatch-usage",
      usageIdentity(
        input.dispatch.dispatch_id,
        input.actor,
        input.windowFrom,
        input.windowTo,
      ),
    ),
    change_id: input.dispatch.change_id,
    revision: input.dispatch.revision,
    observed_at: observedAt(input.dispatch, input.now),
    source_ref: "paseo-omp",
    dispatch_id: input.dispatch.dispatch_id,
    actor: input.actor,
    window_from: input.windowFrom,
    window_to: input.windowTo,
    turns: unavailable ? null : input.usage.turns,
    input_tokens: unavailable ? null : input.usage.inputTokens,
    cached_input_tokens: unavailable ? null : input.usage.cachedInputTokens,
    cache_write_tokens: unavailable ? null : input.usage.cacheWriteTokens,
    output_tokens: unavailable ? null : input.usage.outputTokens,
    recorded_cost: unavailable ? null : input.usage.recordedCost,
    cost_basis: "host-recorded-estimate",
    coverage_complete: unavailable ? false : input.coverageComplete,
    method_ref: input.methodRef,
    ...(input.unavailableCode
      ? { unavailable_code: input.unavailableCode }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

function readObservations(filePath: string): ObservationFile {
  if (!existsSync(filePath)) {
    return {
      schema_version: 1,
      source_kind: "host-export",
      coverage: [],
      events: [],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(
      "observations-invalid: the observation file is not valid JSON",
    );
  }
  if (
    !object(parsed) ||
    parsed.schema_version !== 1 ||
    !Array.isArray(parsed.events) ||
    !Array.isArray(parsed.coverage)
  ) {
    throw new Error(
      "observations-invalid: the observation file does not match schema 1",
    );
  }
  return {
    schema_version: 1,
    source_kind:
      parsed.source_kind === "operator-recorded"
        ? "operator-recorded"
        : "host-export",
    coverage: parsed.coverage,
    events: parsed.events.filter(object),
  };
}

function recordedDispatches(file: ObservationFile): RecordedDispatch[] {
  return file.events.filter(
    (event): event is Record<string, unknown> & RecordedDispatch =>
      event.kind === "dispatch" &&
      reference(event.dispatch_id) &&
      reference(event.change_id) &&
      reference(event.revision) &&
      reference(event.orchestrator_ref) &&
      isoOrNull(event.observed_at) !== null,
  );
}

function inWindow(time: string, from: number, to: number): boolean {
  const parsed = Date.parse(time);
  return Number.isFinite(parsed) && parsed >= from && parsed < to;
}

const TOTAL_KEYS: readonly TotalKey[] = [
  "turns",
  "inputTokens",
  "cachedInputTokens",
  "cacheWriteTokens",
  "outputTokens",
  "recordedCost",
];

/** Adds one measurement, keeping unknown components counted instead of dropped. */
function accumulateUnattributed(
  totals: Map<TotalKey, UsageTotal>,
  usage: TraceUsage,
): void {
  for (const key of TOTAL_KEYS) {
    const value = usage[key];
    const total = totals.get(key) ?? { known: 0, unknown: 0 };
    if (value === null) total.unknown += 1;
    else total.known += value;
    totals.set(key, total);
  }
}

/** Counts every component as unknown: an orchestrator that could not be measured. */
function accumulateUnknown(totals: Map<TotalKey, UsageTotal>): void {
  for (const key of TOTAL_KEYS) {
    const total = totals.get(key) ?? { known: 0, unknown: 0 };
    total.unknown += 1;
    totals.set(key, total);
  }
}

function reportTotals(
  orchestrators: number,
  totals: Map<TotalKey, UsageTotal>,
): UnattributedUsage {
  const total = (key: TotalKey): UsageTotal =>
    totals.get(key) ?? { known: 0, unknown: 0 };
  return {
    orchestrators,
    turns: total("turns"),
    inputTokens: total("inputTokens"),
    cachedInputTokens: total("cachedInputTokens"),
    cacheWriteTokens: total("cacheWriteTokens"),
    outputTokens: total("outputTokens"),
    recordedCost: total("recordedCost"),
  };
}

export async function planDispatchUsage(
  options: ImportOptions,
): Promise<DispatchUsagePlan> {
  const from = Date.parse(options.from);
  const to = Date.parse(options.to);
  const file = readObservations(options.observationsPath);
  const plan: DispatchUsagePlan = {
    events: [],
    inventory: [],
    unattributed: reportTotals(0, new Map()),
    limitations: [...LIMITATIONS],
  };
  const dispatches = recordedDispatches(file).filter((dispatch) =>
    inWindow(dispatch.observed_at, from, to),
  );
  if (dispatches.length === 0) {
    plan.limitations.push("No dispatch event falls inside the window.");
    return plan;
  }

  const now = options.now ?? new Date().toISOString();
  const windowFrom = new Date(from).toISOString();
  const windowTo = new Date(to).toISOString();
  const adapter =
    options.adapter === undefined
      ? adapterForHost(options.host, options.paseoHome)
      : options.adapter;

  if (!adapter) {
    for (const dispatch of dispatches) {
      for (const actor of ACTORS) {
        plan.events.push(
          usageEvent({
            dispatch,
            actor,
            windowFrom,
            windowTo,
            now,
            methodRef:
              actor === "worker" ? WORKER_METHOD_REF : SUPERVISION_METHOD_REF,
            usage: { ...UNKNOWN_USAGE },
            coverageComplete: false,
            unavailableCode: "no-adapter",
          }),
        );
      }
    }
    plan.limitations.push(
      `No host adapter is available for the requested host; every dispatch and actor pair is recorded as unavailable (no-adapter).`,
    );
    return plan;
  }

  // Worker side: resolve, bind each transcript to its own identity, then aggregate.
  const members: WorkerMember[] = [];
  const workerFailure = new Map<string, UnavailableCode>();
  for (const dispatch of dispatches) {
    const binding = await adapter.resolveWorker(dispatch.dispatch_id);
    if (!binding) {
      workerFailure.set(dispatch.dispatch_id, "unresolved");
      continue;
    }
    const header = await readTranscriptHeader(binding.transcriptPath);
    if (!header) {
      workerFailure.set(dispatch.dispatch_id, "unresolved");
      continue;
    }
    if (header.id !== binding.expectedSessionId) {
      workerFailure.set(dispatch.dispatch_id, "identity-mismatch");
      continue;
    }
    members.push({
      dispatchId: dispatch.dispatch_id,
      transcriptPath: binding.transcriptPath,
      workspace: header.cwd,
      sessionId: header.id,
    });
  }
  const workerMeasurements = await collectWorkerUsage(
    members,
    options,
    plan.limitations,
  );

  // Supervision side: one trace per orchestrator, one shared registry of dispatches.
  const registry = dispatches.map((dispatch) => dispatch.dispatch_id);
  const byOrchestrator = new Map<string, RecordedDispatch[]>();
  for (const dispatch of dispatches) {
    const group = byOrchestrator.get(dispatch.orchestrator_ref) ?? [];
    group.push(dispatch);
    byOrchestrator.set(dispatch.orchestrator_ref, group);
  }
  const supervisionUsage = new Map<string, TraceUsage>();
  const supervisionFailure = new Map<string, UnavailableCode>();
  const supervisionCoverage = new Map<string, boolean>();
  const unattributed = new Map<TotalKey, UsageTotal>();
  const recordedIds = new Set(
    recordedDispatches(file).map((dispatch) => dispatch.dispatch_id),
  );

  for (const [orchestratorRef, group] of byOrchestrator) {
    const binding = await adapter.resolveOrchestrator(orchestratorRef);
    const trace = binding
      ? await readOrchestratorTrace({
          path: binding.transcriptPath,
          expectedSessionId: binding.expectedSessionId,
          dispatchIds: registry,
          startedAt: options.from,
          completedAt: options.to,
        })
      : null;
    const status = trace?.status ?? "unresolved";
    if (!trace || status !== "resolved") {
      const code: UnavailableCode =
        status === "identity-mismatch" ? "identity-mismatch" : "unresolved";
      for (const dispatch of group)
        supervisionFailure.set(dispatch.dispatch_id, code);
      // Inventory stays omitted, but the reason names only the safe reference.
      plan.limitations.push(
        `inventory-unavailable: ${reference(orchestratorRef) ? orchestratorRef : "unknown"}`,
      );
      accumulateUnknown(unattributed);
      continue;
    }
    const measured: TraceUsage = {
      turns: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      recordedCost: 0,
    };
    for (const dispatch of group) {
      supervisionUsage.set(
        dispatch.dispatch_id,
        trace.usage.get(dispatch.dispatch_id) ?? measured,
      );
      supervisionCoverage.set(dispatch.dispatch_id, trace.malformedLines === 0);
    }
    accumulateUnattributed(unattributed, trace.unattributed);

    // Inventory (SRS-008): agents this orchestrator created in the window with no
    // recorded dispatch. One event per change served, one count for the window.
    const unrecorded = trace.createdAgentIds.filter(
      (id) => !recordedIds.has(id),
    ).length;
    const changes = new Map<string, RecordedDispatch>();
    for (const dispatch of group) {
      if (!changes.has(dispatch.change_id))
        changes.set(dispatch.change_id, dispatch);
    }
    for (const [changeId, dispatch] of changes) {
      plan.inventory.push({
        kind: "dispatch-inventory",
        id: eventId(
          "dispatch-inventory",
          inventoryIdentity(
            changeId,
            dispatch.orchestrator_ref,
            windowFrom,
            windowTo,
          ),
        ),
        change_id: changeId,
        revision: dispatch.revision,
        observed_at: observedAt(dispatch, now),
        source_ref: "paseo-omp",
        orchestrator_ref: dispatch.orchestrator_ref,
        window_from: windowFrom,
        window_to: windowTo,
        unrecorded_count: unrecorded,
      });
    }
  }

  for (const dispatch of dispatches) {
    const workerCode =
      workerFailure.get(dispatch.dispatch_id) ??
      (workerMeasurements.get(dispatch.dispatch_id) === null
        ? "unresolved"
        : undefined);
    const worker = workerMeasurements.get(dispatch.dispatch_id) ?? null;
    plan.events.push(
      usageEvent({
        dispatch,
        actor: "worker",
        windowFrom,
        windowTo,
        now,
        methodRef: WORKER_METHOD_REF,
        usage: worker?.usage ?? { ...UNKNOWN_USAGE },
        coverageComplete: worker?.coverageComplete ?? false,
        ...(workerCode ? { unavailableCode: workerCode } : {}),
      }),
    );
    const supervisionCode = supervisionFailure.get(dispatch.dispatch_id);
    const supervision = supervisionUsage.get(dispatch.dispatch_id);
    plan.events.push(
      usageEvent({
        dispatch,
        actor: "supervision",
        windowFrom,
        windowTo,
        now,
        methodRef: SUPERVISION_METHOD_REF,
        usage: supervision ?? { ...UNKNOWN_USAGE },
        coverageComplete:
          supervision !== undefined &&
          supervisionCode === undefined &&
          (supervisionCoverage.get(dispatch.dispatch_id) ?? false),
        ...(supervisionCode ? { unavailableCode: supervisionCode } : {}),
      }),
    );
  }

  plan.unattributed = reportTotals(byOrchestrator.size, unattributed);
  return plan;
}

// ---------------------------------------------------------------------------
// Locked append (SRS-009 shared transaction, SRS-007 overlap policy)
// ---------------------------------------------------------------------------

export interface AppendOptions {
  lockTimeoutMs?: number;
}

export interface AppendResult {
  written: number;
  skipped: number;
}

export const DEFAULT_LOCK_TIMEOUT_MS = 10_000;
const STALE_LOCK_MS = 10 * 60_000;

export function lockTimeoutFromEnvironment(): number {
  const raw = process.env.AGS_OBSERVATIONS_LOCK_TIMEOUT_MS;
  if (!raw) return DEFAULT_LOCK_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_LOCK_TIMEOUT_MS;
}

interface Lock {
  release(): void;
}

async function acquireLock(filePath: string, timeoutMs: number): Promise<Lock> {
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      try {
        writeSync(
          fd,
          JSON.stringify({
            pid: process.pid,
            created_at: new Date().toISOString(),
          }),
        );
      } finally {
        closeSync(fd);
      }
      return {
        release(): void {
          try {
            unlinkSync(lockPath);
          } catch {
            // A vanished lock is already released; never delete a lock we did not create.
          }
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new Error("lock-unavailable: the lock could not be created", {
          cause: error,
        });
      }
      if (Date.now() >= deadline) {
        let ageSeconds: number;
        try {
          ageSeconds = Math.max(
            0,
            Math.round((Date.now() - statSync(lockPath).mtimeMs) / 1000),
          );
        } catch {
          ageSeconds = 0;
        }
        const stale = ageSeconds * 1000 >= STALE_LOCK_MS ? ", stale" : "";
        throw new Error(
          `lock-timeout: an existing lock is ${ageSeconds}s old${stale}; nothing was written`,
          { cause: error },
        );
      }
      await delay(100);
    }
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function withoutId(event: EmittedEvent): Record<string, unknown> {
  const copy = { ...(event as unknown as Record<string, unknown>) };
  delete copy.id;
  return copy;
}

/**
 * Replay comparison ignores `observed_at`: the identity is (kind, dispatch,
 * actor, window), so a rerun of the same window is the same observation at a
 * later time, and the first observation time stands.
 */
function replayPayload(event: EmittedEvent): string {
  const copy = withoutId(event);
  delete copy.observed_at;
  copy.window_from = isoOrNull(event.window_from) ?? event.window_from;
  copy.window_to = isoOrNull(event.window_to) ?? event.window_to;
  return canonical(copy);
}

/** Field validation mirroring the reader for the two kinds this writer emits (SRS-010). */
function validateEmitted(event: EmittedEvent): string[] {
  const problems: string[] = [];
  const usageEvent = event.kind === "dispatch-usage";
  const required: string[] = usageEvent
    ? ["id", "change_id", "revision", "source_ref", "dispatch_id", "method_ref"]
    : ["id", "change_id", "revision", "source_ref", "orchestrator_ref"];
  for (const field of required) {
    if (!reference((event as unknown as Record<string, unknown>)[field])) {
      problems.push(`${String(field)} must be a reference string`);
    }
  }
  if (!isoOrNull(event.observed_at))
    problems.push("observed_at must be a UTC ISO timestamp");
  const from = isoOrNull(event.window_from);
  const to = isoOrNull(event.window_to);
  if (!from || !to)
    problems.push("window_from and window_to must be UTC ISO timestamps");
  else if (Date.parse(from) >= Date.parse(to))
    problems.push("window_from must be before window_to");

  if (usageEvent) {
    const usage = event as DispatchUsageEvent;
    if (!ACTORS.includes(usage.actor))
      problems.push(`actor must be one of: ${ACTORS.join(", ")}`);
    const counters: Array<[string, number | null]> = [
      ["turns", usage.turns],
      ["input_tokens", usage.input_tokens],
      ["cached_input_tokens", usage.cached_input_tokens],
      ["cache_write_tokens", usage.cache_write_tokens],
      ["output_tokens", usage.output_tokens],
    ];
    for (const [field, value] of counters) {
      if (value !== null && !(Number.isSafeInteger(value) && value >= 0)) {
        problems.push(`${field} must be a non-negative integer or null`);
      }
    }
    if (
      usage.recorded_cost !== null &&
      !(
        typeof usage.recorded_cost === "number" &&
        Number.isFinite(usage.recorded_cost) &&
        usage.recorded_cost >= 0
      )
    ) {
      problems.push(
        "recorded_cost must be a finite non-negative number or null",
      );
    }
    if (typeof usage.coverage_complete !== "boolean") {
      problems.push("coverage_complete must be a boolean");
    }
    if (usage.cost_basis !== "host-recorded-estimate") {
      problems.push('cost_basis must be "host-recorded-estimate"');
    }
    const identity = usageIdentity(
      usage.dispatch_id,
      usage.actor,
      usage.window_from,
      usage.window_to,
    );
    if (usage.id !== eventId("dispatch-usage", identity)) {
      problems.push("id must equal the event's domain identity");
    }
    if (usage.unavailable_code !== undefined) {
      if (
        usage.turns !== null ||
        usage.input_tokens !== null ||
        usage.cached_input_tokens !== null ||
        usage.cache_write_tokens !== null ||
        usage.output_tokens !== null ||
        usage.recorded_cost !== null ||
        usage.coverage_complete
      ) {
        problems.push(
          "an unavailable event must carry null counters and incomplete coverage",
        );
      }
    }
  } else {
    const inventory = event as DispatchInventoryEvent;
    if (
      !Number.isSafeInteger(inventory.unrecorded_count) ||
      inventory.unrecorded_count < 0
    ) {
      problems.push("unrecorded_count must be a non-negative integer");
    }
    const identity = inventoryIdentity(
      inventory.change_id,
      inventory.orchestrator_ref,
      inventory.window_from,
      inventory.window_to,
    );
    if (inventory.id !== eventId("dispatch-inventory", identity)) {
      problems.push("id must equal the event's domain identity");
    }
  }
  return problems;
}

interface WindowedEvent {
  window_from: string;
  window_to: string;
}

function overlaps(left: WindowedEvent, right: WindowedEvent): boolean {
  return (
    Date.parse(left.window_from) < Date.parse(right.window_to) &&
    Date.parse(right.window_from) < Date.parse(left.window_to)
  );
}

function sameWindow(left: WindowedEvent, right: WindowedEvent): boolean {
  return (
    Date.parse(left.window_from) === Date.parse(right.window_from) &&
    Date.parse(left.window_to) === Date.parse(right.window_to)
  );
}

function asEvent(raw: Record<string, unknown>): EmittedEvent | null {
  if (raw.kind !== "dispatch-usage" && raw.kind !== "dispatch-inventory")
    return null;
  return raw as unknown as EmittedEvent;
}

/** Domain identity key with its windows canonicalized, as the id derivation requires. */
function identityOf(event: EmittedEvent): string {
  const windowFrom = isoOrNull(event.window_from) ?? event.window_from;
  const windowTo = isoOrNull(event.window_to) ?? event.window_to;
  return event.kind === "dispatch-usage"
    ? usageIdentity(event.dispatch_id, event.actor, windowFrom, windowTo)
    : inventoryIdentity(
        event.change_id,
        event.orchestrator_ref,
        windowFrom,
        windowTo,
      );
}

/**
 * Validates the new events against the file they join: identity replay is a
 * no-op, a conflicting replay is an error, and the overlap, consistency and
 * referential rules apply. The id is a hash of the domain identity, so a written
 * id must never belong to a different identity (shared writer contract).
 */
function mergeEvents(
  existing: readonly Record<string, unknown>[],
  candidate: readonly EmittedEvent[],
): { append: EmittedEvent[]; skipped: number } {
  const byId = new Map<string, string>();
  const replayById = new Map<string, string>();
  const replayByIdentity = new Map<string, string>();
  const identities = new Map<string, string | null>();
  const dispatches = new Map<string, RecordedDispatch>();
  for (const raw of existing) {
    byId.set(String(raw.id), canonical(raw));
    const known = asEvent(raw);
    identities.set(String(raw.id), known ? identityOf(known) : null);
    if (known) {
      replayById.set(String(raw.id), replayPayload(known));
      replayByIdentity.set(identityOf(known), replayPayload(known));
    }
    if (raw.kind !== "dispatch") continue;
    for (const dispatch of recordedDispatches({
      schema_version: 1,
      source_kind: "host-export",
      coverage: [],
      events: [raw],
    })) {
      dispatches.set(dispatch.dispatch_id, dispatch);
    }
  }
  const merged = [...existing];
  const append: EmittedEvent[] = [];
  let skipped = 0;

  for (const event of candidate) {
    const problems = validateEmitted(event);
    if (problems.length > 0) {
      throw new Error(`event-invalid: ${event.id}: ${problems.join("; ")}`);
    }
    const identity = identityOf(event);
    const payload = canonical(withoutId(event));
    const replay = replayPayload(event);
    if (byId.has(event.id)) {
      if (identities.get(event.id) !== identity) {
        throw new Error(
          `event-conflict: ${event.id} is already used by a different identity`,
        );
      }
      if (replayById.get(event.id) !== replay) {
        throw new Error(
          `event-conflict: ${event.id} already exists with a different payload`,
        );
      }
      skipped += 1;
      continue;
    }
    if (replayByIdentity.has(identity)) {
      if (replayByIdentity.get(identity) !== replay) {
        throw new Error(
          `event-conflict: ${event.id} already exists with a different payload`,
        );
      }
      skipped += 1;
      continue;
    }

    if (event.kind === "dispatch-usage") {
      for (const raw of merged) {
        const other = asEvent(raw);
        if (
          !other ||
          other.kind !== "dispatch-usage" ||
          other.dispatch_id !== event.dispatch_id ||
          other.actor !== event.actor ||
          sameWindow(other, event)
        )
          continue;
        if (overlaps(other, event)) {
          throw new Error(
            `window-overlap: ${event.id} overlaps an existing window for the same dispatch and actor`,
          );
        }
      }
      const dispatch = dispatches.get(event.dispatch_id);
      if (!dispatch) {
        throw new Error(
          `reference-missing: ${event.id} names an unknown dispatch`,
        );
      }
      if (dispatch.change_id !== event.change_id) {
        throw new Error(
          `change-mismatch: ${event.id} does not match its dispatch change`,
        );
      }
      if (Date.parse(event.observed_at) < Date.parse(dispatch.observed_at)) {
        throw new Error(`chronology: ${event.id} precedes its dispatch`);
      }
    } else {
      for (const raw of merged) {
        const other = asEvent(raw);
        if (!other || other.kind !== "dispatch-inventory") continue;
        if (other.orchestrator_ref !== event.orchestrator_ref) continue;
        if (sameWindow(other, event)) {
          if (other.unrecorded_count !== event.unrecorded_count) {
            throw new Error(
              `inventory-conflict: ${event.id} disagrees with an existing unrecorded_count for the same window`,
            );
          }
          continue;
        }
        if (overlaps(other, event)) {
          throw new Error(
            `window-overlap: ${event.id} overlaps an existing inventory window for the same orchestrator`,
          );
        }
      }
    }

    merged.push(event as unknown as Record<string, unknown>);
    append.push(event);
    byId.set(event.id, payload);
    replayById.set(event.id, replay);
    replayByIdentity.set(identity, replay);
    identities.set(event.id, identity);
  }
  return { append, skipped };
}

/** Appends dispatch observations under the shared lock. Nothing is written on failure. */
export async function appendDispatchEvents(
  filePath: string,
  events: readonly EmittedEvent[],
  options: AppendOptions = {},
): Promise<AppendResult> {
  if (events.length === 0) return { written: 0, skipped: 0 };
  mkdirSync(path.dirname(filePath), { recursive: true });
  const lock = await acquireLock(
    filePath,
    options.lockTimeoutMs ?? lockTimeoutFromEnvironment(),
  );
  try {
    const file = readObservations(filePath);
    const { append, skipped } = mergeEvents(file.events, events);
    if (append.length === 0) return { written: 0, skipped };
    const next = {
      schema_version: 1,
      source_kind: file.source_kind,
      coverage: file.coverage,
      events: [...file.events, ...append],
    };
    const temporary = `${filePath}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
    try {
      writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`);
      renameSync(temporary, filePath);
    } catch {
      try {
        unlinkSync(temporary);
      } catch {
        // A partial temporary file is the only thing a failed write may leave behind.
      }
      throw new Error("write-failed: the observation file was not replaced");
    }
    return { written: append.length, skipped };
  } finally {
    lock.release();
  }
}
