import fs from 'fs-extra';
import * as path from 'path';
import {
  ARCHIVE_DIR,
  EVALS_REPORT_MD,
  HISTORY_JSON,
  RESULTS_FILENAME,
  RUNS_DIR,
} from './constants';
import { EvalsHistory, EvalsHistoryRecord, RunResults, SkillResult } from './types';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function loadAllResults(): RunResults[] {
  if (!fs.existsSync(RUNS_DIR)) return [];
  const runIds = fs
    .readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const results: RunResults[] = [];
  for (const runId of runIds) {
    const resultsPath = path.join(RUNS_DIR, runId, RESULTS_FILENAME);
    if (fs.existsSync(resultsPath)) {
      results.push(fs.readJSONSync(resultsPath));
    }
  }
  return results;
}

/** Most recent run per category, by scoredAt. */
function latestPerCategory(results: RunResults[]): Map<string, RunResults> {
  const latest = new Map<string, RunResults>();
  for (const r of results) {
    const existing = latest.get(r.category);
    if (!existing || new Date(r.scoredAt) > new Date(existing.scoredAt)) {
      latest.set(r.category, r);
    }
  }
  return latest;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function loadHistory(): EvalsHistory {
  if (fs.existsSync(HISTORY_JSON)) {
    return fs.readJSONSync(HISTORY_JSON);
  }
  return { lastUpdated: new Date().toISOString(), records: [] };
}

function saveHistory(history: EvalsHistory): void {
  fs.ensureDirSync(path.dirname(HISTORY_JSON));
  fs.writeJSONSync(HISTORY_JSON, history, { spaces: 2 });
}

/** Appends a history record + archives a per-run snapshot for any run not already recorded. */
function syncHistoryAndArchive(allResults: RunResults[]): EvalsHistory {
  const history = loadHistory();
  const known = new Set(history.records.map((r) => r.runId));
  fs.ensureDirSync(ARCHIVE_DIR);

  for (const run of allResults) {
    if (known.has(run.runId)) continue;
    const record: EvalsHistoryRecord = {
      runId: run.runId,
      category: run.category,
      version: run.version,
      date: run.scoredAt,
      skillCount: run.skills.length,
      avgBaselinePassRate: avg(run.skills.map((s) => s.baselinePassRate)),
      avgWithSkillPassRate: avg(run.skills.map((s) => s.withSkillPassRate)),
      avgDelta: avg(run.skills.map((s) => s.delta)),
      agent: run.metadata.agent,
      model: run.metadata.model,
    };
    history.records.push(record);

    const archivePath = path.join(ARCHIVE_DIR, `${run.runId}.md`);
    if (!fs.existsSync(archivePath)) {
      fs.writeFileSync(archivePath, buildEvalsReportMarkdown([run]));
    }
  }

  history.lastUpdated = new Date().toISOString();
  saveHistory(history);
  return history;
}

export function buildEvalsReportMarkdown(
  allResults: RunResults[],
  history?: EvalsHistory,
): string {
  const lines: string[] = [];
  lines.push('# 🧪 Live Skill Evals Report');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(
    '> Measured, not structural: each eval prompt is answered twice by an agent — once with no skill in context (baseline), once with the skill\'s SKILL.md loaded (with-skill) — then scored deterministically against the assertions in evals/evals.json.',
  );
  lines.push(
    '> Runs are agent-generated (subjective), scoring is deterministic (verifiable). See [docs/EVALS.md](docs/EVALS.md) for how to run your own category and verify any run in this report.',
  );
  lines.push('');

  if (allResults.length === 0) {
    lines.push('## No runs yet');
    lines.push('');
    lines.push(
      'No eval runs have been committed under `benchmarks/evals/runs/`. See [docs/EVALS.md](docs/EVALS.md) to run your first category — any agent session (Claude Code, Copilot, Codex, Antigravity) can do this with no API key.',
    );
    lines.push('');
    return lines.join('\n');
  }

  const latest = latestPerCategory(allResults);
  const allSkillResults: SkillResult[] = [...latest.values()].flatMap(
    (r) => r.skills,
  );

  lines.push('## 🔢 Executive Summary (latest run per category)');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Categories with a live run | **${latest.size}** |`);
  lines.push(`| Skills covered (latest runs) | **${allSkillResults.length}** |`);
  lines.push(
    `| Avg. baseline pass rate | **${pct(avg(allSkillResults.map((s) => s.baselinePassRate)))}** |`,
  );
  lines.push(
    `| Avg. with-skill pass rate | **${pct(avg(allSkillResults.map((s) => s.withSkillPassRate)))}** |`,
  );
  lines.push(
    `| Avg. delta (with-skill − baseline) | **${pct(avg(allSkillResults.map((s) => s.delta)))}** |`,
  );
  const triggerable = allSkillResults.filter((s) => s.triggerPrecision !== null);
  lines.push(
    `| Avg. trigger precision (should_not_trigger) | **${triggerable.length > 0 ? pct(avg(triggerable.map((s) => s.triggerPrecision as number))) : 'n/a'}** (${triggerable.length} skills) |`,
  );
  lines.push('');

  if (history && history.records.length > 0) {
    lines.push('## 📜 Run History');
    lines.push('');
    lines.push('| Run | Category | Date | Skills | Baseline | With-Skill | Delta | Agent |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of [...history.records].reverse()) {
      lines.push(
        `| \`${r.runId}\` | ${r.category} | ${r.date.split('T')[0]} | ${r.skillCount} | ${pct(r.avgBaselinePassRate)} | ${pct(r.avgWithSkillPassRate)} | ${r.avgDelta >= 0 ? '+' : ''}${pct(r.avgDelta)} | ${r.agent || 'n/a'} |`,
      );
    }
    lines.push('');
  }

  lines.push('## 📦 Per-Category Results (latest run)');
  lines.push('');
  lines.push(
    '| Category | Run | Scored | Skills | Baseline | With-Skill | Delta | Trigger Precision |',
  );
  lines.push(
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const [category, run] of [...latest.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const baseline = avg(run.skills.map((s) => s.baselinePassRate));
    const withSkill = avg(run.skills.map((s) => s.withSkillPassRate));
    const delta = withSkill - baseline;
    const trig = run.skills.filter((s) => s.triggerPrecision !== null);
    const trigLabel =
      trig.length > 0
        ? pct(avg(trig.map((s) => s.triggerPrecision as number)))
        : 'n/a';
    lines.push(
      `| ${category} | \`${run.runId}\` | ${run.scoredAt.split('T')[0]} | ${run.skills.length} | ${pct(baseline)} | ${pct(withSkill)} | ${delta >= 0 ? '+' : ''}${pct(delta)} | ${trigLabel} |`,
    );
  }
  lines.push('');

  lines.push('## 📋 Per-Skill Detail (latest run per category)');
  lines.push('');
  lines.push('| Skill | Category | Baseline | With-Skill | Delta | Trigger | Guardrail |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of [...allSkillResults].sort((a, b) => a.delta - b.delta)) {
    lines.push(
      `| \`${s.skillName}\` | ${s.category} | ${pct(s.baselinePassRate)} | ${pct(s.withSkillPassRate)} | ${s.delta >= 0 ? '+' : ''}${pct(s.delta)} | ${s.triggerPrecision !== null ? pct(s.triggerPrecision) : 'n/a'} | ${s.guardrailApplicable ? 'yes' : 'no'} |`,
    );
  }
  lines.push('');

  const negativeDelta = allSkillResults.filter((s) => s.delta < 0);
  if (negativeDelta.length > 0) {
    lines.push('## ⚠️ Skills Where With-Skill Underperformed Baseline');
    lines.push('');
    lines.push(
      '> A negative delta means the agent scored worse WITH the skill loaded than without it on the same prompts. This should be rare — investigate the transcripts under `benchmarks/evals/runs/<runId>/answers/` for these skills.',
    );
    lines.push('');
    lines.push('| Skill | Category | Delta |');
    lines.push('| --- | --- | --- |');
    for (const s of negativeDelta) {
      lines.push(`| \`${s.skillName}\` | ${s.category} | ${pct(s.delta)} |`);
    }
    lines.push('');
  }

  lines.push('## 🛡️ How to Verify This Report');
  lines.push('');
  lines.push(
    '1. **Clone the repo**, `pnpm install`.',
  );
  lines.push(
    '2. **Re-score committed transcripts**: `pnpm evals:verify -- --all` (or `--run <runId>` for one run) — recomputes scores from the committed answer transcripts and diffs against the committed `results.json`. Any tampering or drift fails loudly.',
  );
  lines.push(
    '3. **Regenerate this report**: `pnpm evals:report`.',
  );
  lines.push(
    '4. **Run your own category**: see [docs/EVALS.md](docs/EVALS.md) — any agent session can do this with no API key; it only needs to read/write files and run `pnpm` scripts in this repo.',
  );
  lines.push('');
  lines.push(
    '> Trust model: generation (the transcripts) is agent-driven and therefore subjective; scoring (assertions -> pass/fail) is deterministic string-matching over the committed transcripts, reproducible by anyone via `pnpm evals:verify` or the MCP `verify_eval_run` tool — no API key required for either.',
  );
  lines.push('');

  return lines.join('\n');
}

export function generateReport(): void {
  const allResults = loadAllResults();
  const history = syncHistoryAndArchive(allResults);
  const markdown = buildEvalsReportMarkdown(allResults, history);
  fs.outputFileSync(EVALS_REPORT_MD, markdown);
}
