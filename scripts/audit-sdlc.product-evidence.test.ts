import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  OPTIONAL_PRODUCT_WORKFLOWS,
  auditOptionalWorkflow,
  validateOptionalWorkflowReachability,
} from "./audit-sdlc";

const WORKFLOWS_DIR = path.join(__dirname, "..", ".agents", "workflows");

async function readWorkflow(workflow: string): Promise<string> {
  const filePath = path.join(WORKFLOWS_DIR, `${workflow}.md`);
  return fs.readFile(filePath, "utf8");
}

test("auditOptionalWorkflow: accepts proper three canonical workflows", async () => {
  for (const workflow of OPTIONAL_PRODUCT_WORKFLOWS) {
    const content = await readWorkflow(workflow);
    const issues = auditOptionalWorkflow(workflow, content);
    assert.deepEqual(
      issues,
      [],
      `Expected ${workflow}.md to have 0 issues, got: ${issues.join("; ")}`,
    );
  }
});

test("auditOptionalWorkflow: rejects missing Goal section", async () => {
  const content = await readWorkflow("discover-product");
  const mutated = content.replace(/^Goal:.*$/m, "");
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) => issue.includes("missing Goal section")),
    "Should report missing Goal section",
  );
});

test("auditOptionalWorkflow: rejects missing required runtime sections", async () => {
  const content = await readWorkflow("discover-product");
  const withoutContract = content.replace("## Runtime Contract", "## Custom Contract");
  const issuesContract = auditOptionalWorkflow("discover-product", withoutContract);
  assert.ok(
    issuesContract.some((issue) => issue.includes("missing ## Runtime Contract")),
    "Should report missing Runtime Contract",
  );

  const withoutHandoff = content.replace("## Handoff Payload", "## Summary");
  const issuesHandoff = auditOptionalWorkflow("discover-product", withoutHandoff);
  assert.ok(
    issuesHandoff.some((issue) => issue.includes("missing ## Handoff Payload")),
    "Should report missing Handoff Payload",
  );

  const withoutBlocking = content.replace("## Blocking Questions", "## Clarifications");
  const issuesBlocking = auditOptionalWorkflow("discover-product", withoutBlocking);
  assert.ok(
    issuesBlocking.some((issue) => issue.includes("missing ## Blocking Questions")),
    "Should report missing Blocking Questions",
  );
});

test("auditOptionalWorkflow: rejects missing operator_profile in Handoff Payload", async () => {
  const content = await readWorkflow("discover-product");
  const withoutOperator = content.replace(/operator_profile,? ?/g, "");
  const issues = auditOptionalWorkflow("discover-product", withoutOperator);
  assert.ok(
    issues.some((issue) => issue.includes("missing operator_profile in Handoff Payload")),
    "Should report missing operator_profile in Handoff Payload",
  );
});

test("auditOptionalWorkflow: rejects missing or incorrect Cost Report call", async () => {
  const content = await readWorkflow("discover-product");
  const mutated = content.replace(
    'get_session_cost(workflow="discover-product")',
    "get_session_cost()",
  );
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) => issue.includes("Cost Report must call")),
    "Should report incorrect cost report call",
  );
});

test("auditOptionalWorkflow: rejects bad budget in validate-product", async () => {
  const content = await readWorkflow("validate-product");
  const mutated = content
    .replace(/budget_cap/g, "spend_estimate")
    .replace(/finite bounds/g, "unbounded")
    .replace(/exposure_cap/g, "open_exposure");
  const issues = auditOptionalWorkflow("validate-product", mutated);
  assert.ok(
    issues.some((issue) =>
      issue.includes("missing explicit finite bounds or budget_cap declaration"),
    ),
    "Should report bad or missing budget declaration",
  );
});

test("auditOptionalWorkflow: rejects missing host authorization gap boundary", async () => {
  const content = await readWorkflow("validate-product");
  const mutated = content
    .replace(/host-check-eligible/g, "auto-approved")
    .replace(/host approval/g, "implicit consent")
    .replace(/proposal_only/g, "autonomous_run")
    .replace(/proposal-only/g, "autonomous-run")
    .replace(/AUTHORIZATION_REQUIRED/g, "AUTHORIZED")
    .replace(/host authorization/g, "agent authority")
    .replace(/host check/g, "agent check")
    .replace(/host decision/g, "agent decision");
  const issues = auditOptionalWorkflow("validate-product", mutated);
  assert.ok(
    issues.some((issue) =>
      issue.includes("missing host authorization gap boundary"),
    ),
    "Should report missing host authorization boundary",
  );
});

test("auditOptionalWorkflow: rejects feature_status overwrite even when token is present", async () => {
  const content = await readWorkflow("discover-product");
  const invalidHandoffPayload = [
    "## Handoff Payload",
    "",
    "- `slug`, `operator_profile`, scope, strategy authority/gap, candidate `OPP` and `HYP` records, `SRC`/`CLM` evidence ledger, non-goals, capability gaps, proposed `DEC`, next workflow.",
    "- Outcome report: overwrite delivery `feature_status` to `blocked` whenever any product-evidence gap is detected.",
    "",
  ].join("\n");
  const mutated = content.replace(
    /## Handoff Payload[\s\S]*?(?=## Blocking Questions)/,
    invalidHandoffPayload,
  );
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) =>
      issue.includes("missing delivery feature_status preservation rule"),
    ),
    "Should report missing delivery feature_status preservation rule when overwritten",
  );
});

test("auditOptionalWorkflow: rejects corrupted Outcome Report block", async () => {
  const content = await readWorkflow("discover-product");
  const mutated = content.replace(
    /\{schema_version: 1,[\s\S]*?\}/,
    "{schema_version: 1, run_id: [unterminated",
  );
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) => issue.includes("failed to parse as YAML")),
    "Should report YAML parse failure for corrupted Outcome Report",
  );
});

test("auditOptionalWorkflow: rejects missing required key in Outcome Report block", async () => {
  const content = await readWorkflow("discover-product");
  const mutated = content.replace(/feature_status: requirements_ready,/, "");
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) => issue.includes('missing required key "feature_status"')),
    "Should report missing required key in Outcome Report block",
  );
});

test("auditOptionalWorkflow: rejects non-portable runtime content and docs links", async () => {
  const content = await readWorkflow("discover-product");
  const withLocalPath = content + "\nSee ../../skills/common/SKILL.md\n";
  const issuesLocal = auditOptionalWorkflow("discover-product", withLocalPath);
  assert.ok(
    issuesLocal.some((issue) => issue.includes("contains non-portable repo-local skills path")),
    "Should report non-portable path",
  );

  const withDocsLink = content + "\nSee [Guide](docs/getting-started.md)\n";
  const issuesDocs = auditOptionalWorkflow("discover-product", withDocsLink);
  assert.ok(
    issuesDocs.some((issue) => issue.includes("links to unsynced docs/ runtime material")),
    "Should report docs/ runtime link",
  );
});

test("auditOptionalWorkflow: rejects line count exceeding 80 lines", async () => {
  const content = await readWorkflow("discover-product");
  const padding = Array.from({ length: 40 }, (_, idx) => `<!-- line padding ${idx} -->`).join("\n");
  const mutated = content + "\n" + padding;
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) => issue.includes("exceeds 80 lines")),
    "Should report line budget violation",
  );
});

test("auditOptionalWorkflow: rejects unknown Next Workflow tokens", async () => {
  const content = await readWorkflow("discover-product");
  const mutated = content.replace("validate-product | plan-feature", "unknown-fantasy-workflow");
  const issues = auditOptionalWorkflow("discover-product", mutated);
  assert.ok(
    issues.some((issue) => issue.includes("Next Workflow references unknown workflow")),
    "Should report unknown next workflow token",
  );
});

test("validateOptionalWorkflowReachability: passes for real canonical workflows and real sdlc.md", async () => {
  const sdlcContent = await fs.readFile(
    path.join(WORKFLOWS_DIR, "sdlc.md"),
    "utf8",
  );
  const canonicalWorkflows = new Set([
    ...OPTIONAL_PRODUCT_WORKFLOWS,
    "sdlc",
    "brainstorm-feature",
    "plan-feature",
  ]);
  const issues = validateOptionalWorkflowReachability(
    canonicalWorkflows,
    sdlcContent,
    OPTIONAL_PRODUCT_WORKFLOWS,
  );
  assert.deepEqual(issues, []);
});

test("validateOptionalWorkflowReachability: rejects missing canonical optional workflow", async () => {
  const sdlcContent = await fs.readFile(
    path.join(WORKFLOWS_DIR, "sdlc.md"),
    "utf8",
  );
  const canonicalWithoutDiscover = new Set(["validate-product", "review-product-value"]);
  const issues = validateOptionalWorkflowReachability(
    canonicalWithoutDiscover,
    sdlcContent,
    OPTIONAL_PRODUCT_WORKFLOWS,
  );
  assert.ok(
    issues.some((issue) => issue.includes("Missing canonical optional workflow: discover-product")),
    "Should report missing canonical optional workflow",
  );
});

test("validateOptionalWorkflowReachability: rejects missing direct route despite name mentioned elsewhere", async () => {
  const sdlcContent = await fs.readFile(
    path.join(WORKFLOWS_DIR, "sdlc.md"),
    "utf8",
  );
  // Replace direct route arrow `-> `discover-product`` with non-route prose mentioning the name
  const mutatedSdlc = sdlcContent.replace(
    /->\s*`discover-product`/g,
    "see notes about `discover-product`",
  );
  const canonicalWorkflows = new Set([...OPTIONAL_PRODUCT_WORKFLOWS]);
  const issues = validateOptionalWorkflowReachability(
    canonicalWorkflows,
    mutatedSdlc,
    OPTIONAL_PRODUCT_WORKFLOWS,
  );
  assert.ok(
    issues.some((issue) =>
      issue.includes("sdlc.md router cannot reach optional workflow: discover-product"),
    ),
    "Should reject when direct arrow route is missing even if workflow name is mentioned elsewhere",
  );
});
