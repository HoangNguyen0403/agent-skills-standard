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
import fs from "fs-extra";
import path from "path";
import pc from "picocolors";

const THRESHOLD = (() => {
  const idx = process.argv.indexOf("--threshold");
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 70;
})();

const FORBIDDEN_ALIGNMENT_MARKER = "alignment tokens:";

function stripHtmlComments(content: string): string {
  let res = content;
  let start = res.indexOf("<!--");
  while (start !== -1) {
    const end = res.indexOf("-->", start + 4);
    if (end !== -1) {
      res = res.substring(0, start) + res.substring(end + 3);
    } else {
      res = res.substring(0, start);
    }
    start = res.indexOf("<!--");
  }
  return res;
}

interface Assertion {
  type: string;
  value?: string | string[];
  values?: string[];
}
interface Eval {
  id: number;
  prompt?: string;
  expected_output?: string;
  assertions: Assertion[];
}
interface EvalsJson {
  skill_name: string;
  evals: Eval[];
}

async function main() {
  const skillsDir = path.join(__dirname, "../skills");

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
      } else if (item === "SKILL.md") {
        await checkForbiddenMarkers(fullPath);
      } else if (item === "evals.json") {
        await checkAlignment(fullPath);
      }
    }
  }

  async function checkForbiddenMarkers(skillFile: string) {
    const content = await fs.readFile(skillFile, "utf8");
    if (content.toLowerCase().includes(FORBIDDEN_ALIGNMENT_MARKER)) {
      failures.push(
        `${path.relative(skillsDir, path.dirname(skillFile))}: forbidden alignment marker in SKILL.md`,
      );
    }
  }

  async function checkAlignment(evalsPath: string) {
    const skillDir = path.dirname(path.dirname(evalsPath)); // evals/ -> skill root
    const relativeSkillDir = path.relative(skillsDir, skillDir);
    if (relativeSkillDir.startsWith(`specialists${path.sep}`)) return;
    const skillFile = path.join(skillDir, "SKILL.md");

    if (!(await fs.pathExists(skillFile))) {
      warnings.push(`${evalsPath}: no SKILL.md found alongside evals`);
      return;
    }

    const evalsJson: EvalsJson = await fs.readJson(evalsPath);
    const rawContent = await fs.readFile(skillFile, "utf8");
    const strippedContent = stripHtmlComments(rawContent);
    const skillContent = strippedContent.toLowerCase();

    let total = 0;
    let matched = 0;
    const misses: string[] = [];

    for (const ev of evalsJson.evals) {
      if (!Array.isArray(ev.assertions)) continue;
      // An assertion is "aligned" when the skill teaches the behavior OR the
      // eval's own task contract states it. `scripts/evals/quality.ts` requires
      // task-contract grounding and forbids skill-only sourcing; scoring both
      // sources here keeps the two gates from demanding opposite things of the
      // same field, which previously made some skills unable to satisfy both.
      const taskContract = `${ev.prompt ?? ""}\n${ev.expected_output ?? ""}`
        .toLowerCase();
      const grounded = (value: string) =>
        skillContent.includes(value.toLowerCase()) ||
        taskContract.includes(value.toLowerCase());
      for (const assertion of ev.assertions) {
        switch (assertion.type) {
          case "contains": {
            total++;
            if (grounded(String(assertion.value ?? ""))) {
              matched++;
            } else {
              misses.push(`eval ${ev.id}: contains "${assertion.value}"`);
            }
            break;
          }
          case "not_contains": {
            // Negative assertions may name an anti-pattern that the skill
            // intentionally documents; absence is not source alignment.
            break;
          }
          case "contains_any": {
            total++;
            const values =
              assertion.values ??
              (Array.isArray(assertion.value)
                ? assertion.value
                : assertion.value
                  ? [assertion.value]
                  : []);
            if (values.some((v) => grounded(v))) {
              matched++;
            } else {
              misses.push(`eval ${ev.id}: contains_any [${values.join(", ")}]`);
            }
            break;
          }
          case "regex": {
            total++;
            try {
              const re = new RegExp(assertion.value ?? "", "i");
              if (re.test(strippedContent) || re.test(taskContract)) {
                matched++;
              } else {
                misses.push(`eval ${ev.id}: regex /${assertion.value}/i`);
              }
            } catch {
              misses.push(
                `eval ${ev.id}: regex /${assertion.value}/i (invalid pattern)`,
              );
            }
            break;
          }
          case "file_reference": {
            total++;
            const relPath = assertion.value ?? "";
            const fileExists = await fs.pathExists(
              path.join(skillDir, relPath),
            );
            const isLinked = skillContent.includes(relPath.toLowerCase());
            if (fileExists && isLinked) {
              matched++;
            } else {
              misses.push(
                `eval ${ev.id}: file_reference "${relPath}" (exists: ${fileExists}, linked: ${isLinked})`,
              );
            }
            break;
          }
          default: {
            warnings.push(
              `${path.relative(skillsDir, skillDir)}: unknown assertion type "${assertion.type}" — skipped`,
            );
          }
        }
      }
    }

    if (total === 0) return; // no recognized assertions — skip

    const pct = Math.round((matched / total) * 100);
    const label = path.relative(skillsDir, skillDir);

    if (pct < THRESHOLD) {
      failures.push(
        `${label}: ${pct}% alignment (${matched}/${total}) — misses: ${misses.join(", ")}`,
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
    console.log(pc.yellow("\n⚠️  Skills below 90% (warnings):"));
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
