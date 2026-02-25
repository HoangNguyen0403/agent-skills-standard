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
