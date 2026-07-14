export interface SkillBenchmark {
  category: string;
  skillName: string;
  skillPath: string;
  // Token counts
  tokensWithSkill: number; // SKILL.md tokens
  tokensBaselineLight: number;
  tokensBaselineHeavy: number;
  savingsLight: number; // tokens saved vs light baseline
  savingsHeavy: number;
  savingsPctLight: number; // % saved vs light
  savingsPctHeavy: number;
  // Cost savings per model, per 1 call (USD)
  costSavingsLight: Record<string, number>;
  costSavingsHeavy: Record<string, number>;
  // Quality
  qualityScore: number; // 0–10
  qualityDetail: string[];
  behaviorGuardrailApplicable: boolean;
  behaviorQualityScore: number; // 0–4 for applicable guardrail skills
  behaviorDetail: string[];
  // Eval coverage
  evalCount: number; // number of evals in evals.json (0 = no evals)
  evalAlignmentPct: number; // % of eval "contains" assertions whose value appears in SKILL.md; -1 = n/a (no contains assertions)
}

export interface BenchmarkHistoryRecord {
  version: string;
  date: string;
  totalSkills: number;
  avgTokens: number;
  savingsPctHeavy: number;
  avgQuality: number;
  reportPath: string;
}

export interface BenchmarkHistory {
  lastUpdated: string;
  records: BenchmarkHistoryRecord[];
}

/** Compact per-skill snapshot archived alongside each version's report, used to diff releases. */
export interface SkillSnapshot {
  category: string;
  skillName: string;
  tokensWithSkill: number;
  qualityScore: number;
}

export interface VersionSnapshot {
  version: string;
  date: string;
  skills: SkillSnapshot[];
}

export interface BenchmarkSummary {
  totalSkills: number;
  avgTokensWithSkill: number;
  avgSavingsPctLight: number;
  avgSavingsPctHeavy: number;
  avgQualityScore: number;
  applicableBehaviorSkills: number;
  avgBehaviorQualityScore: number;
  totalCostSavingsLight: Record<string, number>; // per 1 call (USD) sum across all skills
  totalCostSavingsHeavy: Record<string, number>;
  skills: SkillBenchmark[];
  history?: BenchmarkHistory;
  /** Previous version's per-skill snapshot, if found, for the "What Changed" section. */
  previousSnapshot?: VersionSnapshot;
}
