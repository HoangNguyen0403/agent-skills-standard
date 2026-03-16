import fs from 'fs-extra';
import * as path from 'path';
import { CHARS_PER_TOKEN } from './constants';

export function countTokens(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf-8');
  return Math.ceil(content.length / CHARS_PER_TOKEN);
}

export function costUSD(tokens: number, pricePerMillion: number): number {
  return (tokens / 1_000_000) * pricePerMillion;
}

export function scoreQuality(
  skillDir: string,
  skillMdPath: string,
): { score: number; detail: string[] } {
  const detail: string[] = [];
  let score = 0;
  const content = fs.existsSync(skillMdPath)
    ? fs.readFileSync(skillMdPath, 'utf-8')
    : '';

  const lines = content.split('\n').length;

  // 1. Actionable Constraints
  const bulletLines = (content.match(/^\s*[-*]\s+.+/gm) || []).length;
  if (bulletLines >= 3) {
    score += 2;
    detail.push('✅ Actionable constraints (≥ 3 bullets)');
  } else {
    detail.push('❌ Missing actionable constraints');
  }

  // 2. Explicit Anti-Patterns
  if (/##\s+.*Anti-Pattern/i.test(content) || /🚫.*Anti-Pattern/i.test(content)) {
    score += 2;
    detail.push('✅ Explicit Anti-Patterns section found');
  } else {
    detail.push('❌ Missing Anti-patterns section');
  }

  // 3. Context Architecture (Progressive Disclosure OR Extreme Density)
  const hasReferenceLinks = /\]\(references\/[^)]+\.md\)/i.test(content);
  if (hasReferenceLinks) {
    score += 2;
    detail.push('✅ Progressive Disclosure (links to references used)');
  } else if (lines <= 60) {
    score += 2;
    detail.push('✅ Efficiency Mastery (ultra-dense ≤ 60 lines)');
  } else {
    detail.push('❌ Bloat Risk (>60 lines with no references linked)');
  }

  // 4. Token Optimality
  if (lines <= 100) {
    score += 2;
    detail.push(`✅ Token optimal (${lines} lines)`);
  } else {
    detail.push(`❌ Too long (${lines} lines)`);
  }

  // 5. Inline Triggers (Optimized Metadata)
  const hasOptimizedTriggers = /description:.*\(triggers:.*?\)/i.test(content);
  if (hasOptimizedTriggers) {
    score += 2;
    detail.push('✅ Inline Triggers ((triggers: ...) found in description)');
  } else {
    detail.push('❌ Missing Inline Triggers in description');
  }

  return { score, detail };
}
