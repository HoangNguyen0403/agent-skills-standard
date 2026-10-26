// Token/cost usage capture and aggregation for live eval worker runs.
// See docs/EVALS.md "Usage capture and cost gates" for the end-to-end contract.
//
// Usage is parsed tolerantly from `codex exec --json` JSONL event streams. A
// missing or unparseable event stream MUST NEVER fail an eval run and MUST
// NEVER be estimated or guessed — record `usage: null` for that lane and keep
// going (the `common-sdlc-metrics` "report unavailable" rule).
import { costUSD } from "../benchmark/utils";
import { MODELS } from "../benchmark/models";
import type {
  ArmName,
  RunUsage,
  TaskActorIdentity,
  TaskAttemptOutcome,
  TaskAttemptRecord,
  UsageSample,
  UsageTotals,
} from "./types";

/**
 * Parse the cumulative token usage out of a `codex exec --json` JSONL event
 * stream. Tolerant by design: unparseable lines, missing fields, and streams
 * with no `token_count` event all return `null` rather than throwing or
 * guessing a value.
 */
export function parseUsageFromJsonl(
  jsonl: string,
  wallMs: number,
): UsageSample | null {
  if (!jsonl || !jsonl.trim()) return null;
  let last:
    | {
        inputTokens: number;
        cachedInputTokens: number;
        outputTokens: number;
        reasoningOutputTokens: number;
        totalTokens: number;
      }
    | undefined;
  for (const line of jsonl.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const msg = (parsed as { msg?: unknown } | null)?.msg as
      { type?: unknown; info?: unknown } | undefined;
    if (!msg || msg.type !== "token_count") continue;
    const info = msg.info as { total_token_usage?: unknown } | null | undefined;
    const total = info?.total_token_usage as
      Record<string, unknown> | undefined;
    if (!total || typeof total !== "object") continue;
    const inputTokens = total.input_tokens;
    const outputTokens = total.output_tokens;
    if (typeof inputTokens !== "number" || typeof outputTokens !== "number")
      continue;
    const cachedInputTokens = total.cached_input_tokens;
    const reasoningOutputTokens = total.reasoning_output_tokens;
    const totalTokens = total.total_tokens;
    last = {
      inputTokens,
      cachedInputTokens:
        typeof cachedInputTokens === "number" ? cachedInputTokens : 0,
      outputTokens,
      reasoningOutputTokens:
        typeof reasoningOutputTokens === "number" ? reasoningOutputTokens : 0,
      totalTokens:
        typeof totalTokens === "number"
          ? totalTokens
          : inputTokens + outputTokens,
    };
  }
  if (!last) return null;
  return {
    promptTokens: last.inputTokens,
    completionTokens: last.outputTokens,
    cachedPromptTokens: last.cachedInputTokens,
    reasoningTokens: last.reasoningOutputTokens,
    wallMs,
  };
}

/**
 * Resolve a per-million-token price for a model id. Exact (case-insensitive)
 * match against the pricing table only — no fuzzy matching, no fallback
 * guess. An unresolved model MUST report cost as unavailable, never a guess.
 */
export function resolvePriceForModel(model: string): number | null {
  const target = model.trim().toLowerCase();
  for (const [name, price] of Object.entries(MODELS)) {
    if (name.trim().toLowerCase() === target) return price;
  }
  return null;
}

export function emptyUsageTotals(): UsageTotals {
  return {
    promptTokens: 0,
    completionTokens: 0,
    cachedPromptTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    wallMs: 0,
    lanesMetered: 0,
    lanesUnmetered: 0,
    estimatedUsd: null,
  };
}

function accumulate(totals: UsageTotals, usage: UsageSample | null): void {
  if (!usage) {
    totals.lanesUnmetered += 1;
    return;
  }
  totals.lanesMetered += 1;
  totals.promptTokens += usage.promptTokens;
  totals.completionTokens += usage.completionTokens;
  totals.cachedPromptTokens += usage.cachedPromptTokens ?? 0;
  totals.reasoningTokens += usage.reasoningTokens ?? 0;
  totals.totalTokens += usage.promptTokens + usage.completionTokens;
  totals.wallMs += usage.wallMs;
}

function priceTotals(totals: UsageTotals, model: string): UsageTotals {
  const price = resolvePriceForModel(model);
  return {
    ...totals,
    estimatedUsd: price === null ? null : costUSD(totals.totalTokens, price),
  };
}

/** Aggregate one execution batch's per-lane usage samples into run + per-arm totals. */
export function aggregateUsage(
  entries: Array<{ arm?: ArmName; usage: UsageSample | null }>,
  model: string,
): RunUsage {
  const overall = emptyUsageTotals();
  const byArm: Partial<Record<ArmName, UsageTotals>> = {};
  for (const entry of entries) {
    accumulate(overall, entry.usage);
    if (entry.arm) {
      const armTotals = (byArm[entry.arm] ??= emptyUsageTotals());
      accumulate(armTotals, entry.usage);
    }
  }
  const pricedByArm: Partial<Record<ArmName, UsageTotals>> = {};
  for (const arm of Object.keys(byArm) as ArmName[]) {
    pricedByArm[arm] = priceTotals(byArm[arm] as UsageTotals, model);
  }
  return { overall: priceTotals(overall, model), byArm: pricedByArm };
}

export interface TaskCohortUsage {
  totals: UsageTotals;
  attemptsByOutcome: Record<TaskAttemptOutcome, number>;
  /** Distinct declared actors observed in the attempt records. */
  observedActors: TaskActorIdentity[];
  /** Attempts whose task/actor/attempt identity is absent. */
  unknownActorAttempts: number;
  /** Distinct task ids observed; a savings claim requires exactly one. */
  taskIds: string[];
  /** True only when full actor coverage and pricing are certified. */
  complete: boolean;
}

export interface TaskCohortOptions {
  /** Declared actors that must all be observed before coverage is certified. */
  expectedActors?: readonly TaskActorIdentity[];
}

export interface TaskComparisonOptions {
  baselineExpectedActors?: readonly TaskActorIdentity[];
  currentExpectedActors?: readonly TaskActorIdentity[];
}

function actorKey(actor: TaskActorIdentity): string {
  return JSON.stringify([actor.role, actor.taskId, actor.parentTaskId]);
}

/**
 * Aggregate every attempt in one task cohort, including failed, retried and
 * cancelled attempts. A missing sample is unmetered, never zero. Coverage is
 * certified only from explicit identities plus a declared expected inventory;
 * it is never inferred from the attempt array alone.
 */
export function summarizeTaskUsage(
  attempts: readonly TaskAttemptRecord[],
  model: string,
  options: TaskCohortOptions = {},
): TaskCohortUsage {
  const totals = emptyUsageTotals();
  const attemptsByOutcome: Record<TaskAttemptOutcome, number> = {
    completed: 0,
    failed: 0,
    retried: 0,
    interrupted: 0,
    cancelled: 0,
  };
  const observed = new Map<string, TaskActorIdentity>();
  const taskIds = new Set<string>();
  let unknownActorAttempts = 0;
  for (const attempt of attempts) {
    accumulate(totals, attempt.usage);
    attemptsByOutcome[attempt.outcome] += 1;
    if (
      attempt.taskId === undefined ||
      attempt.parentTaskId === undefined ||
      attempt.actorRole === undefined ||
      attempt.attemptId === undefined
    ) {
      unknownActorAttempts += 1;
      continue;
    }
    const identity: TaskActorIdentity = {
      role: attempt.actorRole,
      taskId: attempt.taskId,
      parentTaskId: attempt.parentTaskId,
    };
    observed.set(actorKey(identity), identity);
    taskIds.add(attempt.taskId);
  }
  const expected = options.expectedActors ?? [];
  const priced = priceTotals(totals, model);
  return {
    totals: priced,
    attemptsByOutcome,
    observedActors: [...observed.values()],
    unknownActorAttempts,
    taskIds: [...taskIds],
    complete:
      attempts.length > 0 &&
      unknownActorAttempts === 0 &&
      taskIds.size === 1 &&
      expected.length > 0 &&
      expected.every((actor) => observed.has(actorKey(actor))) &&
      priced.lanesUnmetered === 0 &&
      priced.estimatedUsd !== null,
  };
}

export interface TaskComparison {
  baseline: TaskCohortUsage;
  current: TaskCohortUsage;
  /** `null` whenever coverage or pricing is incomplete. */
  savingsUsd: number | null;
  withheldReason: string | null;
}

/**
 * Compare a baseline and candidate task cohort. Monetary savings are withheld
 * unless both cohorts are fully metered, priced, identically scoped to one
 * task, and carry a certified full-actor inventory.
 */
export function compareTaskUsage(
  baseline: readonly TaskAttemptRecord[],
  current: readonly TaskAttemptRecord[],
  model: string,
  options: TaskComparisonOptions = {},
): TaskComparison {
  const baselineCohort = summarizeTaskUsage(baseline, model, {
    expectedActors: options.baselineExpectedActors,
  });
  const currentCohort = summarizeTaskUsage(current, model, {
    expectedActors: options.currentExpectedActors,
  });
  const withhold = (withheldReason: string): TaskComparison => ({
    baseline: baselineCohort,
    current: currentCohort,
    savingsUsd: null,
    withheldReason,
  });
  if (baseline.length === 0 || current.length === 0)
    return withhold("no recorded attempts in one or both cohorts");
  if (
    baselineCohort.totals.lanesUnmetered > 0 ||
    currentCohort.totals.lanesUnmetered > 0
  )
    return withhold(
      "unmetered attempt lanes present; missing usage is unknown, never zero",
    );
  if (
    baselineCohort.totals.estimatedUsd === null ||
    currentCohort.totals.estimatedUsd === null
  )
    return withhold(`price unresolved for model "${model}"`);
  if (
    baselineCohort.unknownActorAttempts > 0 ||
    currentCohort.unknownActorAttempts > 0
  )
    return withhold(
      "cohort actor membership is unknown for one or more attempts",
    );
  if (!baselineCohort.complete || !currentCohort.complete)
    return withhold(
      "full actor coverage is not certified for one or both cohorts",
    );
  if (baselineCohort.taskIds[0] !== currentCohort.taskIds[0])
    return withhold("baseline and current cohorts cover different tasks");
  return {
    baseline: baselineCohort,
    current: currentCohort,
    savingsUsd:
      baselineCohort.totals.estimatedUsd - currentCohort.totals.estimatedUsd,
    withheldReason: null,
  };
}

function mergeUsageTotals(
  a: UsageTotals | undefined,
  b: UsageTotals,
): UsageTotals {
  if (!a) return b;
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    cachedPromptTokens: a.cachedPromptTokens + b.cachedPromptTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    wallMs: a.wallMs + b.wallMs,
    lanesMetered: a.lanesMetered + b.lanesMetered,
    lanesUnmetered: a.lanesUnmetered + b.lanesUnmetered,
    estimatedUsd: null,
  };
}

/** Merge a prior cumulative run usage record with a freshly executed batch (resume-safe). */
export function mergeRunUsage(
  prev: RunUsage | undefined,
  fresh: RunUsage,
  model: string,
): RunUsage {
  const overall = mergeUsageTotals(prev?.overall, fresh.overall);
  const byArm: Partial<Record<ArmName, UsageTotals>> = {};
  const arms: ArmName[] = ["baseline", "with-skill"];
  for (const arm of arms) {
    const prevArm = prev?.byArm?.[arm];
    const freshArm = fresh.byArm[arm];
    if (!prevArm && !freshArm) continue;
    byArm[arm] = mergeUsageTotals(prevArm, freshArm ?? emptyUsageTotals());
  }
  const pricedByArm: Partial<Record<ArmName, UsageTotals>> = {};
  for (const arm of Object.keys(byArm) as ArmName[]) {
    pricedByArm[arm] = priceTotals(byArm[arm] as UsageTotals, model);
  }
  return { overall: priceTotals(overall, model), byArm: pricedByArm };
}
