/**
 * Static eval-alignment gate.
 *
 * For every skill that has an evals/evals.json file, verify that each
 * "contains" assertion value is a substring of the skill's SKILL.md
 * content (case-insensitive).  Skills below the threshold fail the gate.
 *
 * Usage:
 *   pnpm check-alignment              # default threshold = 70
 *   pnpm check-alignment --threshold 80
 */
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

const THRESHOLD = (() => {
  const idx = process.argv.indexOf('--threshold');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 70;
})();

const FORBIDDEN_ALIGNMENT_MARKER = 'alignment tokens:';

function stripHtmlComments(content: string): string {
  let res = content;
  let start = res.indexOf('<!--');
  while (start !== -1) {
    const end = res.indexOf('-->', start + 4);
    if (end !== -1) {
      res = res.substring(0, start) + res.substring(end + 3);
    } else {
      res = res.substring(0, start);
    }
    start = res.indexOf('<!--');
  }
  return res;
}

interface Assertion {
  type: string;
  value: string;
}
interface Eval {
  id: number;
  assertions: Assertion[];
}
interface EvalsJson {
  skill_name: string;
  evals: Eval[];
}

async function main() {
  const skillsDir = path.join(__dirname, '../skills');

  if (!(await fs.pathExists(skillsDir))) {
    console.error(pc.red(`Skills directory not found at ${skillsDir}`));
    process.exit(1);
  }

  const failures: string[] = [];
  const warnings: string[] = [];

  async function scanDir(dir: string) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await scanDir(fullPath);
      } else if (item === 'SKILL.md') {
        await checkForbiddenMarkers(fullPath);
      } else if (item === 'evals.json') {
        await checkAlignment(fullPath);
      }
    }
  }

  async function checkForbiddenMarkers(skillFile: string) {
    const content = await fs.readFile(skillFile, 'utf8');
    if (content.toLowerCase().includes(FORBIDDEN_ALIGNMENT_MARKER)) {
      failures.push(
        `${path.relative(skillsDir, path.dirname(skillFile))}: forbidden alignment marker in SKILL.md`,
      );
    }
  }

  async function checkAlignment(evalsPath: string) {
    const skillDir = path.dirname(path.dirname(evalsPath)); // evals/ -> skill root
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (!(await fs.pathExists(skillFile))) {
      warnings.push(`${evalsPath}: no SKILL.md found alongside evals`);
      return;
    }

    const evalsJson: EvalsJson = await fs.readJson(evalsPath);
    const rawContent = await fs.readFile(skillFile, 'utf8');
    const skillContent = stripHtmlComments(rawContent).toLowerCase();

    let total = 0;
    let matched = 0;
    const misses: string[] = [];

    for (const ev of evalsJson.evals) {
      if (!Array.isArray(ev.assertions)) continue;
      for (const assertion of ev.assertions) {
        if (assertion.type === 'contains') {
          total++;
          if (skillContent.includes(assertion.value.toLowerCase())) {
            matched++;
          } else {
            misses.push(`eval ${ev.id}: "${assertion.value}"`);
          }
        }
      }
    }

    if (total === 0) return; // no contains assertions — skip

    const pct = Math.round((matched / total) * 100);
    const label = path.relative(skillsDir, skillDir);

    if (pct < THRESHOLD) {
      failures.push(
        `${label}: ${pct}% alignment (${matched}/${total}) — misses: ${misses.join(', ')}`,
      );
    } else if (pct < 90) {
      warnings.push(`${label}: ${pct}% alignment (${matched}/${total})`);
    }
  }

  console.log(
    pc.blue(`🔍 Checking eval alignment (threshold: ${THRESHOLD}%)…`),
  );
  await scanDir(skillsDir);

  if (warnings.length > 0) {
    console.log(pc.yellow('\n⚠️  Skills below 90% (warnings):'));
    warnings.forEach((w) => console.log(pc.yellow(`  • ${w}`)));
  }

  if (failures.length > 0) {
    console.log(
      pc.red(`\n❌ ${failures.length} skill(s) below ${THRESHOLD}% threshold:`),
    );
    failures.forEach((f) => console.log(pc.red(`  • ${f}`)));
    process.exit(1);
  }

  console.log(
    pc.green(`\n✅ All skills meet the ${THRESHOLD}% alignment threshold.`),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
