// scripts/outcome/template.ts
import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { REQUIRED_TOP_LEVEL_KEYS } from "./schema";
import type { ValidationIssue } from "./schema";

const ROOT = path.join(__dirname, "..", "..");
export const WORKFLOWS_DIR = path.join(ROOT, ".agents", "workflows");

const OUTCOME_HEADING_RE = /^## Outcome Report[ \t]*\r?\n/m;

/**
 * Extracts the body of the `## Outcome Report` section.
 *
 * In these workflows the section lives *inside* the ```md fence of
 * `## Output Template`, and its body is bare `key: value` lines — not a
 * nested fenced block. The section therefore runs from the heading to the
 * next markdown heading or the closing fence of the enclosing template,
 * whichever comes first.
 */
export function extractOutcomeReportBlock(content: string): { body: string } | null {
  const headingMatch = OUTCOME_HEADING_RE.exec(content);
  if (!headingMatch) return null;

  const rest = content.slice(headingMatch.index + headingMatch[0].length);
  const lines = rest.split(/\r?\n/);
  const body: string[] = [];

  for (const line of lines) {
    if (/^#{1,6} /.test(line)) break;
    if (/^```/.test(line)) break;
    body.push(line);
  }

  const joined = body.join("\n").trim();
  return joined.length > 0 ? { body: joined } : null;
}

/**
 * Validates the `## Outcome Report` fenced YAML block of a single workflow
 * markdown file: the block must exist, parse as YAML, and declare every
 * required top-level key of the run-record schema. Template values may
 * legitimately be placeholders (unlike real run records) — only structure
 * is enforced here.
 */
export function validateOutcomeReportTemplate(workflow: string, content: string, relPath: string): ValidationIssue[] {
  const block = extractOutcomeReportBlock(content);
  if (!block) {
    return [
      {
        severity: "error",
        file: relPath,
        message: `${workflow}.md missing a fenced Outcome Report block after "## Outcome Report"`,
      },
    ];
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(block.body);
  } catch (error) {
    return [
      {
        severity: "error",
        file: relPath,
        message: `${workflow}.md Outcome Report block failed to parse as YAML: ${(error as Error).message}`,
      },
    ];
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [
      {
        severity: "error",
        file: relPath,
        message: `${workflow}.md Outcome Report block must parse to a YAML mapping`,
      },
    ];
  }

  const declaredKeys = new Set(Object.keys(parsed as Record<string, unknown>));
  const issues: ValidationIssue[] = [];
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!declaredKeys.has(key)) {
      issues.push({
        severity: "error",
        file: relPath,
        message: `${workflow}.md Outcome Report block missing required key "${key}"`,
      });
    }
  }
  return issues;
}

/**
 * Runs `validateOutcomeReportTemplate` for every workflow in
 * `CORE_SDLC_CHAIN`, reading each `.agents/workflows/<name>.md` file.
 * Workflows missing their markdown file surface as a single error issue
 * rather than throwing.
 */
export async function validateOutcomeReportTemplates(
  workflows: readonly string[],
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const workflow of workflows) {
    const file = path.join(WORKFLOWS_DIR, `${workflow}.md`);
    const relPath = path.relative(ROOT, file);
    if (!(await fs.pathExists(file))) {
      issues.push({ severity: "error", file: relPath, message: `${workflow}.md not found` });
      continue;
    }
    const content = await fs.readFile(file, "utf8");
    issues.push(...validateOutcomeReportTemplate(workflow, content, relPath));
  }
  return issues;
}
