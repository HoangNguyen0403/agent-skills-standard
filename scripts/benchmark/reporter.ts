import { BASELINE_EXAMPLES, BASELINE_HEAVY, BASELINE_LIGHT } from './baselines';
import { MODELS } from './models';
import { BenchmarkSummary } from './types';

function fmtBig(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function fmtMicro(usd: number): string {
  if (usd < 0.0000001) return '<$0.0000001';
  return `$${usd.toFixed(7)}`;
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
    '> Token counting: `ceil(characters / 4)` — cl100k_base approximation.',
  );
  lines.push(
    '> Baselines: derived from **real, measured example prompts** (see Methodology).',
  );
  lines.push(
    '> Quality: structural rubric (0–10), no live LLM calls required.',
  );
  lines.push('');

  lines.push('## ❓ How to Read This Report');
  lines.push('');
  lines.push(
    'This benchmark answers: **"How many tokens and dollars does an agent skill save compared to a developer writing the same guidance inline?"**',
  );
  lines.push('');
  lines.push(
    '**WITHOUT a skill**: A developer writes domain knowledge directly into the prompt every time (Baseline).',
  );
  lines.push(
    '**WITH a skill**: The agent loads the SKILL.md file (~400 tokens) — structured, reusable, cached.',
  );
  lines.push('');
  lines.push(
    '**Eval Alignment**: % of eval assertion values that appear in SKILL.md. High alignment means the skill actually teaches what the evals test — the static proxy for "with skill > without skill" behavioral improvement.',
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

  const skillsWithEvals = skills.filter((s) => s.evalCount > 0).length;
  const avgAlignment =
    skillsWithEvals > 0
      ? Math.round(
          skills
            .filter((s) => s.evalCount > 0)
            .reduce((sum, s) => sum + s.evalAlignmentPct, 0) / skillsWithEvals,
        )
      : 0;
  lines.push(
    `| Skills with Evals                 | **${skillsWithEvals} / ${summary.totalSkills}** |`,
  );
  lines.push(
    `| Avg. Eval Alignment               | **${avgAlignment}%** (eval assertions covered by SKILL.md) |`,
  );
  lines.push('');

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

  lines.push('### 💰 Cost Comparison — Per Single Call (Average Skill)');
  lines.push('');
  lines.push(
    '> Comparison based on **Heavy Baseline** vs. modern and speculative models.',
  );
  lines.push('');
  lines.push(
    '| Model             | Original Cost | Skill Cost | Net Savings    | % Saved |',
  );
  lines.push(
    '| ----------------- | ------------- | ---------- | -------------- | ------- |',
  );

  for (const [model, price] of Object.entries(MODELS)) {
    const originalCost = (BASELINE_HEAVY / 1_000_000) * price;
    const skillCost = (summary.avgTokensWithSkill / 1_000_000) * price;
    const savings = originalCost - skillCost;
    const savingsPct = Math.round((savings / originalCost) * 100);

    lines.push(
      `| ${model.padEnd(17)} | ${fmtMicro(originalCost).padEnd(13)} | ${fmtMicro(skillCost).padEnd(10)} | **${fmtMicro(savings).padEnd(14)}** | ${savingsPct}% |`,
    );
  }
  lines.push('');

  lines.push('### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Prompt)');
  lines.push('');
  lines.push(
    '| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Monthly Savings (50 skills) | Model |',
  );
  lines.push(
    '| ----------- | ---------------- | ------------------------- | --------------------------- | ----- |',
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
    const fiftySkills = oneSkill * 50;

    lines.push(
      `| 1,000       | ${fmtBig(monthlyOriginal).padEnd(16)}/mo | ${fmtBig(oneSkill).padEnd(24)}/mo | ${fmtBig(fiftySkills).padEnd(26)}/mo | ${model} |`,
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
    const catAvgAlignment =
      catEvalsCount > 0
        ? Math.round(
            catSkills
              .filter((s) => s.evalCount > 0)
              .reduce((s, x) => s + x.evalAlignmentPct, 0) / catEvalsCount,
          )
        : 0;

    lines.push('<details>');
    lines.push(
      `<summary><h3>📦 ${cat} (${catSkills.length} skills | avg ${avgTokens} tokens | quality ${avgQuality}/10 | eval alignment ${catAvgAlignment}%)</h3></summary>`,
    );
    lines.push('');
    lines.push(
      '| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |',
    );
    lines.push(
      '| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |',
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
      const alignDisplay =
        skill.evalCount === 0
          ? 'n/a'
          : skill.evalAlignmentPct >= 70
            ? `✅ ${skill.evalAlignmentPct}%`
            : `⚠️ ${skill.evalAlignmentPct}%`;

      lines.push(
        `| \`${skill.skillName.padEnd(21)}\` | ${skill.tokensWithSkill.toString().padEnd(6)} | ${heavyDisplay.padEnd(18)} | ${skill.qualityScore}/10 | ${evalDisplay} | ${alignDisplay} |`,
      );
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Skills with evals but low alignment — the skill doesn't teach what the evals test
  const lowAlignment = [...skills]
    .filter((s) => s.evalCount > 0 && s.evalAlignmentPct < 70)
    .sort((a, b) => a.evalAlignmentPct - b.evalAlignmentPct);

  if (lowAlignment.length > 0) {
    lines.push('## ⚠️ Low Eval Alignment — Skills to Review');
    lines.push('');
    lines.push(
      '> These skills have evals but SKILL.md content does not cover ≥70% of what the evals test. The skill may not actually improve agent behavior for its target scenarios.',
    );
    lines.push('');
    lines.push(
      '| Skill                   | Category | Alignment | Evals | Action |',
    );
    lines.push(
      '| ----------------------- | -------- | --------- | ----- | ------ |',
    );
    for (const s of lowAlignment.slice(0, 15)) {
      lines.push(
        `| \`${s.skillName.padEnd(21)}\` | ${s.category.padEnd(8)} | ⚠️ ${s.evalAlignmentPct}% | ${s.evalCount} | Add missing terms from eval assertions to SKILL.md |`,
      );
    }
    lines.push('');
  }

  lines.push('## 🏆 Quality Leaders');
  lines.push('');
  lines.push(
    '| Rank | Skill                   | Category | Quality | Tokens | Evals | Aligned |',
  );
  lines.push(
    '| ---- | ----------------------- | -------- | ------- | ------ | ----- | ------- |',
  );
  const sorted = [...skills].sort((a, b) => b.qualityScore - a.qualityScore);
  sorted.slice(0, 10).forEach((s, i) => {
    const evalDisplay = s.evalCount === 0 ? '❌' : `${s.evalCount}`;
    const alignDisplay =
      s.evalCount === 0
        ? 'n/a'
        : s.evalAlignmentPct >= 70
          ? `✅ ${s.evalAlignmentPct}%`
          : `⚠️ ${s.evalAlignmentPct}%`;
    lines.push(
      `| ${((i + 1).toString() + ' '.repeat(4)).slice(0, 4)} | \`${s.skillName.padEnd(21)}\` | ${s.category.padEnd(8)} | ${s.qualityScore}/10 | ${s.tokensWithSkill} | ${evalDisplay} | ${alignDisplay} |`,
    );
  });
  lines.push('');

  lines.push('## 📐 Methodology & Baseline Justification');
  lines.push('');
  lines.push('### Why These Baselines?');
  lines.push('');
  lines.push(
    'The baselines are derived from **real, token-counted example prompts** that represent what a developer actually writes when there is no structured skill available.',
  );
  lines.push('');
  lines.push(
    'Using NestJS as the **Reference Unit**: Because we measure instruction volume replaced, using a high-density reference ensures scientific consistency across all tech stacks.',
  );
  lines.push('');
  lines.push(
    `#### 🟡 Reference Technical Prompt — Light — ${BASELINE_LIGHT} tokens`,
  );
  lines.push('');
  lines.push(`> **${BASELINE_EXAMPLES.light.label}**`);
  lines.push(`> ${BASELINE_EXAMPLES.light.description}`);
  lines.push('');
  lines.push(
    `#### 🔴 Reference Technical Prompt — Heavy — ${BASELINE_HEAVY} tokens`,
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
    '| **+2** | **Reference Examples**    | Presence of a verified `references/` folder with code.             |',
  );
  lines.push(
    '| **+2** | **Token Optimality**      | Entire `SKILL.md` is ≤100 lines (forces brevity).                  |',
  );
  lines.push(
    '| **+2** | **Eval Coverage**         | ≥3 evals with `should_not_trigger`, ≥2 assertions each. +1 partial.|',
  );
  lines.push('');
  lines.push(
    '> **Eval Alignment** (reported separately, not scored): % of eval `contains` assertion values that appear in SKILL.md content. Measures whether the skill actually teaches what its evals test — the closest static proxy for **with-skill vs without-skill** behavioral improvement.',
  );
  lines.push('');

  lines.push('### 🛡️ How to Verify This Report');
  lines.push('');
  lines.push(
    'Trust but verify. You can audit the raw data and run the benchmark yourself:',
  );
  lines.push('');
  lines.push(
    '1. **Clone the repo** and install dependencies (`pnpm install`).',
  );
  lines.push(
    '2. **Inspect Source**: The benchmark logic is open in [cli/src/scripts/benchmark/](./cli/src/scripts/benchmark/).',
  );
  lines.push('');

  lines.push('### Pricing (per 1M input tokens, Feb 2026)');
  lines.push('');
  for (const [model, price] of Object.entries(MODELS)) {
    lines.push(`- **${model}**: $${price.toFixed(2)}`);
  }
  lines.push('');

  return lines.join('\n');
}
