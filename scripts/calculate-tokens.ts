#!/usr/bin/env node

/**
 * Token Metrics Calculator
 * Calculates token costs for each skill category based on SKILL.md files.
 * Uses character-based approximation: ~4 characters = 1 token (cl100k_base average)
 */

import fs from 'fs-extra';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../skills');
const METADATA_PATH = path.join(SKILLS_DIR, 'metadata.json');
const CHARS_PER_TOKEN = 4; // Approximate ratio for cl100k_base tokenizer
const HEAVY_BASELINE = 3656; // Reference unit for savings calculation

const CATEGORY_NAME_MAP: Record<string, string> = {
  common: 'Common Patterns',
  flutter: 'Flutter',
  dart: 'Dart',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  react: 'React',
  'react-native': 'React Native',
  nestjs: 'NestJS',
  nextjs: 'Next.js',
  angular: 'Angular',
  android: 'Android',
  kotlin: 'Kotlin',
  java: 'Java',
  'spring-boot': 'Spring Boot',
  swift: 'Swift',
  ios: 'iOS',
  golang: 'Go (Golang)',
  php: 'PHP',
  laravel: 'Laravel',
  database: 'Database',
  'quality-engineering': 'Quality Engineering',
};

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
  fs.outputFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2) + '\n');
  console.log('✅ Updated metadata.json with token_metrics');

  // Update README files
  const readmePaths = [
    path.join(__dirname, '../README.md'),
    path.join(__dirname, '../cli/README.md'),
  ];

  for (const readmePath of readmePaths) {
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, 'utf-8');
      let updated = false;

      // Update Legacy Table Format (Backward Compatibility)
      const lines = readmeContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const category of categories) {
          const displayName = CATEGORY_NAME_MAP[category] || category;
          const flexibleName = displayName
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .split(' ')
            .join('.*');
          const categoryMatch = new RegExp(`\\| \\*\\*${flexibleName}\\*\\*`, 'i').test(
            line,
          );

          if (categoryMatch && line.split('|').length >= 8) {
            const metrics = results[category];
            const version = metadata.categories[category]?.version;
            const savings = Math.round((1 - metrics.avgTokensPerSkill / HEAVY_BASELINE) * 100);
            const cells = line.split('|');
            
            // Expected indices for 7-data-column table:
            // | Stack | Modules | Saving | Status | Version | Skills | Footprint |
            // [0]   [1]     [2]     [3]      [4]      [5]       [6]      [7]       [8]
            
            cells[3] = ` **${savings}%** `.padEnd(10);
            cells[4] = ` Healthy `.padEnd(10);
            if (version) cells[5] = ` \`v${version}\``.padEnd(10);
            cells[6] = ` ${metrics.totalSkills}`.padEnd(8);
            cells[7] = ` ~${metrics.avgTokensPerSkill} tokens `
              .trimEnd()
              .padEnd(16);
            lines[i] = cells.join('|');
            updated = true;
          }

          // Update Badges
          const badgeRegex = new RegExp(`^\\[!\\[${category}\\]`);
          if (badgeRegex.test(line)) {
            const version = metadata.categories[category]?.version;
            if (version) {
              lines[i] = line.replace(
                new RegExp(`${category}-v\\d+\\.\\d+\\.\\d+`, 'g'),
                `${category}-v${version}`,
              );
              updated = true;
            }
          }
        }
      }
      if (updated) {
        readmeContent = lines.join('\n');
      }

      if (updated) {
        fs.outputFileSync(readmePath, lines.join('\n'));
        console.log(`✅ Updated ${path.basename(readmePath)} metrics`);
      }
    }
  }
}

main().catch(console.error);
