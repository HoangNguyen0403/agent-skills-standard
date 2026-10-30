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

export function parseThreshold(argv: string[] = process.argv): number {
  const idx = argv.indexOf("--threshold");
  return idx !== -1 ? parseInt(argv[idx + 1], 10) : 70;
}

const FORBIDDEN_ALIGNMENT_MARKER = "alignment tokens:";

export function stripHtmlComments(content: string): string {
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

export interface Assertion {
  type: string;
  value?: string | string[];
  values?: string[];
}
export interface Eval {
  id: number;
  prompt?: string;
  expected_output?: string;
  assertions: Assertion[];
}
export interface EvalsJson {
  skill_name: string;
  evals: Eval[];
}

export interface RegexSources {
  skillContent: string;
  prompt?: string;
  expectedOutput?: string;
}

export function isRegexAligned(
  pattern: string,
  sources: RegexSources,
): { matched: boolean; invalid?: boolean } {
  try {
    const re = new RegExp(pattern, "i");
    const matched =
      re.test(sources.skillContent) ||
      (typeof sources.prompt === "string" && re.test(sources.prompt)) ||
      (typeof sources.expectedOutput === "string" &&
        re.test(sources.expectedOutput));
    return { matched };
  } catch {
    return { matched: false, invalid: true };
  }
}

export interface SkillAlignmentResult {
  total: number;
  matched: number;
  percentage: number;
  misses: string[];
  warnings: string[];
}

export async function checkSkillAlignment(
  evalsPath: string,
  skillsDir?: string,
): Promise<SkillAlignmentResult | null> {
  const skillDir = path.dirname(path.dirname(evalsPath)); // evals/ -> skill root
  const effectiveSkillsDir = skillsDir ?? path.dirname(skillDir);
  const relativeSkillDir = path.relative(effectiveSkillsDir, skillDir);
  if (relativeSkillDir.startsWith(`specialists${path.sep}`)) return null;
  const skillFile = path.join(skillDir, "SKILL.md");

  const warnings: string[] = [];
  if (!(await fs.pathExists(skillFile))) {
    warnings.push(`${evalsPath}: no SKILL.md found alongside evals`);
    return {
      total: 0,
      matched: 0,
      percentage: 0,
      misses: [],
      warnings,
    };
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
          const { matched: isMatched, invalid } = isRegexAligned(
            String(assertion.value ?? ""),
            {
              skillContent: strippedContent,
              prompt: ev.prompt,
              expectedOutput: ev.expected_output,
            },
          );
          if (isMatched) {
            matched++;
          } else if (invalid) {
            misses.push(
              `eval ${ev.id}: regex /${assertion.value}/i (invalid pattern)`,
            );
          } else {
            misses.push(`eval ${ev.id}: regex /${assertion.value}/i`);
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
            `${path.relative(effectiveSkillsDir, skillDir)}: unknown assertion type "${assertion.type}" — skipped`,
          );
        }
      }
    }
  }

  if (total === 0) return null; // no recognized assertions — skip

  const pct = Math.round((matched / total) * 100);
  return {
    total,
    matched,
    percentage: pct,
    misses,
    warnings,
  };
}

async function main() {
  const skillsDir = path.join(__dirname, "../skills");
  const THRESHOLD = parseThreshold();

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
    const result = await checkSkillAlignment(evalsPath, skillsDir);
    if (!result) return;

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }

    if (result.total === 0) return;

    const skillDir = path.dirname(path.dirname(evalsPath));
    const label = path.relative(skillsDir, skillDir);

    if (result.percentage < THRESHOLD) {
      failures.push(
        `${label}: ${result.percentage}% alignment (${result.matched}/${result.total}) — misses: ${result.misses.join(", ")}`,
      );
    } else if (result.percentage < 90) {
      warnings.push(`${label}: ${result.percentage}% alignment (${result.matched}/${result.total})`);
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

export function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  const scriptPath = typeof __filename !== "undefined" ? __filename : "";
  if (!scriptPath) return false;
  try {
    const resolvedArgv = fs.realpathSync(process.argv[1]);
    const resolvedSelf = fs.realpathSync(scriptPath);
    return resolvedArgv === resolvedSelf;
  } catch {
    try {
      return path.resolve(process.argv[1]) === path.resolve(scriptPath);
    } catch {
      return false;
    }
  }
}

if (isDirectExecution()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
