import { BASELINE_EXAMPLES, BASELINE_HEAVY, BASELINE_LIGHT } from './baselines';
import { MODELS, PRICING_AS_OF } from './models';
import { BenchmarkSummary, SkillBenchmark } from './types';
import { countFrontmatterTokens } from './utils';
import fs from 'fs-extra';
import * as path from 'path';
import { SKILLS_DIR } from './constants';
import { EVALS_DIR } from '../evals/constants';

interface EvalsHistoryRecordLike {
  runId: string;
  category: string;
  date: string;
  avgBaselinePassRate: number;
  avgWithSkillPassRate: number;
  avgDelta: number;
}

function loadEvalsHistory(): EvalsHistoryRecordLike[] {
  const historyPath = path.join(EVALS_DIR, 'history.json');
  if (!fs.existsSync(historyPath)) return [];
  try {
    const data = fs.readJSONSync(historyPath);
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

/** Most recent live-eval run per category, by date. */
function latestEvalsPerCategory(
  records: EvalsHistoryRecordLike[],
): Map<string, EvalsHistoryRecordLike> {
  const latest = new Map<string, EvalsHistoryRecordLike>();
  for (const r of records) {
    const existing = latest.get(r.category);
    if (!existing || new Date(r.date) > new Date(existing.date)) {
      latest.set(r.category, r);
    }
  }
  return latest;
}

export function formatLiveEvalCoverage(
  records: EvalsHistoryRecordLike[],
  allCategories: string[],
): string | null {
  if (records.some((record) => record.category === 'all')) {
    return `> Full-catalog live eval run covers all ${allCategories.length} categories; see the [Live Evals Report](evals-report.md) for the per-category breakdown.`;
  }

  const coveredCategories = new Set(records.map((record) => record.category));
  const uncovered = allCategories.filter(
    (category) => !coveredCategories.has(category),
  );
  if (uncovered.length === 0) return null;

  return `> No live eval run yet for: ${uncovered.map((category) => `\`${category}\``).join(', ')}. Run \.agents/workflows/evals-run.md\` (or \`/evals-run <category>\`) to add measured results for these.`;
}

function skillKey(category: string, skillName: string): string {
  return `${category}/${skillName}`;
}

function fmtBig(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function fmtMicro(usd: number): string {
  if (usd < 0.0000001) return '<$0.0000001';
  return `$${usd.toFixed(7)}`;
}

/** n/a-aware formatter for evalAlignmentPct (-1 sentinel = no contains assertions to check). */
function alignmentLabel(pct: number): string {
  if (pct < 0) return 'n/a';
  return pct >= 70 ? `✅ ${pct}%` : `⚠️ ${pct}%`;
}

function bar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function buildMarkdownReport(summary: BenchmarkSummary): string {
  const { skills, history } = summary;
  const lines: string[] = [];

  lines.push('# 📊 Agent Skill Benchmark Report');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(
    '> Token counting: real cl100k-family tokenizer (`gpt-tokenizer`), chars/4 as fallback only.',
  );
  lines.push(
    '> Baselines: **synthetic reference instruction-volume bands**, not a measured survey of real prompts (see Methodology). Token/cost figures below measure *skill size*, not *behavioral effectiveness*.',
  );
  lines.push(
    '> Quality: structural rubric (0–10), no live LLM calls required. For measured with/without-skill behavioral results, see the [Live Evals Report](evals-report.md).',
  );
  lines.push('');

  lines.push('## ❓ How to Read This Report');
  lines.push('');
  lines.push(
    'This benchmark answers: **"How much smaller is a skill than a reference band of inline instructions a developer might otherwise write?"** It is a size/structure metric, not a measured behavioral improvement — that is what the [Live Evals Report](evals-report.md) is for.',
  );
  lines.push('');
  lines.push(
    '**Reference band (no skill)**: a synthetic stand-in for domain knowledge written directly into the prompt every time.',
  );
  lines.push(
    `**WITH a skill**: the agent loads the SKILL.md file (avg. ${summary.avgTokensWithSkill} tokens this run) — structured, reusable, cached.`,
  );
  lines.push('');
  lines.push(
    '**Eval–Skill Consistency** (labeled "Aligned" below): % of eval `contains` assertion values that are literal substrings of SKILL.md. This only checks that the skill and its evals were written consistently with each other — it is **not** evidence the skill changes agent behavior. Evals are written from the skill, so near-100% is expected and does not by itself indicate quality. Measured behavioral delta lives in the [Live Evals Report](evals-report.md).',
  );
  lines.push('');

  lines.push('## 🔢 Executive Summary');
  lines.push('');
  lines.push(
    '| Metric                            | Value                             |',
  );
  lines.push(
    '| --------------------------------- | --------------------------------- |',
  );
  lines.push(
    `| Total Skills Benchmarked          | **${summary.totalSkills}**           |`,
  );
  lines.push(
    `| Avg. Tokens WITH Skill (SKILL.md) | **${summary.avgTokensWithSkill} tokens**    |`,
  );
  lines.push(
    `| Baseline: Light prompt (no skill) | **${BASELINE_LIGHT} tokens** ↓ see Methodology |`,
  );
  lines.push(
    `| Baseline: Heavy prompt (no skill) | **${BASELINE_HEAVY} tokens** ↓ see Methodology |`,
  );
  lines.push(
    `| Avg. Token Savings vs Light       | **${summary.avgSavingsPctLight}%** (${BASELINE_LIGHT - summary.avgTokensWithSkill} tokens/call) |`,
  );
  lines.push(
    `| Avg. Token Savings vs Heavy       | **${summary.avgSavingsPctHeavy}%** (${BASELINE_HEAVY - summary.avgTokensWithSkill} tokens/call) |`,
  );
  lines.push(
    `| Avg. Quality Score                | **${summary.avgQualityScore}/10** |`,
  );
  lines.push(
    `| Guardrail Skills Covered          | **${summary.applicableBehaviorSkills}** |`,
  );
  lines.push(
    `| Avg. Behavior Quality             | **${summary.avgBehaviorQualityScore}/4** (guardrail skills only) |`,
  );

  const skillsWithEvals = skills.filter((s) => s.evalCount > 0).length;
  const alignableSkills = skills.filter((s) => s.evalAlignmentPct >= 0);
  const avgAlignment =
    alignableSkills.length > 0
      ? Math.round(
          alignableSkills.reduce((sum, s) => sum + s.evalAlignmentPct, 0) /
            alignableSkills.length,
        )
      : 0;
  lines.push(
    `| Skills with Evals                 | **${skillsWithEvals} / ${summary.totalSkills}** |`,
  );
  lines.push(
    `| Avg. Eval–Skill Consistency       | **${avgAlignment}%** (${alignableSkills.length} skills with \`contains\` assertions — see caveat above) |`,
  );
  lines.push('');

  const prev = summary.previousSnapshot;
  if (prev) {
    const prevByKey = new Map(
      prev.skills.map((s) => [skillKey(s.category, s.skillName), s]),
    );
    const currentByKey = new Map(
      skills.map((s) => [skillKey(s.category, s.skillName), s]),
    );

    const added = skills.filter(
      (s) => !prevByKey.has(skillKey(s.category, s.skillName)),
    );
    const removed = prev.skills.filter(
      (s) => !currentByKey.has(skillKey(s.category, s.skillName)),
    );
    const tokenChanges: Array<{ skill: SkillBenchmark; pctChange: number }> =
      [];
    const qualityChanges: Array<{
      skill: SkillBenchmark;
      from: number;
      to: number;
    }> = [];
    for (const s of skills) {
      const key = skillKey(s.category, s.skillName);
      const before = prevByKey.get(key);
      if (!before) continue;
      if (before.tokensWithSkill > 0) {
        const pctChange =
          ((s.tokensWithSkill - before.tokensWithSkill) /
            before.tokensWithSkill) *
          100;
        if (Math.abs(pctChange) >= 10) {
          tokenChanges.push({ skill: s, pctChange: Math.round(pctChange) });
        }
      }
      if (s.qualityScore !== before.qualityScore) {
        qualityChanges.push({
          skill: s,
          from: before.qualityScore,
          to: s.qualityScore,
        });
      }
    }

    const hasChanges =
      added.length > 0 ||
      removed.length > 0 ||
      tokenChanges.length > 0 ||
      qualityChanges.length > 0;

    lines.push(`## 🆕 What Changed Since v${prev.version}`);
    lines.push('');
    if (!hasChanges) {
      lines.push(
        `No skill additions, removals, or ≥10% token / quality-score changes since v${prev.version} (${prev.date.split('T')[0]}).`,
      );
      lines.push('');
    } else {
      if (added.length > 0) {
        lines.push(`**New skills (${added.length})**: ${added.map((s) => `\`${s.skillName}\``).join(', ')}`);
        lines.push('');
      }
      if (removed.length > 0) {
        lines.push(`**Removed skills (${removed.length})**: ${removed.map((s) => `\`${s.skillName}\``).join(', ')}`);
        lines.push('');
      }
      if (qualityChanges.length > 0) {
        lines.push('**Quality-score changes**:');
        lines.push('');
        lines.push('| Skill | Category | Before | After |');
        lines.push('| --- | --- | --- | --- |');
        for (const c of qualityChanges.sort(
          (a, b) => a.to - a.from - (b.to - b.from),
        )) {
          lines.push(
            `| \`${c.skill.skillName}\` | ${c.skill.category} | ${c.from}/10 | ${c.to}/10 |`,
          );
        }
        lines.push('');
      }
      if (tokenChanges.length > 0) {
        lines.push('**Token-size changes ≥10%**:');
        lines.push('');
        lines.push('| Skill | Category | Change |');
        lines.push('| --- | --- | --- |');
        for (const c of tokenChanges.sort(
          (a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange),
        )) {
          lines.push(
            `| \`${c.skill.skillName}\` | ${c.skill.category} | ${c.pctChange >= 0 ? '+' : ''}${c.pctChange}% (${c.skill.tokensWithSkill} tokens now) |`,
          );
        }
        lines.push('');
      }
    }
  }

  const evalsHistory = latestEvalsPerCategory(loadEvalsHistory());
  if (evalsHistory.size > 0) {
    lines.push('## 🧪 Measured Effectiveness — Live Evals (latest run per category)');
    lines.push('');
    lines.push(
      'Unlike everything else in this report, these numbers come from actually running each skill\'s eval prompts through an agent — see the [Live Evals Report](evals-report.md) and [docs/EVALS.md](docs/EVALS.md) for the full methodology and how to verify or extend this table.',
    );
    lines.push('');
    lines.push('| Category | Baseline Pass Rate | With-Skill Pass Rate | Delta | Last Run |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const [category, r] of [...evalsHistory.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const deltaPct = Math.round(r.avgDelta * 100);
      lines.push(
        `| ${category} | ${Math.round(r.avgBaselinePassRate * 100)}% | ${Math.round(r.avgWithSkillPassRate * 100)}% | ${deltaPct >= 0 ? '+' : ''}${deltaPct}% | ${r.date.split('T')[0]} |`,
      );
    }
    lines.push('');
    const coverageNote = formatLiveEvalCoverage(
      loadEvalsHistory(),
      [...new Set(skills.map((skill) => skill.category))].sort(),
    );
    if (coverageNote) {
      lines.push(coverageNote);
      lines.push('');
    }
  }

  if (history && history.records.length > 0) {
    lines.push('## 📜 History');
    lines.push('');
    lines.push(
      '| Version | Date       | Skills | Avg Tokens | Savings (%) | Quality | Report |',
    );
    lines.push(
      '| ------- | ---------- | ------ | ---------- | ----------- | ------- | ------ |',
    );
    for (const record of [...history.records].reverse()) {
      lines.push(
        `| v${record.version} | ${record.date.split('T')[0]} | ${record.totalSkills} | ${record.avgTokens} | ${record.savingsPctHeavy}% | ${record.avgQuality}/10 | [Full Report](${record.reportPath}) |`,
      );
    }
    lines.push('');
  }

  // ---- Metadata overhead: the part of every skill that loads into every
  // session regardless of whether the skill body is ever read.
  const frontmatterTokens = skills.map((s) => {
    const skillMdPath = path.join(
      SKILLS_DIR,
      s.category,
      s.skillName,
      'SKILL.md',
    );
    return countFrontmatterTokens(skillMdPath);
  });
  const totalFrontmatterTokens = frontmatterTokens.reduce((a, b) => a + b, 0);
  const avgFrontmatterTokens = Math.round(
    totalFrontmatterTokens / (skills.length || 1),
  );
  // Frontmatter for every installed skill loads every session, whether or
  // not that skill is ever used. A skill's body only "pays for itself" when
  // it is actually loaded AND is smaller than the reference band. Break-even
  // = how many such uses it takes for that per-use saving to offset the
  // always-on frontmatter cost of the *whole installed catalog* (not just
  // one skill) — because that catalog-wide cost is paid regardless of which
  // single skill ends up being used.
  const avgSavingsPerUse = BASELINE_HEAVY - summary.avgTokensWithSkill;
  const breakEvenCalls =
    avgSavingsPerUse > 0
      ? Math.ceil(totalFrontmatterTokens / avgSavingsPerUse)
      : null;

  lines.push('## 🧾 Metadata Overhead (the cost skills are NOT free)');
  lines.push('');
  lines.push(
    '> Skills are not zero-cost to install. Every synced skill\'s frontmatter (`name` + `description`) is loaded into the session/router context regardless of whether its full body is ever read. This section reports that always-on cost, which the savings figures above do not net out.',
  );
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(
    `| Avg. frontmatter tokens per skill | **${avgFrontmatterTokens} tokens** |`,
  );
  lines.push(
    `| Total frontmatter overhead (all ${summary.totalSkills} skills registered, paid every session) | **${totalFrontmatterTokens} tokens** |`,
  );
  lines.push(
    `| Break-even (skill *uses*, at avg. savings/use, to offset the whole catalog's per-session frontmatter cost) | ${breakEvenCalls !== null ? `**~${breakEvenCalls} use(s)**` : 'n/a (avg. skill is not smaller than the reference band)'} |`,
  );
  lines.push('');
  lines.push(
    '> **Prompt caching caveat**: all cost figures in this report price every token at the full input rate. In practice, static context (including skill frontmatter and any skill body loaded early in a session) is frequently served from a prompt cache at a fraction of the input price on providers that support it. Real savings are directionally consistent with this report but smaller in absolute $ than the tables below imply.',
  );
  lines.push('');

  lines.push('### 💰 Cost Comparison — Per Single Call (Average Skill)');
  lines.push('');
  lines.push(
    '> Comparison based on the **Heavy reference band** vs. current model pricing. Ignores prompt caching (see caveat above) — treat as an upper bound, not an exact figure.',
  );
  lines.push('');
  lines.push(
    '| Model             | Original Cost | Skill Cost | Net Savings | % Saved |',
  );
  lines.push(
    '| ----------------- | ------------- | ---------- | ----------- | ------- |',
  );

  for (const [model, price] of Object.entries(MODELS)) {
    const originalCost = (BASELINE_HEAVY / 1_000_000) * price;
    const skillCost = (summary.avgTokensWithSkill / 1_000_000) * price;
    const savings = originalCost - skillCost;
    const savingsPct = Math.round((savings / originalCost) * 100);

    lines.push(
      `| ${model} | ${fmtMicro(originalCost)} | ${fmtMicro(skillCost)} | **${fmtMicro(savings)}** | ${savingsPct}% |`,
    );
  }
  lines.push('');

  lines.push('### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Reference Band)');
  lines.push('');
  lines.push(
    `> Illustrative only: assumes 1,000 calls/day for a single average skill, no prompt caching, and constant token counts. Real savings depend heavily on caching and actual call volume — do not treat this as a budgeting figure.`,
  );
  lines.push('');
  lines.push(
    '| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Model |',
  );
  lines.push(
    '| ----------- | ---------------- | -------------------------- | ----- |',
  );

  const scaleModels = ['GPT-5', 'Claude Sonnet 4.5', 'Gemini 3.1 Pro'];
  for (const model of scaleModels) {
    const price = MODELS[model];
    if (price === undefined) continue;
    const avgHeavySavings = BASELINE_HEAVY - summary.avgTokensWithSkill;
    const dailyCalls = 1000;
    const monthlyCalls = dailyCalls * 30;

    const monthlyOriginal = (BASELINE_HEAVY / 1_000_000) * price * monthlyCalls;
    const oneSkill = (avgHeavySavings / 1_000_000) * price * monthlyCalls;

    lines.push(
      `| 1,000 | ${fmtBig(monthlyOriginal)}/mo | ${fmtBig(oneSkill)}/mo | ${model} |`,
    );
  }
  lines.push('');

  lines.push('## 📦 Per-Category Summary');
  lines.push('');

  const categories = [...new Set(skills.map((s) => s.category))].sort();

  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.category === cat);
    const avgTokens = Math.round(
      catSkills.reduce((s, x) => s + x.tokensWithSkill, 0) / catSkills.length,
    );
    const avgQuality = (
      catSkills.reduce((s, x) => s + x.qualityScore, 0) / catSkills.length
    ).toFixed(1);
    const catEvalsCount = catSkills.filter((s) => s.evalCount > 0).length;
    const catAlignable = catSkills.filter((s) => s.evalAlignmentPct >= 0);
    const catAvgAlignment =
      catAlignable.length > 0
        ? Math.round(
            catAlignable.reduce((s, x) => s + x.evalAlignmentPct, 0) /
              catAlignable.length,
          )
        : 0;

    lines.push('<details>');
    lines.push(
      `<summary><h3>📦 ${cat} (${catSkills.length} skills | avg ${avgTokens} tokens | quality ${avgQuality}/10 | eval–skill consistency ${catAvgAlignment}%)</h3></summary>`,
    );
    lines.push('');
    lines.push(
      '| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |',
    );
    lines.push(
      '| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |',
    );

    for (const skill of catSkills.sort(
      (a, b) => b.qualityScore - a.qualityScore,
    )) {
      const heavyPct = skill.savingsPctHeavy;
      const heavyDisplay =
        heavyPct >= 0
          ? `${bar(heavyPct, 10)} ${heavyPct}%`
          : `⚠️ Overhead ${Math.abs(heavyPct)}%`;
      const evalDisplay =
        skill.evalCount === 0 ? '❌ none' : `${skill.evalCount}`;
      const alignDisplay = alignmentLabel(skill.evalAlignmentPct);

      const behaviorDisplay = skill.behaviorGuardrailApplicable
        ? `${skill.behaviorQualityScore}/4`
        : 'n/a';
      lines.push(
        `| \`${skill.skillName.padEnd(21)}\` | ${skill.tokensWithSkill.toString().padEnd(6)} | ${heavyDisplay.padEnd(18)} | ${skill.qualityScore}/10 | ${behaviorDisplay.padEnd(8)} | ${evalDisplay} | ${alignDisplay} |`,
      );
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Skills whose evals use different wording than their SKILL.md — a
  // maintenance/consistency signal, not evidence of behavioral quality.
  const lowAlignment = [...skills]
    .filter((s) => s.evalAlignmentPct >= 0 && s.evalAlignmentPct < 70)
    .sort((a, b) => a.evalAlignmentPct - b.evalAlignmentPct);

  if (lowAlignment.length > 0) {
    lines.push('## ⚠️ Low Eval–Skill Consistency — Skills to Review');
    lines.push('');
    lines.push(
      "> These skills have `contains` assertions whose exact wording does not appear in SKILL.md content ≥70% of the time. This usually means the eval and the skill drifted (e.g. the skill was edited after the eval was written) — it is a maintenance signal, not a measure of behavioral effectiveness. See the Live Evals Report for that.",
    );
    lines.push('');
    lines.push(
      '| Skill                   | Category | Consistency | Evals | Action |',
    );
    lines.push(
      '| ----------------------- | -------- | ----------- | ----- | ------ |',
    );
    for (const s of lowAlignment.slice(0, 15)) {
      lines.push(
        `| \`${s.skillName.padEnd(21)}\` | ${s.category.padEnd(8)} | ⚠️ ${s.evalAlignmentPct}% | ${s.evalCount} | Reconcile wording between evals/evals.json and SKILL.md |`,
      );
    }
    lines.push('');
  }

  const lowBehavior = [...skills]
    .filter((s) => s.behaviorGuardrailApplicable && s.behaviorQualityScore < 4)
    .sort((a, b) => a.behaviorQualityScore - b.behaviorQualityScore);

  if (lowBehavior.length > 0) {
    lines.push('## ⚠️ Guardrail Skills Missing Behavior Coverage');
    lines.push('');
    lines.push(
      '> These skills enforce behavior but do not yet cover enough pressure scenarios, rationalizations, red flags, or behavior assertions.',
    );
    lines.push('');
    lines.push('| Skill | Category | Behavior | Action |');
    lines.push('| ----- | -------- | -------- | ------ |');
    for (const s of lowBehavior.slice(0, 15)) {
      lines.push(
        `| \`${s.skillName}\` | ${s.category} | ${s.behaviorQualityScore}/4 | Add pressure_scenarios, rationalizations, red_flags, and behavior_assertions |`,
      );
    }
    lines.push('');
  }

  lines.push('## 📊 Quality Distribution');
  lines.push('');
  lines.push(
    '> Averages hide saturation. This shows how many skills actually sit at each score, so a 9.8/10 average can be read in context.',
  );
  lines.push('');
  lines.push('| Score | Count | Share |');
  lines.push('| --- | --- | --- |');
  for (let score = 10; score >= 0; score--) {
    const count = skills.filter((s) => s.qualityScore === score).length;
    if (count === 0) continue;
    const share = Math.round((count / skills.length) * 100);
    lines.push(`| ${score}/10 | ${count} | ${bar(share, 15)} ${share}% |`);
  }
  lines.push('');

  lines.push('## 🔧 Needs Attention');
  lines.push('');
  lines.push(
    '> Actionable, not celebratory: lowest structural quality, largest token footprint, and guardrail skills with the weakest behavior coverage. (Guardrail gaps are also listed in full above, under "Guardrail Skills Missing Behavior Coverage".)',
  );
  lines.push('');

  const lowestQuality = [...skills]
    .sort((a, b) => a.qualityScore - b.qualityScore)
    .slice(0, 10);
  lines.push('**Lowest structural quality:**');
  lines.push('');
  lines.push('| Skill | Category | Quality | Tokens | Evals | Consistency |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const s of lowestQuality) {
    const evalDisplay = s.evalCount === 0 ? '❌' : `${s.evalCount}`;
    lines.push(
      `| \`${s.skillName}\` | ${s.category} | ${s.qualityScore}/10 | ${s.tokensWithSkill} | ${evalDisplay} | ${alignmentLabel(s.evalAlignmentPct)} |`,
    );
  }
  lines.push('');

  const largestTokens = [...skills]
    .sort((a, b) => b.tokensWithSkill - a.tokensWithSkill)
    .slice(0, 10);
  lines.push('**Largest token footprint** (candidates for splitting or trimming):');
  lines.push('');
  lines.push('| Skill | Category | Tokens | Quality |');
  lines.push('| --- | --- | --- | --- |');
  for (const s of largestTokens) {
    lines.push(
      `| \`${s.skillName}\` | ${s.category} | ${s.tokensWithSkill} | ${s.qualityScore}/10 |`,
    );
  }
  lines.push('');

  lines.push('## 📐 Methodology & Baseline Justification');
  lines.push('');
  lines.push('### Why These Baselines? (and what they do NOT prove)');
  lines.push('');
  lines.push(
    'The baselines are **synthetic reference prompts**, hand-written once and token-counted — they are not a measured survey or average of real developer prompts. They exist to give "tokens saved" a stable unit of comparison across a catalog of 264+ skills spanning many stacks; they do not claim any individual skill was benchmarked against what a specific developer would have typed.',
  );
  lines.push('');
  lines.push(
    'NestJS was picked as the **Reference Unit** purely because it is a high-density, well-documented stack — not because every skill category resembles NestJS. Savings % should be read as "SKILL.md is this much smaller than a reference instruction-volume band", not as "this skill saves X% of what a developer would otherwise write for this specific framework."',
  );
  lines.push('');
  lines.push(
    'For a measured (not synthetic) with/without-skill effectiveness signal, see the [Live Evals Report](evals-report.md), which runs each skill\'s eval prompts through an agent twice — once without the skill, once with it — and scores the transcripts deterministically.',
  );
  lines.push('');
  lines.push(
    `#### 🟡 Reference Prompt — Light — ${BASELINE_LIGHT} tokens (real-tokenizer count, no padding)`,
  );
  lines.push('');
  lines.push(`> **${BASELINE_EXAMPLES.light.label}**`);
  lines.push(`> ${BASELINE_EXAMPLES.light.description}`);
  lines.push('');
  lines.push(
    `#### 🔴 Reference Prompt — Heavy — ${BASELINE_HEAVY} tokens (real-tokenizer count, no padding)`,
  );
  lines.push('');
  lines.push(`> **${BASELINE_EXAMPLES.heavy.label}**`);
  lines.push(`> ${BASELINE_EXAMPLES.heavy.description}`);
  lines.push('');

  lines.push('### 🏆 Detailed Quality Rubric (0–10)');
  lines.push('');
  lines.push(
    'To ensure skills are not just "short" but actually **high quality**, every skill is scored against this structural rubric:',
  );
  lines.push('');
  lines.push(
    '| Score  | Criteria                  | Rationale                                              |',
  );
  lines.push(
    '| ------ | ------------------------- | ------------------------------------------------------ |',
  );
  lines.push(
    '| **+2** | **Structured Guidelines** | At least 3 specific instructions/bullet points.                    |',
  );
  lines.push(
    '| **+2** | **Anti-Patterns**         | `## Anti-Patterns` section or `**No X**` inline lines.            |',
  );
  lines.push(
    '| **+2** | **Reference Examples**    | `references/*.md` links resolved on disk (existing + non-empty) — OR ≤60 lines total. Dangling links score 0 here even if present in text. |',
  );
  lines.push(
    '| **+2** | **Token Optimality**      | Entire `SKILL.md` is ≤100 lines (forces brevity).                  |',
  );
  lines.push(
    '| **+2** | **Eval Coverage**         | ≥3 evals with `should_not_trigger`, ≥2 assertions each. +1 partial.|',
  );
  lines.push('');
  lines.push(
    '> **Eval–Skill Consistency** (reported separately, not scored): % of eval `contains` assertion values that are literal substrings of SKILL.md content. Because evals are typically authored from the skill, near-100% is the expected baseline, not evidence of quality — it only flags drift between a skill and its own evals. It is **not** a proxy for with-skill vs. without-skill behavioral improvement; that requires actually running the evals (see [Live Evals Report](evals-report.md)).',
  );
  lines.push(
    '> **Behavior Quality** (reported separately): guardrail-only score for pressure scenarios, rationalizations, red flags, and behavior assertions.',
  );
  lines.push('');

  lines.push('### 🛡️ How to Verify This Report');
  lines.push('');
  lines.push(
    'Trust but verify. Every number above is reproducible from source — nothing here requires taking our word for it:',
  );
  lines.push('');
  lines.push(
    '1. **Clone the repo** and install dependencies (`pnpm install`).',
  );
  lines.push(
    '2. **Inspect source**: the benchmark logic is open in [scripts/benchmark/](scripts/benchmark/) (`utils.ts` for the quality rubric, `baselines.ts` for the reference prompts, `reporter.ts` for how this file is generated).',
  );
  lines.push(
    '3. **Regenerate this report**: `pnpm benchmark:report` — diff the output against this file; it should match modulo the `Generated:` timestamp.',
  );
  lines.push(
    '4. **For measured (non-structural) behavioral results**, see [docs/EVALS.md](docs/EVALS.md) for how to run and verify the Live Evals Report yourself, including via `pnpm evals:verify` or the MCP `verify_eval_run` tool — no API key required.',
  );
  lines.push('');

  lines.push(`### Pricing (per 1M input tokens, ${PRICING_AS_OF})`);
  lines.push('');
  lines.push(
    '> Pricing drifts. Verify current rates with each provider before using these figures for budgeting.',
  );
  lines.push('');
  for (const [model, price] of Object.entries(MODELS)) {
    lines.push(`- **${model}**: $${price.toFixed(2)}`);
  }
  lines.push('');

  return lines.join('\n');
}
