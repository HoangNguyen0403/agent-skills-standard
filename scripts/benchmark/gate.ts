import { BenchmarkHistoryRecord, BenchmarkSummary } from './types';

/**
 * Regression gate for `pnpm benchmark:gate` / `--gate`. Compares the newly
 * computed snapshot against the most recent DIFFERENT-version record already
 * persisted in `benchmarks/history.json` and fails CI when any threshold is
 * breached. All defaults are named exports so CI and tests can reference the
 * exact number instead of a magic literal; every one is overridable via CLI
 * flag (see `parseGateThresholds`).
 */

/** Max % growth allowed in avgTokens vs. the previous history record before the gate fails. */
export const DEFAULT_MAX_TOKEN_GROWTH_PCT = 10;
/** Max point drop allowed in savingsPctHeavy vs. the previous history record before the gate fails. */
export const DEFAULT_MAX_SAVINGS_DROP_PTS = 10;
/** avgQuality is not allowed to drop at all vs. the previous history record (0 = any drop fails). */
export const DEFAULT_MAX_QUALITY_DROP = 0;

export interface GateThresholds {
  maxTokenGrowthPct: number;
  maxSavingsDropPts: number;
  maxQualityDrop: number;
}

export const DEFAULT_GATE_THRESHOLDS: GateThresholds = {
  maxTokenGrowthPct: DEFAULT_MAX_TOKEN_GROWTH_PCT,
  maxSavingsDropPts: DEFAULT_MAX_SAVINGS_DROP_PTS,
  maxQualityDrop: DEFAULT_MAX_QUALITY_DROP,
};

export interface GateCheck {
  metric: 'avgTokens' | 'avgQuality' | 'savingsPctHeavy';
  previous: number;
  current: number;
  /** Direction vs. the cited previous record, e.g. "+4.2% vs v2.4.7 (2026-06-15)". */
  direction: string;
  breached: boolean;
  reason?: string;
}

export interface GateResult {
  passed: boolean;
  hasPrevious: boolean;
  sourceRecord?: BenchmarkHistoryRecord;
  checks: GateCheck[];
  /** Human-readable lines, each citing the source record, ready to print. */
  summaryLines: string[];
}

type GateInputSummary = Pick<
  BenchmarkSummary,
  'avgTokensWithSkill' | 'avgSavingsPctHeavy' | 'avgQualityScore'
>;

/** Most recent record in `history.records` whose version differs from `currentVersion`. */
export function findPreviousGateRecord(
  records: BenchmarkHistoryRecord[],
  currentVersion: string,
): BenchmarkHistoryRecord | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].version !== currentVersion) return records[i];
  }
  return undefined;
}

export function evaluateGate(
  current: GateInputSummary,
  previous: BenchmarkHistoryRecord | undefined,
  thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS,
): GateResult {
  if (!previous) {
    return {
      passed: true,
      hasPrevious: false,
      checks: [],
      summaryLines: [
        'ℹ️ No previous record in benchmarks/history.json to compare against — gate passes by default (safe for the first run).',
      ],
    };
  }

  const sourceLabel = `v${previous.version} (${previous.date.split('T')[0]})`;

  const tokenGrowthPct =
    previous.avgTokens > 0
      ? ((current.avgTokensWithSkill - previous.avgTokens) / previous.avgTokens) * 100
      : 0;
  const tokenBreached = tokenGrowthPct > thresholds.maxTokenGrowthPct;
  const tokenCheck: GateCheck = {
    metric: 'avgTokens',
    previous: previous.avgTokens,
    current: current.avgTokensWithSkill,
    direction: `${tokenGrowthPct >= 0 ? '+' : ''}${tokenGrowthPct.toFixed(1)}% vs ${sourceLabel}`,
    breached: tokenBreached,
    reason: tokenBreached
      ? `avgTokens grew ${tokenGrowthPct.toFixed(1)}% vs ${sourceLabel} (threshold: >${thresholds.maxTokenGrowthPct}%)`
      : undefined,
  };

  const qualityDelta = current.avgQualityScore - previous.avgQuality;
  const qualityBreached = qualityDelta < -thresholds.maxQualityDrop;
  const qualityCheck: GateCheck = {
    metric: 'avgQuality',
    previous: previous.avgQuality,
    current: current.avgQualityScore,
    direction: `${qualityDelta >= 0 ? '+' : ''}${qualityDelta.toFixed(1)} vs ${sourceLabel}`,
    breached: qualityBreached,
    reason: qualityBreached
      ? `avgQuality (structural rubric, not measured behavior) dropped ${Math.abs(qualityDelta).toFixed(1)} vs ${sourceLabel} (threshold: any drop fails)`
      : undefined,
  };

  const savingsDeltaPts = current.avgSavingsPctHeavy - previous.savingsPctHeavy;
  const savingsBreached = savingsDeltaPts < -thresholds.maxSavingsDropPts;
  const savingsCheck: GateCheck = {
    metric: 'savingsPctHeavy',
    previous: previous.savingsPctHeavy,
    current: current.avgSavingsPctHeavy,
    direction: `${savingsDeltaPts >= 0 ? '+' : ''}${savingsDeltaPts} pts vs ${sourceLabel}`,
    breached: savingsBreached,
    reason: savingsBreached
      ? `savingsPctHeavy (synthetic-baseline upper bound, see baselines.ts) dropped ${Math.abs(savingsDeltaPts)} pts vs ${sourceLabel} (threshold: >${thresholds.maxSavingsDropPts} pts)`
      : undefined,
  };

  const checks = [tokenCheck, qualityCheck, savingsCheck];
  const passed = checks.every((c) => !c.breached);
  const summaryLines = checks.map(
    (c) =>
      `${c.breached ? '❌' : '✅'} ${c.metric}: ${c.current} (${c.direction}) — source: ${sourceLabel}`,
  );

  return { passed, hasPrevious: true, sourceRecord: previous, checks, summaryLines };
}

/** Parses `--max-token-growth-pct=N`, `--max-savings-drop-pts=N`, `--max-quality-drop=N`. */
export function parseGateThresholds(argv: string[]): GateThresholds {
  const getFlag = (name: string): number | undefined => {
    const prefix = `--${name}=`;
    const arg = argv.find((a) => a.startsWith(prefix));
    if (!arg) return undefined;
    const value = Number(arg.slice(prefix.length));
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    maxTokenGrowthPct: getFlag('max-token-growth-pct') ?? DEFAULT_MAX_TOKEN_GROWTH_PCT,
    maxSavingsDropPts: getFlag('max-savings-drop-pts') ?? DEFAULT_MAX_SAVINGS_DROP_PTS,
    maxQualityDrop: getFlag('max-quality-drop') ?? DEFAULT_MAX_QUALITY_DROP,
  };
}
