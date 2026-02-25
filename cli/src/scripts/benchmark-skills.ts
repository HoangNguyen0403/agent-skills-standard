#!/usr/bin/env node

/**
 * Skill Benchmark Script
 * Compares token consumption, dollar cost, and quality score
 * for agent skills vs. baseline (no skill / naive prompting).
 *
 * Baselines:
 *   - Light task: 1,500 tokens (simple, focused request)
 *   - Heavy task: 3,000 tokens (complex, multi-step request)
 *
 * Quality is measured via a structural rubric (0–10).
 * No live LLM calls required.
 */

import fs from 'fs-extra';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILLS_DIR = path.join(__dirname, '../../../skills');
const METADATA_PATH = path.join(SKILLS_DIR, 'metadata.json');
const OUTPUT_DIR = path.join(__dirname, '../../..');
const REPORT_MD = path.join(OUTPUT_DIR, 'benchmark-report.md');
const REPORT_JSON = path.join(OUTPUT_DIR, 'benchmark-report.json');

const CHARS_PER_TOKEN = 4;

// Baseline tokens WITHOUT skills (no structured guidance)
const BASELINE_LIGHT = 1_500; // simple, focused task
const BASELINE_HEAVY = 3_000; // complex, multi-step task

// Model pricing (USD per 1M input tokens) — Feb 2026 public rates
const MODELS: Record<string, number> = {
  'GPT-4o': 2.5,
  'Claude 3.5 Sonnet': 3.0,
  'Gemini 1.5 Pro': 1.25,
  'Gemini 2.0 Flash': 0.1,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillBenchmark {
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
}

interface BenchmarkSummary {
  totalSkills: number;
  avgTokensWithSkill: number;
  avgSavingsPctLight: number;
  avgSavingsPctHeavy: number;
  avgQualityScore: number;
  totalCostSavingsLight: Record<string, number>; // per 1000 calls/day
  totalCostSavingsHeavy: Record<string, number>;
  skills: SkillBenchmark[];
}

// ---------------------------------------------------------------------------
// Token Helpers
// ---------------------------------------------------------------------------

function countTokens(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf-8');
  return Math.ceil(content.length / CHARS_PER_TOKEN);
}

function costUSD(tokens: number, pricePerMillion: number): number {
  return (tokens / 1_000_000) * pricePerMillion;
}

// ---------------------------------------------------------------------------
// Quality Rubric (Structural Proxy, 0–10)
// ---------------------------------------------------------------------------

function scoreQuality(
  skillDir: string,
  skillMdPath: string,
): { score: number; detail: string[] } {
  const detail: string[] = [];
  let score = 0;
  const content = fs.existsSync(skillMdPath)
    ? fs.readFileSync(skillMdPath, 'utf-8')
    : '';

  // 1. Structured guidelines (≥3 bullet-point lines)
  const bulletLines = (content.match(/^\s*[-*]\s+.+/gm) || []).length;
  if (bulletLines >= 3) {
    score += 2;
    detail.push('✅ Guidelines: ≥3 bullet points');
  } else {
    detail.push(`❌ Guidelines: only ${bulletLines} bullet point(s) (need ≥3)`);
  }

  // 2. Anti-patterns section
  if (/##\s+anti-pattern/i.test(content)) {
    score += 2;
    detail.push('✅ Anti-Patterns section present');
  } else {
    detail.push('❌ Anti-Patterns section missing');
  }

  // 3. References/examples folder with ≥1 file
  const refsDir = path.join(skillDir, 'references');
  const hasRefs =
    fs.existsSync(refsDir) &&
    fs.readdirSync(refsDir).filter((f) => !f.startsWith('.')).length > 0;
  if (hasRefs) {
    score += 2;
    detail.push('✅ References folder with content');
  } else {
    detail.push('❌ No references/ folder (or empty)');
  }

  // 4. SKILL.md ≤100 lines
  const lines = content.split('\n').length;
  if (lines <= 100) {
    score += 2;
    detail.push(`✅ Token-optimal size: ${lines} lines (≤100)`);
  } else {
    detail.push(
      `❌ Oversized: ${lines} lines (>100, move content to references/)`,
    );
  }

  // 5. Triggers defined in frontmatter
  const hasKeywords = /keywords\s*:/i.test(content);
  const hasFiles = /files\s*:/i.test(content);
  if (hasKeywords && hasFiles) {
    score += 2;
    detail.push('✅ Frontmatter triggers: keywords + files defined');
  } else {
    const missing = [!hasKeywords && 'keywords', !hasFiles && 'files']
      .filter(Boolean)
      .join(', ');
    detail.push(`❌ Missing triggers: ${missing}`);
  }

  return { score, detail };
}

// ---------------------------------------------------------------------------
// Benchmark a single skill
// ---------------------------------------------------------------------------

function benchmarkSkill(category: string, skillName: string): SkillBenchmark {
  const skillDir = path.join(SKILLS_DIR, category, skillName);
  const skillMdPath = path.join(skillDir, 'SKILL.md');

  const tokensWithSkill = countTokens(skillMdPath);

  const savingsLight = Math.max(0, BASELINE_LIGHT - tokensWithSkill);
  const savingsHeavy = Math.max(0, BASELINE_HEAVY - tokensWithSkill);
  const savingsPctLight = Math.round((savingsLight / BASELINE_LIGHT) * 100);
  const savingsPctHeavy = Math.round((savingsHeavy / BASELINE_HEAVY) * 100);

  // Cost savings per model (per single call)
  const costSavingsLight: Record<string, number> = {};
  const costSavingsHeavy: Record<string, number> = {};
  for (const [model, price] of Object.entries(MODELS)) {
    costSavingsLight[model] = costUSD(savingsLight, price);
    costSavingsHeavy[model] = costUSD(savingsHeavy, price);
  }

  const { score: qualityScore, detail: qualityDetail } = scoreQuality(
    skillDir,
    skillMdPath,
  );

  return {
    category,
    skillName,
    skillPath: `skills/${category}/${skillName}/SKILL.md`,
    tokensWithSkill,
    tokensBaselineLight: BASELINE_LIGHT,
    tokensBaselineHeavy: BASELINE_HEAVY,
    savingsLight,
    savingsHeavy,
    savingsPctLight,
    savingsPctHeavy,
    costSavingsLight,
    costSavingsHeavy,
    qualityScore,
    qualityDetail,
  };
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function fmtCost(usd: number): string {
  return usd < 0.000001 ? `<$0.000001` : `$${usd.toFixed(7)}`;
}

function fmtBig(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function bar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function buildMarkdownReport(summary: BenchmarkSummary): string {
  const { skills } = summary;
  const lines: string[] = [];

  lines.push('# 📊 Agent Skill Benchmark Report');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(
    '> Methodology: Token counting via char/4 approximation (cl100k_base).',
  );
  lines.push(
    '> Quality: Structural rubric (0–10), no live LLM calls required.',
  );
  lines.push('');

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  lines.push('## 🔢 Executive Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Skills Benchmarked | **${summary.totalSkills}** |`);
  lines.push(`| Avg. Tokens WITH Skill | **${summary.avgTokensWithSkill}** |`);
  lines.push(`| Baseline Light (no skill) | **${BASELINE_LIGHT} tokens** |`);
  lines.push(`| Baseline Heavy (no skill) | **${BASELINE_HEAVY} tokens** |`);
  lines.push(
    `| Avg. Token Savings (light) | **${summary.avgSavingsPctLight}%** |`,
  );
  lines.push(
    `| Avg. Token Savings (heavy) | **${summary.avgSavingsPctHeavy}%** |`,
  );
  lines.push(`| Avg. Quality Score | **${summary.avgQualityScore}/10** |`);
  lines.push('');

  // Cost savings at 1000 calls/day
  lines.push('### 💰 Cost Savings at 1,000 Calls/Day');
  lines.push('');
  lines.push(`| Model | Price/1M | vs Light Baseline | vs Heavy Baseline |`);
  lines.push(`|-------|----------|-------------------|-------------------|`);
  for (const [model, price] of Object.entries(MODELS)) {
    const lightDay = summary.totalCostSavingsLight[model] * 1000;
    const heavyDay = summary.totalCostSavingsHeavy[model] * 1000;
    lines.push(
      `| ${model} | $${price.toFixed(2)}/1M | ${fmtBig(lightDay)}/day | ${fmtBig(heavyDay)}/day |`,
    );
  }
  lines.push('');
  lines.push(
    '> **How to read**: "vs Light Baseline" = savings when replacing a 1,500-token naive call with a skill-guided call.',
  );
  lines.push(
    '> "vs Heavy Baseline" = savings when replacing a 3,000-token naive call.',
  );
  lines.push('');

  // ── PER-CATEGORY ─────────────────────────────────────────────────────────
  lines.push('## 📦 Per-Category Summary');
  lines.push('');

  const categories = [...new Set(skills.map((s) => s.category))].sort();

  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.category === cat);
    const avgTokens = Math.round(
      catSkills.reduce((s, x) => s + x.tokensWithSkill, 0) / catSkills.length,
    );
    const avgPctLight = Math.round(
      catSkills.reduce((s, x) => s + x.savingsPctLight, 0) / catSkills.length,
    );
    const avgPctHeavy = Math.round(
      catSkills.reduce((s, x) => s + x.savingsPctHeavy, 0) / catSkills.length,
    );
    const avgQuality = (
      catSkills.reduce((s, x) => s + x.qualityScore, 0) / catSkills.length
    ).toFixed(1);

    lines.push(
      `### ${cat} (${catSkills.length} skills | avg ${avgTokens} tokens | quality ${avgQuality}/10)`,
    );
    lines.push('');
    lines.push(
      `| Skill | Tokens | Savings (Light) | Savings (Heavy) | Quality |`,
    );
    lines.push(
      `|-------|--------|-----------------|-----------------|---------|`,
    );

    for (const skill of catSkills.sort(
      (a, b) => b.qualityScore - a.qualityScore,
    )) {
      const lightBar = `${bar(skill.savingsPctLight, 10)} ${skill.savingsPctLight}%`;
      const heavyBar = `${bar(skill.savingsPctHeavy, 10)} ${skill.savingsPctHeavy}%`;
      lines.push(
        `| \`${skill.skillName}\` | ${skill.tokensWithSkill} | ${lightBar} | ${heavyBar} | ${skill.qualityScore}/10 |`,
      );
    }
    lines.push('');

    // Category-level cost savings (all skills combined, per 1000 calls/day)
    lines.push(`**Cost savings for ${cat} at 1,000 calls/day:**`);
    lines.push('');
    lines.push(`| Model | Light Baseline | Heavy Baseline |`);
    lines.push(`|-------|----------------|----------------|`);
    for (const [model] of Object.entries(MODELS)) {
      const lightDay =
        catSkills.reduce((s, x) => s + x.costSavingsLight[model], 0) * 1000;
      const heavyDay =
        catSkills.reduce((s, x) => s + x.costSavingsHeavy[model], 0) * 1000;
      lines.push(
        `| ${model} | ${fmtBig(lightDay)}/day | ${fmtBig(heavyDay)}/day |`,
      );
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // ── TOP / BOTTOM QUALITY ─────────────────────────────────────────────────
  lines.push('## 🏆 Quality Leaders');
  lines.push('');
  lines.push(`| Rank | Skill | Category | Quality | Tokens |`);
  lines.push(`|------|-------|----------|---------|--------|`);
  const sorted = [...skills].sort((a, b) => b.qualityScore - a.qualityScore);
  sorted.slice(0, 10).forEach((s, i) => {
    lines.push(
      `| ${i + 1} | \`${s.skillName}\` | ${s.category} | ${s.qualityScore}/10 | ${s.tokensWithSkill} |`,
    );
  });
  lines.push('');

  lines.push('## ⚠️ Skills Needing Improvement (Quality < 6)');
  lines.push('');
  const needsWork = sorted.filter((s) => s.qualityScore < 6).reverse();
  if (needsWork.length === 0) {
    lines.push('> 🎉 All skills score 6/10 or higher!');
  } else {
    lines.push(`| Skill | Category | Quality | Issues |`);
    lines.push(`|-------|----------|---------|--------|`);
    for (const s of needsWork.slice(0, 20)) {
      const issues = s.qualityDetail
        .filter((d) => d.startsWith('❌'))
        .join('; ');
      lines.push(
        `| \`${s.skillName}\` | ${s.category} | ${s.qualityScore}/10 | ${issues} |`,
      );
    }
  }
  lines.push('');

  // ── METHODOLOGY ──────────────────────────────────────────────────────────
  lines.push('## 📐 Methodology');
  lines.push('');
  lines.push('### Token Counting');
  lines.push('`tokens = ceil(characters / 4)` — cl100k_base approximation.');
  lines.push('');
  lines.push('### Baselines (No Skill)');
  lines.push(
    `- **Light task** (${BASELINE_LIGHT} tokens): Simple, focused LLM call with no structured guidance`,
  );
  lines.push(
    `- **Heavy task** (${BASELINE_HEAVY} tokens): Complex, multi-step call with inline context`,
  );
  lines.push('');
  lines.push('### Quality Rubric (0–10, 2pts each)');
  lines.push('1. ≥3 bullet-point guidelines in SKILL.md');
  lines.push('2. Anti-Patterns section present');
  lines.push('3. `references/` folder with ≥1 file');
  lines.push('4. SKILL.md ≤100 lines');
  lines.push('5. Frontmatter has `keywords` + `files` triggers');
  lines.push('');
  lines.push('### Pricing (per 1M input tokens, Feb 2026)');
  for (const [model, price] of Object.entries(MODELS)) {
    lines.push(`- **${model}**: $${price.toFixed(2)}`);
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔬 Running Skill Benchmark...\n');

  if (!fs.existsSync(METADATA_PATH)) {
    console.error(`❌ metadata.json not found at: ${METADATA_PATH}`);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  const categories = Object.keys(metadata.categories);

  const allBenchmarks: SkillBenchmark[] = [];

  for (const category of categories.sort()) {
    const categoryPath = path.join(SKILLS_DIR, category);
    if (!fs.existsSync(categoryPath)) continue;

    const entries = fs.readdirSync(categoryPath, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory());

    console.log(`📦 ${category} (${skillDirs.length} skills)`);

    for (const entry of skillDirs) {
      const skillMdPath = path.join(categoryPath, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      const b = benchmarkSkill(category, entry.name);
      allBenchmarks.push(b);

      const statusIcon = b.savingsPctLight >= 50 ? '✅' : '⚠️';
      const qualityIcon =
        b.qualityScore >= 8 ? '🌟' : b.qualityScore >= 6 ? '✅' : '❌';
      console.log(
        `   ${statusIcon} ${entry.name}: ${b.tokensWithSkill} tokens | ` +
          `saves ${b.savingsPctLight}% (light) / ${b.savingsPctHeavy}% (heavy) | ` +
          `quality ${qualityIcon} ${b.qualityScore}/10`,
      );
    }
    console.log('');
  }

  // Build summary
  const totalSkills = allBenchmarks.length;
  const avgTokensWithSkill = Math.round(
    allBenchmarks.reduce((s, b) => s + b.tokensWithSkill, 0) / totalSkills,
  );
  const avgSavingsPctLight = Math.round(
    allBenchmarks.reduce((s, b) => s + b.savingsPctLight, 0) / totalSkills,
  );
  const avgSavingsPctHeavy = Math.round(
    allBenchmarks.reduce((s, b) => s + b.savingsPctHeavy, 0) / totalSkills,
  );
  const avgQualityScore = parseFloat(
    (
      allBenchmarks.reduce((s, b) => s + b.qualityScore, 0) / totalSkills
    ).toFixed(1),
  );

  // Total cost savings across all skills, per call
  const totalCostSavingsLight: Record<string, number> = {};
  const totalCostSavingsHeavy: Record<string, number> = {};
  for (const model of Object.keys(MODELS)) {
    totalCostSavingsLight[model] = allBenchmarks.reduce(
      (s, b) => s + b.costSavingsLight[model],
      0,
    );
    totalCostSavingsHeavy[model] = allBenchmarks.reduce(
      (s, b) => s + b.costSavingsHeavy[model],
      0,
    );
  }

  const summary: BenchmarkSummary = {
    totalSkills,
    avgTokensWithSkill,
    avgSavingsPctLight,
    avgSavingsPctHeavy,
    avgQualityScore,
    totalCostSavingsLight,
    totalCostSavingsHeavy,
    skills: allBenchmarks,
  };

  // ── Console Summary ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📈 BENCHMARK COMPLETE — ${totalSkills} skills`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Avg tokens WITH skill:  ${avgTokensWithSkill}`);
  console.log(
    `   Avg savings (light):    ${avgSavingsPctLight}%  (vs ${BASELINE_LIGHT} token baseline)`,
  );
  console.log(
    `   Avg savings (heavy):    ${avgSavingsPctHeavy}%  (vs ${BASELINE_HEAVY} token baseline)`,
  );
  console.log(`   Avg quality score:      ${avgQualityScore}/10`);
  console.log('');
  console.log('💰 Cost savings at 1,000 calls/day (all skills):');
  for (const [model, price] of Object.entries(MODELS)) {
    const lightDay = totalCostSavingsLight[model] * 1000;
    const heavyDay = totalCostSavingsHeavy[model] * 1000;
    console.log(
      `   ${model.padEnd(22)} $${price.toFixed(2)}/1M | ` +
        `light: ${fmtBig(lightDay)}/day | heavy: ${fmtBig(heavyDay)}/day`,
    );
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Write reports ────────────────────────────────────────────────────────
  const markdownReport = buildMarkdownReport(summary);
  fs.outputFileSync(REPORT_MD, markdownReport);
  console.log(`✅ Markdown report:  ${REPORT_MD}`);

  fs.outputFileSync(REPORT_JSON, JSON.stringify(summary, null, 2) + '\n');
  console.log(`✅ JSON report:      ${REPORT_JSON}`);
}

main().catch((err) => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});
