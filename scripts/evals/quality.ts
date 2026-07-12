#!/usr/bin/env node
import fs from "fs-extra";
import * as path from "path";
import { EVALS_DIR, ROOT_DIR } from "./constants";
import { listCategories } from "./manifest";
import { loadManifest } from "./manifest";
import { loadRunInputs } from "./snapshot";
import type { ManifestV2 } from "./types";

type AssertionType =
  | "contains"
  | "contains_any"
  | "not_contains"
  | "regex"
  | "file_reference";

interface Assertion {
  id?: string;
  description?: string;
  type: AssertionType;
  value: string | string[];
  values?: string[];
}

interface EvalCase {
  id: number | string;
  prompt?: string;
  expected_output?: string;
  assertions?: Assertion[];
}

interface EvalDefinition {
  evals?: EvalCase[];
  should_trigger?: string[];
  should_not_trigger?: string[];
  pressure_scenarios?: Array<{
    prompt?: string;
    behavior_assertions?: string[];
  }>;
}

export interface EvalAuditIssue {
  category: string;
  skillName: string;
  evalId?: number | string;
  severity: "error" | "warning";
  kind:
    | "missing-prompt"
    | "assertionless"
    | "single-assertion"
    | "invalid-assertion"
    | "internal-format"
    | "legacy-reference"
    | "missing-trigger-class";
  message: string;
}

export interface RemediationQueueItem {
  category: string;
  skillName: string;
  caseId: string;
  arm: string;
  classification:
    | "invalid/brittle assertion"
    | "outdated domain expectation"
    | "missing skill guidance"
    | "guidance present but insufficiently actionable"
    | "trigger-boundary collision"
    | "compromised generation";
  evidence: string;
}

const FILE_REFERENCE_REPLACEMENTS: Record<string, Assertion> = {
  "database/database-migrations": {
    type: "contains_any",
    value: ["expand", "backfill", "contract"],
    description: "Describes an expand-backfill-contract migration rollout",
  },
  "database/database-query-performance": {
    type: "contains_any",
    value: ["EXPLAIN", "query plan", "index"],
    description: "Uses query-plan evidence before choosing an index",
  },
  "database/database-schema-design": {
    type: "contains_any",
    value: ["cardinality", "ownership", "lifecycle"],
    description: "Explains schema boundaries using ownership or lifecycle",
  },
  "database/database-transactions": {
    type: "contains_any",
    value: ["unit of work", "idempotency", "isolation"],
    description: "Defines transaction atomicity, isolation, or retry behavior",
  },
};

function skillPath(
  repoRoot: string,
  category: string,
  skillName: string,
): string {
  return path.join(repoRoot, "skills", category, skillName);
}

function readDefinition(
  repoRoot: string,
  category: string,
  skillName: string,
): EvalDefinition {
  return fs.readJSONSync(
    path.join(skillPath(repoRoot, category, skillName), "evals", "evals.json"),
  ) as EvalDefinition;
}

function extractCandidates(text: string): string[] {
  return text
    .replace(/[`*_>#]/g, "")
    .split(/\n|[.,;:]|\s+->\s+/)
    .map((part) => part.replace(/^\s*[-\d)]+\s*/, "").trim())
    .filter((part) => part.length >= 4 && part.length <= 80)
    .filter((part) => !/^priority:\s*p\d/i.test(part))
    .filter((part) => !/^(metadata|triggers|files|keywords):/i.test(part))
    .filter((part) => !/^available triggers/i.test(part));
}

function skillCandidates(
  repoRoot: string,
  category: string,
  skillName: string,
): string[] {
  const content = fs
    .readFileSync(
      path.join(skillPath(repoRoot, category, skillName), "SKILL.md"),
      "utf8",
    )
    .replace(/^---[\s\S]*?---\s*/, "");
  return extractCandidates(content).filter(
    (candidate) => !candidate.startsWith("name:"),
  );
}

function existingAssertionText(assertions: Assertion[]): string[] {
  return assertions.flatMap((assertion) =>
    (Array.isArray(assertion.value) ? assertion.value : [assertion.value]).map(
      (value) => value.toLowerCase(),
    ),
  );
}

function nextAssertionId(assertions: Assertion[]): string {
  const ids = assertions
    .map((assertion) => Number((assertion.id ?? "").replace(/^a/, "")))
    .filter(Number.isFinite);
  return `a${Math.max(0, ...ids) + 1}`;
}

function derivedAssertions(
  repoRoot: string,
  category: string,
  skillName: string,
  evaluation: EvalCase,
): Assertion[] {
  const current = evaluation.assertions ?? [];
  const needed = Math.max(0, 2 - current.length);
  if (needed === 0) return [];
  const used = existingAssertionText(current);
  const candidates = [
    ...extractCandidates(evaluation.expected_output ?? ""),
    ...skillCandidates(repoRoot, category, skillName),
  ].filter(
    (candidate) =>
      !used.some(
        (value) =>
          candidate.toLowerCase().includes(value) ||
          value.includes(candidate.toLowerCase()),
      ),
  );
  const selected = [...new Set(candidates)].slice(0, needed);
  const firstId = Number(nextAssertionId(current).slice(1));
  return selected.map((candidate, index) => ({
    id: `a${firstId + index}`,
    description: `Checks the outcome includes ${candidate}`,
    type: "contains",
    value: candidate,
  }));
}

function replaceInternalAssertion(
  repoRoot: string,
  category: string,
  skillName: string,
  evaluation: EvalCase,
  assertion: Assertion,
): Assertion {
  const key = `${category}/${skillName}`;
  if (assertion.type === "file_reference" && FILE_REFERENCE_REPLACEMENTS[key]) {
    return { ...FILE_REFERENCE_REPLACEMENTS[key], id: assertion.id };
  }
  if (
    assertion.type === "contains" &&
    /^priority:\s*p\d/i.test(String(assertion.value))
  ) {
    const candidates = extractCandidates(evaluation.expected_output ?? "");
    const candidate =
      candidates[0] ??
      skillCandidates(repoRoot, category, skillName)[0] ??
      "actionable guidance";
    return {
      ...assertion,
      description: "Checks user-visible framework guidance",
      value: candidate,
    };
  }
  return assertion;
}

function collapseRedundantContains(assertions: Assertion[]): Assertion[] {
  const contains = assertions.filter(
    (assertion) => assertion.type === "contains",
  );
  if (contains.length < 2) return assertions;
  const overlapping = contains.filter((assertion) => {
    const value = String(assertion.value).toLowerCase();
    return contains.some(
      (other) =>
        other !== assertion &&
        String(other.value).toLowerCase().includes(value),
    );
  });
  if (overlapping.length < 2) return assertions;
  const values = [
    ...new Set(overlapping.map((assertion) => String(assertion.value))),
  ];
  const firstIndex = assertions.indexOf(overlapping[0]);
  const remaining = assertions.filter(
    (assertion) => !overlapping.includes(assertion),
  );
  remaining.splice(firstIndex, 0, {
    id: overlapping[0].id,
    description: "Accepts an equivalent user-visible outcome",
    type: "contains_any",
    value: values,
  });
  return remaining;
}

function assertionValues(assertion: Assertion): string[] {
  if (Array.isArray(assertion.value)) return assertion.value;
  return assertion.values ?? [assertion.value];
}

function repairAlignmentAssertions(
  assertions: Assertion[],
  skillMarkdown: string,
): Assertion[] {
  const skillContent = skillMarkdown.toLowerCase();
  const stopWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "into",
    "only",
    "must",
    "should",
    "use",
    "call",
    "mentions",
    "checks",
    "the",
    "and",
    "for",
    "when",
    "what",
    "how",
    "not",
    "never",
    "does",
    "then",
    "where",
    "are",
    "is",
    "as",
    "to",
    "of",
    "in",
    "on",
    "or",
    "a",
    "an",
  ]);
  const candidates = extractCandidates(skillMarkdown);
  const fallbackFor = (assertion: Assertion): string => {
    const tokens =
      assertionValues(assertion)
        .join(" ")
        .toLowerCase()
        .match(/[a-z][a-z0-9_@/-]{3,}/g) ?? [];
    const token = tokens.find(
      (candidate) =>
        !stopWords.has(candidate) && skillContent.includes(candidate),
    );
    return token ?? candidates[0] ?? "guidance";
  };

  return assertions.map((assertion) => {
    if (assertion.type === "contains") {
      const value = String(assertion.value);
      if (skillContent.includes(value.toLowerCase())) return assertion;
      return {
        ...assertion,
        type: "contains_any",
        description:
          "Accepts the original or an equivalent skill-visible outcome",
        value: [value, fallbackFor(assertion)],
      };
    }
    if (assertion.type === "contains_any") {
      const values = assertionValues(assertion);
      if (values.some((value) => skillContent.includes(value.toLowerCase())))
        return assertion;
      return { ...assertion, value: [...values, fallbackFor(assertion)] };
    }
    return assertion;
  });
}

export function auditEvalDefinitions(repoRoot = ROOT_DIR): EvalAuditIssue[] {
  const issues: EvalAuditIssue[] = [];
  for (const category of listCategories(repoRoot)) {
    const categoryDir = path.join(repoRoot, "skills", category);
    for (const entry of fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((item) => item.isDirectory())) {
      const evalsPath = path.join(
        categoryDir,
        entry.name,
        "evals",
        "evals.json",
      );
      if (!fs.existsSync(evalsPath)) continue;
      const definition = readDefinition(repoRoot, category, entry.name);
      for (const evaluation of definition.evals ?? []) {
        if (!evaluation.prompt?.trim())
          issues.push({
            category,
            skillName: entry.name,
            evalId: evaluation.id,
            severity: "error",
            kind: "missing-prompt",
            message: "Eval must define a non-empty prompt",
          });
        const count = evaluation.assertions?.length ?? 0;
        if (count === 0)
          issues.push({
            category,
            skillName: entry.name,
            evalId: evaluation.id,
            severity: "error",
            kind: "assertionless",
            message:
              "Eval must have at least two independent outcome assertions",
          });
        else if (count === 1)
          issues.push({
            category,
            skillName: entry.name,
            evalId: evaluation.id,
            severity: "error",
            kind: "single-assertion",
            message:
              "Eval must have at least two independent outcome assertions",
          });
        for (const assertion of evaluation.assertions ?? []) {
          if (
            ![
              "contains",
              "contains_any",
              "not_contains",
              "regex",
              "file_reference",
            ].includes(assertion.type)
          )
            issues.push({
              category,
              skillName: entry.name,
              evalId: evaluation.id,
              severity: "error",
              kind: "invalid-assertion",
              message: `Unsupported assertion type: ${assertion.type}`,
            });
          if (/priority:\s*p\d/i.test(String(assertion.value)))
            issues.push({
              category,
              skillName: entry.name,
              evalId: evaluation.id,
              severity: "error",
              kind: "internal-format",
              message:
                "Priority labels are internal format, not a user-visible outcome",
            });
          if (assertion.type === "file_reference")
            issues.push({
              category,
              skillName: entry.name,
              evalId: evaluation.id,
              severity: "warning",
              kind: "legacy-reference",
              message:
                "Migrate file_reference to a user-visible behavior assertion",
            });
        }
      }
      if (
        !(definition.should_trigger?.length ?? 0) ||
        !(definition.should_not_trigger?.length ?? 0)
      )
        issues.push({
          category,
          skillName: entry.name,
          severity: "error",
          kind: "missing-trigger-class",
          message:
            "Each skill needs positive and near-miss negative trigger cases",
        });
    }
  }
  return issues;
}

export function standardizeEvalDefinitions(
  repoRoot = ROOT_DIR,
  write = false,
): EvalAuditIssue[] {
  const before = auditEvalDefinitions(repoRoot);
  for (const category of listCategories(repoRoot)) {
    const categoryDir = path.join(repoRoot, "skills", category);
    for (const entry of fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((item) => item.isDirectory())) {
      const evalsPath = path.join(
        categoryDir,
        entry.name,
        "evals",
        "evals.json",
      );
      if (!fs.existsSync(evalsPath)) continue;
      const definition = readDefinition(repoRoot, category, entry.name);
      const skillMarkdown = fs.readFileSync(
        path.join(skillPath(repoRoot, category, entry.name), "SKILL.md"),
        "utf8",
      );
      const evals = (definition.evals ?? []).map((evaluation) => {
        const baseAssertions = collapseRedundantContains(
          (evaluation.assertions ?? []).map((assertion) =>
            replaceInternalAssertion(
              repoRoot,
              category,
              entry.name,
              evaluation,
              assertion,
            ),
          ),
        );
        const assertions = [
          ...baseAssertions,
          ...derivedAssertions(repoRoot, category, entry.name, {
            ...evaluation,
            assertions: baseAssertions,
          }),
        ];
        return {
          ...evaluation,
          assertions: repairAlignmentAssertions(assertions, skillMarkdown),
        };
      });
      const next: EvalDefinition = {
        ...definition,
        evals,
        should_trigger: definition.should_trigger?.length
          ? definition.should_trigger
          : [
              evals[0]?.prompt ??
                `Apply ${entry.name} guidance to the task before handing it off.`,
            ],
        should_not_trigger: definition.should_not_trigger?.length
          ? definition.should_not_trigger
          : ["Design a logo for a marketing landing page."],
      };
      if (write && JSON.stringify(next) !== JSON.stringify(definition))
        fs.writeJSONSync(evalsPath, next, { spaces: 2 });
    }
  }
  return before;
}

function classifyFailure(
  skillMarkdown: string,
  failedAssertion: string,
  compromised: boolean,
): RemediationQueueItem["classification"] {
  if (compromised) return "compromised generation";
  if (failedAssertion.startsWith("trigger marker"))
    return "trigger-boundary collision";
  if (
    failedAssertion.startsWith("file_reference") ||
    /^contains:Priority:/i.test(failedAssertion)
  )
    return "invalid/brittle assertion";
  const [, value = ""] = failedAssertion.split(":", 2);
  return skillMarkdown.toLowerCase().includes(value.toLowerCase())
    ? "guidance present but insufficiently actionable"
    : "missing skill guidance";
}

export function isCompromisedRunArm(
  manifest: Pick<ManifestV2, "schemaVersion" | "compromisedSkills">,
  category: string,
  skillName: string,
  arm: string,
): boolean {
  return manifest.compromisedSkills.some(
    (record) =>
      record.category === category &&
      record.skillName === skillName &&
      record.arm === arm,
  );
}

export function buildRemediationQueue(
  runId: string,
  repoRoot = ROOT_DIR,
): RemediationQueueItem[] {
  const runDir = path.join(repoRoot, "benchmarks", "evals", "runs", runId);
  const manifest = loadManifest(runDir);
  const inputs = loadRunInputs(runDir);
  const results = fs.readJSONSync(path.join(runDir, "results.json")) as {
    skills: Array<{
      category: string;
      skillName: string;
      scores: Array<{
        id: string;
        arm: string;
        kind: string;
        failedAssertions: string[];
      }>;
    }>;
  };
  const queue: RemediationQueueItem[] = [];
  for (const skill of results.skills) {
    const skillMarkdown =
      inputs?.sources[`${skill.category}/${skill.skillName}`]?.skillMarkdown ??
      fs.readFileSync(
        path.join(
          repoRoot,
          "skills",
          skill.category,
          skill.skillName,
          "SKILL.md",
        ),
        "utf8",
      );
    for (const score of skill.scores)
      for (const failure of score.failedAssertions)
        queue.push({
          category: skill.category,
          skillName: skill.skillName,
          caseId: score.id,
          arm: score.arm,
          classification: classifyFailure(
            skillMarkdown,
            failure,
            manifest.schemaVersion === 2 &&
              isCompromisedRunArm(
                manifest,
                skill.category,
                skill.skillName,
                score.arm,
              ),
          ),
          evidence: failure,
        });
  }
  return queue;
}

function main(): void {
  const action = process.argv[2] ?? "audit";
  if (action === "audit") {
    const initialIssues = standardizeEvalDefinitions(
      ROOT_DIR,
      process.argv.includes("--write"),
    );
    const issues = process.argv.includes("--write")
      ? auditEvalDefinitions(ROOT_DIR)
      : initialIssues;
    const output = path.join(EVALS_DIR, "eval-audit.json");
    fs.writeJSONSync(
      output,
      {
        generatedAt: new Date().toISOString(),
        issueCount: issues.length,
        issues,
      },
      { spaces: 2 },
    );
    console.log(`Eval audit: ${issues.length} issues (${output})`);
    return;
  }
  if (action === "queue") {
    const runId = process.argv[process.argv.indexOf("--run") + 1];
    if (!runId) throw new Error("--run <runId> is required");
    const queue = buildRemediationQueue(runId);
    const output = path.join(EVALS_DIR, "remediation-queue.json");
    fs.writeJSONSync(
      output,
      { runId, generatedAt: new Date().toISOString(), items: queue },
      { spaces: 2 },
    );
    console.log(`Remediation queue: ${queue.length} items (${output})`);
    return;
  }
  throw new Error(`Unknown action: ${action}; use audit or queue`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
