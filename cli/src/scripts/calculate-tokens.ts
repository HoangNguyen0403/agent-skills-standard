#!/usr/bin/env node

/**
 * Token Metrics Calculator
 * Calculates token costs for each skill category based on SKILL.md files.
 * Uses character-based approximation: ~4 characters = 1 token (cl100k_base average)
 */

import fs from 'fs-extra';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../../skills');
const METADATA_PATH = path.join(SKILLS_DIR, 'metadata.json');
const CHARS_PER_TOKEN = 4; // Approximate ratio for cl100k_base tokenizer

interface SkillMetrics {
  skillName: string;
  lines: number;
  characters: number;
  tokens: number;
}

interface CategoryMetrics {
  totalSkills: number;
  totalLines: number;
  totalCharacters: number;
  totalTokens: number;
  avgTokensPerSkill: number;
  largestSkill: string;
  largestSkillTokens: number;
}

function calculateFileTokens(filePath: string): {
  lines: number;
  characters: number;
  tokens: number;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const characters = content.length;
  const tokens = Math.ceil(characters / CHARS_PER_TOKEN);
  return { lines, characters, tokens };
}

function getSkillsInCategory(categoryPath: string): SkillMetrics[] {
  const skills: SkillMetrics[] = [];

  if (!fs.existsSync(categoryPath)) {
    return skills;
  }

  const entries = fs.readdirSync(categoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillMdPath = path.join(categoryPath, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        const metrics = calculateFileTokens(skillMdPath);
        skills.push({
          skillName: entry.name,
          ...metrics,
        });
      }
    }
  }

  return skills;
}

function calculateCategoryMetrics(skills: SkillMetrics[]): CategoryMetrics {
  if (skills.length === 0) {
    return {
      totalSkills: 0,
      totalLines: 0,
      totalCharacters: 0,
      totalTokens: 0,
      avgTokensPerSkill: 0,
      largestSkill: 'N/A',
      largestSkillTokens: 0,
    };
  }

  const totalSkills = skills.length;
  const totalLines = skills.reduce((sum, s) => sum + s.lines, 0);
  const totalCharacters = skills.reduce((sum, s) => sum + s.characters, 0);
  const totalTokens = skills.reduce((sum, s) => sum + s.tokens, 0);
  const avgTokensPerSkill = Math.round(totalTokens / totalSkills);

  const largest = skills.reduce(
    (max, s) => (s.tokens > max.tokens ? s : max),
    skills[0],
  );

  return {
    totalSkills,
    totalLines,
    totalCharacters,
    totalTokens,
    avgTokensPerSkill,
    largestSkill: largest.skillName,
    largestSkillTokens: largest.tokens,
  };
}

async function main() {
  console.log('📊 Calculating token metrics for skills...\n');

  // Read existing metadata
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));

  // Get all categories
  const categories = Object.keys(metadata.categories);

  const results: Record<string, CategoryMetrics> = {};

  for (const category of categories) {
    const categoryPath = path.join(SKILLS_DIR, category);
    const skills = getSkillsInCategory(categoryPath);
    const metrics = calculateCategoryMetrics(skills);
    results[category] = metrics;

    // Update metadata with token_metrics
    metadata.categories[category].token_metrics = {
      total_skills: metrics.totalSkills,
      total_tokens: metrics.totalTokens,
      avg_tokens_per_skill: metrics.avgTokensPerSkill,
      largest_skill: `${metrics.largestSkill} (${metrics.largestSkillTokens} tokens)`,
    };

    console.log(`📦 ${category}:`);
    console.log(`   Skills: ${metrics.totalSkills}`);
    console.log(`   Total Tokens: ${metrics.totalTokens}`);
    console.log(`   Avg/Skill: ${metrics.avgTokensPerSkill}`);
    console.log(
      `   Largest: ${metrics.largestSkill} (${metrics.largestSkillTokens} tokens)`,
    );
    console.log('');
  }

  // Calculate grand total
  const grandTotal = Object.values(results).reduce(
    (sum, m) => sum + m.totalTokens,
    0,
  );
  const totalSkills = Object.values(results).reduce(
    (sum, m) => sum + m.totalSkills,
    0,
  );

  console.log('═══════════════════════════════════════');
  console.log(
    `📈 GRAND TOTAL: ${grandTotal} tokens across ${totalSkills} skills`,
  );
  console.log('═══════════════════════════════════════\n');

  // Write updated metadata
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2) + '\n');
  console.log('✅ Updated metadata.json with token_metrics');

  // Update README.md table
  const readmePath = path.join(__dirname, '../../../README.md');
  if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, 'utf-8');

    for (const category of categories) {
      const metrics = results[category];
      const version = metadata.categories[category].version;

      // Find the row for this category (case-insensitive for emojis)
      // Standardizes on the format: | **ICON Category** | Key Modules | Version | Skills | Avg. Footprint |
      const regex = new RegExp(
        `(\\|\\s*\\*\\*.*${category}.*\\*\\*\\s*\\|.*\\|\\s*\`v?${version}\`\\s*\\|)\\s*\\d+\\s*\\|\\s*~?\\d+\\s*tokens\\s*\\|`,
        'i',
      );

      const replacement = `$1 ${metrics.totalSkills}      | ~${metrics.avgTokensPerSkill} tokens    |`;

      if (readmeContent.match(regex)) {
        readmeContent = readmeContent.replace(regex, replacement);
      }
    }

    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ Updated README.md support table');
  }
}

main().catch(console.error);
