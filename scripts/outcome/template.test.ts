// scripts/outcome/template.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_TOP_LEVEL_KEYS } from "./schema";
import { extractOutcomeReportBlock, validateOutcomeReportTemplate } from "./template";

// Mirrors the real workflow shape: `## Outcome Report` is a heading INSIDE the
// ```md fence of `## Output Template`, with bare `key: value` lines under it.
function markdownWithBlock(yamlBody: string): string {
  return [
    "# Some Workflow",
    "",
    "## Output Template",
    "```md",
    "# Feature Plan: [Name]",
    "## Verification Plan",
    "",
    "## Outcome Report",
    yamlBody,
    "",
    "## Next Workflow",
    "```",
  ].join("\n");
}

const VALID_TEMPLATE_YAML = REQUIRED_TOP_LEVEL_KEYS.map((key) => `${key}: <placeholder>`).join("\n");

test("extractOutcomeReportBlock returns the section body after the heading", () => {
  const block = extractOutcomeReportBlock(markdownWithBlock("feature_status: requirements_ready | blocked"));
  assert.match(block?.body ?? "", /feature_status: requirements_ready \| blocked/);
});

test("extractOutcomeReportBlock returns null when there is no Outcome Report heading", () => {
  const block = extractOutcomeReportBlock("# Workflow\n\nNo outcome section here.\n");
  assert.equal(block, null);
});

test("validateOutcomeReportTemplate passes when every required key is declared", () => {
  const issues = validateOutcomeReportTemplate(
    "plan-feature",
    markdownWithBlock(VALID_TEMPLATE_YAML),
    ".agents/workflows/plan-feature.md",
  );
  assert.deepEqual(issues, []);
});

test("validateOutcomeReportTemplate allows placeholder values (only structure is enforced)", () => {
  const issues = validateOutcomeReportTemplate(
    "plan-feature",
    markdownWithBlock(
      [
        "schema_version: 1",
        "run_id: <compactISO>-plan-feature",
        "slug: <slug>",
        "workflow: plan-feature",
        "feature_status: requirements_ready | blocked",
        "started_at: <iso8601>",
        "completed_at: <iso8601>",
        "requirement_trace: BRD-OBJ-* -> REQ-* -> AC-*",
        "completed_evidence: []",
        "missing_evidence: []",
        "decision_needed: []",
        "recommended_next_workflow: design-solution | implementation-readiness",
        "cost: unavailable",
        "agent: unavailable",
      ].join("\n"),
    ),
    ".agents/workflows/plan-feature.md",
  );
  assert.deepEqual(issues, []);
});

test("validateOutcomeReportTemplate fails when a required key is missing", () => {
  const yamlBody = REQUIRED_TOP_LEVEL_KEYS.filter((key) => key !== "cost")
    .map((key) => `${key}: <placeholder>`)
    .join("\n");
  const issues = validateOutcomeReportTemplate("plan-feature", markdownWithBlock(yamlBody), "plan-feature.md");
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /missing required key "cost"/);
  assert.equal(issues[0].severity, "error");
});

test("validateOutcomeReportTemplate fails loudly when the Outcome Report block is absent", () => {
  const issues = validateOutcomeReportTemplate("plan-feature", "# Workflow\n\nno block here\n", "plan-feature.md");
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /missing a fenced Outcome Report block/);
});

test("validateOutcomeReportTemplate fails when the fenced block is not valid YAML", () => {
  const issues = validateOutcomeReportTemplate(
    "plan-feature",
    markdownWithBlock("feature_status: [unterminated"),
    "plan-feature.md",
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /failed to parse as YAML/);
});
