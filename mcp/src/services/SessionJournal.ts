import { createReadStream } from "node:fs";
import { realpath, readFile } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
import path from "node:path";

export type SessionRole = "main" | "implementation" | "review" | "auxiliary";
export type SessionFormat = "codex" | "omp";
export type AttemptOutcome = "completed" | "failed" | "retried" | "interrupted";
export type SessionPhase =
  "planning" | "repair" | "acceptance" | "analysis" | "delivery" | "auxiliary";

export interface SessionManifest {
  workspace: string;
  startedAt: string;
  completedAt: string;
  sessions: Array<{
    path: string;
    format: SessionFormat;
    role: SessionRole;
    attemptOutcome: AttemptOutcome | null;
    auxiliaryPurpose?: string;
  }>;
  expectedSessionIds: string[];
  phaseWindows: Array<{
    phase: SessionPhase;
    startedAt: string;
    completedAt: string;
  }>;
}

export interface SessionUsageGroup {
  role: SessionRole;
  usageKind: "conversation" | "auxiliary";
  model: string;
  phase: SessionPhase | null;
  attemptOutcome: AttemptOutcome | null;
  auxiliaryPurpose: string | null;
  nativePurpose: string | null;
  nativeModelRole: string | null;
  messages: number;
  uncachedInputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number;
  reasoningTokens: number | null;
  orchestrationInputTokens: number | null;
  orchestrationCacheReadTokens: number | null;
  orchestrationOutputTokens: number | null;
  recordedCostEstimate: number | null;
}

export interface SessionJournalReport {
  window: { startedAt: string; completedAt: string };
  coverage: {
    selectedSessions: number;
    expectedSessions: number;
    missingSessions: number;
    sessionsWithUsage: number;
    malformedLines: number;
    invalidUsageRecords: number;
    abortedSessions: number;
    resourceLimitReached: boolean;
    complete: boolean;
  };
  groups: SessionUsageGroup[];
  limitations: string[];
}

interface Counters {
  input: number;
  cachedInput?: number;
  cacheWrite?: number;
  output: number;
  reasoning?: number;
  orchestrationInput?: number;
  orchestrationCacheRead?: number;
  orchestrationOutput?: number;
  total?: number;
  cost?: number;
}

interface Aggregate extends SessionUsageGroup {
  uncachedKnown: boolean;
  cacheKnown: boolean;
  cacheWriteKnown: boolean;
  reasoningKnown: boolean;
  orchestrationInputKnown: boolean;
  orchestrationCacheReadKnown: boolean;
  orchestrationOutputKnown: boolean;
  costKnown: boolean;
}

const MAX_LINE_CHARS = 1_000_000;
const MAX_TRACKED_IDENTITIES = 10_000;
const PHASES: readonly SessionPhase[] = [
  "planning",
  "repair",
  "acceptance",
  "analysis",
  "delivery",
  "auxiliary",
];
const OUTCOMES: readonly AttemptOutcome[] = [
  "completed",
  "failed",
  "retried",
  "interrupted",
];
const ROLES: readonly SessionRole[] = [
  "main",
  "implementation",
  "review",
  "auxiliary",
];
const MODEL_ID = /^[A-Za-z0-9._:/+@-]{1,128}$/;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function* boundedLines(
  stream: AsyncIterable<Buffer>,
): AsyncGenerator<{ line: string | null; tooLong: boolean }> {
  const decoder = new StringDecoder("utf8");
  let fragments: string[] = [];
  let length = 0;
  let tooLong = false;

  const append = (fragment: string): void => {
    if (tooLong) return;
    length += fragment.length;
    if (length > MAX_LINE_CHARS) {
      tooLong = true;
      fragments = [];
      length = 0;
    } else if (fragment) fragments.push(fragment);
  };
  const finish = (): { line: string | null; tooLong: boolean } => {
    const result = {
      line: tooLong ? null : fragments.join("").replace(/\r$/, ""),
      tooLong,
    };
    fragments = [];
    length = 0;
    tooLong = false;
    return result;
  };

  for await (const chunk of stream) {
    const text = decoder.write(chunk);
    let start = 0;
    for (
      let index = text.indexOf("\n");
      index !== -1;
      index = text.indexOf("\n", start)
    ) {
      append(text.slice(start, index));
      yield finish();
      start = index + 1;
    }
    append(text.slice(start));
  }

  const trailing = decoder.end();
  if (trailing) append(trailing);
  if (length > 0 || fragments.length > 0 || tooLong) yield finish();
}

function safeModel(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !MODEL_ID.test(value) ||
    path.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    value.includes("\\") ||
    value.includes("://") ||
    value.startsWith("~/") ||
    value.split(/[\\/]/).includes("..") ||
    value.split("/").length > 2
  )
    return null;
  return value;
}

function timestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new Error(`Invalid ${label} timestamp in session manifest.`);
  return new Date(value).toISOString();
}

function readManifest(value: unknown): SessionManifest {
  if (
    !object(value) ||
    typeof value.workspace !== "string" ||
    !value.workspace ||
    !Array.isArray(value.sessions) ||
    value.sessions.length === 0 ||
    !Array.isArray(value.expectedSessionIds) ||
    !Array.isArray(value.phaseWindows)
  ) {
    throw new Error(
      "Session manifest must specify workspace, bounds, sessions, expectedSessionIds, and phaseWindows.",
    );
  }
  const startedAt = timestamp(value.startedAt, "start");
  const completedAt = timestamp(value.completedAt, "completion");
  if (Date.parse(startedAt) >= Date.parse(completedAt))
    throw new Error("Session manifest time bounds must be increasing.");
  const sessions = value.sessions.map((entry) => {
    if (
      !object(entry) ||
      typeof entry.path !== "string" ||
      !entry.path ||
      !["codex", "omp"].includes(String(entry.format)) ||
      !ROLES.includes(entry.role as SessionRole)
    )
      throw new Error(
        "Each manifest session requires an explicit path, supported format, and role.",
      );
    if (
      entry.attemptOutcome !== null &&
      !OUTCOMES.includes(entry.attemptOutcome as AttemptOutcome)
    )
      throw new Error(
        "Session attemptOutcome must be a declared outcome or null.",
      );
    if (
      entry.role === "auxiliary" &&
      (typeof entry.auxiliaryPurpose !== "string" ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(entry.auxiliaryPurpose))
    )
      throw new Error("Auxiliary sessions require an auxiliaryPurpose label.");
    if (entry.role !== "auxiliary" && entry.auxiliaryPurpose !== undefined)
      throw new Error("auxiliaryPurpose is only valid for auxiliary sessions.");
    return {
      path: entry.path,
      format: entry.format as SessionFormat,
      role: entry.role as SessionRole,
      attemptOutcome: entry.attemptOutcome as AttemptOutcome | null,
      ...(typeof entry.auxiliaryPurpose === "string"
        ? { auxiliaryPurpose: entry.auxiliaryPurpose }
        : {}),
    };
  });
  if (
    value.expectedSessionIds.some((id) => typeof id !== "string" || !id) ||
    new Set(value.expectedSessionIds).size !== value.expectedSessionIds.length
  )
    throw new Error(
      "Expected session inventory must contain unique native identities.",
    );
  const phaseWindows = value.phaseWindows.map((entry) => {
    if (!object(entry) || !PHASES.includes(entry.phase as SessionPhase))
      throw new Error("Invalid declared phase window.");
    const phaseStart = timestamp(entry.startedAt, "phase start");
    const phaseEnd = timestamp(entry.completedAt, "phase completion");
    if (
      Date.parse(phaseStart) >= Date.parse(phaseEnd) ||
      Date.parse(phaseStart) < Date.parse(startedAt) ||
      Date.parse(phaseEnd) > Date.parse(completedAt)
    )
      throw new Error(
        "Phase windows must be increasing and inside report bounds.",
      );
    return {
      phase: entry.phase as SessionPhase,
      startedAt: phaseStart,
      completedAt: phaseEnd,
    };
  });
  for (let index = 1; index < phaseWindows.length; index += 1) {
    if (
      Date.parse(phaseWindows[index - 1].startedAt) >
        Date.parse(phaseWindows[index].startedAt) ||
      Date.parse(phaseWindows[index - 1].completedAt) >
        Date.parse(phaseWindows[index].startedAt)
    )
      throw new Error("Phase windows must be ordered and non-overlapping.");
  }
  return {
    workspace: path.resolve(value.workspace),
    startedAt,
    completedAt,
    sessions,
    expectedSessionIds: value.expectedSessionIds as string[],
    phaseWindows,
  };
}

function validCounters(value: unknown): value is Counters {
  if (
    !object(value) ||
    typeof value.input !== "number" ||
    typeof value.output !== "number"
  )
    return false;
  for (const key of [
    "input",
    "cachedInput",
    "cacheWrite",
    "output",
    "reasoning",
    "orchestrationInput",
    "orchestrationCacheRead",
    "orchestrationOutput",
    "total",
  ] as const) {
    const counter = value[key];
    if (
      counter !== undefined &&
      (typeof counter !== "number" ||
        !Number.isSafeInteger(counter) ||
        counter < 0)
    )
      return false;
  }
  if (typeof value.reasoning === "number" && value.reasoning > value.output)
    return false;
  if (
    typeof value.total === "number" &&
    value.total < value.input + value.output
  )
    return false;
  if (
    value.cost !== undefined &&
    (typeof value.cost !== "number" ||
      !Number.isFinite(value.cost) ||
      value.cost < 0)
  )
    return false;
  return true;
}

function codexCounters(value: unknown): Counters | null {
  if (!object(value)) return null;
  const counters: Record<string, unknown> = {};
  const mapping = {
    input_tokens: "input",
    cached_input_tokens: "cachedInput",
    cache_write_input_tokens: "cacheWrite",
    output_tokens: "output",
    reasoning_output_tokens: "reasoning",
    total_tokens: "total",
  } as const;
  for (const [source, target] of Object.entries(mapping))
    if (value[source] !== undefined) counters[target] = value[source];
  if (!validCounters(counters)) return null;
  if (
    counters.cachedInput !== undefined &&
    counters.cachedInput > counters.input
  )
    return null;
  if (
    counters.total !== undefined &&
    counters.total !== counters.input + counters.output
  )
    return null;
  return counters;
}

function delta(current: Counters, previous: Counters | null): Counters | null {
  const result: Counters = { input: current.input, output: current.output };
  for (const key of [
    "input",
    "cachedInput",
    "cacheWrite",
    "output",
    "reasoning",
  ] as const) {
    const now = current[key];
    const before = previous?.[key];
    if (now === undefined) continue;
    if (previous === null) {
      result[key] = now;
    } else if (before !== undefined) {
      if (now < before) return null;
      result[key] = now - before;
    }
  }
  return validCounters(result) ? result : null;
}

function phaseFor(
  manifest: SessionManifest,
  time: number,
): SessionPhase | null {
  const entry = manifest.phaseWindows.find(
    (window) =>
      time >= Date.parse(window.startedAt) &&
      time < Date.parse(window.completedAt),
  );
  return entry?.phase ?? null;
}

function aggregateKey(
  role: SessionRole,
  usageKind: "conversation" | "auxiliary",
  model: string,
  phase: SessionPhase | null,
  outcome: AttemptOutcome | null,
  purpose: string | null,
  nativePurpose: string | null,
  nativeModelRole: string | null,
): string {
  return JSON.stringify([
    role,
    usageKind,
    model,
    phase,
    outcome,
    purpose,
    nativePurpose,
    nativeModelRole,
  ]);
}

function addUsage(
  groups: Map<string, Aggregate>,
  session: SessionManifest["sessions"][number],
  model: string,
  phase: SessionPhase | null,
  counters: Counters,
  codex: boolean,
  options: {
    usageKind?: "conversation" | "auxiliary";
    nativePurpose?: string | null;
    nativeModelRole?: string | null;
    countMessage?: boolean;
  } = {},
): void {
  const role = session.role;
  const usageKind = options.usageKind ?? "conversation";
  const purpose =
    session.auxiliaryPurpose ?? (role === "auxiliary" ? "unspecified" : null);
  const nativePurpose = options.nativePurpose ?? null;
  const nativeModelRole = options.nativeModelRole ?? null;
  const key = aggregateKey(
    role,
    usageKind,
    model,
    phase,
    session.attemptOutcome,
    purpose,
    nativePurpose,
    nativeModelRole,
  );
  let group = groups.get(key);
  if (!group) {
    group = {
      role,
      usageKind,
      model,
      phase,
      attemptOutcome: session.attemptOutcome,
      auxiliaryPurpose: purpose,
      nativePurpose,
      nativeModelRole,
      messages: 0,
      uncachedInputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      orchestrationInputTokens: 0,
      orchestrationCacheReadTokens: 0,
      orchestrationOutputTokens: 0,
      recordedCostEstimate: 0,
      uncachedKnown: true,
      cacheKnown: true,
      cacheWriteKnown: true,
      reasoningKnown: true,
      orchestrationInputKnown: true,
      orchestrationCacheReadKnown: true,
      orchestrationOutputKnown: true,
      costKnown: true,
    };
    groups.set(key, group);
  }
  if (options.countMessage !== false) group.messages += 1;
  if (!codex)
    group.uncachedInputTokens =
      (group.uncachedInputTokens ?? 0) + counters.input;
  else if (counters.cachedInput === undefined) group.uncachedKnown = false;
  else if (group.uncachedInputTokens !== null)
    group.uncachedInputTokens += counters.input - counters.cachedInput;
  group.outputTokens += counters.output;
  if (counters.cachedInput === undefined) group.cacheKnown = false;
  else if (group.cachedInputTokens !== null)
    group.cachedInputTokens += counters.cachedInput;
  if (counters.cacheWrite === undefined) group.cacheWriteKnown = false;
  else if (group.cacheWriteTokens !== null)
    group.cacheWriteTokens += counters.cacheWrite;
  if (counters.reasoning === undefined) group.reasoningKnown = false;
  else if (group.reasoningTokens !== null)
    group.reasoningTokens += counters.reasoning;
  if (counters.orchestrationInput === undefined)
    group.orchestrationInputKnown = false;
  else
    group.orchestrationInputTokens =
      (group.orchestrationInputTokens ?? 0) + counters.orchestrationInput;
  if (counters.orchestrationCacheRead === undefined)
    group.orchestrationCacheReadKnown = false;
  else
    group.orchestrationCacheReadTokens =
      (group.orchestrationCacheReadTokens ?? 0) +
      counters.orchestrationCacheRead;
  if (counters.orchestrationOutput === undefined)
    group.orchestrationOutputKnown = false;
  else
    group.orchestrationOutputTokens =
      (group.orchestrationOutputTokens ?? 0) + counters.orchestrationOutput;
  if (counters.cost === undefined) group.costKnown = false;
  else if (group.recordedCostEstimate !== null)
    group.recordedCostEstimate += counters.cost;
}

type AggregateKnownKey =
  | "uncachedKnown"
  | "cacheKnown"
  | "cacheWriteKnown"
  | "reasoningKnown"
  | "orchestrationInputKnown"
  | "orchestrationCacheReadKnown"
  | "orchestrationOutputKnown"
  | "costKnown";

type AggregateValueKey =
  | "uncachedInputTokens"
  | "cachedInputTokens"
  | "cacheWriteTokens"
  | "reasoningTokens"
  | "orchestrationInputTokens"
  | "orchestrationCacheReadTokens"
  | "orchestrationOutputTokens"
  | "recordedCostEstimate";

function mergeAggregateMetric<
  K extends AggregateKnownKey,
  V extends AggregateValueKey,
>(target: Aggregate, source: Aggregate, knownKey: K, valueKey: V): void {
  const known = target[knownKey] && source[knownKey];
  target[knownKey] = known;
  target[valueKey] = known
    ? (target[valueKey] ?? 0) + (source[valueKey] ?? 0)
    : null;
}

function mergeAggregates(target: Aggregate, source: Aggregate): void {
  target.messages += source.messages;
  target.outputTokens += source.outputTokens;
  mergeAggregateMetric(target, source, "uncachedKnown", "uncachedInputTokens");
  mergeAggregateMetric(target, source, "cacheKnown", "cachedInputTokens");
  mergeAggregateMetric(target, source, "cacheWriteKnown", "cacheWriteTokens");
  mergeAggregateMetric(target, source, "reasoningKnown", "reasoningTokens");
  mergeAggregateMetric(
    target,
    source,
    "orchestrationInputKnown",
    "orchestrationInputTokens",
  );
  mergeAggregateMetric(
    target,
    source,
    "orchestrationCacheReadKnown",
    "orchestrationCacheReadTokens",
  );
  mergeAggregateMetric(
    target,
    source,
    "orchestrationOutputKnown",
    "orchestrationOutputTokens",
  );
  mergeAggregateMetric(target, source, "costKnown", "recordedCostEstimate");
}

function redactNativeIdentities(
  groups: Map<string, Aggregate>,
  expectedSessionIds: readonly string[],
  nativeIdentities: ReadonlySet<string>,
  provenanceComplete: boolean,
): Map<string, Aggregate> {
  const provenanceValues = new Set<string>();
  for (const group of groups.values()) {
    if (group.nativePurpose !== null) provenanceValues.add(group.nativePurpose);
    if (group.nativeModelRole !== null)
      provenanceValues.add(group.nativeModelRole);
  }
  const redactedValues = new Set<string>();
  if (!provenanceComplete) {
    for (const value of provenanceValues) redactedValues.add(value);
  } else {
    for (const identity of expectedSessionIds)
      if (provenanceValues.has(identity)) redactedValues.add(identity);
    for (const identity of nativeIdentities)
      if (provenanceValues.has(identity)) redactedValues.add(identity);
  }
  if (redactedValues.size === 0) return groups;

  const sanitizedGroups = new Map<string, Aggregate>();
  for (const group of groups.values()) {
    const nativePurpose =
      group.nativePurpose !== null && redactedValues.has(group.nativePurpose)
        ? null
        : group.nativePurpose;
    const nativeModelRole =
      group.nativeModelRole !== null &&
      redactedValues.has(group.nativeModelRole)
        ? null
        : group.nativeModelRole;
    const key = aggregateKey(
      group.role,
      group.usageKind,
      group.model,
      group.phase,
      group.attemptOutcome,
      group.auxiliaryPurpose,
      nativePurpose,
      nativeModelRole,
    );
    const sanitized = { ...group, nativePurpose, nativeModelRole };
    const existing = sanitizedGroups.get(key);
    if (existing) mergeAggregates(existing, sanitized);
    else sanitizedGroups.set(key, sanitized);
  }
  return sanitizedGroups;
}

export async function collectSessionJournal(
  manifestPath: string,
): Promise<SessionJournalReport> {
  const manifestRealPath = await realpath(manifestPath).catch(() => null);
  if (!manifestRealPath)
    throw new Error("Session manifest could not be opened.");
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(manifestRealPath, "utf8"));
  } catch {
    throw new Error("Session manifest is not valid JSON.");
  }
  const manifest = readManifest(raw);
  const workspace = await realpath(manifest.workspace).catch(() => null);
  if (!workspace) throw new Error("Manifest workspace does not exist.");
  const manifestDir = path.dirname(manifestRealPath);
  const paths = manifest.sessions.map((session) =>
    path.resolve(manifestDir, session.path),
  );
  if (new Set(paths).size !== paths.length)
    throw new Error("Duplicate session paths are not allowed.");
  const selectedIds = new Set<string>();
  const nativeIdentities = new Set<string>();

  let nativeProvenanceComplete = true;
  let groups = new Map<string, Aggregate>();
  const coverage = {
    selectedSessions: manifest.sessions.length,
    expectedSessions: manifest.expectedSessionIds.length,
    missingSessions: 0,
    sessionsWithUsage: 0,
    malformedLines: 0,
    invalidUsageRecords: 0,
    abortedSessions: 0,
    resourceLimitReached: false,
    complete: true,
  };
  for (
    let sessionIndex = 0;
    sessionIndex < manifest.sessions.length;
    sessionIndex += 1
  ) {
    const session = manifest.sessions[sessionIndex];
    const file = paths[sessionIndex];
    const actualPath = await realpath(file).catch(() => null);
    if (!actualPath)
      throw new Error("A manifest-selected file could not be opened.");
    let sessionId: string | null = null;
    const stream = createReadStream(actualPath);
    let previous: Counters | null = null;
    let model = "unreported";
    let used = false;
    let aborted = false;
    const trackedRows = new Map<string, string | null>();
    const canTrackIdentity = () => {
      if (trackedRows.size >= MAX_TRACKED_IDENTITIES) {
        coverage.resourceLimitReached = true;
        return false;
      }
      return true;
    };
    try {
      for await (const { line, tooLong } of boundedLines(stream)) {
        if (tooLong) {
          if (session.format === "omp") nativeProvenanceComplete = false;
          coverage.malformedLines += 1;
          coverage.resourceLimitReached = true;
          break;
        }
        if (line === null || !line.trim()) continue;
        let row: unknown;
        try {
          row = JSON.parse(line);
        } catch {
          if (session.format === "omp") nativeProvenanceComplete = false;
          coverage.malformedLines += 1;
          continue;
        }
        if (!object(row)) {
          coverage.malformedLines += 1;
          if (session.format === "omp") nativeProvenanceComplete = false;
          continue;
        }
        if (
          sessionId === null &&
          session.format === "omp" &&
          row.type === "title"
        )
          continue;
        if (sessionId === null) {
          const codexHeader =
            row.type === "session_meta" && object(row.payload)
              ? row.payload
              : null;
          const ompHeader =
            row.type === "session" && row.version === 3 ? row : null;
          const nativeId =
            session.format === "codex" ? codexHeader?.id : ompHeader?.id;
          const nativeCwd =
            session.format === "codex" ? codexHeader?.cwd : ompHeader?.cwd;
          if (
            typeof nativeId !== "string" ||
            !nativeId ||
            typeof nativeCwd !== "string"
          )
            throw new Error(
              "Native session header does not match its declared format.",
            );
          const nativeWorkspace = await realpath(nativeCwd).catch(() => null);
          if (nativeWorkspace !== workspace)
            throw new Error("Native session workspace mismatch with manifest.");
          if (selectedIds.has(nativeId))
            throw new Error(
              "Duplicate native session identities are not allowed.",
            );
          if (!manifest.expectedSessionIds.includes(nativeId))
            throw new Error(
              "Native session identity is not declared in expected inventory.",
            );
          selectedIds.add(nativeId);
          sessionId = nativeId;
          continue;
        }
        const time =
          typeof row.timestamp === "string" ? Date.parse(row.timestamp) : NaN;
        const inWindow =
          Number.isFinite(time) &&
          time >= Date.parse(manifest.startedAt) &&
          time < Date.parse(manifest.completedAt);
        if (session.format === "codex") {
          if (
            row.type === "event_msg" &&
            object(row.payload) &&
            row.payload.type === "turn_aborted" &&
            inWindow
          )
            aborted = true;
          if (
            row.type === "turn_context" &&
            object(row.payload) &&
            typeof row.payload.model === "string"
          ) {
            model = safeModel(row.payload.model) ?? "unreported";
            if (model === "unreported") coverage.invalidUsageRecords += 1;
          }
          if (
            row.type !== "event_msg" ||
            !object(row.payload) ||
            row.payload.type !== "token_count"
          )
            continue;
          if (!Number.isFinite(time) || !object(row.payload.info)) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          const info = row.payload.info;
          const cumulative =
            info.total_token_usage === undefined
              ? null
              : codexCounters(info.total_token_usage);
          const last =
            info.last_token_usage === undefined
              ? null
              : codexCounters(info.last_token_usage);
          if (
            (info.total_token_usage !== undefined && !cumulative) ||
            (info.last_token_usage !== undefined && !last) ||
            (!cumulative && !last)
          ) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          const usage = cumulative ? delta(cumulative, previous) : last;
          if (
            !usage ||
            (cumulative !== null &&
              usage.cachedInput !== undefined &&
              usage.cachedInput > usage.input)
          ) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          if (cumulative) previous = cumulative;
          if (!inWindow) continue;
          addUsage(
            groups,
            session,
            model,
            phaseFor(manifest, time),
            usage,
            true,
          );
          used = true;
        } else {
          const identity =
            typeof row.id === "string" && row.id ? row.id : undefined;
          const identityWasTracked =
            identity !== undefined && trackedRows.has(identity);
          if (identity !== undefined && !identityWasTracked) {
            if (!canTrackIdentity()) {
              nativeProvenanceComplete = false;
              break;
            }
            trackedRows.set(identity, null);
          }
          if (identity !== undefined && !nativeIdentities.has(identity)) {
            if (nativeIdentities.size >= MAX_TRACKED_IDENTITIES) {
              nativeProvenanceComplete = false;
              coverage.resourceLimitReached = true;
            } else {
              nativeIdentities.add(identity);
            }
          }
          const messageRecord = object(row.message) ? row.message : null;
          const modelUsageRecord = row.type === "model_usage";
          if (
            inWindow &&
            ((row.type === "message" &&
              messageRecord?.role === "assistant" &&
              messageRecord.stopReason === "aborted") ||
              (modelUsageRecord && row.stopReason === "aborted"))
          )
            aborted = true;
          if (
            !modelUsageRecord &&
            !(row.type === "message" && messageRecord?.role === "assistant")
          )
            continue;
          if (!Number.isFinite(time)) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          if (!identity) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          const usageRecord = modelUsageRecord ? row : messageRecord;
          const nativeUsage = object(usageRecord?.usage)
            ? usageRecord.usage
            : null;
          if (!nativeUsage) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          const countersValue: Record<string, unknown> = {
            input: nativeUsage.input,
            output: nativeUsage.output,
          };
          const optionalFields = {
            cacheRead: "cachedInput",
            cacheWrite: "cacheWrite",
            reasoningTokens: "reasoning",
            totalTokens: "total",
          } as const;
          for (const [source, target] of Object.entries(optionalFields))
            if (Object.hasOwn(nativeUsage, source))
              countersValue[target] = nativeUsage[source];
          if (Object.hasOwn(nativeUsage, "orchestration")) {
            const orchestration = nativeUsage.orchestration;
            if (!object(orchestration)) {
              coverage.invalidUsageRecords += 1;
              continue;
            }
            const orchestrationFields = {
              input: "orchestrationInput",
              cacheRead: "orchestrationCacheRead",
              output: "orchestrationOutput",
            } as const;
            for (const [source, target] of Object.entries(orchestrationFields))
              if (Object.hasOwn(orchestration, source))
                countersValue[target] = orchestration[source];
          }
          if (Object.hasOwn(nativeUsage, "cost")) {
            const nativeCost = nativeUsage.cost;
            if (!object(nativeCost) || !Object.hasOwn(nativeCost, "total")) {
              coverage.invalidUsageRecords += 1;
              continue;
            }
            countersValue.cost = nativeCost.total;
          }
          if (!validCounters(countersValue)) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          if (
            modelUsageRecord &&
            (typeof row.model !== "string" ||
              typeof row.purpose !== "string" ||
              (row.role !== undefined && typeof row.role !== "string"))
          ) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          const modelName = safeModel(usageRecord?.model) ?? "unreported";
          if (usageRecord?.model !== undefined && modelName === "unreported")
            coverage.invalidUsageRecords += 1;
          const nativePurpose =
            modelUsageRecord && typeof row.purpose === "string"
              ? row.purpose
              : null;
          const nativeModelRole =
            modelUsageRecord && typeof row.role === "string" ? row.role : null;
          if (
            (nativePurpose !== null &&
              !/^[A-Za-z0-9_-]{1,64}$/.test(nativePurpose)) ||
            (nativeModelRole !== null &&
              !/^[A-Za-z0-9_-]{1,64}$/.test(nativeModelRole))
          ) {
            coverage.invalidUsageRecords += 1;
            continue;
          }
          const signature = JSON.stringify([
            modelUsageRecord ? "model_usage" : "message",
            modelName,
            countersValue,
            nativePurpose,
            nativeModelRole,
          ]);
          const previousSignature = trackedRows.get(identity);
          if (
            identityWasTracked &&
            previousSignature !== null &&
            previousSignature !== undefined
          ) {
            if (previousSignature !== signature)
              coverage.invalidUsageRecords += 1;
            continue;
          }
          trackedRows.set(identity, signature);
          if (!inWindow) continue;
          addUsage(
            groups,
            session,
            modelName,
            phaseFor(manifest, time),
            countersValue,
            false,
            modelUsageRecord
              ? {
                  usageKind: "auxiliary",
                  nativePurpose,
                  nativeModelRole,
                  countMessage: false,
                }
              : undefined,
          );
          used = true;
        }
      }
      if (sessionId === null) throw new Error("Native session file is empty.");
    } finally {
      stream.destroy();
    }
    groups = redactNativeIdentities(
      groups,
      manifest.expectedSessionIds,
      nativeIdentities,
      nativeProvenanceComplete,
    );
    for (const identity of trackedRows.keys()) trackedRows.set(identity, null);
    if (used) coverage.sessionsWithUsage += 1;
    if (aborted) coverage.abortedSessions += 1;
  }
  coverage.missingSessions =
    manifest.expectedSessionIds.length - selectedIds.size;
  coverage.complete =
    coverage.missingSessions === 0 &&
    coverage.malformedLines === 0 &&
    coverage.invalidUsageRecords === 0 &&
    coverage.abortedSessions === 0 &&
    !coverage.resourceLimitReached &&
    coverage.sessionsWithUsage === coverage.selectedSessions;
  const reportGroups = [...groups.values()]
    .map((group) => ({
      role: group.role,
      usageKind: group.usageKind,
      model: group.model,
      phase: group.phase,
      attemptOutcome: group.attemptOutcome,
      auxiliaryPurpose: group.auxiliaryPurpose,
      nativePurpose: group.nativePurpose,
      nativeModelRole: group.nativeModelRole,
      messages: group.messages,
      uncachedInputTokens: group.uncachedKnown
        ? group.uncachedInputTokens
        : null,
      cachedInputTokens: group.cacheKnown ? group.cachedInputTokens : null,
      cacheWriteTokens: group.cacheWriteKnown ? group.cacheWriteTokens : null,
      outputTokens: group.outputTokens,
      reasoningTokens: group.reasoningKnown ? group.reasoningTokens : null,
      orchestrationInputTokens: group.orchestrationInputKnown
        ? group.orchestrationInputTokens
        : null,
      orchestrationCacheReadTokens: group.orchestrationCacheReadKnown
        ? group.orchestrationCacheReadTokens
        : null,
      orchestrationOutputTokens: group.orchestrationOutputKnown
        ? group.orchestrationOutputTokens
        : null,
      recordedCostEstimate: group.costKnown ? group.recordedCostEstimate : null,
    }))
    .sort(
      (a, b) =>
        a.role.localeCompare(b.role) ||
        a.usageKind.localeCompare(b.usageKind) ||
        a.model.localeCompare(b.model) ||
        (a.phase ?? "").localeCompare(b.phase ?? "") ||
        (a.attemptOutcome ?? "").localeCompare(b.attemptOutcome ?? ""),
    );
  return {
    window: {
      startedAt: manifest.startedAt,
      completedAt: manifest.completedAt,
    },
    coverage,
    groups: reportGroups,
    limitations: [
      "Only explicitly listed session files, expected identities, roles, workspace, and time bounds were read; other host activity is not measured.",
      "Caller-supplied inventory is a scope declaration, not proof of complete host activity. Missing expected actors and malformed, invalid, aborted, or no-usage sessions make coverage incomplete.",
      "Phase gaps and undeclared outcomes remain unattributed or unknown; elapsed session spans are not billed compute.",
      "Provider-unreported submetrics and native cost unavailable in session records remain unknown. OMP orchestration buckets are preserved independently when present; no rates or invoice totals are inferred.",
      `Oversized records longer than ${MAX_LINE_CHARS} characters or selected journals exceeding ${MAX_TRACKED_IDENTITIES} tracked native identities stop accounting for that journal, set the resource-limit flag, and make coverage incomplete.`,
      `Cross-journal OMP privacy membership is separately capped at ${MAX_TRACKED_IDENTITIES} distinct row identities; reaching that cap withholds all native provenance and sets resource-limited incomplete coverage while valid accounting continues.`,
      "Prompts, responses, credentials, filesystem paths, and native session identities are not included in reports.",
    ],
  };
}
