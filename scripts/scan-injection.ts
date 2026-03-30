/**
 * CI Scanner: Detects prompt injection patterns in skill descriptions.
 *
 * Scans all SKILL.md frontmatter `description` fields in skills/.
 * Exits with code 1 if any injection pattern is found, failing the CI check.
 *
 * Usage: tsx scripts/scan-injection.ts
 */
import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import pc from 'picocolors';
import { INJECTION_PATTERNS } from '../cli/src/constants/security';

interface ScanResult {
  skill: string;
  pattern: string;
}

async function scanSkillFile(
  filePath: string,
  skillId: string,
): Promise<ScanResult[]> {
  const content = await fs.readFile(filePath, 'utf8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return [];

  const fm = yaml.load(frontmatterMatch[1]) as { description?: string } | null;
  const description = fm?.description ?? '';
  if (!description) return [];

  const findings: ScanResult[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(description)) {
      findings.push({ skill: skillId, pattern: pattern.toString() });
    }
    pattern.lastIndex = 0;
  }
  return findings;
}

async function scanDir(
  dir: string,
  baseSkillsDir: string,
): Promise<ScanResult[]> {
  const findings: ScanResult[] = [];
  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const nested = await scanDir(fullPath, baseSkillsDir);
      findings.push(...nested);
    } else if (item === 'SKILL.md') {
      const skillId = path.relative(baseSkillsDir, path.dirname(fullPath));
      const results = await scanSkillFile(fullPath, skillId);
      findings.push(...results);
    }
  }
  return findings;
}

async function main(): Promise<void> {
  const skillsDir = path.join(process.cwd(), 'skills');

  if (!(await fs.pathExists(skillsDir))) {
    console.error(pc.red(`Skills directory not found at ${skillsDir}`));
    process.exit(1);
  }

  console.log(
    pc.blue('🔍 Scanning skills/ for prompt injection patterns...\n'),
  );

  const findings = await scanDir(skillsDir, skillsDir);

  if (findings.length === 0) {
    console.log(
      pc.green('✅ No injection patterns detected in skill descriptions.'),
    );
    process.exit(0);
  }

  console.error(
    pc.red(`\n🚨 Found ${findings.length} prompt injection finding(s):\n`),
  );
  for (const finding of findings) {
    console.error(
      pc.red(`  - [${finding.skill}] matched pattern: ${finding.pattern}`),
    );
  }
  console.error(
    pc.yellow(
      '\nReview the skills above and remove or sanitize the flagged descriptions.',
    ),
  );
  process.exit(1);
}

void main();
