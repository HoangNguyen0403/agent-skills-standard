/**
 * CI Scanner: Detects prompt injection patterns in skill content.
 *
 * - SKILL.md frontmatter `description`: always error-level (fails the build).
 * - SKILL.md body + references/*.md: warn-level by default; pass --strict to
 *   promote these to error-level too, once a corpus cleanup pass has landed.
 * - Pass --roots <dir1,dir2,...> to also scan CLI-emitted mirrors (e.g.
 *   .claude,.agents,.codex) alongside the skills/ source of truth.
 *
 * Usage: tsx scripts/scan-injection.ts [--strict] [--roots .claude,.agents]
 */
import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import pc from 'picocolors';
import { scanContent, type InjectionFinding } from '../cli/src/constants/security';

interface ScanResult extends InjectionFinding {
  skill: string;
  file: string;
}

function parseArgs(argv: string[]): { strict: boolean; roots: string[] } {
  const strict = argv.includes('--strict');
  const rootsIdx = argv.indexOf('--roots');
  const roots =
    rootsIdx !== -1 && argv[rootsIdx + 1]
      ? argv[rootsIdx + 1].split(',').map((r) => r.trim()).filter(Boolean)
      : [];
  return { strict, roots };
}

async function scanSkillFile(
  filePath: string,
  skillId: string,
): Promise<ScanResult[]> {
  const content = await fs.readFile(filePath, 'utf8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  const findings: ScanResult[] = [];

  if (frontmatterMatch) {
    const fm = yaml.load(frontmatterMatch[1]) as { description?: string } | null;
    const description = fm?.description ?? '';
    if (description) {
      for (const finding of scanContent(description, 'description')) {
        findings.push({ ...finding, skill: skillId, file: filePath });
      }
    }
  }

  const body = frontmatterMatch
    ? content.slice(frontmatterMatch[0].length)
    : content;
  for (const finding of scanContent(body, 'body')) {
    findings.push({ ...finding, skill: skillId, file: filePath });
  }

  return findings;
}

async function scanReferenceFile(
  filePath: string,
  skillId: string,
): Promise<ScanResult[]> {
  const content = await fs.readFile(filePath, 'utf8');
  return scanContent(content, 'body').map((finding) => ({
    ...finding,
    skill: skillId,
    file: filePath,
  }));
}

async function scanSkillDir(
  dir: string,
  baseSkillsDir: string,
): Promise<ScanResult[]> {
  const findings: ScanResult[] = [];
  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (item === 'references') {
        const refFiles = await fs.readdir(fullPath);
        const skillId = path.relative(baseSkillsDir, dir);
        for (const refFile of refFiles) {
          if (!refFile.endsWith('.md')) continue;
          const results = await scanReferenceFile(
            path.join(fullPath, refFile),
            skillId,
          );
          findings.push(...results);
        }
        continue;
      }
      // evals/ and scripts/ are not prose an agent reads as instructions —
      // skip them the same way the SkillSpector CI gate does.
      if (item === 'evals' || item === 'scripts') continue;

      const nested = await scanSkillDir(fullPath, baseSkillsDir);
      findings.push(...nested);
    } else if (item === 'SKILL.md') {
      const skillId = path.relative(baseSkillsDir, path.dirname(fullPath));
      const results = await scanSkillFile(fullPath, skillId);
      findings.push(...results);
    }
  }
  return findings;
}

async function scanRoot(root: string): Promise<ScanResult[]> {
  if (!(await fs.pathExists(root))) return [];
  return scanSkillDir(root, root);
}

async function main(): Promise<void> {
  const { strict, roots } = parseArgs(process.argv.slice(2));
  const skillsDir = path.join(process.cwd(), 'skills');

  if (!(await fs.pathExists(skillsDir))) {
    console.error(pc.red(`Skills directory not found at ${skillsDir}`));
    process.exit(1);
  }

  console.log(
    pc.blue('🔍 Scanning skills/ for prompt injection patterns...\n'),
  );

  let findings = await scanSkillDir(skillsDir, skillsDir);

  for (const root of roots) {
    console.log(pc.blue(`🔍 Scanning mirror ${root}/ ...`));
    findings = findings.concat(await scanRoot(path.join(process.cwd(), root)));
  }

  const errors = findings.filter(
    (f) => f.mode === 'description' || strict,
  );
  const warnings = findings.filter(
    (f) => f.mode === 'body' && !strict,
  );

  if (warnings.length > 0) {
    console.warn(
      pc.yellow(
        `\n⚠️  ${warnings.length} body-level finding(s) (warn-only; pass --strict to fail on these):\n`,
      ),
    );
    for (const finding of warnings) {
      console.warn(
        pc.yellow(`  - [${finding.skill}] ${finding.file} matched: ${finding.pattern}`),
      );
    }
  }

  if (errors.length === 0) {
    console.log(
      pc.green('\n✅ No error-level injection patterns detected.'),
    );
    process.exit(0);
  }

  console.error(
    pc.red(`\n🚨 Found ${errors.length} error-level injection finding(s):\n`),
  );
  for (const finding of errors) {
    console.error(
      pc.red(
        `  - [${finding.skill}] ${finding.file} (${finding.mode}) matched pattern: ${finding.pattern}`,
      ),
    );
  }
  console.error(
    pc.yellow(
      '\nReview the findings above and remove or sanitize the flagged content.',
    ),
  );
  process.exit(1);
}

void main();
