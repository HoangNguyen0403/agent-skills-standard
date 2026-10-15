// scripts/skill-tests/common-product-evidence/validate-product-evidence.test.mjs
// Comprehensive test suite for product-evidence-validator (SDLC contract t01-v2)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { validateProductEvidence as validateProductEvidenceRaw } from "../../../skills/common/common-product-evidence/scripts/validate-product-evidence.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALIDATOR_CLI = path.resolve(__dirname, "../../../skills/common/common-product-evidence/scripts/validate-product-evidence.mjs");
async function validateProductEvidence(ledger, options) {
  return validateProductEvidenceRaw(JSON.parse(JSON.stringify(ledger)), options);
}


function createTempRoot() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pe-val-test-"));
  return fs.realpathSync(tmpDir);
}

function cleanupTempRoot(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
function expectedEnvelope(gate, readiness, effectiveProductState, affectedDecisions = [], issues = []) {
  return {
    schema_version: 1,
    tool: "product-evidence-validator",
    valid: true,
    gate,
    readiness,
    effective_product_state: effectiveProductState,
    affected_decisions: affectedDecisions,
    issues,
    limitations: [
      "source_truth_not_verified",
      "human_authorization_not_authenticated",
      "historical_payloads_not_authenticated",
    ],
  };
}
function createResidualClosureFixture() {
  const root = createTempRoot();
  const scope = { segment: "fictional-isolated", geography: "no-people", window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" } };
  const freshness = { status: "current", rationale: "Synthetic closure regression only", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["fixture changes"] };
  const artifactBytes = "Synthetic plan and exception proof only; no authorization or real-world evidence.\n";
  fs.writeFileSync(path.join(root, "fixture-proof.md"), artifactBytes);
  const artifact = { path: "fixture-proof.md", sha256: sha256(artifactBytes) };
  const authority = (id) => ({
    id, domain: "authorization",
    locator: { kind: "external", uri: `urn:fictional:${id}`, snapshot_sha256: artifact.sha256 },
    revision: "fictional-approval-r1", owner: "Synthetic fixture authority", scope,
    declared_ids: [], access: "available",
  });
  const planAuthority = authority("AUTH-701");
  const exceptionAuthority = authority("AUTH-702");
  const unrelatedAuthority = authority("AUTH-703");
  const source = {
    id: "SRC-701", kind: "SRC", revision: "r1", owner: "Synthetic fixture source", scope, depends_on: [], freshness,
    data: {
      locator: { kind: "external", uri: "urn:fictional:query", snapshot_sha256: null },
      origin: { publisher: "Synthetic publisher", origin_id: "urn:fictional:origin", classification: "primary", revision: "publisher/revision:2026-10", observed_at: "2026-10-01T00:00:00Z", scope },
      retrieved_at: "2026-10-10T00:00:00Z",
      privacy: { classification: "public", redaction: "none", access: "available" },
      license: { identifier: "unknown", usage: "unresolved", restrictions: [] },
      status: "available", limitations: ["Synthetic only"],
    },
  };
  const metric = {
    id: "MET-701", kind: "MET", revision: "r1", owner: "Synthetic fixture owner", scope,
    depends_on: [{ id: "SRC-701", revision: "r1" }], freshness,
    data: {
      definition: "Synthetic wait", unit: "ms", denominator: "fixture rows",
      query: { id: "SRC-701", revision: "r1" }, query_revision: "publisher/revision:2026-10",
      baseline: null, baseline_exception: { id: "DEC-702", revision: "r1" },
      comparison_window: scope.window, eligibility: "Synthetic only", target: "No product target",
      guardrail: "No action", measurement_owner: "Synthetic", review_trigger: "Fixture changes", status: "instrumented",
    },
  };
  const opportunity = {
    id: "OPP-701", kind: "OPP", revision: "r1", owner: "Synthetic fixture owner", scope, depends_on: [], freshness,
    data: { problem: "Synthetic wait", customer_job: "Synthetic request", claims: [], substitutes: ["unknown"], alternatives: ["defer"], status: "selected", rationale: "Synthetic only" },
  };
  const hypothesis = (revision) => ({
    id: "HYP-701", kind: "HYP", revision, owner: "Synthetic fixture owner", scope,
    depends_on: [{ id: "OPP-701", revision: "r1" }, { id: "MET-701", revision: "r1" }], freshness,
    data: {
      opportunity: { id: "OPP-701", revision: "r1" }, prediction: "Synthetic prediction",
      mechanism: "Synthetic mechanism", claims: [], primary_metric: { id: "MET-701", revision: "r1" },
      disconfirmation: "No change", status: "testing",
    },
  });
  const oldHypothesis = hypothesis("h1");
  const currentHypothesis = hypothesis("h2");
  const proposal = {
    id: "EXP-701", kind: "EXP", revision: "plan1", owner: "Synthetic fixture owner", scope,
    depends_on: [{ id: "HYP-701", revision: "h1" }, { id: "MET-701", revision: "r1" }], freshness,
    data: {
      hypothesis: { id: "HYP-701", revision: "h1" }, method: "Synthetic bounded test",
      eligibility: "Fixture only", sample_plan: "One synthetic case",
      primary_metric: { id: "MET-701", revision: "r1" }, guardrails: [{ id: "MET-701", revision: "r1" }],
      rules: { success: "Target met", failure: "Target missed", inconclusive: "Missing fixture" },
      bounds: { starts_at: "2026-10-02T00:00:00Z", ends_at: "2026-10-09T00:00:00Z", budget_cap: "0", currency: "USD", exposure_cap: 0, stop_rules: ["Never perform an action"] },
      authorization: null, status: "proposed", result: null,
    },
  };
  const experiment = {
    ...proposal, revision: "exec2",
    depends_on: [{ id: "HYP-701", revision: "h2" }, { id: "MET-701", revision: "r1" }],
    data: { ...proposal.data, hypothesis: { id: "HYP-701", revision: "h2" }, authorization: { id: "DEC-701", revision: "r1" }, status: "authorized" },
  };
  const decision = (id, purpose, outcome, consumes, decisionAuthority) => ({
    id, kind: "DEC", revision: "r1", owner: "Synthetic fixture author", scope, depends_on: consumes, freshness,
    data: {
      purpose, status: "recorded", outcome, consumes, critical_claims: [],
      authority_id: decisionAuthority.id, authority_revision: decisionAuthority.revision, strategy_binding: null,
      artifact_bindings: [artifact], decided_at: "2026-10-02T00:00:00Z",
      rationale: "Synthetic predicate fixture only", uncertainties: ["No real consent or observation"],
      revisit_triggers: ["Fixture changes"], supersedes: null,
    },
  });
  const planDecision = decision("DEC-701", "experiment", "authorize", [
    { id: "EXP-701", revision: "plan1" },
  ], planAuthority);
  const exceptionDecision = decision("DEC-702", "release", "risk_accept", [
    { id: "MET-701", revision: "r1" },
  ], exceptionAuthority);
  const unrelatedDecision = decision("DEC-703", "learning", "authorize", [], unrelatedAuthority);
  const ledger = {
    schema_version: 1, slug: "rr-final-fictional", product_id: "fictional-no-action",
    revision: "r1", synthetic: false, updated_at: "2026-10-10T00:00:00Z",
    strategy_authority: null, strategy_gap: "Synthetic isolated test only",
    authorities: [planAuthority, exceptionAuthority, unrelatedAuthority], authority_history: [],
    records: [planDecision, exceptionDecision, source, metric, opportunity, currentHypothesis, experiment, unrelatedDecision],
    record_history: [oldHypothesis, proposal], bridges: [],
    product_state: {
      value: "validating", reason: "Synthetic compatible plan state", scope,
      hypotheses: [{ id: "HYP-701", revision: "h2" }], decision: { id: "DEC-701", revision: "r1" },
      assessed_at: "2026-10-10T00:00:00Z",
      history: [{ from: "unvalidated", to: "validating", at: "2026-10-03T00:00:00Z", reason: "Synthetic plan", decision: { id: "DEC-701", revision: "r1" } }],
    },
  };
  return { root, ledgerPath: path.join(root, "evidence.json"), ledger, artifactBytes };
}

async function assertResidualCli(ledger, ledgerPath, root, gate, expected, exit) {
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  const api = await validateProductEvidence(ledger, { authorityRoot: root, ledgerPath, asOf: "2026-10-10T00:00:00Z", gate });
  assert.deepEqual(api, expected);
  const run = spawnSync(process.execPath, [
    VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", "2026-10-10T00:00:00Z", "--gate", gate,
  ], { encoding: "utf8" });
  assert.equal(run.status, exit, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, `${JSON.stringify(expected, null, 2)}\n`);
}

function invalidStructuralEnvelope(pathname, recordId, message) {
  return {
    schema_version: 1, tool: "product-evidence-validator", valid: false,
    gate: "structural", readiness: "blocked", effective_product_state: null, affected_decisions: [],
    issues: [{ code: "INVALID_FIELD", severity: "error", path: pathname, record_id: recordId, message }],
    limitations: ["source_truth_not_verified", "human_authorization_not_authenticated", "historical_payloads_not_authenticated"],
  };
}

test("1. Direct API: Minimal synthetic intake ledger", async () => {
  const root = createTempRoot();
  try {
    const ledger = {
      schema_version: 1,
      slug: "synthetic-intake",
      product_id: "synthetic-product",
      revision: "r1",
      synthetic: true,
      updated_at: "2026-10-11T10:00:00Z",
      strategy_authority: null,
      strategy_gap: "Synthetic intake has no approved strategy",
      authorities: [],
      authority_history: [],
      records: [],
      record_history: [],
      bridges: [],
      product_state: {
        value: "unvalidated",
        reason: "No research or approval supplied",
        scope: {
          segment: "synthetic cohort",
          geography: "test-only",
          window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        },
        hypotheses: [],
        decision: null,
        assessed_at: "2026-10-11T10:00:00Z",
        history: [],
      },
    };

    const ledgerPath = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

    const res = await validateProductEvidence(ledger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });

    assert.equal(res.valid, true);
    assert.equal(res.gate, "structural");
    assert.equal(res.readiness, "not_assessed");
    assert.equal(res.effective_product_state, "unvalidated");
    assert.deepEqual(res.affected_decisions, []);
    assert.equal(res.issues.length, 0);

    // Commit gate should be rejected for synthetic intake
    const commitRes = await validateProductEvidence(ledger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "commit",
    });

    assert.equal(commitRes.valid, true);
    assert.equal(commitRes.readiness, "blocked");
    assert.ok(commitRes.issues.some((i) => i.code === "SYNTHETIC_EVIDENCE" && i.severity === "gap"));
  } finally {
    cleanupTempRoot(root);
  }
});

test("2. Authority declarations & real normalized BRD fixture (F3, Section 7.3)", async () => {
  const root = createTempRoot();
  try {
    const brdTablePath = path.join(__dirname, "fixtures/authorities/brd-product-evidence-table.md");
    const brdRefPath = path.join(__dirname, "fixtures/authorities/brd-reference-only.md");

    const brdTableContent = fs.readFileSync(brdTablePath, "utf8");
    const brdTableHash = sha256(brdTableContent);

    const docsBrdDir = path.join(root, "docs/brd");
    fs.mkdirSync(docsBrdDir, { recursive: true });
    fs.writeFileSync(path.join(docsBrdDir, "brd.md"), brdTableContent);

    const auth = {
      id: "AUTH-001",
      domain: "business",
      locator: { kind: "local", path: "docs/brd/brd.md", sha256: brdTableHash },
      revision: `sha256:${brdTableHash}`,
      owner: "Product Owner",
      scope: {
        segment: "pilot",
        geography: "test",
        window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
      },
      declared_ids: ["BRD-OBJ-001", "BRD-OBJ-002", "BRD-OBJ-003"],
      access: "available",
    };

    const ledger = {
      schema_version: 1,
      slug: "brd-test",
      product_id: "brd-product",
      revision: "r1",
      synthetic: false,
      updated_at: "2026-10-11T10:00:00Z",
      strategy_authority: null,
      strategy_gap: "Strategy gap noted",
      authorities: [auth],
      authority_history: [],
      records: [],
      record_history: [],
      bridges: [],
      product_state: {
        value: "unvalidated",
        reason: "Initial intake",
        scope: auth.scope,
        hypotheses: [],
        decision: null,
        assessed_at: "2026-10-11T10:00:00Z",
        history: [],
      },
    };

    const ledgerPath = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

    const res = await validateProductEvidence(ledger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });

    assert.equal(res.valid, true, JSON.stringify(res.issues));
    assert.equal(res.issues.length, 0);

    // Negative case A: claiming undeclared BRD-OBJ-999
    ledger.authorities[0].declared_ids.push("BRD-OBJ-999");
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    const badDeclaredRes = await validateProductEvidence(ledger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });
    assert.equal(badDeclaredRes.valid, false);
    assert.ok(badDeclaredRes.issues.some((i) => i.code === "BRIDGE_DECLARATION"));

    // Negative case B: pointing to reference-only table
    const brdRefContent = fs.readFileSync(brdRefPath, "utf8");
    fs.writeFileSync(path.join(docsBrdDir, "brd.md"), brdRefContent);
    const refHash = sha256(brdRefContent);
    ledger.authorities[0].locator.sha256 = refHash;
    ledger.authorities[0].revision = `sha256:${refHash}`;
    ledger.authorities[0].declared_ids = ["BRD-OBJ-001", "BRD-OBJ-002", "BRD-OBJ-003"];

    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    const refOnlyRes = await validateProductEvidence(ledger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });
    assert.equal(refOnlyRes.valid, false);
    assert.ok(refOnlyRes.issues.some((i) => i.code === "BRIDGE_DECLARATION"));
  } finally {
    cleanupTempRoot(root);
  }
});

test("3. Complete Nine-Kind Structural Example", async () => {
  const root = createTempRoot();
  try {
    const brdPath = path.join(root, "docs/brd/brd-synthetic-nine.md");
    fs.mkdirSync(path.dirname(brdPath), { recursive: true });
    const brdContent = "# BRD-OBJ-001: Synthetic objective\n";
    fs.writeFileSync(brdPath, brdContent);
    const brdHash = sha256(brdContent);
    assert.equal(brdHash, "8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf");

    const exampleRaw = fs.readFileSync(
      path.resolve(__dirname, "../../../skills/common/common-product-evidence/references/examples.md"),
      "utf8"
    );
    const jsonMatch = exampleRaw.match(/```json\s*\n([\s\S]*?)\n```/g);
    const nineKindJson = JSON.parse(jsonMatch[1].replace(/```json\s*\n|```/g, ""));

    const ledgerPath = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerPath, JSON.stringify(nineKindJson, null, 2));

    const res = await validateProductEvidence(nineKindJson, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });

    assert.equal(res.valid, true);
    assert.equal(res.readiness, "not_assessed");
  } finally {
    cleanupTempRoot(root);
  }
});

test("4. Exact History Timeline (F1, Section 7.1)", async () => {
  const root = createTempRoot();
  try {
    const scope = {
      segment: "enterprise",
      geography: "global",
      window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
    };

    const planFile = path.join(root, "plan.md");
    fs.writeFileSync(planFile, "Approved plan v1\n");
    const planHash = sha256(fs.readFileSync(planFile));

    const approvalFile = path.join(root, "approval.md");
    fs.writeFileSync(approvalFile, "Investment approval v1\n");
    const approvalHash = sha256(fs.readFileSync(approvalFile));

    const approval010File = path.join(root, "approval010.md");
    fs.writeFileSync(approval010File, "Investment approval 010 v1\n");
    const approval010Hash = sha256(fs.readFileSync(approval010File));

    const brdFile = path.join(root, "docs/brd/brd.md");
    fs.mkdirSync(path.dirname(brdFile), { recursive: true });
    fs.writeFileSync(brdFile, "# BRD-OBJ-001\n");
    const brdHash = sha256(fs.readFileSync(brdFile));

    const strategyFile = path.join(root, "strategy.md");
    fs.writeFileSync(strategyFile, "Strategy 2026\n");
    const stratHash = sha256(fs.readFileSync(strategyFile));

    const authStrat = {
      id: "AUTH-000",
      domain: "strategy",
      locator: { kind: "local", path: "strategy.md", sha256: stratHash },
      revision: `sha256:${stratHash}`,
      owner: "VP Strategy",
      scope,
      declared_ids: [],
      access: "available",
    };

    const authBrd = {
      id: "AUTH-001",
      domain: "business",
      locator: { kind: "local", path: "docs/brd/brd.md", sha256: brdHash },
      revision: `sha256:${brdHash}`,
      owner: "PO",
      scope,
      declared_ids: ["BRD-OBJ-001"],
      access: "available",
    };
    const authApproval = {
      id: "AUTH-002",
      domain: "authorization",
      locator: { kind: "external", uri: "urn:authorization:executive", snapshot_sha256: sha256("synthetic executive authority") },
      revision: "exec-r1",
      owner: "Authorized fixture authority",
      scope,
      declared_ids: [],
      access: "available",
    };

    function makeSrc(id, rev) {
      return {
        id,
        kind: "SRC",
        revision: rev,
        owner: "Researcher",
        scope,
        depends_on: [],
        freshness: {
          status: "current",
          rationale: "Validated primary",
          reviewed_at: "2026-10-10T10:00:00Z",
          expires_at: "2026-11-01T00:00:00Z",
          review_triggers: ["source updated"],
        },
        data: {
          locator: { kind: "external", uri: `urn:research:${id}:${rev}`, snapshot_sha256: null },
          origin: { publisher: "Lab", origin_id: `urn:orig:${id}`, classification: "primary", revision: rev, observed_at: "2026-10-09T00:00:00Z", scope },
          retrieved_at: "2026-10-10T00:00:00Z",
          privacy: { classification: "public", redaction: "none", access: "available" },
          license: { identifier: "CC-BY", usage: "reuse_permitted", restrictions: [] },
          status: "available",
          limitations: [],
        },
      };
    }

    const src1 = makeSrc("SRC-001", "r1");

    const clm1 = {
      id: "CLM-001",
      kind: "CLM",
      revision: "r1",
      owner: "PO",
      scope,
      depends_on: [{ id: "SRC-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Supported",
        reviewed_at: "2026-10-10T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["evidence changes"],
      },
      data: {
        statement: "Customer task time drops by 50%",
        classification: "confirmed",
        sources: [{ id: "SRC-001", revision: "r1" }],
        counterevidence: [],
        rationale: "Direct observation",
        uncertainty: "Minimal",
        status: "supported",
        critical: true,
      },
    };

    const opp1 = {
      id: "OPP-001",
      kind: "OPP",
      revision: "r1",
      owner: "PO",
      scope,
      depends_on: [{ id: "CLM-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Current",
        reviewed_at: "2026-10-10T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["market changes"],
      },
      data: {
        problem: "Slow checkout",
        customer_job: "Complete purchase",
        claims: [{ id: "CLM-001", revision: "r1" }],
        substitutes: ["manual phone call"],
        alternatives: ["automated checkout"],
        status: "selected",
        rationale: "Highest impact",
      },
    };

    const met1 = {
      id: "MET-001",
      kind: "MET",
      revision: "r1",
      owner: "Analytics",
      scope,
      depends_on: [],
      freshness: {
        status: "current",
        rationale: "Instrumented",
        reviewed_at: "2026-10-10T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["tracking changes"],
      },
      data: {
        definition: "Checkout duration",
        unit: "seconds",
        denominator: "completed transaction",
        query: { id: "SRC-001", revision: "r1" },
        query_revision: "r1",
        baseline: {
          value: "120.0",
          source: { id: "SRC-001", revision: "r1" },
          window: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
        },
        baseline_exception: null,
        comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "All users",
        target: "60.0",
        guardrail: "Error rate < 1%",
        measurement_owner: "Analytics",
        review_trigger: "End of month",
        status: "observed",
      },
    };

    const hyp1_r1 = {
      id: "HYP-001",
      kind: "HYP",
      revision: "r1",
      owner: "PO",
      scope,
      depends_on: [{ id: "OPP-001", revision: "r1" }, { id: "CLM-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Tested and supported",
        reviewed_at: "2026-10-10T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["experiment complete"],
      },
      data: {
        opportunity: { id: "OPP-001", revision: "r1" },
        prediction: "Checkout duration drops under 60s",
        mechanism: "One-click payments",
        claims: [{ id: "CLM-001", revision: "r1" }],
        primary_metric: { id: "MET-001", revision: "r1" },
        disconfirmation: "Duration remains >= 120s",
        status: "supported",
      },
    };

    const hyp1_plan1 = {
      ...hyp1_r1,
      revision: "plan1",
      freshness: { ...hyp1_r1.freshness },
      data: { ...hyp1_r1.data, status: "testing" },
    };

    const exp1_r1 = {
      id: "EXP-001",
      kind: "EXP",
      revision: "r1",
      owner: "PO",
      scope,
      depends_on: [{ id: "HYP-001", revision: "r1" }, { id: "MET-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Completed trial",
        reviewed_at: "2026-10-10T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["experiment results"],
      },
      data: {
        hypothesis: { id: "HYP-001", revision: "r1" },
        method: "A/B test",
        eligibility: "Beta users",
        sample_plan: "1000 users",
        primary_metric: { id: "MET-001", revision: "r1" },
        guardrails: [{ id: "MET-001", revision: "r1" }],
        rules: { success: "Time < 60s", failure: "Time >= 120s", inconclusive: "High variance" },
        bounds: {
          starts_at: "2026-10-02T00:00:00Z",
          ends_at: "2026-10-09T00:00:00Z",
          budget_cap: "5000.00",
          currency: "USD",
          exposure_cap: 1000,
          stop_rules: ["Error rate > 2%"],
        },
        authorization: { id: "DEC-003", revision: "r1" },
        status: "completed",
        result: {
          classification: "supported",
          sources: [{ id: "SRC-001", revision: "r1" }],
          limitations: [],
        },
      },
    };

    const exp1_plan1 = {
      ...exp1_r1,
      revision: "plan1",
      depends_on: [{ id: "HYP-001", revision: "r1" }, { id: "MET-001", revision: "r1" }],
      freshness: { ...exp1_r1.freshness },
      data: {
        ...exp1_r1.data,
        hypothesis: { id: "HYP-001", revision: "r1" },
        status: "proposed",
        authorization: null,
        result: null,
      },
    };

    const inv1 = {
      id: "INV-001",
      kind: "INV",
      revision: "r1",
      owner: "Finance",
      scope,
      depends_on: [{ id: "CLM-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Reviewed",
        reviewed_at: "2026-10-10T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["cost model update"],
      },
      data: {
        alternatives: [{ name: "build", rationale: "High ROI" }, { name: "defer", rationale: "Loss of market" }],
        claims: [{ id: "CLM-001", revision: "r1" }],
        financial_input: null,
        financial_result: null,
        nonmonetary: ["Improves customer satisfaction"],
        status: "reviewed",
        accounting_rationale: "Positive qualitative value",
      },
    };

    const dec003 = {
      id: "DEC-003",
      kind: "DEC",
      revision: "r1",
      owner: "Product Director",
      scope,
      depends_on: [{ id: "EXP-001", revision: "plan1" }, { id: "CLM-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Authorized",
        reviewed_at: "2026-10-01T10:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["plan change"],
      },
      data: {
        purpose: "experiment",
        status: "recorded",
        outcome: "authorize",
        consumes: [{ id: "EXP-001", revision: "plan1" }],
        critical_claims: [{ id: "CLM-001", revision: "r1" }],
        authority_id: "AUTH-002",
        authority_revision: "exec-r1",
        strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }],
        decided_at: "2026-10-01T10:00:00Z",
        rationale: "Authorize checkout A/B test",
        uncertainties: ["User adoption"],
        revisit_triggers: ["test completed"],
        supersedes: null,
      },
    };

    const dec001 = {
      id: "DEC-001",
      kind: "DEC",
      revision: "r1",
      owner: "Executive Committee",
      scope,
      depends_on: [{ id: "INV-001", revision: "r1" }, { id: "OPP-001", revision: "r1" }, { id: "HYP-001", revision: "r1" }, { id: "EXP-001", revision: "r1" }, { id: "CLM-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Approved",
        reviewed_at: "2026-10-10T12:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["quarterly review"],
      },
      data: {
        purpose: "investment",
        status: "recorded",
        outcome: "authorize",
        consumes: [
          { id: "INV-001", revision: "r1" },
          { id: "OPP-001", revision: "r1" },
          { id: "HYP-001", revision: "r1" },
          { id: "EXP-001", revision: "r1" },
        ],
        critical_claims: [{ id: "CLM-001", revision: "r1" }],
        authority_id: "AUTH-002",
        authority_revision: "exec-r1",
        strategy_binding: { authority_id: "AUTH-000", revision: `sha256:${stratHash}` },
        artifact_bindings: [{ path: "approval.md", sha256: approvalHash }],
        decided_at: "2026-10-10T12:00:00Z",
        rationale: "Commit full build based on completed experiment",
        uncertainties: [],
        revisit_triggers: ["market changes"],
        supersedes: null,
      },
    };

    // Full independent 010 chain (HYP-010, EXP-010, INV-010, DEC-010, helper DEC-013)
    const src010 = makeSrc("SRC-010", "r1");
    const clm010 = {
      ...clm1,
      id: "CLM-010",
      depends_on: [{ id: "SRC-010", revision: "r1" }],
      data: { ...clm1.data, sources: [{ id: "SRC-010", revision: "r1" }] },
    };
    const opp010 = {
      ...opp1,
      id: "OPP-010",
      depends_on: [{ id: "CLM-010", revision: "r1" }],
      data: { ...opp1.data, claims: [{ id: "CLM-010", revision: "r1" }] },
    };
    const met010 = {
      ...met1,
      id: "MET-010",
      depends_on: [{ id: "SRC-010", revision: "r1" }],
      data: {
        ...met1.data,
        query: { id: "SRC-010", revision: "r1" },
        baseline: { value: "100.0", source: { id: "SRC-010", revision: "r1" }, window: met1.data.baseline.window },
      },
    };
    const hyp010 = {
      ...hyp1_r1,
      id: "HYP-010",
      depends_on: [{ id: "OPP-010", revision: "r1" }, { id: "CLM-010", revision: "r1" }],
      data: {
        ...hyp1_r1.data,
        opportunity: { id: "OPP-010", revision: "r1" },
        claims: [{ id: "CLM-010", revision: "r1" }],
        primary_metric: { id: "MET-010", revision: "r1" },
      },
    };
    const exp010 = {
      ...exp1_r1,
      id: "EXP-010",
      depends_on: [{ id: "HYP-010", revision: "r1" }, { id: "MET-010", revision: "r1" }],
      data: {
        ...exp1_r1.data,
        hypothesis: { id: "HYP-010", revision: "r1" },
        primary_metric: { id: "MET-010", revision: "r1" },
        authorization: { id: "DEC-013", revision: "r1" },
        result: { classification: "supported", sources: [{ id: "SRC-010", revision: "r1" }], limitations: [] },
      },
    };
    const inv010 = {
      ...inv1,
      id: "INV-010",
      depends_on: [{ id: "CLM-010", revision: "r1" }],
      data: { ...inv1.data, claims: [{ id: "CLM-010", revision: "r1" }] },
    };

    const dec013 = {
      id: "DEC-013",
      kind: "DEC",
      revision: "r1",
      owner: "Executive Committee",
      scope,
      depends_on: [{ id: "EXP-010", revision: "r1" }, { id: "CLM-010", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Approved helper",
        reviewed_at: "2026-10-01T00:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["annual"],
      },
      data: {
        purpose: "experiment",
        status: "recorded",
        outcome: "authorize",
        consumes: [{ id: "EXP-010", revision: "r1" }],
        critical_claims: [{ id: "CLM-010", revision: "r1" }],
        authority_id: "AUTH-002",
        authority_revision: "exec-r1",
        strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }],
        decided_at: "2026-10-01T00:00:00Z",
        rationale: "Helper learning",
        uncertainties: [],
        revisit_triggers: ["annual"],
        supersedes: null,
      },
    };

    const dec010 = {
      id: "DEC-010",
      kind: "DEC",
      revision: "r1",
      owner: "Executive Committee",
      scope,
      depends_on: [{ id: "INV-010", revision: "r1" }, { id: "OPP-010", revision: "r1" }, { id: "HYP-010", revision: "r1" }, { id: "EXP-010", revision: "r1" }, { id: "CLM-010", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Approved independent",
        reviewed_at: "2026-10-10T12:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["revisit"],
      },
      data: {
        purpose: "investment",
        status: "recorded",
        outcome: "authorize",
        consumes: [
          { id: "INV-010", revision: "r1" },
          { id: "OPP-010", revision: "r1" },
          { id: "HYP-010", revision: "r1" },
          { id: "EXP-010", revision: "r1" },
        ],
        critical_claims: [{ id: "CLM-010", revision: "r1" }],
        authority_id: "AUTH-002",
        authority_revision: "exec-r1",
        strategy_binding: { authority_id: "AUTH-000", revision: `sha256:${stratHash}` },
        artifact_bindings: [{ path: "approval010.md", sha256: approval010Hash }],
        decided_at: "2026-10-10T12:00:00Z",
        rationale: "Independent authorization",
        uncertainties: [],
        revisit_triggers: ["annual"],
        supersedes: null,
      },
    };

    const bridges = [
      {
        record: { id: "DEC-001", revision: "r1" },
        authority_id: "AUTH-001",
        authority_revision: `sha256:${brdHash}`,
        ids: ["BRD-OBJ-001"],
      },
      {
        record: { id: "DEC-010", revision: "r1" },
        authority_id: "AUTH-001",
        authority_revision: `sha256:${brdHash}`,
        ids: ["BRD-OBJ-001"],
      },
    ];

    const stateBefore = {
      value: "validated_for_scope",
      reason: "Experiment completed and supported",
      scope,
      hypotheses: [{ id: "HYP-001", revision: "r1" }],
      decision: { id: "DEC-001", revision: "r1" },
      assessed_at: "2026-10-10T12:30:00Z",
      history: [
        { from: "unvalidated", to: "validating", at: "2026-10-01T10:00:00Z", reason: "Started testing", decision: { id: "DEC-003", revision: "r1" } },
        { from: "validating", to: "validated_for_scope", at: "2026-10-10T12:30:00Z", reason: "Experiment supported", decision: { id: "DEC-001", revision: "r1" } },
      ],
    };

    const baseRecords = [
      dec001, dec010, dec003, dec013,
      src1, clm1, opp1, met1, hyp1_r1, exp1_r1, inv1,
      src010, clm010, opp010, met010, hyp010, exp010, inv010,
    ];
    const baseRecordHistory = [hyp1_plan1, exp1_plan1];
    const immutableDecisionBytes = new Map(
      [dec001, dec003, dec010, dec013].map((decision) => [decision.id, JSON.stringify(decision)]),
    );

    const baseLedger = {
      schema_version: 1,
      slug: "revision-timeline",
      product_id: "timeline-product",
      revision: "r1",
      synthetic: false,
      updated_at: "2026-10-10T12:30:00Z",
      strategy_authority: "AUTH-000",
      strategy_gap: null,
      authorities: [authStrat, authBrd, authApproval],
      authority_history: [],
      records: baseRecords,
      record_history: baseRecordHistory,
      bridges,
      product_state: stateBefore,
    };

    const ledgerPath = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerPath, JSON.stringify(baseLedger, null, 2));
    const assertCliResult = (expected, gate, asOf, exitCode) => {
      const cli = spawnSync("node", [
        VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", asOf, "--gate", gate,
      ], { encoding: "utf8" });
      assert.equal(cli.status, exitCode, cli.stderr);
      assert.deepEqual(JSON.parse(cli.stdout), expected);
    };

    // Step 1: Before - structural
    const step1 = await validateProductEvidence(baseLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });
    assert.equal(step1.valid, true, JSON.stringify(step1.issues));
    assert.equal(step1.readiness, "not_assessed");
    assert.equal(step1.effective_product_state, "validated_for_scope", JSON.stringify(step1.issues));
    assert.deepEqual(step1.affected_decisions, []);
    assert.equal(step1.issues.length, 0);
    assertCliResult(step1, "structural", "2026-10-11T10:00:00Z", 0);

    // Step 2: Before - commit
    const step2 = await validateProductEvidence(baseLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "commit",
    });
    assert.equal(step2.valid, true, JSON.stringify(step2.issues));
    assert.equal(step2.readiness, "eligible_for_host_check");
    assert.equal(step2.effective_product_state, "validated_for_scope", JSON.stringify(step2.issues));
    assert.deepEqual(step2.affected_decisions, []);
    assert.equal(step2.issues.length, 0);
    assertCliResult(step2, "commit", "2026-10-11T10:00:00Z", 0);

    // Step 3: Change - HYP-001@r2, EXP-001@r2, retain r1
    const hyp1_r2 = {
      ...hyp1_r1,
      revision: "r2",
      freshness: { ...hyp1_r1.freshness, reviewed_at: "2026-10-11T11:00:00Z" },
    };
    const exp1_r2 = {
      ...exp1_r1,
      revision: "r2",
      depends_on: [{ id: "HYP-001", revision: "r2" }, { id: "MET-001", revision: "r1" }],
      data: { ...exp1_r1.data, hypothesis: { id: "HYP-001", revision: "r2" } },
    };

    const changeRecords = baseRecords.map((r) => {
      if (r.id === "HYP-001") return hyp1_r2;
      if (r.id === "EXP-001") return exp1_r2;
      return r;
    });
    const changeRecordHistory = [...baseRecordHistory, hyp1_r1, exp1_r1];

    const changeLedger = {
      ...baseLedger,
      records: changeRecords,
      record_history: changeRecordHistory,
      updated_at: "2026-10-11T11:00:00Z",
    };

    fs.writeFileSync(ledgerPath, JSON.stringify(changeLedger, null, 2));

    // Step 3a: Change - structural (selected DEC-001)
    const step3 = await validateProductEvidence(changeLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T11:00:00Z",
      gate: "structural",
    });
    assert.equal(step3.valid, true);
    assert.equal(step3.readiness, "not_assessed");
    assert.equal(step3.effective_product_state, "inconclusive");
    assert.deepEqual(step3.affected_decisions, ["DEC-001"], JSON.stringify(step3.issues));
    assert.deepEqual(step3.issues, [{
      code: "OBSOLETE_BINDING",
      severity: "warning",
      path: "/records/0",
      record_id: "DEC-001",
      message: "Recorded proof binds an obsolete retained revision.",
    }]);
    assertCliResult(step3, "structural", "2026-10-11T11:00:00Z", 0);

    // Step 3b: Change - commit (selected DEC-001)
    const step4 = await validateProductEvidence(changeLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T11:00:00Z",
      gate: "commit",
    });
    assert.equal(step4.valid, true);
    assert.equal(step4.readiness, "blocked");
    assert.equal(step4.effective_product_state, "inconclusive");
    assert.deepEqual(step4.affected_decisions, ["DEC-001"], JSON.stringify(step4.issues));
    assert.deepEqual(step4.issues, [{
      code: "OBSOLETE_BINDING",
      severity: "gap",
      path: "/records/0",
      record_id: "DEC-001",
      message: "Recorded proof binds an obsolete retained revision.",
    }]);
    assertCliResult(step4, "commit", "2026-10-11T11:00:00Z", 3);
    // Step 3c: Change - commit (selected DEC-010)
    const changeLedger010 = {
      ...changeLedger,
      product_state: {
        value: "validated_for_scope",
        reason: "Direct authorize for 010",
        scope,
        hypotheses: [{ id: "HYP-010", revision: "r1" }],
        decision: { id: "DEC-010", revision: "r1" },
        assessed_at: "2026-10-11T11:00:00Z",
        history: [
          { from: "unvalidated", to: "validating", at: "2026-10-10T12:05:00Z", reason: "Started testing 010", decision: { id: "DEC-013", revision: "r1" } },
          { from: "validating", to: "validated_for_scope", at: "2026-10-10T12:30:00Z", reason: "Direct authorize 010", decision: { id: "DEC-010", revision: "r1" } },
        ],
      },
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(changeLedger010, null, 2));

    const step5 = await validateProductEvidence(changeLedger010, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T11:00:00Z",
      gate: "commit",
    });
    assert.equal(step5.valid, true, JSON.stringify(step5.issues));
    assert.equal(step5.readiness, "eligible_for_host_check");
    assert.equal(step5.effective_product_state, "validated_for_scope");
    assert.deepEqual(step5.affected_decisions, ["DEC-001"]);
    assert.deepEqual(step5.issues, [{
      code: "OBSOLETE_BINDING",
      severity: "warning",
      path: "/records/0",
      record_id: "DEC-001",
      message: "Recorded proof binds an obsolete retained revision.",
    }]);
    assertCliResult(step5, "commit", "2026-10-11T11:00:00Z", 0);

    // Step 4: Supersede - append DEC-002@r1 superseding DEC-001
    const approval2File = path.join(root, "approval2.md");
    fs.writeFileSync(approval2File, "Investment approval v2\n");
    const approval2Hash = sha256(fs.readFileSync(approval2File));

    const dec002 = {
      id: "DEC-002",
      kind: "DEC",
      revision: "r1",
      owner: "Executive Committee",
      scope,
      depends_on: [{ id: "INV-001", revision: "r1" }, { id: "OPP-001", revision: "r1" }, { id: "HYP-001", revision: "r2" }, { id: "EXP-001", revision: "r2" }, { id: "CLM-001", revision: "r1" }],
      freshness: {
        status: "current",
        rationale: "Re-approved for r2",
        reviewed_at: "2026-10-11T11:20:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        review_triggers: ["market changes"],
      },
      data: {
        purpose: "investment",
        status: "recorded",
        outcome: "authorize",
        consumes: [
          { id: "INV-001", revision: "r1" },
          { id: "OPP-001", revision: "r1" },
          { id: "HYP-001", revision: "r2" },
          { id: "EXP-001", revision: "r2" },
        ],
        critical_claims: [{ id: "CLM-001", revision: "r1" }],
        authority_id: "AUTH-002",
        authority_revision: "exec-r1",
        strategy_binding: { authority_id: "AUTH-000", revision: `sha256:${stratHash}` },
        artifact_bindings: [{ path: "approval2.md", sha256: approval2Hash }],
        decided_at: "2026-10-11T11:20:00Z",
        rationale: "Supersede DEC-001 with r2 evidence",
        uncertainties: [],
        revisit_triggers: ["market changes"],
        supersedes: { id: "DEC-001", revision: "r1" },
      },
    };

    const supersedeRecords = [...changeRecords, dec002];
    const supersedeBridges = [
      ...bridges,
      {
        record: { id: "DEC-002", revision: "r1" },
        authority_id: "AUTH-001",
        authority_revision: `sha256:${brdHash}`,
        ids: ["BRD-OBJ-001"],
      },
    ];

    const supersedeLedger = {
      ...changeLedger,
      records: supersedeRecords,
      bridges: supersedeBridges,
      updated_at: "2026-10-11T11:20:00Z",
      product_state: {
        value: "validated_for_scope",
        reason: "Re-validated with DEC-002",
        scope,
        hypotheses: [{ id: "HYP-001", revision: "r2" }],
        decision: { id: "DEC-002", revision: "r1" },
        assessed_at: "2026-10-11T11:20:00Z",
        history: [
          { from: "unvalidated", to: "validating", at: "2026-10-01T10:00:00Z", reason: "Started testing", decision: { id: "DEC-003", revision: "r1" } },
          { from: "validating", to: "validated_for_scope", at: "2026-10-10T12:30:00Z", reason: "Experiment supported", decision: { id: "DEC-001", revision: "r1" } },
          { from: "validated_for_scope", to: "validating", at: "2026-10-11T11:16:00Z", reason: "r2 review", decision: { id: "DEC-003", revision: "r1" } },
          { from: "validating", to: "validated_for_scope", at: "2026-10-11T11:20:00Z", reason: "DEC-002 authorize", decision: { id: "DEC-002", revision: "r1" } },
        ],
      },
    };

    fs.writeFileSync(ledgerPath, JSON.stringify(supersedeLedger, null, 2));

    const step6 = await validateProductEvidence(supersedeLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T11:20:00Z",
      gate: "commit",
    });
    assert.equal(step6.valid, true, JSON.stringify(step6.issues));
    assert.equal(step6.readiness, "eligible_for_host_check");
    assert.equal(step6.effective_product_state, "validated_for_scope");
    assert.deepEqual(step6.affected_decisions, []);
    assert.equal(step6.issues.length, 0);
    assertCliResult(step6, "commit", "2026-10-11T11:20:00Z", 0);
    assert.equal(supersedeRecords.some((record) => record.id === "DEC-004"), false);
    for (const [id, originalBytes] of immutableDecisionBytes) {
      assert.equal(JSON.stringify(supersedeRecords.find((record) => record.id === id)), originalBytes, `${id} must remain byte-identical`);
    }
    assert.deepEqual(supersedeLedger.record_history.map((record) => JSON.stringify(record)),
      changeRecordHistory.map((record) => JSON.stringify(record)));

    // Structural Countercase: coalesced per-row ASCII-first error
    const corruptLedger = JSON.parse(JSON.stringify(changeLedger010));
    corruptLedger.records[0].data.consumes[1].revision = "absent-r9";
    corruptLedger.records[0].depends_on[1].revision = "absent-r9";
    fs.writeFileSync(ledgerPath, JSON.stringify(corruptLedger, null, 2));

    const counterRes = await validateProductEvidence(corruptLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T11:00:00Z",
      gate: "commit",
    });
    assert.equal(counterRes.valid, false);
    assert.equal(counterRes.readiness, "blocked");
    assert.ok(counterRes.issues.some((i) => i.code === "REFERENCE_REVISION" && i.path === "/records/0/data/consumes/1" && i.record_id === "DEC-001"));

    // Retention-deletion boundary test (F07/F12)
    const deletedSnapLedger = JSON.parse(JSON.stringify(baseLedger));
    deletedSnapLedger.record_history = []; // genuinely consumed snapshot deleted!
    fs.writeFileSync(ledgerPath, JSON.stringify(deletedSnapLedger, null, 2));
    const delRes = await validateProductEvidence(deletedSnapLedger, {
      authorityRoot: root,
      ledgerPath,
      asOf: "2026-10-11T10:00:00Z",
      gate: "structural",
    });
    assert.equal(delRes.valid, false);
    assert.equal(delRes.readiness, "blocked");
    assert.ok(delRes.issues.some((i) => i.code === "REFERENCE_REVISION"));
  } finally {
    cleanupTempRoot(root);
  }
});

test("5. 12 Source-Only Influence Vectors (F2, Section 7.2)", async () => {
  const root = createTempRoot();
  try {
    const scope = { segment: "ent", geography: "us", window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" } };

    const planFile = path.join(root, "plan.md");
    fs.writeFileSync(planFile, "plan\n");
    const planHash = sha256(fs.readFileSync(planFile));

    const appFile = path.join(root, "app.md");
    fs.writeFileSync(appFile, "app\n");
    const appHash = sha256(fs.readFileSync(appFile));

    const app010File = path.join(root, "app010.md");
    fs.writeFileSync(app010File, "app 010\n");
    const app010Hash = sha256(fs.readFileSync(app010File));

    const brdFile = path.join(root, "docs/brd/brd.md");
    fs.mkdirSync(path.dirname(brdFile), { recursive: true });
    fs.writeFileSync(brdFile, "# BRD-OBJ-001\n");
    const brdHash = sha256(fs.readFileSync(brdFile));

    const stratFile = path.join(root, "strat.md");
    fs.writeFileSync(stratFile, "strat\n");
    const stratHash = sha256(fs.readFileSync(stratFile));

    const authStrat = { id: "AUTH-000", domain: "strategy", locator: { kind: "local", path: "strat.md", sha256: stratHash }, revision: `sha256:${stratHash}`, owner: "O", scope, declared_ids: [], access: "available" };
    const authBrd = { id: "AUTH-001", domain: "business", locator: { kind: "local", path: "docs/brd/brd.md", sha256: brdHash }, revision: `sha256:${brdHash}`, owner: "O", scope, declared_ids: ["BRD-OBJ-001"], access: "available" };
    const authApproval = { id: "AUTH-002", domain: "authorization", locator: { kind: "external", uri: "urn:authorization:influence", snapshot_sha256: sha256("synthetic influence authority") }, revision: "approval-r1", owner: "Authorized fixture authority", scope, declared_ids: [], access: "available" };

    function makeSrc(id, rev) {
      return {
        id,
        kind: "SRC",
        revision: rev,
        owner: "O",
        scope,
        depends_on: [],
        freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
        data: {
          locator: { kind: "external", uri: `urn:src:${id}:${rev}`, snapshot_sha256: null },
          origin: { publisher: "P", origin_id: `urn:orig:${id}`, classification: "primary", revision: rev, observed_at: "2026-10-01T00:00:00Z", scope },
          retrieved_at: "2026-10-10T00:00:00Z",
          privacy: { classification: "public", redaction: "none", access: "available" },
          license: { identifier: "MIT", usage: "reuse_permitted", restrictions: [] },
          status: "available",
          limitations: [],
        },
      };
    }

    const src1 = makeSrc("SRC-001", "r1");
    const src2_r1 = makeSrc("SRC-002", "r1");
    const src3_r1 = makeSrc("SRC-003", "r1");
    const src4_r1 = makeSrc("SRC-004", "r1");
    const src5_r1 = makeSrc("SRC-005", "r1");
    const src6 = makeSrc("SRC-006", "r1");

    const met1 = {
      id: "MET-001",
      kind: "MET",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        definition: "D", unit: "U", denominator: "Den",
        query: { id: "SRC-003", revision: "r1" }, query_revision: "r1",
        baseline: { value: "10", source: { id: "SRC-004", revision: "r1" }, window: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" } },
        baseline_exception: null,
        comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "E", target: "T", guardrail: "G", measurement_owner: "O", review_trigger: "RT", status: "observed",
      },
    };

    const met2 = {
      id: "MET-002",
      kind: "MET",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        definition: "D2", unit: "U2", denominator: "Den2",
        query: { id: "SRC-005", revision: "r1" }, query_revision: "r1",
        baseline: { value: "5", source: { id: "SRC-006", revision: "r1" }, window: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" } },
        baseline_exception: null,
        comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "E", target: "T", guardrail: "G", measurement_owner: "O", review_trigger: "RT", status: "observed",
      },
    };

    const clm1 = {
      id: "CLM-001",
      kind: "CLM",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [{ id: "SRC-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { statement: "S", classification: "confirmed", sources: [{ id: "SRC-001", revision: "r1" }], counterevidence: [], rationale: "R", uncertainty: "U", status: "supported", critical: true },
    };

    const opp1 = {
      id: "OPP-001",
      kind: "OPP",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [{ id: "CLM-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { problem: "P", customer_job: "J", claims: [{ id: "CLM-001", revision: "r1" }], substitutes: ["S"], alternatives: ["A"], status: "selected", rationale: "R" },
    };

    const hyp1 = {
      id: "HYP-001",
      kind: "HYP",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [{ id: "OPP-001", revision: "r1" }, { id: "CLM-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { opportunity: { id: "OPP-001", revision: "r1" }, prediction: "P", mechanism: "M", claims: [{ id: "CLM-001", revision: "r1" }], primary_metric: { id: "MET-001", revision: "r1" }, disconfirmation: "D", status: "supported" },
    };

    const exp1 = {
      id: "EXP-001",
      kind: "EXP",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [{ id: "HYP-001", revision: "r1" }, { id: "MET-001", revision: "r1" }, { id: "MET-002", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        hypothesis: { id: "HYP-001", revision: "r1" }, method: "M", eligibility: "E", sample_plan: "SP",
        primary_metric: { id: "MET-001", revision: "r1" }, guardrails: [{ id: "MET-002", revision: "r1" }],
        rules: { success: "S", failure: "F", inconclusive: "I" },
        bounds: { starts_at: "2026-10-02T00:00:00Z", ends_at: "2026-10-09T00:00:00Z", budget_cap: "100.00", currency: "USD", exposure_cap: 10, stop_rules: ["SR"] },
        authorization: { id: "DEC-003", revision: "r1" }, status: "completed",
        result: { classification: "supported", sources: [{ id: "SRC-002", revision: "r1" }], limitations: [] },
      },
    };

    const exp1_plan1 = {
      ...exp1,
      revision: "plan1",
      freshness: { ...exp1.freshness },
      data: { ...exp1.data, status: "proposed", authorization: null, result: null },
    };

    const inv1 = {
      id: "INV-001",
      kind: "INV",
      revision: "r1",
      owner: "O",
      scope,
      depends_on: [{ id: "CLM-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { alternatives: [{ name: "A", rationale: "R" }], claims: [{ id: "CLM-001", revision: "r1" }], financial_input: null, financial_result: null, nonmonetary: ["NM"], status: "reviewed", accounting_rationale: "AR" },
    };

    const dec001 = {
      id: "DEC-001", kind: "DEC", revision: "r1", owner: "O", scope,
      depends_on: [{ id: "INV-001", revision: "r1" }, { id: "OPP-001", revision: "r1" }, { id: "HYP-001", revision: "r1" }, { id: "EXP-001", revision: "r1" }, { id: "CLM-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "investment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "INV-001", revision: "r1" }, { id: "OPP-001", revision: "r1" }, { id: "HYP-001", revision: "r1" }, { id: "EXP-001", revision: "r1" }],
        critical_claims: [{ id: "CLM-001", revision: "r1" }],
        authority_id: "AUTH-002", authority_revision: "approval-r1", strategy_binding: { authority_id: "AUTH-000", revision: `sha256:${stratHash}` },
        artifact_bindings: [{ path: "app.md", sha256: appHash }], decided_at: "2026-10-10T00:00:00Z", rationale: "R", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    const src010 = makeSrc("SRC-010", "r1");
    const clm010 = {
      ...clm1,
      id: "CLM-010",
      depends_on: [{ id: "SRC-010", revision: "r1" }],
      data: { ...clm1.data, sources: [{ id: "SRC-010", revision: "r1" }] },
    };
    const inv010 = {
      ...inv1,
      id: "INV-010",
      depends_on: [{ id: "CLM-010", revision: "r1" }],
      data: { ...inv1.data, claims: [{ id: "CLM-010", revision: "r1" }] },
    };
    const opp010 = {
      ...opp1,
      id: "OPP-010",
      depends_on: [{ id: "CLM-010", revision: "r1" }],
      data: { ...opp1.data, claims: [{ id: "CLM-010", revision: "r1" }] },
    };
    const met010 = {
      ...met1,
      id: "MET-010",
      depends_on: [{ id: "SRC-010", revision: "r1" }],
      data: {
        ...met1.data,
        query: { id: "SRC-010", revision: "r1" },
        baseline: {
          ...met1.data.baseline,
          source: { id: "SRC-010", revision: "r1" },
        },
      },
    };
    const hyp010 = {
      ...hyp1,
      id: "HYP-010",
      depends_on: [{ id: "OPP-010", revision: "r1" }, { id: "CLM-010", revision: "r1" }, { id: "MET-010", revision: "r1" }],
      data: {
        ...hyp1.data,
        opportunity: { id: "OPP-010", revision: "r1" },
        claims: [{ id: "CLM-010", revision: "r1" }],
        primary_metric: { id: "MET-010", revision: "r1" },
      },
    };
    const exp010 = {
      ...exp1,
      id: "EXP-010",
      depends_on: [{ id: "HYP-010", revision: "r1" }, { id: "MET-010", revision: "r1" }],
      data: {
        ...exp1.data,
        hypothesis: { id: "HYP-010", revision: "r1" },
        guardrails: [{ id: "MET-010", revision: "r1" }],
        primary_metric: { id: "MET-010", revision: "r1" },
        authorization: { id: "DEC-013", revision: "r1" },
        result: { classification: "supported", sources: [{ id: "SRC-010", revision: "r1" }], limitations: [] },
      },
    };

    const dec010 = {
      id: "DEC-010", kind: "DEC", revision: "r1", owner: "O", scope,
      depends_on: [{ id: "INV-010", revision: "r1" }, { id: "OPP-010", revision: "r1" }, { id: "HYP-010", revision: "r1" }, { id: "EXP-010", revision: "r1" }, { id: "CLM-010", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "investment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "INV-010", revision: "r1" }, { id: "OPP-010", revision: "r1" }, { id: "HYP-010", revision: "r1" }, { id: "EXP-010", revision: "r1" }], critical_claims: [{ id: "CLM-010", revision: "r1" }],
        authority_id: "AUTH-002", authority_revision: "approval-r1", strategy_binding: { authority_id: "AUTH-000", revision: `sha256:${stratHash}` },
        artifact_bindings: [{ path: "app010.md", sha256: app010Hash }], decided_at: "2026-10-10T00:00:00Z", rationale: "R", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    const dec003 = {
      id: "DEC-003", kind: "DEC", revision: "r1", owner: "O", scope,
      depends_on: [{ id: "EXP-001", revision: "plan1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-01T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "experiment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "EXP-001", revision: "plan1" }], critical_claims: [],
        authority_id: "AUTH-002", authority_revision: "approval-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-01T00:00:00Z", rationale: "R", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    const dec013 = {
      id: "DEC-013", kind: "DEC", revision: "r1", owner: "O", scope,
      depends_on: [{ id: "EXP-010", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-01T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "learning", status: "recorded", outcome: "authorize",
        consumes: [{ id: "EXP-010", revision: "r1" }], critical_claims: [], authority_id: "AUTH-002", authority_revision: "approval-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-01T00:00:00Z", rationale: "R", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    const dec020 = {
      id: "DEC-020", kind: "DEC", revision: "r1", owner: "O", scope,
      depends_on: [{ id: "MET-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "release", status: "recorded", outcome: "authorize",
        consumes: [{ id: "MET-001", revision: "r1" }], critical_claims: [],
        authority_id: "AUTH-002", authority_revision: "approval-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-10T00:00:00Z", rationale: "R", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    const bridges = [
      { record: { id: "DEC-001", revision: "r1" }, authority_id: "AUTH-001", authority_revision: `sha256:${brdHash}`, ids: ["BRD-OBJ-001"] },
      { record: { id: "DEC-010", revision: "r1" }, authority_id: "AUTH-001", authority_revision: `sha256:${brdHash}`, ids: ["BRD-OBJ-001"] },
    ];

    const stateObj = {
      value: "validated_for_scope",
      reason: "Validated",
      scope,
      hypotheses: [{ id: "HYP-001", revision: "r1" }],
      decision: { id: "DEC-001", revision: "r1" },
      assessed_at: "2026-10-10T12:00:00Z",
      history: [
        { from: "unvalidated", to: "validating", at: "2026-10-01T00:00:00Z", reason: "testing", decision: { id: "DEC-003", revision: "r1" } },
        { from: "validating", to: "validated_for_scope", at: "2026-10-10T12:00:00Z", reason: "validated", decision: { id: "DEC-001", revision: "r1" } },
      ],
    };

    const vectors = [
      { change: "SRC-002", affected: ["DEC-001"], selected_helpers: [] },
      { change: "SRC-003", affected: ["DEC-001", "DEC-003", "DEC-020"], selected_helpers: ["DEC-003"] },
      { change: "SRC-004", affected: ["DEC-001", "DEC-003", "DEC-020"], selected_helpers: ["DEC-003"] },
      { change: "SRC-005", affected: ["DEC-001", "DEC-003"], selected_helpers: ["DEC-003"] },
    ];

    const publicKeys = ["schema_version", "tool", "valid", "gate", "readiness", "effective_product_state", "affected_decisions", "issues", "limitations"];
    const permanentLimitations = [
      "source_truth_not_verified",
      "human_authorization_not_authenticated",
      "historical_payloads_not_authenticated",
    ];
    const assertVectorEnvelope = (result, testRecords, gate, readiness, effectiveState, affected, severities) => {
      assert.deepEqual(Object.keys(result), publicKeys);
      assert.equal(result.schema_version, 1);
      assert.equal(result.tool, "product-evidence-validator");
      assert.equal(result.valid, true);
      assert.equal(result.gate, gate);
      assert.equal(result.readiness, readiness);
      assert.equal(result.effective_product_state, effectiveState);
      assert.deepEqual(result.affected_decisions, affected);
      assert.deepEqual(result.limitations, permanentLimitations);
      const recordIndices = new Map(testRecords.map((record, index) => [record.id, index]));
      assert.deepEqual(result.issues, affected.map((id, index) => ({
        code: "OBSOLETE_BINDING",
        severity: severities[index],
        path: `/records/${recordIndices.get(id)}`,
        record_id: id,
        message: "Recorded proof binds an obsolete retained revision.",
      })));
    };
    const assertVectorCli = (expected, ledger, ledgerPath, gate, exitCode) => {
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
      const cli = spawnSync("node", [
        VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", "2026-10-10T12:00:00Z", "--gate", gate,
      ], { encoding: "utf8" });
      assert.equal(cli.status, exitCode, cli.stderr);
      assert.deepEqual(JSON.parse(cli.stdout), expected);
    };

    for (const v of vectors) {
      const srcId = v.change;
      const src_r2 = makeSrc(srcId, "r2");

      const testRecords = [dec001, dec010, dec003, dec013, dec020, src1, src2_r1, src3_r1, src4_r1, src5_r1, src6, met1, met2, clm1, opp1, hyp1, exp1, inv1, src010, clm010, opp010, met010, hyp010, exp010, inv010].map((r) => {
        if (r.id === srcId) return src_r2;
        return r;
      });

      const oldSrc = [src2_r1, src3_r1, src4_r1, src5_r1].find((s) => s.id === srcId);
      const testRecordHistory = [oldSrc, exp1_plan1];

      const ledger = {
        schema_version: 1,
        slug: "influence-support",
        product_id: "influence-product",
        revision: "r1",
        synthetic: false,
        updated_at: "2026-10-10T12:00:00Z",
        strategy_authority: "AUTH-000",
        strategy_gap: null,
        authorities: [authStrat, authBrd, authApproval],
        authority_history: [],
        records: testRecords,
        record_history: testRecordHistory,
        bridges,
        product_state: stateObj,
      };

      const ledgerPath = path.join(root, "evidence.json");
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

      // 1. Selected DEC-001, gate commit
      const res001Commit = await validateProductEvidence(ledger, {
        authorityRoot: root,
        ledgerPath,
        asOf: "2026-10-10T12:00:00Z",
        gate: "commit",
      });

      assert.deepEqual(res001Commit.affected_decisions, v.affected.sort(), JSON.stringify(res001Commit.issues));
      assert.equal(res001Commit.valid, true);
      assert.equal(res001Commit.readiness, "blocked");
      assert.equal(res001Commit.effective_product_state, "inconclusive");
      const selectedRootSeverities = v.affected.map((id) =>
        id === "DEC-001" || v.selected_helpers.includes(id) ? "gap" : "warning"
      );
      assertVectorEnvelope(res001Commit, testRecords, "commit", "blocked", "inconclusive", v.affected, selectedRootSeverities);
      assertVectorCli(res001Commit, ledger, ledgerPath, "commit", 3);

      for (const affId of v.affected) {
        const iss = res001Commit.issues.find((i) => i.record_id === affId && i.code === "OBSOLETE_BINDING");
        assert.ok(iss, `Expected OBSOLETE_BINDING issue on ${affId}`);
        if (affId === "DEC-001" || v.selected_helpers.includes(affId)) {
          assert.equal(iss.severity, "gap", `Expected gap severity on ${affId}`);
        } else {
          assert.equal(iss.severity, "warning", `Expected warning severity on ${affId}`);
        }
      }

      // 2. Selected DEC-010, gate commit
      const ledger010 = {
        ...ledger,
        product_state: {
          ...stateObj,
          decision: { id: "DEC-010", revision: "r1" },
          hypotheses: [{ id: "HYP-010", revision: "r1" }],
          assessed_at: "2026-10-10T12:00:00Z",
          history: [
            { from: "unvalidated", to: "validating", at: "2026-10-01T00:05:00Z", reason: "testing", decision: { id: "DEC-013", revision: "r1" } },
            { from: "validating", to: "validated_for_scope", at: "2026-10-10T12:00:00Z", reason: "direct", decision: { id: "DEC-010", revision: "r1" } },
          ],
        },
      };
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger010, null, 2));

      const res010Commit = await validateProductEvidence(ledger010, {
        authorityRoot: root,
        ledgerPath,
        asOf: "2026-10-10T12:00:00Z",
        gate: "commit",
      });

      assert.deepEqual(res010Commit.affected_decisions, v.affected.sort(), JSON.stringify(res010Commit.issues));
      assert.equal(res010Commit.valid, true);
      assert.equal(res010Commit.readiness, "eligible_for_host_check", JSON.stringify(res010Commit.issues));
      assert.equal(res010Commit.effective_product_state, "validated_for_scope");
      for (const iss of res010Commit.issues) {
        assert.equal(iss.severity, "warning");
      }
      assertVectorEnvelope(res010Commit, testRecords, "commit", "eligible_for_host_check", "validated_for_scope",
        v.affected, v.affected.map(() => "warning"));
      assertVectorCli(res010Commit, ledger010, ledgerPath, "commit", 0);

      // 3. Selected DEC-001, gate structural
      const res001Struct = await validateProductEvidence(ledger, {
        authorityRoot: root,
        ledgerPath,
        asOf: "2026-10-10T12:00:00Z",
        gate: "structural",
      });
      assert.deepEqual(res001Struct.affected_decisions, v.affected.sort());
      assert.equal(res001Struct.valid, true);
      assert.equal(res001Struct.readiness, "not_assessed");
      for (const iss of res001Struct.issues) {
        assert.equal(iss.severity, "warning");
      }
      assertVectorEnvelope(res001Struct, testRecords, "structural", "not_assessed", "inconclusive",
        v.affected, v.affected.map(() => "warning"));
      assertVectorCli(res001Struct, ledger, ledgerPath, "structural", 0);
    }
  } finally {
    cleanupTempRoot(root);
  }
});

test("6. NV-R1 Combined Plan & Baseline-Exception Lifecycle Boundary (F12)", async () => {
  const root = createTempRoot();
  try {
    const scope = { segment: "s", geography: "g", window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" } };

    const planFile = path.join(root, "plan.md");
    fs.writeFileSync(planFile, "plan bytes v1\n");
    const planHash = sha256(fs.readFileSync(planFile));

    const planFile2 = path.join(root, "plan2.md");
    fs.writeFileSync(planFile2, "plan bytes v2 renewed\n");
    const planHash2 = sha256(fs.readFileSync(planFile2));

    const brdFile = path.join(root, "docs/brd/brd.md");
    fs.mkdirSync(path.dirname(brdFile), { recursive: true });
    fs.writeFileSync(brdFile, "# BRD-OBJ-001\n");
    const brdHash = sha256(fs.readFileSync(brdFile));

    const stratFile = path.join(root, "strat.md");
    fs.writeFileSync(stratFile, "strat\n");
    const stratHash = sha256(fs.readFileSync(stratFile));
    const requirementsFile = path.join(root, "requirements.md");
    fs.writeFileSync(requirementsFile, "# REQ-001\n## AC-001\n");
    const requirementsHash = sha256(fs.readFileSync(requirementsFile));
    const authRequirements = {
      id: "AUTH-002", domain: "requirements",
      locator: { kind: "local", path: "requirements.md", sha256: requirementsHash },
      revision: `sha256:${requirementsHash}`, owner: "QA", scope,
      declared_ids: ["REQ-001", "AC-001"], access: "available",
    };
    const authRelease = {
      id: "AUTH-003", domain: "authorization",
      locator: { kind: "external", uri: "urn:authorization:release", snapshot_sha256: sha256("synthetic release authority") },
      revision: "release-r1", owner: "Release Authority", scope, declared_ids: [], access: "available",
    };

    const authBrd = { id: "AUTH-001", domain: "business", locator: { kind: "local", path: "docs/brd/brd.md", sha256: brdHash }, revision: `sha256:${brdHash}`, owner: "O", scope, declared_ids: ["BRD-OBJ-001"], access: "available" };
    const authStrat = { id: "AUTH-000", domain: "strategy", locator: { kind: "local", path: "strat.md", sha256: stratHash }, revision: `sha256:${stratHash}`, owner: "O", scope, declared_ids: [], access: "available" };

    function makeSrc(id, rev) {
      return {
        id, kind: "SRC", revision: rev, owner: "O", scope, depends_on: [],
        freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
        data: {
          locator: { kind: "external", uri: `urn:src:${id}:${rev}`, snapshot_sha256: null },
          origin: { publisher: "P", origin_id: `urn:orig:${id}`, classification: "primary", revision: rev, observed_at: "2026-10-01T00:00:00Z", scope },
          retrieved_at: "2026-10-10T00:00:00Z", privacy: { classification: "public", redaction: "none", access: "available" },
          license: { identifier: "MIT", usage: "reuse_permitted", restrictions: [] }, status: "available", limitations: [],
        },
      };
    }

    const src1 = makeSrc("SRC-001", "r1");
    const src2 = makeSrc("SRC-002", "r1");
    const src010 = makeSrc("SRC-010", "r1");

    // 1. Plan uses baseline-exception DEC:
    // MET-001@r1 has baseline_exception pointing to DEC-030@r1
    const dec030_r1 = {
      id: "DEC-030", kind: "DEC", revision: "r1", owner: "QA", scope, depends_on: [{ id: "MET-001", revision: "r1" }],
      freshness: { status: "current", rationale: "Exception accepted", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "release", status: "recorded", outcome: "risk_accept",
        consumes: [{ id: "MET-001", revision: "r1" }], critical_claims: [],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-10T00:00:00Z", rationale: "Baseline unavailable; risk accepted", uncertainties: ["No baseline"], revisit_triggers: ["T"], supersedes: null,
      },
    };

    const met1_r1 = {
      id: "MET-001", kind: "MET", revision: "r1", owner: "Analytics", scope, depends_on: [{ id: "SRC-001", revision: "r1" }],
      freshness: { status: "current", rationale: "Instrumented", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        definition: "Latency", unit: "ms", denominator: "req",
        query: { id: "SRC-001", revision: "r1" }, query_revision: "r1",
        baseline: null,
        baseline_exception: { id: "DEC-030", revision: "r1" },
        comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "All", target: "100", guardrail: "none", measurement_owner: "Analytics", review_trigger: "T", status: "instrumented",
      },
    };

    // HYP-001 and EXP-001 form the experiment plan
    const hyp1_r1 = {
      id: "HYP-001", kind: "HYP", revision: "r1", owner: "PO", scope, depends_on: [{ id: "OPP-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { opportunity: { id: "OPP-001", revision: "r1" }, prediction: "P", mechanism: "M", claims: [], primary_metric: null, disconfirmation: "D", status: "supported" },
    };
    const opp1_r1 = {
      id: "OPP-001", kind: "OPP", revision: "r1", owner: "PO", scope, depends_on: [],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { problem: "P", customer_job: "J", claims: [], substitutes: ["S"], alternatives: ["A"], status: "selected", rationale: "R" },
    };

    const exp1_r1 = {
      id: "EXP-001", kind: "EXP", revision: "r1", owner: "PO", scope, depends_on: [{ id: "HYP-001", revision: "r1" }, { id: "MET-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        hypothesis: { id: "HYP-001", revision: "r1" }, method: "M", eligibility: "E", sample_plan: "SP",
        primary_metric: { id: "MET-001", revision: "r1" }, guardrails: [{ id: "MET-001", revision: "r1" }], rules: { success: "S", failure: "F", inconclusive: "I" },
        bounds: { starts_at: "2026-10-02T00:00:00Z", ends_at: "2026-10-09T00:00:00Z", budget_cap: "0", currency: "USD", exposure_cap: 10, stop_rules: ["SR"] },
        authorization: { id: "DEC-003", revision: "r1" }, status: "authorized",
        result: null,
      },
    };

    // Experiment authorization DEC-003 authorizes the plan (consuming MET-001@r1)
    const dec003_r1 = {
      id: "DEC-003", kind: "DEC", revision: "r1", owner: "PO", scope, depends_on: [{ id: "EXP-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-01T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "experiment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "EXP-001", revision: "r1" }], critical_claims: [],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-01T00:00:00Z", rationale: "Plan auth", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    // UAT and release decisions bind a complete, scoped release proof.
    const uatDecision = {
      id: "DEC-040", kind: "DEC", revision: "r1", owner: "QA", scope, depends_on: [],
      freshness: { status: "current", rationale: "Synthetic test UAT decision", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["test evidence changes"] },
      data: {
        purpose: "uat", status: "recorded", outcome: "authorize",
        consumes: [], critical_claims: [], authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-10T00:00:00Z",
        rationale: "Fixture-only UAT authorization", uncertainties: [], revisit_triggers: ["test results"], supersedes: null,
      },
    };
    const dec020_r1 = {
      id: "DEC-020", kind: "DEC", revision: "r1", owner: "Release Manager", scope,
      depends_on: [{ id: "MET-001", revision: "r1" }, { id: "DEC-040", revision: "r1" }, { id: "CLM-010", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "release", status: "recorded", outcome: "authorize",
        consumes: [{ id: "MET-001", revision: "r1" }], critical_claims: [{ id: "CLM-010", revision: "r1" }],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-10T00:00:00Z",
        rationale: "Release authorize", uncertainties: [], revisit_triggers: ["T"], supersedes: null,
      },
    };

    // Independent DEC-010 (investment authorize)
    const inv010 = {
      id: "INV-010", kind: "INV", revision: "r1", owner: "O", scope, depends_on: [],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: { alternatives: [{ name: "A", rationale: "R" }], claims: [], financial_input: null, financial_result: null, nonmonetary: ["NM"], status: "reviewed", accounting_rationale: "AR" },
    };
    const claim010 = {
      id: "CLM-010", kind: "CLM", revision: "r1", owner: "O", scope, depends_on: [{ id: "SRC-010", revision: "r1" }],
      freshness: { status: "current", rationale: "Fixture support", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["evidence changes"] },
      data: {
        statement: "Synthetic release metric is within its stated target",
        classification: "confirmed", sources: [{ id: "SRC-010", revision: "r1" }], counterevidence: [],
        rationale: "Fixture-only support", uncertainty: "Synthetic test data only", status: "supported", critical: true,
      },
    };
    const metric010 = {
      id: "MET-010", kind: "MET", revision: "r1", owner: "Analytics", scope, depends_on: [{ id: "SRC-010", revision: "r1" }],
      freshness: { status: "current", rationale: "Fixture observation", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["query changes"] },
      data: {
        definition: "Synthetic latency", unit: "ms", denominator: "requests",
        query: { id: "SRC-010", revision: "r1" }, query_revision: "r1",
        baseline: { value: "120", source: { id: "SRC-010", revision: "r1" }, window: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" } },
        baseline_exception: null, comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "Fixture requests", target: "100", guardrail: "No production action",
        measurement_owner: "Analytics", review_trigger: "Query change", status: "observed",
      },
    };
    const opportunity010 = {
      id: "OPP-010", kind: "OPP", revision: "r1", owner: "O", scope, depends_on: [],
      freshness: { status: "current", rationale: "Fixture opportunity", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["scope changes"] },
      data: { problem: "Fixture problem", customer_job: "Fixture job", claims: [], substitutes: ["defer"], alternatives: ["study"], status: "selected", rationale: "Fixture only" },
    };
    const hypothesis010 = {
      id: "HYP-010", kind: "HYP", revision: "r1", owner: "O", scope, depends_on: [{ id: "OPP-010", revision: "r1" }, { id: "MET-010", revision: "r1" }],
      freshness: { status: "current", rationale: "Fixture hypothesis", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["results change"] },
      data: { opportunity: { id: "OPP-010", revision: "r1" }, prediction: "Fixture latency improves", mechanism: "Fixture intervention", claims: [], primary_metric: { id: "MET-010", revision: "r1" }, disconfirmation: "No improvement", status: "supported" },
    };
    const experiment010 = {
      id: "EXP-010", kind: "EXP", revision: "r1", owner: "O", scope, depends_on: [{ id: "HYP-010", revision: "r1" }, { id: "MET-010", revision: "r1" }],
      freshness: { status: "current", rationale: "Fixture completion", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["results change"] },
      data: {
        hypothesis: { id: "HYP-010", revision: "r1" }, method: "Synthetic test", eligibility: "Fixture only", sample_plan: "One synthetic case",
        primary_metric: { id: "MET-010", revision: "r1" }, guardrails: [{ id: "MET-010", revision: "r1" }],
        rules: { success: "Target met", failure: "Target missed", inconclusive: "Missing data" },
        bounds: { starts_at: "2026-10-02T00:00:00Z", ends_at: "2026-10-09T00:00:00Z", budget_cap: "0", currency: "USD", exposure_cap: 0, stop_rules: ["Stop on missing input"] },
        authorization: { id: "DEC-013", revision: "r1" }, status: "completed",
        result: { classification: "supported", sources: [{ id: "SRC-010", revision: "r1" }], limitations: ["Synthetic fixture only"] },
      },
    };
    const authorization010 = {
      id: "DEC-013", kind: "DEC", revision: "r1", owner: "O", scope, depends_on: [{ id: "EXP-010", revision: "r1" }],
      freshness: { status: "current", rationale: "Fixture experiment authorization", reviewed_at: "2026-10-01T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["plan changes"] },
      data: {
        purpose: "experiment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "EXP-010", revision: "r1" }], critical_claims: [],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-01T00:00:00Z",
        rationale: "Fixture-only plan authorization", uncertainties: [], revisit_triggers: ["plan changes"], supersedes: null,
      },
    };
    const dec010 = {
      id: "DEC-010", kind: "DEC", revision: "r1", owner: "O", scope,
      depends_on: [{ id: "INV-010", revision: "r1" }, { id: "OPP-010", revision: "r1" }, { id: "HYP-010", revision: "r1" }, { id: "EXP-010", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "investment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "INV-010", revision: "r1" }, { id: "OPP-010", revision: "r1" }, { id: "HYP-010", revision: "r1" }, { id: "EXP-010", revision: "r1" }], critical_claims: [],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: { authority_id: "AUTH-000", revision: `sha256:${stratHash}` },
        artifact_bindings: [{ path: "plan.md", sha256: planHash }], decided_at: "2026-10-10T00:00:00Z", rationale: "Independent investment authorization", uncertainties: [], revisit_triggers: ["test results change"], supersedes: null,
      },
    };

    const bridges = [
      { record: { id: "DEC-010", revision: "r1" }, authority_id: "AUTH-001", authority_revision: `sha256:${brdHash}`, ids: ["BRD-OBJ-001"] },
      { record: { id: "DEC-020", revision: "r1" }, authority_id: "AUTH-002", authority_revision: `sha256:${requirementsHash}`, ids: ["REQ-001", "AC-001"] },
    ];

    const stateObj = {
      value: "validating", reason: "Synthetic experiment authorization", scope,
      hypotheses: [{ id: "HYP-001", revision: "r1" }], decision: { id: "DEC-003", revision: "r1" },
      assessed_at: "2026-10-01T00:00:00Z",
      history: [{ from: "unvalidated", to: "validating", at: "2026-10-01T00:00:00Z", reason: "Plan authorized", decision: { id: "DEC-003", revision: "r1" } }],
    };

    const baseRecords = [dec020_r1, dec030_r1, dec003_r1, dec010, uatDecision, met1_r1, hyp1_r1, opp1_r1, exp1_r1, inv010, src1, src2, src010, claim010, metric010, opportunity010, hypothesis010, experiment010, authorization010];

    const baseLedger = {
      schema_version: 1, slug: "nv-r1-test", product_id: "nv-r1-product", revision: "r1", synthetic: false,
      updated_at: "2026-10-10T00:00:00Z", strategy_authority: "AUTH-000", strategy_gap: null,
      authorities: [authBrd, authStrat, authRequirements, authRelease], authority_history: [],
      records: baseRecords, record_history: [], bridges, product_state: stateObj,
    };

    const ledgerPath = path.join(root, "evidence.json");
    const assertCliParity = async (ledger, gate, asOf, expected) => {
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
      const run = spawnSync(process.execPath, [VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", asOf, "--gate", gate], { encoding: "utf8" });
      assert.equal(run.status, expected.exit, run.stderr);
      assert.deepEqual(JSON.parse(run.stdout), expected.result);
    };
    const originalDecisionBytes = new Map(baseRecords.filter((record) => record.kind === "DEC").map((record) => [record.id, JSON.stringify(record)]));

    fs.writeFileSync(ledgerPath, JSON.stringify(baseLedger, null, 2));

    // Step A: An instrumented frozen plan remains eligible for its recorded experiment authorization.
    const resInitial = await validateProductEvidence(baseLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-10T00:00:00Z", gate: "experiment",
    });
    assert.equal(resInitial.valid, true, JSON.stringify(resInitial.issues));
    assert.equal(resInitial.readiness, "eligible_for_host_check", JSON.stringify(resInitial.issues));
    assert.deepEqual(resInitial.affected_decisions, ["DEC-020"]);
    await assertCliParity(baseLedger, "experiment", "2026-10-10T00:00:00Z", {
      exit: 0,
      result: expectedEnvelope("experiment", "eligible_for_host_check", "validating", ["DEC-020"], [{
        code: "EVIDENCE_UNAVAILABLE", severity: "warning", path: "/records/0", record_id: "DEC-020",
        message: "Recorded proof does not satisfy EVIDENCE_UNAVAILABLE.",
      }]),
    });
    const rejectedUatLedger = {
      ...baseLedger,
      records: baseRecords.map((record) => record.id === "DEC-040"
        ? { ...record, data: { ...record.data, outcome: "reject" } }
        : record),
    };
    const rejectedUat = await validateProductEvidence(rejectedUatLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-10T00:00:00Z", gate: "release",
    });
    assert.equal(rejectedUat.valid, true);
    assert.equal(rejectedUat.readiness, "blocked");
    assert.ok(rejectedUat.issues.some((issue) =>
      issue.code === "EVIDENCE_UNAVAILABLE" && issue.record_id === "DEC-020" && issue.severity === "gap"
    ));
    await assertCliParity(rejectedUatLedger, "release", "2026-10-10T00:00:00Z", {
      exit: 3,
      result: expectedEnvelope("release", "blocked", "validating", ["DEC-020"], [{
        code: "EVIDENCE_UNAVAILABLE", severity: "gap", path: "/records/0", record_id: "DEC-020",
        message: "Release requires scoped measurements, requirements, UAT, and current release authority.",
      }]),
    });

    // Step B: Advance MET-001 lifecycle r1 -> r2 (definition unchanged, retain r1 in history)
    const met1_r2 = {
      ...met1_r1, revision: "r2",
      freshness: { ...met1_r1.freshness, reviewed_at: "2026-10-11T00:00:00Z" },
      data: { ...met1_r1.data, status: "observed" },
    };

    const changedLedger = {
      ...baseLedger,
      records: baseRecords.map((record) => record.id === "MET-001" ? met1_r2 : record),
      record_history: [met1_r1],
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(changedLedger, null, 2));
    const oldPlanGate = await validateProductEvidence(changedLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T00:00:00Z", gate: "experiment",
    });
    assert.equal(oldPlanGate.valid, true, JSON.stringify(oldPlanGate.issues));
    assert.equal(oldPlanGate.readiness, "blocked", JSON.stringify(oldPlanGate.issues));
    assert.deepEqual(oldPlanGate.affected_decisions, ["DEC-003", "DEC-020", "DEC-030"]);
    assert.deepEqual(oldPlanGate.issues, [
      {
        code: "OBSOLETE_BINDING", severity: "warning", path: "/records/0", record_id: "DEC-020",
        message: "Recorded proof binds an obsolete retained revision.",
      },
      {
        code: "OBSOLETE_BINDING", severity: "gap", path: "/records/1", record_id: "DEC-030",
        message: "Recorded proof binds an obsolete retained revision.",
      },
      {
        code: "OBSOLETE_BINDING", severity: "gap", path: "/records/2", record_id: "DEC-003",
        message: "Recorded proof binds an obsolete retained revision.",
      },
    ]);
    await assertCliParity(changedLedger, "experiment", "2026-10-11T00:00:00Z", {
      exit: 3,
      result: expectedEnvelope("experiment", "blocked", "inconclusive", ["DEC-003", "DEC-020", "DEC-030"], [
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/0", record_id: "DEC-020",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "gap", path: "/records/1", record_id: "DEC-030",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "gap", path: "/records/2", record_id: "DEC-003",
          message: "Recorded proof binds an obsolete retained revision.",
        },
      ]),
    });
    const compatibleExp = {
      ...exp1_r1, revision: "r2",
      data: { ...exp1_r1.data, authorization: { id: "DEC-003", revision: "r1" }, status: "authorized" },
    };
    const compatibleExperimentLedger = {
      ...changedLedger,
      records: changedLedger.records.map((record) => record.id === "EXP-001" ? compatibleExp : record),
      record_history: [...changedLedger.record_history, exp1_r1],
    };
    const compatibleExperiment = await validateProductEvidence(compatibleExperimentLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T00:00:00Z", gate: "experiment",
    });
    assert.equal(compatibleExperiment.valid, true, JSON.stringify(compatibleExperiment.issues));
    assert.equal(compatibleExperiment.readiness, "blocked", JSON.stringify(compatibleExperiment.issues));
    assert.deepEqual(compatibleExperiment.affected_decisions, ["DEC-003", "DEC-020", "DEC-030"]);
    await assertCliParity(compatibleExperimentLedger, "experiment", "2026-10-11T00:00:00Z", {
      exit: 3,
      result: expectedEnvelope("experiment", "blocked", "inconclusive", ["DEC-003", "DEC-020", "DEC-030"], [
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/0", record_id: "DEC-020",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "gap", path: "/records/1", record_id: "DEC-030",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "gap", path: "/records/2", record_id: "DEC-003",
          message: "Recorded proof binds an obsolete retained revision.",
        },
      ]),
    });

    const resBlocked = await validateProductEvidence(changedLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T00:00:00Z", gate: "release",
    });

    // The stale exception helper and its experiment-plan consumer are both affected; the independent investment root remains outside that closure.
    assert.equal(resBlocked.valid, true);
    assert.equal(resBlocked.readiness, "blocked");
    assert.deepEqual(resBlocked.affected_decisions, ["DEC-003", "DEC-020", "DEC-030"]);
    await assertCliParity(changedLedger, "release", "2026-10-11T00:00:00Z", {
      exit: 3,
      result: expectedEnvelope("release", "blocked", "inconclusive", ["DEC-003", "DEC-020", "DEC-030"], [
        {
          code: "OBSOLETE_BINDING", severity: "gap", path: "/records/0", record_id: "DEC-020",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/1", record_id: "DEC-030",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/2", record_id: "DEC-003",
          message: "Recorded proof binds an obsolete retained revision.",
        },
      ]),
    });
    assert.ok(resBlocked.affected_decisions.includes("DEC-030"), "stale exception helper must be affected with its consumer");
    assert.ok(resBlocked.affected_decisions.includes("DEC-003"), "the experiment-plan consumer must inherit stale helper support failure");

    // Independent DEC-010 remains completely unaffected!
    assert.ok(!resBlocked.affected_decisions.includes("DEC-010"));

    // Verify independent gate on DEC-010 is still eligible_for_host_check!
    const changedLedger010 = {
      ...changedLedger,
      product_state: {
        value: "validated_for_scope", reason: "Independent validated investment proof", scope,
        hypotheses: [{ id: "HYP-010", revision: "r1" }], decision: { id: "DEC-010", revision: "r1" },
        assessed_at: "2026-10-10T00:00:00Z",
        history: [
          { from: "unvalidated", to: "validating", at: "2026-10-01T00:05:00Z", reason: "Synthetic plan authorized", decision: { id: "DEC-013", revision: "r1" } },
          { from: "validating", to: "validated_for_scope", at: "2026-10-10T00:00:00Z", reason: "Independent supported experiment", decision: { id: "DEC-010", revision: "r1" } },
        ],
      },
    };

    const res010Commit = await validateProductEvidence(changedLedger010, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T00:00:00Z", gate: "commit",
    });
    assert.equal(res010Commit.valid, true);
    assert.equal(res010Commit.readiness, "eligible_for_host_check");
    await assertCliParity(changedLedger010, "commit", "2026-10-11T00:00:00Z", {
      exit: 0,
      result: expectedEnvelope("commit", "eligible_for_host_check", "validated_for_scope", ["DEC-003", "DEC-020", "DEC-030"], [
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/0", record_id: "DEC-020",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/1", record_id: "DEC-030",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/2", record_id: "DEC-003",
          message: "Recorded proof binds an obsolete retained revision.",
        },
      ]),
    });
    const nullAuthorityLedger = {
      ...baseLedger,
      product_state: changedLedger010.product_state,
      records: baseLedger.records.map((record) => record.id === "DEC-010"
        ? { ...record, data: { ...record.data, authority_id: null, authority_revision: null } }
        : record),
    };
    const nullAuthorityCommit = await validateProductEvidence(nullAuthorityLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T00:00:00Z", gate: "commit",
    });
    assert.equal(nullAuthorityCommit.valid, true);
    assert.equal(nullAuthorityCommit.readiness, "blocked");
    assert.deepEqual(nullAuthorityCommit.affected_decisions, ["DEC-010", "DEC-020"]);
    assert.ok(nullAuthorityCommit.issues.some((issue) =>
      issue.code === "AUTHORITY_UNAVAILABLE" && issue.record_id === "DEC-010" && issue.severity === "gap"
    ));
    await assertCliParity(nullAuthorityLedger, "commit", "2026-10-11T00:00:00Z", {
      exit: 3,
      result: expectedEnvelope("commit", "blocked", "inconclusive", ["DEC-010", "DEC-020"], [
        {
          code: "EVIDENCE_UNAVAILABLE", severity: "warning", path: "/records/0", record_id: "DEC-020",
          message: "Recorded proof does not satisfy EVIDENCE_UNAVAILABLE.",
        },
        {
          code: "AUTHORITY_UNAVAILABLE", severity: "gap", path: "/records/3", record_id: "DEC-010",
          message: "Recorded proof does not satisfy AUTHORITY_UNAVAILABLE.",
        },
      ]),
    });

    const staleStateHypothesis = { ...hypothesis010, revision: "r2" };
    const currentExperiment = {
      ...experiment010, depends_on: [{ id: "HYP-010", revision: "r2" }],
      data: { ...experiment010.data, hypothesis: { id: "HYP-010", revision: "r2" } },
    };
    const currentInvestmentDecision = {
      ...dec010,
      depends_on: dec010.depends_on.map((ref) => ref.id === "HYP-010" ? { id: "HYP-010", revision: "r2" } : ref),
      data: {
        ...dec010.data,
        consumes: dec010.data.consumes.map((ref) => ref.id === "HYP-010" ? { id: "HYP-010", revision: "r2" } : ref),
      },
    };
    const staleStateHypothesisLedger = {
      ...changedLedger010,
      records: changedLedger010.records.map((record) => {
        if (record.id === "HYP-010") return staleStateHypothesis;
        if (record.id === "EXP-010") return currentExperiment;
        if (record.id === "DEC-010") return currentInvestmentDecision;
        return record;
      }),
      record_history: [...changedLedger010.record_history, hypothesis010],
    };
    const staleStateResult = await validateProductEvidence(staleStateHypothesisLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T00:00:00Z", gate: "structural",
    });
    assert.equal(staleStateResult.valid, true);
    assert.equal(staleStateResult.effective_product_state, "inconclusive");
    assert.ok(staleStateResult.issues.some((issue) =>
      issue.code === "EVIDENCE_UNAVAILABLE" && issue.path === "/product_state/hypotheses/0" && issue.severity === "warning"
    ));

    // Step C: Renew exact exception & plan bindings using new DEC IDs (preserving old DEC rows byte-for-byte!)
    const dec031_r1 = {
      id: "DEC-031", kind: "DEC", revision: "r1", owner: "QA", scope, depends_on: [{ id: "MET-001", revision: "r3" }],
      freshness: { status: "current", rationale: "Exception renewed", reviewed_at: "2026-10-11T01:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "release", status: "recorded", outcome: "risk_accept",
        consumes: [{ id: "MET-001", revision: "r3" }], critical_claims: [],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan2.md", sha256: planHash2 }], decided_at: "2026-10-11T01:00:00Z", rationale: "Exception renewed for r2", uncertainties: ["No baseline"], revisit_triggers: ["T"],
        supersedes: { id: "DEC-030", revision: "r1" },
      },
    };

    const met1_r3 = {
      ...met1_r2, revision: "r3", depends_on: [{ id: "SRC-002", revision: "r1" }],
      data: {
        ...met1_r2.data,
        query: { id: "SRC-002", revision: "r1" },
        query_revision: "r1",
        baseline_exception: { id: "DEC-031", revision: "r1" },
        guardrail: "Changed guardrail after instrumenting",
      },
    };
    const oldExceptionMaterialMetric = {
      ...met1_r3,
      data: { ...met1_r3.data, baseline_exception: { id: "DEC-030", revision: "r1" } },
    };
    const materialChangeLedger = {
      ...changedLedger,
      records: changedLedger.records.map((record) => record.id === "MET-001" ? oldExceptionMaterialMetric : record),
      record_history: [...changedLedger.record_history, met1_r2],
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(materialChangeLedger, null, 2));
    const oldPlanAfterMaterialChange = await validateProductEvidence(materialChangeLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T01:30:00Z", gate: "experiment",
    });
    assert.equal(oldPlanAfterMaterialChange.valid, true);
    assert.equal(oldPlanAfterMaterialChange.readiness, "blocked");
    assert.ok(oldPlanAfterMaterialChange.issues.some((issue) =>
      issue.code === "OBSOLETE_BINDING" && issue.record_id === "DEC-003" && issue.severity === "gap"
    ));
    await assertCliParity(materialChangeLedger, "experiment", "2026-10-11T01:30:00Z", {
      exit: 3,
      result: expectedEnvelope("experiment", "blocked", "inconclusive", ["DEC-003", "DEC-020", "DEC-030"], [
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/0", record_id: "DEC-020",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "warning", path: "/records/1", record_id: "DEC-030",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "OBSOLETE_BINDING", severity: "gap", path: "/records/2", record_id: "DEC-003",
          message: "Recorded proof binds an obsolete retained revision.",
        },
        {
          code: "EVIDENCE_UNAVAILABLE", severity: "gap", path: "/records/5", record_id: "MET-001",
          message: "Experiment authorization requires current compatible instrumented primary and guardrail metrics with query bindings.",
        },
      ]),
    });

    const exp1_r2 = {
      ...exp1_r1, revision: "r2",
      depends_on: [{ id: "HYP-001", revision: "r1" }, { id: "MET-001", revision: "r3" }],
      data: {
        ...exp1_r1.data,
        primary_metric: { id: "MET-001", revision: "r3" },
        guardrails: [{ id: "MET-001", revision: "r3" }],
        authorization: { id: "DEC-004", revision: "r1" },
      },
    };

    const dec004_r1 = {
      id: "DEC-004", kind: "DEC", revision: "r1", owner: "PO", scope, depends_on: [{ id: "EXP-001", revision: "r2" }],
      freshness: { status: "current", rationale: "Renewed plan auth", reviewed_at: "2026-10-11T01:30:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "experiment", status: "recorded", outcome: "authorize",
        consumes: [{ id: "EXP-001", revision: "r2" }], critical_claims: [],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan2.md", sha256: planHash2 }], decided_at: "2026-10-11T01:30:00Z", rationale: "Renewed plan", uncertainties: [], revisit_triggers: ["T"],
        supersedes: { id: "DEC-003", revision: "r1" },
      },
    };

    const dec021_r1 = {
      id: "DEC-021", kind: "DEC", revision: "r1", owner: "Release Manager", scope,
      depends_on: [{ id: "MET-001", revision: "r3" }, { id: "DEC-040", revision: "r1" }, { id: "CLM-010", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-11T01:30:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        purpose: "release", status: "recorded", outcome: "authorize",
        consumes: [{ id: "MET-001", revision: "r3" }], critical_claims: [{ id: "CLM-010", revision: "r1" }],
        authority_id: "AUTH-003", authority_revision: "release-r1", strategy_binding: null,
        artifact_bindings: [{ path: "plan2.md", sha256: planHash2 }], decided_at: "2026-10-11T01:30:00Z", rationale: "Release authorize renewed", uncertainties: [], revisit_triggers: ["T"],
        supersedes: { id: "DEC-020", revision: "r1" },
      },
    };

    const recoveredRecords = [
      dec021_r1, dec031_r1, dec004_r1, dec020_r1, dec030_r1, dec003_r1,
      uatDecision, dec010, met1_r3, hyp1_r1, opp1_r1, exp1_r2, inv010, src1, src2, src010,
      claim010, metric010, opportunity010, hypothesis010, experiment010, authorization010,
    ];
    const recoveredRecordHistory = [met1_r1, met1_r2, exp1_r1];
    const recoveredState = {
      ...stateObj,
      decision: { id: "DEC-004", revision: "r1" },
      assessed_at: "2026-10-11T01:30:00Z",
      history: [{ from: "unvalidated", to: "validating", at: "2026-10-11T01:30:00Z", reason: "Renewed plan authorized", decision: { id: "DEC-004", revision: "r1" } }],
    };

    const recoveredLedger = {
      ...baseLedger,
      records: recoveredRecords,
      bridges: [...bridges, { record: { id: "DEC-021", revision: "r1" }, authority_id: "AUTH-002", authority_revision: `sha256:${requirementsHash}`, ids: ["REQ-001", "AC-001"] }],
      record_history: recoveredRecordHistory,
      product_state: recoveredState,
      updated_at: "2026-10-11T02:00:00Z",
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(recoveredLedger, null, 2));

    const resRecovered = await validateProductEvidence(recoveredLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T02:00:00Z", gate: "release",
    });

    assert.equal(resRecovered.valid, true, JSON.stringify(resRecovered.issues));
    assert.equal(resRecovered.readiness, "eligible_for_host_check");
    assert.deepEqual(resRecovered.affected_decisions, []);
    assert.deepEqual(resRecovered, expectedEnvelope("release", "eligible_for_host_check", "validating"));
    await assertCliParity(recoveredLedger, "release", "2026-10-11T02:00:00Z", {
      exit: 0, result: expectedEnvelope("release", "eligible_for_host_check", "validating"),
    });
    for (const [id, bytes] of originalDecisionBytes) {
      assert.equal(JSON.stringify(recoveredRecords.find((record) => record.id === id)), bytes, `${id} was mutated during plan recovery`);
    }

    const recoveredExperiment = await validateProductEvidence(recoveredLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T02:00:00Z", gate: "experiment",
    });
    assert.equal(recoveredExperiment.valid, true, JSON.stringify(recoveredExperiment.issues));
    assert.equal(recoveredExperiment.readiness, "eligible_for_host_check");
    assert.deepEqual(recoveredExperiment.affected_decisions, []);
    assert.deepEqual(recoveredExperiment, expectedEnvelope("experiment", "eligible_for_host_check", "validating"));
    await assertCliParity(recoveredLedger, "experiment", "2026-10-11T02:00:00Z", {
      exit: 0, result: expectedEnvelope("experiment", "eligible_for_host_check", "validating"),
    });

    const recoveredLedger010 = { ...recoveredLedger, product_state: changedLedger010.product_state };
    assert.deepEqual(recoveredLedger010.product_state.history, changedLedger010.product_state.history);
    assert.equal(JSON.stringify(recoveredLedger010.records.find((record) => record.id === "DEC-010")), originalDecisionBytes.get("DEC-010"));
    const recovered010Commit = await validateProductEvidence(recoveredLedger010, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T02:00:00Z", gate: "commit",
    });
    assert.equal(recovered010Commit.valid, true, JSON.stringify(recovered010Commit.issues));
    assert.equal(recovered010Commit.readiness, "eligible_for_host_check");
    assert.deepEqual(recovered010Commit, expectedEnvelope("commit", "eligible_for_host_check", "validated_for_scope"));
    await assertCliParity(recoveredLedger010, "commit", "2026-10-11T02:00:00Z", {
      exit: 0, result: expectedEnvelope("commit", "eligible_for_host_check", "validated_for_scope"),
    });
  } finally {
    cleanupTempRoot(root);
  }
});

test("7. Adversarial and Error Mutation Vectors (Section 7)", async () => {
  const root = createTempRoot();
  try {
    const scope = { segment: "s", geography: "g", window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" } };
    const baseLedger = {
      schema_version: 1,
      slug: "mutation-test",
      product_id: "mut-product",
      revision: "r1",
      synthetic: false,
      updated_at: "2026-10-11T10:00:00Z",
      strategy_authority: null,
      strategy_gap: "Gap",
      authorities: [],
      authority_history: [],
      records: [
        {
          id: "SRC-001", kind: "SRC", revision: "r1", owner: "O", scope,
          depends_on: [],
          freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
          data: {
            locator: { kind: "external", uri: "urn:src:001", snapshot_sha256: null },
            origin: { publisher: "P", origin_id: "urn:orig:001", classification: "primary", revision: "r1", observed_at: "2026-10-01T00:00:00Z", scope },
            retrieved_at: "2026-10-10T00:00:00Z", privacy: { classification: "public", redaction: "none", access: "available" },
            license: { identifier: "MIT", usage: "reuse_permitted", restrictions: [] }, status: "available", limitations: [],
          },
        },
      ],
      record_history: [],
      bridges: [],
      product_state: {
        value: "unvalidated", reason: "R",
        scope, hypotheses: [], decision: null, assessed_at: "2026-10-11T10:00:00Z", history: [],
      },
    };

    const ledgerPath = path.join(root, "evidence.json");
    const opaqueQueryRevision = "publisher/revision:2026-10-01";
    const metric = {
      id: "MET-001", kind: "MET", revision: "r1", owner: "Analytics", scope,
      depends_on: [{ id: "SRC-001", revision: "r1" }],
      freshness: { status: "current", rationale: "Opaque origin token fixture", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["query change"] },
      data: {
        definition: "Fixture metric", unit: "count", denominator: "fixture rows",
        query: { id: "SRC-001", revision: "r1" }, query_revision: opaqueQueryRevision,
        baseline: null, baseline_exception: null,
        comparison_window: scope.window, eligibility: "Fixture only", target: "not a product claim",
        guardrail: "No action", measurement_owner: "Fixture", review_trigger: "Query change", status: "instrumented",
      },
    };
    const opaqueLedger = {
      ...baseLedger,
      records: [
        { ...baseLedger.records[0], data: { ...baseLedger.records[0].data, origin: { ...baseLedger.records[0].data.origin, revision: opaqueQueryRevision } } },
        metric,
      ],
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(opaqueLedger, null, 2));
    const opaqueResult = await validateProductEvidence(opaqueLedger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z", gate: "structural",
    });
    assert.equal(opaqueResult.valid, true, JSON.stringify(opaqueResult.issues));
    const opaqueCli = spawnSync(process.execPath, [
      VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", "2026-10-11T10:00:00Z", "--gate", "structural",
    ], { encoding: "utf8" });
    assert.equal(opaqueCli.status, 0, opaqueCli.stderr);
    assert.deepEqual(opaqueResult, expectedEnvelope("structural", "not_assessed", "unvalidated"));
    assert.deepEqual(JSON.parse(opaqueCli.stdout), expectedEnvelope("structural", "not_assessed", "unvalidated"));

    const malformedQueryPair = {
      ...opaqueLedger,
      records: opaqueLedger.records.map((record) => record.id === "MET-001"
        ? { ...record, data: { ...record.data, query: null } }
        : record),
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(malformedQueryPair, null, 2));
    const malformedResult = await validateProductEvidence(malformedQueryPair, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z", gate: "structural",
    });
    const malformedIssues = [
      {
        code: "INVALID_FIELD", severity: "error", path: "/records/1/data/query", record_id: "MET-001",
        message: "Observed/instrumented MET requires query ref and query_revision.",
      },
      {
        code: "INVALID_FIELD", severity: "error", path: "/records/1/data/query_revision", record_id: "MET-001",
        message: "query and query_revision must both be null or both be present.",
      },
    ];
    assert.equal(malformedResult.readiness, "blocked");
    assert.equal(malformedResult.effective_product_state, null);
    assert.deepEqual(malformedResult.issues, malformedIssues);
    const malformedCli = spawnSync(process.execPath, [
      VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", "2026-10-11T10:00:00Z", "--gate", "structural",
    ], { encoding: "utf8" });
    assert.equal(malformedCli.status, 1, malformedCli.stderr);
    const malformedCliResult = JSON.parse(malformedCli.stdout);
    assert.equal(malformedCliResult.valid, false);
    assert.equal(malformedCliResult.readiness, "blocked");
    assert.equal(malformedCliResult.effective_product_state, null);
    assert.deepEqual(malformedCliResult.issues, malformedIssues);

    fs.writeFileSync(ledgerPath, JSON.stringify(baseLedger, null, 2));

    // 1. UNSUPPORTED_VERSION
    const mutVer = JSON.parse(JSON.stringify(baseLedger));
    mutVer.schema_version = 2;
    fs.writeFileSync(ledgerPath, JSON.stringify(mutVer, null, 2));
    const resVer = await validateProductEvidence(mutVer, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resVer.valid, false);
    assert.equal(resVer.readiness, "blocked");
    assert.equal(resVer.effective_product_state, null);
    assert.ok(resVer.issues.some((i) => i.code === "UNSUPPORTED_VERSION"));

    // 2. INVALID_TRANSITION
    const mutTrans = JSON.parse(JSON.stringify(baseLedger));
    mutTrans.product_state.value = "validated_for_scope";
    fs.writeFileSync(ledgerPath, JSON.stringify(mutTrans, null, 2));
    const resTrans = await validateProductEvidence(mutTrans, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resTrans.valid, false);
    assert.ok(resTrans.issues.some((i) => i.code === "INVALID_TRANSITION"));

    // 3. DUPLICATE_ID
    const mutDup = JSON.parse(JSON.stringify(baseLedger));
    mutDup.records.push(JSON.parse(JSON.stringify(baseLedger.records[0])));
    fs.writeFileSync(ledgerPath, JSON.stringify(mutDup, null, 2));
    const resDup = await validateProductEvidence(mutDup, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resDup.valid, false);
    assert.ok(resDup.issues.some((i) => i.code === "DUPLICATE_ID"));

    // 4. DEPENDENCY_CYCLE
    const mutCycle = JSON.parse(JSON.stringify(baseLedger));
    mutCycle.records[0].depends_on = [{ id: "SRC-001", revision: "r1" }];
    fs.writeFileSync(ledgerPath, JSON.stringify(mutCycle, null, 2));
    const resCycle = await validateProductEvidence(mutCycle, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resCycle.valid, false);
    assert.ok(resCycle.issues.some((i) => i.code === "DEPENDENCY_CYCLE"));

    // 5. UNSAFE_PATH (Traversal ..)
    const mutPath = JSON.parse(JSON.stringify(baseLedger));
    mutPath.records[0].data.locator = { kind: "local", path: "../private.txt", sha256: "0".repeat(64) };
    fs.writeFileSync(ledgerPath, JSON.stringify(mutPath, null, 2));
    const resPath = await validateProductEvidence(mutPath, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resPath.valid, false);
    assert.ok(resPath.issues.some((i) => i.code === "UNSAFE_PATH"));

    // 6. UNSAFE_PATH (URI with token)
    const mutUri = JSON.parse(JSON.stringify(baseLedger));
    mutUri.records[0].data.locator = { kind: "external", uri: "https://example.invalid/?token=secret", snapshot_sha256: null };
    fs.writeFileSync(ledgerPath, JSON.stringify(mutUri, null, 2));
    const resUri = await validateProductEvidence(mutUri, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resUri.valid, false);
    assert.ok(resUri.issues.some((i) => i.code === "UNSAFE_PATH"));

    // 7. INVALID_FIELD (Unexpected property)
    const mutField = JSON.parse(JSON.stringify(baseLedger));
    mutField.records[0].unexpected_human_name = "Jane Doe";
    fs.writeFileSync(ledgerPath, JSON.stringify(mutField, null, 2));
    const resField = await validateProductEvidence(mutField, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resField.valid, false);
    assert.ok(resField.issues.some((i) => i.code === "INVALID_FIELD"));
    const badMetricLedger = JSON.parse(JSON.stringify(baseLedger));
    badMetricLedger.records.push({
      id: "MET-001", kind: "MET", revision: "r1", owner: "Analytics", scope, depends_on: [],
      freshness: { status: "current", rationale: "Observed", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["query changes"] },
      data: {
        definition: "Conversion", unit: "percent", denominator: "eligible sessions",
        query: { id: "SRC-001", revision: "r1" }, query_revision: "forged-origin-revision",
        baseline: null, baseline_exception: null,
        comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "Fixture only", target: "10", guardrail: "No production action",
        measurement_owner: "Analytics", review_trigger: "Query changes", status: "observed",
      },
    });
    fs.writeFileSync(ledgerPath, JSON.stringify(badMetricLedger, null, 2));
    const resQueryRevision = await validateProductEvidence(badMetricLedger, { authorityRoot: root, ledgerPath, asOf: "2026-10-11T10:00:00Z" });
    assert.equal(resQueryRevision.valid, false);
    assert.ok(resQueryRevision.issues.some((issue) =>
      issue.code === "INVALID_FIELD" && issue.path === "/records/1/data/query_revision"
    ));
    const malformedBaseline = JSON.parse(JSON.stringify(baseLedger));
    malformedBaseline.records.push({
      id: "MET-001", kind: "MET", revision: "r1", owner: "Analytics", scope, depends_on: [{ id: "SRC-001", revision: "r1" }],
      freshness: { status: "current", rationale: "R", reviewed_at: "2026-10-10T00:00:00Z", expires_at: "2026-11-01T00:00:00Z", review_triggers: ["T"] },
      data: {
        definition: "Conversion", unit: "percent", denominator: "eligible sessions",
        query: null, query_revision: null,
        baseline: { value: 12, source: { id: "SRC-001", revision: "r1" }, window: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" } },
        baseline_exception: null, comparison_window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
        eligibility: "Fixture only", target: "10", guardrail: "No production action",
        measurement_owner: "Analytics", review_trigger: "Query changes", status: "planned",
      },
    });
    const malformedBaselinePath = path.join(root, "malformed-baseline.json");
    fs.writeFileSync(malformedBaselinePath, JSON.stringify(malformedBaseline, null, 2));
    const baselineResult = await validateProductEvidence(malformedBaseline, {
      authorityRoot: root, ledgerPath: malformedBaselinePath, asOf: "2026-10-11T10:00:00Z",
    });
    assert.deepEqual(baselineResult.issues.filter((issue) =>
      issue.code === "INVALID_FIELD" && issue.path === "/records/1/data/baseline/value"
    ).map(({ code, severity, path: issuePath, record_id }) => ({ code, severity, path: issuePath, record_id })),
    [{ code: "INVALID_FIELD", severity: "error", path: "/records/1/data/baseline/value", record_id: "MET-001" }]);
    assert.equal(baselineResult.valid, false);
    const assertShapeMutation = async (name, mutate, expected) => {
      const ledger = JSON.parse(JSON.stringify(baseLedger));
      mutate(ledger);
      const file = path.join(root, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(ledger, null, 2));
      const result = await validateProductEvidence(ledger, { authorityRoot: root, ledgerPath: file, asOf: "2026-10-11T10:00:00Z" });
      assert.equal(result.valid, false, name);
      assert.deepEqual(result.issues.filter((issue) => issue.code === expected.code && issue.path === expected.path)
        .map(({ code, severity, path: issuePath, record_id }) => ({ code, severity, path: issuePath, record_id })),
      [expected], name);
    };
    await assertShapeMutation("restricted-source", (ledger) => {
      ledger.records[0].data.privacy = { classification: "restricted", redaction: "none", access: "available" };
    }, { code: "INVALID_FIELD", severity: "error", path: "/records/0/data/privacy", record_id: "SRC-001" });
    await assertShapeMutation("duplicate-dependency", (ledger) => {
      ledger.records[0].depends_on = [{ id: "SRC-001", revision: "r1" }, { id: "SRC-001", revision: "r1" }];
    }, { code: "INVALID_FIELD", severity: "error", path: "/records/0/depends_on/1", record_id: "SRC-001" });
    await assertShapeMutation("unknown-observation-time", (ledger) => {
      ledger.records[0].data.origin.observed_at = null;
      ledger.records[0].data.limitations = [];
    }, { code: "INVALID_FIELD", severity: "error", path: "/records/0/data/origin/observed_at", record_id: "SRC-001" });
    await assertShapeMutation("invalid-proposed-experiment-date", (ledger) => {
      ledger.records.push({
        id: "EXP-001", kind: "EXP", revision: "r1", owner: "synthetic fixture", scope, depends_on: [],
        freshness: { status: "current", rationale: "fixture", reviewed_at: "2026-10-10T00:00:00Z", expires_at: null, review_triggers: ["review"] },
        data: {
          hypothesis: { id: "HYP-001", revision: "r1" }, method: "fixture", eligibility: "fixture", sample_plan: "fixture",
          primary_metric: { id: "MET-001", revision: "r1" }, guardrails: [],
          rules: { success: "success", failure: "failure", inconclusive: "unclear" },
          bounds: { starts_at: "not-a-UTC-instant", ends_at: "2026-11-01T00:00:00Z", budget_cap: null, currency: null, exposure_cap: null, stop_rules: ["stop"] },
          authorization: null, status: "proposed", result: null,
        },
      });
    }, { code: "INVALID_FIELD", severity: "error", path: "/records/1/data/bounds/starts_at", record_id: "EXP-001" });
    await assertShapeMutation("closed-bridge-reference", (ledger) => {
      ledger.bridges.push({
        record: { id: "SRC-001", revision: "r1", owner: "not-a-ref-field" },
        authority_id: "AUTH-001", authority_revision: "rev1", ids: ["BRD-OBJ-001"],
      });
    }, { code: "INVALID_FIELD", severity: "error", path: "/bridges/0/record/owner", record_id: null });
    const proposalLedger = JSON.parse(JSON.stringify(baseLedger));
    proposalLedger.records.push({
      id: "DEC-001", kind: "DEC", revision: "r1", owner: "synthetic fixture", scope, depends_on: [],
      freshness: { status: "current", rationale: "proposal", reviewed_at: "2026-10-10T00:00:00Z", expires_at: null, review_triggers: ["review"] },
      data: {
        purpose: "investment", status: "proposed", outcome: "reject", consumes: [], critical_claims: [],
        authority_id: null, authority_revision: null, strategy_binding: null, artifact_bindings: [],
        decided_at: null, rationale: "Synthetic proposal only", uncertainties: ["No evidence"], revisit_triggers: ["review"], supersedes: null,
      },
    });
    const proposalPath = path.join(root, "proposal-decision.json");
    fs.writeFileSync(proposalPath, JSON.stringify(proposalLedger, null, 2));
    const proposalResult = await validateProductEvidence(proposalLedger, {
      authorityRoot: root, ledgerPath: proposalPath, asOf: "2026-10-11T10:00:00Z",
    });
    assert.equal(proposalResult.valid, true, JSON.stringify(proposalResult.issues));
    assert.deepEqual(proposalResult.issues, []);

    const opaqueAuthorityLedger = JSON.parse(JSON.stringify(baseLedger));
    opaqueAuthorityLedger.authorities.push({
      id: "AUTH-001", domain: "technical",
      locator: { kind: "external", uri: "urn:publisher:policy:1", snapshot_sha256: null },
      revision: "publisher/revision:2026-10-11", owner: "synthetic publisher", scope,
      declared_ids: ["SRS-001"], access: "unavailable",
    });
    const authorityPath = path.join(root, "opaque-authority.json");
    fs.writeFileSync(authorityPath, JSON.stringify(opaqueAuthorityLedger, null, 2));
    const authorityResult = await validateProductEvidence(opaqueAuthorityLedger, {
      authorityRoot: root, ledgerPath: authorityPath, asOf: "2026-10-11T10:00:00Z",
    });
    assert.equal(authorityResult.valid, true, JSON.stringify(authorityResult.issues));
    assert.deepEqual(authorityResult.issues, []);
  } finally {
    cleanupTempRoot(root);
  }
});

test("8. Specific Review Probes: F01, F03, F04, F08, F09, F10", async () => {
  const root = createTempRoot();
  try {
    const scope = { segment: "s", geography: "g", window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" } };
    const ledger = {
      schema_version: 1, slug: "probe-test", product_id: "probe-product", revision: "r1", synthetic: false,
      updated_at: "2026-10-11T10:00:00Z", strategy_authority: null, strategy_gap: "Gap",
      authorities: [], authority_history: [], records: [], record_history: [], bridges: [],
      product_state: { value: "unvalidated", reason: "R", scope, hypotheses: [], decision: null, assessed_at: "2026-10-11T10:00:00Z", history: [] },
    };
    const ledgerFile = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2));

    // Probe F08: Non-existent ledgerPath in library mode
    const nonExistentPath = path.join(root, "does-not-exist.json");
    const resF08 = await validateProductEvidence(ledger, {
      authorityRoot: root, ledgerPath: nonExistentPath, asOf: "2026-10-11T10:00:00Z",
    });
    assert.equal(resF08.valid, false);
    assert.equal(resF08.readiness, "blocked");
    assert.equal(resF08.effective_product_state, null);
    assert.ok(resF08.issues.some((i) => i.code === "IO_ERROR"));

    // Probe F08: CLI ledger outside authority root
    const outsideRoot = createTempRoot();
    const outsideLedgerFile = path.join(outsideRoot, "outside.json");
    fs.writeFileSync(outsideLedgerFile, JSON.stringify(ledger, null, 2));
    const cliOutsideRun = spawnSync("node", [
      VALIDATOR_CLI, outsideLedgerFile, "--authority-root", root, "--as-of", "2026-10-11T10:00:00Z",
    ], { encoding: "utf8" });
    assert.equal(cliOutsideRun.status, 2);
    const parsedOutside = JSON.parse(cliOutsideRun.stdout);
    assert.ok(parsedOutside.issues.some((i) => i.code === "UNSAFE_PATH"));
    // CLI ledger paths may be relative, but the authority root may not.
    const cliRelativeLedger = spawnSync("node", [
      VALIDATOR_CLI, "evidence.json", "--authority-root", root, "--as-of", "2026-10-11T10:00:00Z", "--gate", "structural",
    ], { encoding: "utf8", cwd: root });
    assert.equal(cliRelativeLedger.status, 0);
    assert.equal(JSON.parse(cliRelativeLedger.stdout).valid, true);
    assert.equal(cliRelativeLedger.stderr, "");

    const cliRelativeRoot = spawnSync("node", [
      VALIDATOR_CLI, "evidence.json", "--authority-root", ".", "--as-of", "2026-10-11T10:00:00Z",
    ], { encoding: "utf8", cwd: root });
    assert.equal(cliRelativeRoot.status, 2);
    assert.ok(JSON.parse(cliRelativeRoot.stdout).issues.some((issue) => issue.code === "INVALID_ARGUMENT"));
    const overCapLedger = { ...ledger, records: Array.from({ length: 2001 }, (_, index) => ({ id: `REC-${index}`, kind: "SRC", revision: "r1" })) };
    const overCapPath = path.join(root, "over-cap.json");
    fs.writeFileSync(overCapPath, JSON.stringify(overCapLedger));
    const overCapResult = await validateProductEvidence(overCapLedger, {
      authorityRoot: root, ledgerPath: overCapPath, asOf: "2026-10-11T10:00:00Z",
    });
    assert.equal(overCapResult.valid, false);
    assert.equal(overCapResult.readiness, "blocked");
    assert.ok(overCapResult.issues.some((issue) => issue.code === "LIMIT_EXCEEDED" && issue.path === "/records"));

    cleanupTempRoot(outsideRoot);

    // Probe F10: CLI --help not standalone
    const cliHelpMixed = spawnSync("node", [
      VALIDATOR_CLI, "--help", "--as-of", "2026-10-11T10:00:00Z",
    ], { encoding: "utf8" });
    assert.equal(cliHelpMixed.status, 2);

    // Probe F10: CLI repeated flag
    const cliRepeatedGate = spawnSync("node", [
      VALIDATOR_CLI, ledgerFile, "--authority-root", root, "--as-of", "2026-10-11T10:00:00Z", "--gate", "structural", "--gate", "structural",
    ], { encoding: "utf8" });
    assert.equal(cliRepeatedGate.status, 2);

    // Probe F10: CLI unsupported version exits 2
    const badVerFile = path.join(root, "bad-version.json");
    fs.writeFileSync(badVerFile, JSON.stringify({ ...ledger, schema_version: 2 }, null, 2));
    const cliVerRun = spawnSync("node", [
      VALIDATOR_CLI, badVerFile, "--authority-root", root, "--as-of", "2026-10-11T10:00:00Z",
    ], { encoding: "utf8" });
    assert.equal(cliVerRun.status, 2);
    const parsedVer = JSON.parse(cliVerRun.stdout);
    assert.equal(parsedVer.readiness, "blocked");
    assert.equal(parsedVer.effective_product_state, null);
    assert.ok(parsedVer.issues.some((i) => i.code === "UNSUPPORTED_VERSION"));
  } finally {
    cleanupTempRoot(root);
  }
});
test("9. Supersession depth includes revoked decisions outside active roots", async () => {
  const root = createTempRoot();
  try {
    const scope = {
      segment: "isolated test",
      geography: "local",
      window: { start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z" },
    };
    const freshness = {
      status: "current", rationale: "Synthetic depth boundary", reviewed_at: "2026-10-10T00:00:00Z",
      expires_at: "2026-11-01T00:00:00Z", review_triggers: ["fixture change"],
    };
    const decisions = Array.from({ length: 66 }, (_, index) => ({
      id: `DEC-${String(index + 100).padStart(3, "0")}`, kind: "DEC", revision: "r1",
      owner: "Synthetic test fixture", scope, depends_on: [], freshness,
      data: {
        purpose: "retirement", status: "revoked", outcome: "reject", consumes: [], critical_claims: [],
        authority_id: null, authority_revision: null, strategy_binding: null,
        artifact_bindings: [{ path: "unread-historical-artifact", sha256: "0".repeat(64) }],
        decided_at: "2026-10-10T00:00:00Z", rationale: "Synthetic imported lineage only",
        uncertainties: ["No real decision"], revisit_triggers: ["fixture change"],
        supersedes: index === 0 ? null : { id: `DEC-${String(index + 99).padStart(3, "0")}`, revision: "r1" },
      },
    }));
    const ledger = {
      schema_version: 1, slug: "revoked-lineage-depth", product_id: "synthetic-lineage",
      revision: "r1", synthetic: true, updated_at: "2026-10-10T00:00:00Z",
      strategy_authority: null, strategy_gap: "Synthetic structural fixture",
      authorities: [], authority_history: [], records: decisions, record_history: [], bridges: [],
      product_state: {
        value: "unvalidated", reason: "Synthetic structural test", scope,
        hypotheses: [], decision: null, assessed_at: "2026-10-10T00:00:00Z", history: [],
      },
    };
    const ledgerPath = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    const result = await validateProductEvidence(ledger, {
      authorityRoot: root, ledgerPath, asOf: "2026-10-10T00:00:00Z", gate: "structural",
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) =>
      issue.code === "LIMIT_EXCEEDED" && issue.severity === "error" && issue.path === "/records"
    ));
    const cli = spawnSync(process.execPath, [
      VALIDATOR_CLI, ledgerPath, "--authority-root", root, "--as-of", "2026-10-10T00:00:00Z", "--gate", "structural",
    ], { encoding: "utf8" });
    assert.equal(cli.status, 2, cli.stderr);
    assert.ok(JSON.parse(cli.stdout).issues.some((issue) => issue.code === "LIMIT_EXCEEDED"));
    assert.equal(cli.stderr, "");
  } finally {
    cleanupTempRoot(root);
  }
});

test("10. RR-01 propagates related exception authority failure through a compatible plan", async () => {
  const { root, ledgerPath, ledger } = createResidualClosureFixture();
  try {
    const eligible = expectedEnvelope("experiment", "eligible_for_host_check", "validating");
    await assertResidualCli(ledger, ledgerPath, root, "experiment", eligible, 0);

    const unavailable = JSON.parse(JSON.stringify(ledger));
    unavailable.authorities.find((authority) => authority.id === "AUTH-702").access = "unavailable";
    const blocked = expectedEnvelope("experiment", "blocked", "inconclusive", ["DEC-701", "DEC-702"], [
      {
        code: "AUTHORITY_UNAVAILABLE", severity: "gap", path: "/records/0", record_id: "DEC-701",
        message: "Recorded proof does not satisfy AUTHORITY_UNAVAILABLE.",
      },
      {
        code: "AUTHORITY_UNAVAILABLE", severity: "gap", path: "/records/1", record_id: "DEC-702",
        message: "Recorded proof does not satisfy AUTHORITY_UNAVAILABLE.",
      },
    ]);
    await assertResidualCli(unavailable, ledgerPath, root, "experiment", blocked, 3);
    assert.ok(!blocked.affected_decisions.includes("DEC-703"), "unrelated decision remains outside the affected closure");
  } finally {
    cleanupTempRoot(root);
  }
});

test("11. RR-01 validates uncertainty on the exception root and propagates its failure", async () => {
  const { root, ledgerPath, ledger } = createResidualClosureFixture();
  try {
    const missingUncertainty = JSON.parse(JSON.stringify(ledger));
    missingUncertainty.records.find((record) => record.id === "DEC-702").data.uncertainties = [];
    const expected = expectedEnvelope("structural", "not_assessed", "inconclusive", ["DEC-701", "DEC-702"], [
      {
        code: "AUTHORIZATION_REQUIRED", severity: "warning", path: "/records/0", record_id: "DEC-701",
        message: "Recorded proof does not satisfy AUTHORIZATION_REQUIRED.",
      },
      {
        code: "AUTHORIZATION_REQUIRED", severity: "warning", path: "/records/1", record_id: "DEC-702",
        message: "Recorded proof does not satisfy AUTHORIZATION_REQUIRED.",
      },
    ]);
    await assertResidualCli(missingUncertainty, ledgerPath, root, "structural", expected, 0);
  } finally {
    cleanupTempRoot(root);
  }
});

test("12. RR-02 State currentness does not inherit a compatible plan waiver", async () => {
  const { root, ledgerPath, ledger } = createResidualClosureFixture();
  try {
    const oldStateHypothesis = JSON.parse(JSON.stringify(ledger));
    oldStateHypothesis.product_state.hypotheses = [{ id: "HYP-701", revision: "h1" }];
    const expected = expectedEnvelope("structural", "not_assessed", "inconclusive", [], [{
      code: "EVIDENCE_UNAVAILABLE", severity: "warning", path: "/product_state/hypotheses/0", record_id: "HYP-701",
      message: "Product state hypothesis is not a current supported pair.",
    }]);
    await assertResidualCli(oldStateHypothesis, ledgerPath, root, "structural", expected, 0);
  } finally {
    cleanupTempRoot(root);
  }
});

test("13. Opaque MET origin tokens and malformed query pairs have exact API and CLI contracts", async () => {
  const { root, ledgerPath, ledger } = createResidualClosureFixture();
  try {
    const opaque = JSON.parse(JSON.stringify(ledger));
    const opaqueRevision = "研究:publisher/2026-Q4 — frozen origin@revision+42";
    opaque.records.find((record) => record.id === "SRC-701").data.origin.revision = opaqueRevision;
    opaque.records.find((record) => record.id === "MET-701").data.query_revision = opaqueRevision;
    await assertResidualCli(opaque, ledgerPath, root, "experiment",
      expectedEnvelope("experiment", "eligible_for_host_check", "validating"), 0);

    const mismatched = JSON.parse(JSON.stringify(ledger));
    mismatched.records.find((record) => record.id === "MET-701").data.query_revision = "publisher/revision:other";
    await assertResidualCli(mismatched, ledgerPath, root, "structural",
      invalidStructuralEnvelope(
        "/records/3/data/query_revision", "MET-701",
        "query_revision must equal the exact query source origin revision.",
      ), 1);

    const unpairedNull = JSON.parse(JSON.stringify(ledger));
    const malformedMetric = unpairedNull.records.find((record) => record.id === "MET-701");
    malformedMetric.data.query = null;
    malformedMetric.data.status = "planned";
    await assertResidualCli(unpairedNull, ledgerPath, root, "structural",
      invalidStructuralEnvelope(
        "/records/3/data/query_revision", "MET-701",
        "query and query_revision must both be null or both be present.",
      ), 1);
  } finally {
    cleanupTempRoot(root);
  }
});

test("14. External authority null snapshot is valid only when access is unavailable", async () => {
  const { root, ledgerPath, ledger } = createResidualClosureFixture();
  try {
    const unavailable = JSON.parse(JSON.stringify(ledger));
    const authority = unavailable.authorities.find((item) => item.id === "AUTH-701");
    authority.access = "unavailable";
    authority.locator.snapshot_sha256 = null;
    const unavailableExpected = expectedEnvelope("structural", "not_assessed", "inconclusive", ["DEC-701"], [{
      code: "AUTHORITY_UNAVAILABLE", severity: "warning", path: "/records/0", record_id: "DEC-701",
      message: "Recorded proof does not satisfy AUTHORITY_UNAVAILABLE.",
    }]);
    await assertResidualCli(unavailable, ledgerPath, root, "structural", unavailableExpected, 0);

    for (const access of ["available", "protected"]) {
      const invalid = JSON.parse(JSON.stringify(ledger));
      const invalidAuthority = invalid.authorities.find((item) => item.id === "AUTH-701");
      invalidAuthority.access = access;
      invalidAuthority.locator.snapshot_sha256 = null;
      const expected = invalidStructuralEnvelope(
        "/authorities/0/locator/snapshot_sha256", "AUTH-701",
        "External snapshot hash can only be null when access is unavailable.",
      );
      await assertResidualCli(invalid, ledgerPath, root, "structural", expected, 1);
    }
  } finally {
    cleanupTempRoot(root);
  }
});
