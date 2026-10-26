// scripts/skill-tests/marketing-measurement/report-marketing.test.mjs
// Comprehensive test suite for marketing measurement CLI and contracts (T02)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT_PATH = path.resolve(REPO_ROOT, "skills/marketing/marketing-measurement/scripts/report-marketing.mjs");
const AUTHORITY_ROOT = path.resolve(REPO_ROOT, "docs/product/evidence-led-marketing");
const FIXTURES_DIR = path.resolve(AUTHORITY_ROOT, "fixtures");

function runCli(args, options = {}) {
  const result = spawnSync("node", [SCRIPT_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env, ...options.env }
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

// --- VER-007: Combined Primary Fixture Acceptance ---

test("VER-007: Combined fixture (4 activations [3 mature, 1 immature], 1 mature repeat, cash 12, hours 6)", () => {
  const inputPath = path.join(FIXTURES_DIR, "synthetic-input-combined.json");
  const asOf = "2026-10-25T00:00:00Z";

  // Test with relative authority-root (the exact form tested by parents and orchestrators)
  const res = runCli([
    inputPath,
    "--authority-root", "docs/product/evidence-led-marketing",
    "--as-of", asOf,
    "--format", "json"
  ]);

  assert.equal(res.status, 0, `CLI failed with status ${res.status}: ${res.stderr || res.stdout}`);
  const output = JSON.parse(res.stdout);

  assert.equal(output.schema_version, 1);
  assert.equal(output.tool, "marketing-scorecard");
  assert.equal(output.synthetic, true);
  assert.equal(output.valid, true);
  assert.equal(output.as_of, asOf);
  assert.equal(output.campaign_id, "standards-demo-01");
  assert.equal(output.input_revision, "syn-r1");
  assert.equal(output.attribution, "descriptive");
  assert.equal(output.recommendation, "inconclusive");
  assert.equal(output.issues.length, 0);

  // Calculation identity check: actual executable hash, NEVER empty-string hash
  assert.equal(output.calculation.revision, "1.0.0");
  assert.match(output.calculation.sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(output.calculation.sha256, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  // Provenance includes ledger, investment, and sources
  assert.ok(output.provenance.some(p => p.alias === "ledger"));
  assert.ok(output.provenance.some(p => p.alias === "investment"));
  assert.ok(output.provenance.some(p => p.alias === "cohort-origin-fixture"));

  // Counts verification
  assert.deepEqual(output.counts, {
    eligible_starters: 5,
    activated: 4,
    immature_activated: 1,
    mature_activated: 3,
    confirmed_repeat_all: 1,
    mature_confirmed_repeat: 1,
    mature_confirmed_no_return: 1,
    mature_unknown: 1,
    excluded_participants: 2,
    duplicate_reports: 1
  });

  // Measures verification
  assert.deepEqual(output.measures.activation_rate, {
    status: "available",
    value: "0.800000",
    unit: "ratio",
    reason: null
  });

  assert.deepEqual(output.measures.repeat_rate, {
    status: "available",
    value: "0.333333",
    unit: "ratio",
    reason: null
  });

  assert.deepEqual(output.measures.cash_total, {
    status: "available",
    value: "12.000000",
    unit: "USD",
    reason: null
  });
  assert.deepEqual(output.measures.hours_total, {
    status: "available",
    value: "6.000000",
    unit: "hours",
    reason: null
  });

  assert.deepEqual(output.measures.cash_per_activation, {
    status: "available",
    value: "3.000000",
    unit: "USD/activation",
    reason: null
  });

  assert.deepEqual(output.measures.cash_per_repeat, {
    status: "available",
    value: "12.000000",
    unit: "USD/repeat",
    reason: null
  });

  assert.deepEqual(output.measures.hours_per_repeat, {
    status: "available",
    value: "6.000000",
    unit: "hours/repeat",
    reason: null
  });

  // financial_roi: canonical calculator base scenario with missing benefits -> unknown_benefit
  assert.deepEqual(output.measures.financial_roi, {
    status: "unavailable",
    value: null,
    unit: "ratio",
    reason: "unknown_benefit"
  });

  assert.deepEqual(output.measures.baseline, {
    status: "unavailable",
    value: null,
    unit: "ratio",
    reason: "baseline_unknown"
  });
});

test("VER-007b: Markdown format parity", () => {
  const inputPath = path.join(FIXTURES_DIR, "synthetic-input-combined.json");
  const asOf = "2026-10-25T00:00:00Z";

  const res = runCli([
    inputPath,
    "--authority-root", "docs/product/evidence-led-marketing",
    "--as-of", asOf,
    "--format", "markdown"
  ]);

  assert.equal(res.status, 0);
  assert.match(res.stdout, /Marketing Scorecard/);
  assert.match(res.stdout, /standards-demo-01/);
  assert.match(res.stdout, /3\.000000/); // cash_per_activation
  assert.match(res.stdout, /12\.000000/); // cash_per_repeat
  assert.match(res.stdout, /6\.000000/); // hours_per_repeat
  assert.match(res.stdout, /0\.333333/); // repeat_rate
});

// --- VER-001: Source-Bound Contracts & Baseline ---

test("VER-001: Missing baseline produces unavailable/baseline_unknown and query revision check", () => {
  const inputPath = path.join(FIXTURES_DIR, "synthetic-input-combined.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);

  assert.equal(res.status, 0);
  const output = JSON.parse(res.stdout);
  assert.equal(output.measures.baseline.status, "unavailable");
  assert.equal(output.measures.baseline.reason, "baseline_unknown");
});

test("VER-001b: Query-origin revision mismatch rejects metric binding", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/query-revision-mismatch.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);

  assert.equal(res.status, 1);
  const output = JSON.parse(res.stdout);
  assert.equal(output.valid, false);
  assert.ok(output.issues.some(i => i.code === "OBSOLETE_BINDING"));
});

// --- VER-002: Activation and Maturity Boundaries ---

test("VER-002: Maturity boundary (Jan 1 12:00:00Z activation: 11:59:59Z immature, 12:00:00Z mature)", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/maturity-boundary.json");

  // As-of Jan 15 11:59:59Z: 14 days not reached -> immature
  const resImmature = runCli([
    inputPath,
    "--authority-root", "docs/product/evidence-led-marketing",
    "--as-of", "2026-01-15T11:59:59Z"
  ]);
  assert.equal(resImmature.status, 0);
  const outImmature = JSON.parse(resImmature.stdout);
  assert.equal(outImmature.counts.activated, 1);
  assert.equal(outImmature.counts.immature_activated, 1);
  assert.equal(outImmature.counts.mature_activated, 0);
  assert.equal(outImmature.measures.repeat_rate.status, "unavailable");
  assert.equal(outImmature.measures.repeat_rate.reason, "zero_mature_denominator");

  // As-of Jan 15 12:00:00Z: exactly 14*24h -> mature
  const resMature = runCli([
    inputPath,
    "--authority-root", "docs/product/evidence-led-marketing",
    "--as-of", "2026-01-15T12:00:00Z"
  ]);
  assert.equal(resMature.status, 0);
  const outMature = JSON.parse(resMature.stdout);
  assert.equal(outMature.counts.activated, 1);
  assert.equal(outMature.counts.immature_activated, 0);
  assert.equal(outMature.counts.mature_activated, 1);
});

// --- VER-003: Repeat Window & UTC Boundaries ---

test("VER-003: Repeat window boundaries (same UTC day excluded, exact +14d included, +1s excluded)", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/repeat-boundaries.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-02-01T00:00:00Z"
  ]);

  assert.equal(res.status, 0);
  const output = JSON.parse(res.stdout);
  assert.equal(output.counts.mature_activated, 4);
  assert.equal(output.counts.mature_confirmed_repeat, 1);
});

// --- VER-004: Nonreturn vs Unknown & Contradiction ---

test("VER-004: Three mature participants: one repeat, one no-return, one unknown -> 0.333333", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/nonreturn-partition.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-02-01T00:00:00Z"
  ]);

  assert.equal(res.status, 0);
  const output = JSON.parse(res.stdout);
  assert.equal(output.counts.mature_activated, 3);
  assert.equal(output.counts.mature_confirmed_repeat, 1);
  assert.equal(output.counts.mature_confirmed_no_return, 1);
  assert.equal(output.counts.mature_unknown, 1);
  assert.equal(output.measures.repeat_rate.value, "0.333333");
});

test("VER-004b: Contradictory qualifying repeat plus full-window no-return rejects snapshot", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/contradictory-reports.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-02-01T00:00:00Z"
  ]);

  assert.equal(res.status, 1);
  const output = JSON.parse(res.stdout);
  assert.equal(output.valid, false);
  assert.ok(output.issues.some(i => i.code === "CONTRADICTORY_REPORTS"));
});

// --- VER-005: Missing & Zero States ---

test("VER-005: Null cohort vs complete empty snapshot vs 2 starters 1 activated", () => {
  // Case A: Null cohort
  const resNull = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/null-cohort.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resNull.status, 0);
  const outNull = JSON.parse(resNull.stdout);
  assert.equal(outNull.counts.eligible_starters, null);
  assert.equal(outNull.measures.activation_rate.status, "unavailable");
  assert.equal(outNull.measures.activation_rate.reason, "cohort_unavailable");

  // Case B: Empty cohort snapshot
  const resEmpty = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/empty-cohort.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resEmpty.status, 0);
  const outEmpty = JSON.parse(resEmpty.stdout);
  assert.equal(outEmpty.counts.eligible_starters, 0);
  assert.equal(outEmpty.measures.activation_rate.status, "unavailable");
  assert.equal(outEmpty.measures.activation_rate.reason, "zero_starter_denominator");

  // Case C: 2 starters, 1 activated = 0.500000
  const resHalf = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/two-starters-one-activated.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resHalf.status, 0);
  const outHalf = JSON.parse(resHalf.stdout);
  assert.equal(outHalf.counts.eligible_starters, 2);
  assert.equal(outHalf.counts.activated, 1);
  assert.equal(outHalf.measures.activation_rate.value, "0.500000");
});

test("VER-005b: Duplicate report collapse vs conflicting ID rejection", () => {
  // Identical duplicate report IDs collapse
  const resCollapse = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/duplicate-report-collapse.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resCollapse.status, 0);
  const outCollapse = JSON.parse(resCollapse.stdout);
  assert.equal(outCollapse.counts.duplicate_reports, 1);

  // Conflicting duplicate report ID rejects input
  const resConflict = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/conflicting-report-ids.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resConflict.status, 1);
  const outConflict = JSON.parse(resConflict.stdout);
  assert.equal(outConflict.valid, false);
  assert.ok(outConflict.issues.some(i => i.code === "CONFLICTING_REPORT"));
});

// --- VER-006: Missing Costs & Zero Repeats ---

test("VER-006: Positive cash with zero repeats -> unavailable ratio; missing cash -> unknown", () => {
  // Positive cash, zero mature repeats
  const resZeroRep = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/zero-repeats-positive-cash.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resZeroRep.status, 0);
  const outZeroRep = JSON.parse(resZeroRep.stdout);
  assert.equal(outZeroRep.measures.cash_per_repeat.status, "unavailable");
  assert.equal(outZeroRep.measures.cash_per_repeat.reason, "zero_repeat_denominator");

  // Missing cash (cost_mapping is null)
  const resNoCost = runCli([
    path.join(FIXTURES_DIR, "fixtures-edge/missing-cost-mapping.json"),
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);
  assert.equal(resNoCost.status, 0);
  const outNoCost = JSON.parse(resNoCost.stdout);
  assert.equal(outNoCost.measures.cash_total.status, "unavailable");
  assert.equal(outNoCost.measures.cash_total.reason, "unknown_cost");
  assert.equal(outNoCost.measures.cash_per_activation.status, "unavailable");
  assert.equal(outNoCost.measures.cash_per_activation.reason, "unknown_cost");
});

// --- VER-007c: Known Zero Cash Efficiency & Zero Cost Precedence ---

test("VER-007c: Known cash 0, hours 6, two mature repeats -> cash/repeat 0.000000, hours/repeat 3.000000; zero cost ROI", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/zero-cash-six-hours.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);

  assert.equal(res.status, 0);
  const output = JSON.parse(res.stdout);
  assert.equal(output.measures.cash_total.value, "0.000000");
  assert.equal(output.measures.hours_total.value, "6.000000");
  assert.equal(output.measures.cash_per_repeat.value, "0.000000");
  assert.equal(output.measures.hours_per_repeat.value, "3.000000");

  // Canonical financial calculator precedence: zero cost yields undefined / zero_cost
  assert.equal(output.measures.financial_roi.status, "undefined");
  assert.equal(output.measures.financial_roi.reason, "zero_cost");
});

// --- VER-008: Real Dependency Preflight (No Mock) ---

test("VER-008: Real missing PM dependency produces capability gap exit 2 without mock", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mkt-preflight-"));
  try {
    const isolatedSkillDir = path.join(tmpDir, "skills/marketing/marketing-measurement");
    fs.mkdirSync(path.join(isolatedSkillDir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(isolatedSkillDir, "assets"), { recursive: true });

    // Copy script and schemas to isolated location without sibling product-management
    fs.copyFileSync(SCRIPT_PATH, path.join(isolatedSkillDir, "scripts/report-marketing.mjs"));
    fs.copyFileSync(
      path.resolve(REPO_ROOT, "skills/marketing/marketing-measurement/assets/measurement-input.schema.json"),
      path.join(isolatedSkillDir, "assets/measurement-input.schema.json")
    );
    fs.copyFileSync(
      path.resolve(REPO_ROOT, "skills/marketing/marketing-measurement/assets/scorecard.schema.json"),
      path.join(isolatedSkillDir, "assets/scorecard.schema.json")
    );

    const isolatedScriptPath = path.join(isolatedSkillDir, "scripts/report-marketing.mjs");
    const res = spawnSync("node", [
      isolatedScriptPath,
      path.join(FIXTURES_DIR, "synthetic-input-combined.json"),
      "--authority-root", AUTHORITY_ROOT,
      "--as-of", "2026-10-25T00:00:00Z"
    ], {
      cwd: REPO_ROOT,
      encoding: "utf-8"
    });

    assert.equal(res.status, 2);
    const output = JSON.parse(res.stdout);
    assert.ok(output.issues.some(i => i.code === "CAPABILITY_GAP"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// --- VER-011: Privacy, Redaction & Sentinel Sanitization ---

test("VER-011: Absent/withdrawn participants excluded; no private identifiers echoed", () => {
  const inputPath = path.join(FIXTURES_DIR, "synthetic-input-combined.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);

  assert.equal(res.status, 0);
  const rawStdout = res.stdout;

  assert.doesNotMatch(rawStdout, /usr-secret-internal-key/);
  assert.doesNotMatch(rawStdout, /user_private_email@example\.com/);
  assert.doesNotMatch(rawStdout, /private-task-code-description/);
  assert.doesNotMatch(rawStdout, new RegExp(FIXTURES_DIR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const output = JSON.parse(rawStdout);
  assert.equal(output.counts.excluded_participants, 2); // 1 withdrawn, 1 bot
});

test("VER-011b: Error diagnostics do not echo tainted free-text or paths", () => {
  const inputPath = path.join(FIXTURES_DIR, "fixtures-edge/tainted-input.json");
  const res = runCli([
    inputPath,
    "--authority-root", AUTHORITY_ROOT,
    "--as-of", "2026-10-25T00:00:00Z"
  ]);

  assert.ok(res.status !== 0);
  const combinedOut = (res.stdout + res.stderr);

  assert.doesNotMatch(combinedOut, /TAINTED_SECRET_INJECTED_STRING/);
  assert.doesNotMatch(combinedOut, /\/private\/etc\/passwd/);
});

test("VER-011c: Invalid as-of sentinel string is never leaked in Markdown or JSON envelopes", () => {
  const inputPath = path.join(FIXTURES_DIR, "synthetic-input-combined.json");
  const sentinel = "PRIVATE_REVIEW_SENTINEL";

  // Test Markdown format
  const resMd = runCli([
    inputPath,
    "--authority-root", "docs/product/evidence-led-marketing",
    "--as-of", sentinel,
    "--format", "markdown"
  ]);

  assert.equal(resMd.status, 2);
  assert.doesNotMatch(resMd.stdout, /PRIVATE_REVIEW_SENTINEL/);
  assert.doesNotMatch(resMd.stderr, /PRIVATE_REVIEW_SENTINEL/);

  // Test JSON format
  const resJson = runCli([
    inputPath,
    "--authority-root", "docs/product/evidence-led-marketing",
    "--as-of", sentinel,
    "--format", "json"
  ]);

  assert.equal(resJson.status, 2);
  assert.doesNotMatch(resJson.stdout, /PRIVATE_REVIEW_SENTINEL/);
  const output = JSON.parse(resJson.stdout);
  assert.equal(output.as_of, null);
  assert.ok(output.issues.some(i => i.code === "INVALID_TIMESTAMP"));
});
