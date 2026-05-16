#!/usr/bin/env node

/**
 * Skill Benchmark Script - Entry Point
 *
 * Orchestrates the measurement of agent skills against baselines.
 * Modular structure: constants, types, baselines, models, utils, reporter.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { BASELINE_HEAVY, BASELINE_LIGHT } from './baselines';
import {
  ARCHIVE_DIR,
  BENCHMARKS_DIR,
  HISTORY_JSON,
  METADATA_PATH,
  REPORT_MD,
  ROOT_DIR,
  SKILLS_DIR,
} from './constants';
import { MODELS } from './models';
import { buildMarkdownReport } from './reporter';
import {
  BenchmarkHistory,
  BenchmarkHistoryRecord,
  BenchmarkSummary,
  SkillBenchmark,
} from './types';
import { costUSD, countTokens, scoreQuality } from './utils';

function benchmarkSkill(category: string, skillName: string): SkillBenchmark {
  const skillDir = path.join(SKILLS_DIR, category, skillName);
  const skillMdPath = path.join(skillDir, 'SKILL.md');

  const tokensWithSkill = countTokens(skillMdPath);

  const savingsLight = BASELINE_LIGHT - tokensWithSkill;
  const savingsHeavy = BASELINE_HEAVY - tokensWithSkill;
  const savingsPctLight = Math.round((savingsLight / BASELINE_LIGHT) * 100);
  const savingsPctHeavy = Math.round((savingsHeavy / BASELINE_HEAVY) * 100);

  // Cost savings per model (per single call)
  const costSavingsLight: Record<string, number> = {};
  const costSavingsHeavy: Record<string, number> = {};
  for (const [model, price] of Object.entries(MODELS)) {
    costSavingsLight[model] = costUSD(savingsLight, price);
    costSavingsHeavy[model] = costUSD(savingsHeavy, price);
  }

  const {
    score: qualityScore,
    detail: qualityDetail,
    evalCount,
    evalAlignmentPct,
  } = scoreQuality(skillDir, skillMdPath);

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
    evalCount,
    evalAlignmentPct,
  };
}

const ROOT_PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');
const reportOnly = process.argv.includes('--report-only');

function loadHistory(): BenchmarkHistory {
  if (fs.existsSync(HISTORY_JSON)) {
    return fs.readJSONSync(HISTORY_JSON);
  }
  return { lastUpdated: new Date().toISOString(), records: [] };
}

function saveHistory(history: BenchmarkHistory) {
  if (reportOnly) return;
  fs.ensureDirSync(BENCHMARKS_DIR);
  fs.writeJSONSync(HISTORY_JSON, history, { spaces: 2 });
}

function updateReadmeHistory(
  readmePath: string,
  history: BenchmarkHistoryRecord[],
) {
  if (reportOnly) return;
  if (!fs.existsSync(readmePath)) return;

  const content = fs.readFileSync(readmePath, 'utf-8');
  const MAX_HISTORY_ENTRIES = 10;
  const trend = [...history].reverse().slice(0, MAX_HISTORY_ENTRIES);

  const historyHeader = '### 📜 Benchmark History';
  const tableHeader =
    '| Version | Date | Skills | Avg Tokens | Savings (%) | Report |\n| --- | --- | --- | --- | --- | --- |';
  const tableRows = trend
    .map(
      (r: BenchmarkHistoryRecord) =>
        `| v${r.version} | ${r.date.split('T')[0]} | ${r.totalSkills} | ${r.avgTokens} | ${r.savingsPctHeavy}% | [Report](${r.reportPath}) |`,
    )
    .join('\n');

  const historySection = `\n\n${historyHeader}\n\n${tableHeader}\n${tableRows}\n`;

  // Regex to find and replace the history section if it exists, or append it
  const historyRegex = /### 📜 Benchmark History[\s\S]*?(?=\n#|$|###)/;

  let newContent: string;
  if (historyRegex.test(content)) {
    newContent = content.replace(historyRegex, historySection.trim() + '\n');
  } else {
    // Append after the "Efficiency & Benchmark" section
    // Supports both ## and ### levels
    const efficiencyRegex =
      /(##+ 📊 Efficiency & Benchmark[\s\S]*?)(?=\n#+ |$)/;
    if (efficiencyRegex.test(content)) {
      newContent = content.replace(efficiencyRegex, (match) => {
        return match.trim() + historySection;
      });
    } else {
      newContent = content.trim() + historySection;
    }
  }

  fs.writeFileSync(readmePath, newContent);
}

async function main() {
  console.log('🔬 Running Skill Benchmark (Modular)...\n');

  if (!fs.existsSync(METADATA_PATH)) {
    console.error(`❌ metadata.json not found at: ${METADATA_PATH}`);
    process.exit(1);
  }

  // Load version
  const pkg = fs.readJSONSync(ROOT_PACKAGE_JSON);
  const version = pkg.version || '0.0.0';
  console.log(`🏷️ Version: v${version}`);

  const metadata = fs.readJSONSync(METADATA_PATH);
  const categories = Object.keys(metadata.categories);

  const allBenchmarks: SkillBenchmark[] = [];

  for (const category of categories.sort()) {
    if (category === 'specialists') continue; // Specialists are agent personas, not benchmarked as skills
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
      const evalIcon =
        b.evalCount === 0 ? '❌' : b.evalAlignmentPct >= 70 ? '✅' : '⚠️';
      console.log(
        `   ${statusIcon} ${entry.name}: ${b.tokensWithSkill} tokens | ` +
          `saves ${b.savingsPctHeavy}% (heavy) | ` +
          `quality ${qualityIcon} ${b.qualityScore}/10 | ` +
          `evals ${evalIcon} ${b.evalCount} (${b.evalAlignmentPct}% aligned)`,
      );
    }
    console.log('');
  }

  // Build summary
  const totalSkills = allBenchmarks.length;
  if (totalSkills === 0) {
    console.log('⚠️ No skills found to benchmark.');
    return;
  }

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

  const totalCostSavingsLight: Record<string, number> = {};
  const totalCostSavingsHeavy: Record<string, number> = {};
  for (const model of Object.keys(MODELS)) {
    totalCostSavingsLight[model] = allBenchmarks.reduce(
      (s, b) => s + (b.costSavingsLight[model] || 0),
      0,
    );
    totalCostSavingsHeavy[model] = allBenchmarks.reduce(
      (s, b) => s + (b.costSavingsHeavy[model] || 0),
      0,
    );
  }

  // Handle History
  const history = loadHistory();
  const relativeArchivePath = `benchmarks/archive/v${version}.md`;

  // Update history record BEFORE building report so history shows up in the current report
  const existingIndex = history.records.findIndex(
    (r: BenchmarkHistoryRecord) => r.version === version,
  );
  const newRecord: BenchmarkHistoryRecord = {
    version,
    date: new Date().toISOString(),
    totalSkills,
    avgTokens: avgTokensWithSkill,
    savingsPctHeavy: avgSavingsPctHeavy,
    avgQuality: avgQualityScore,
    reportPath: relativeArchivePath,
  };

  if (existingIndex >= 0) {
    history.records[existingIndex] = newRecord;
  } else {
    history.records.push(newRecord);
  }
  history.lastUpdated = newRecord.date;

  const summary: BenchmarkSummary = {
    totalSkills,
    avgTokensWithSkill,
    avgSavingsPctLight,
    avgSavingsPctHeavy,
    avgQualityScore,
    totalCostSavingsLight,
    totalCostSavingsHeavy,
    skills: allBenchmarks,
    history,
  };

  // Write reports
  const markdownReport = buildMarkdownReport(summary);
  fs.outputFileSync(REPORT_MD, markdownReport);
  console.log(`✅ Markdown report:  ${REPORT_MD}`);

  if (!reportOnly) {
    const archivePath = path.join(ROOT_DIR, relativeArchivePath);
    fs.ensureDirSync(ARCHIVE_DIR);
    fs.writeFileSync(archivePath, markdownReport);
    console.log(`📦 Archived: ${archivePath}`);
  } else {
    console.log('ℹ️ Report-only mode: skipped archive/history/README writes.');
  }

  saveHistory(history);
  if (!reportOnly) console.log(`💾 History updated: ${HISTORY_JSON}`);

  // Update READMEs
  updateReadmeHistory(path.join(ROOT_DIR, 'README.md'), history.records);
  updateReadmeHistory(path.join(ROOT_DIR, 'cli/README.md'), history.records);
  if (!reportOnly) console.log('📝 README history trend updated.');

  console.log('\n📊 Benchmark summary generated successfully.');
}

main().catch((err) => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});
