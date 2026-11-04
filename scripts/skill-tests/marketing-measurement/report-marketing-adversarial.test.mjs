// scripts/skill-tests/marketing-measurement/report-marketing-adversarial.test.mjs
// Regression tests for runtime-confirmed T02 defects: nested timestamp/type validation,
// exact ledger/source binding, projection privacy, four-decimal hours, real schema
// application, and standard/flattened installed-layout execution.

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
const COMBINED_FIXTURE = path.join(AUTHORITY_ROOT, "fixtures/synthetic-input-combined.json");
const AS_OF = "2026-10-25T00:00:00Z";

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Self-contained authority snapshot: real ledger + real fixture artifacts, no symlinks.
function makeAuthoritySnapshot() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mkt-adv-")));
  fs.copyFileSync(path.join(AUTHORITY_ROOT, "evidence.json"), path.join(root, "evidence.json"));
  fs.cpSync(path.join(AUTHORITY_ROOT, "fixtures"), path.join(root, "fixtures"), { recursive: true });
  return root;
}

function writeInput(root, input, name = "input.json") {
  const target = path.join(root, name);
  fs.writeFileSync(target, JSON.stringify(input, null, 2));
  return target;
}

function runCli(inputPath, root = AUTHORITY_ROOT, extraArgs = []) {
  return spawnSync("node", [
    SCRIPT_PATH,
    inputPath,
    "--authority-root", root,
    "--as-of", AS_OF,
    ...extraArgs
  ], {
    cwd: REPO_ROOT,
    encoding: "utf-8"
  });
}

function parseEnvelope(res) {
  try {
    return JSON.parse(res.stdout);
  } catch {
    assert.fail(`CLI did not emit JSON (status ${res.status}, stderr: ${res.stderr})`);
  }
}

function combinedInput() {
  return readJson(COMBINED_FIXTURE);
}

function assertNoLeak(res, sentinel) {
  assert.ok(!res.stdout.includes(sentinel), `stdout leaked ${sentinel}`);
  assert.ok(!res.stderr.includes(sentinel), `stderr leaked ${sentinel}`);
}

// --- DEF-01: nested types and UTC calendar timestamps are validated before arithmetic ---

test("DEF-01: invalid report timestamps/types/closed fields reject before temporal arithmetic", () => {
  const cases = [
    {
      label: "sentinel reported_at on every repeat copy",
      mutate: (input) => {
        for (const report of input.cohort.reports) {
          if (report.kind === "repeat") report.reported_at = "PRIVATE_INVALID_TIMESTAMP";
        }
      },
      expectedCode: "INVALID_TIMESTAMP",
      sentinel: "PRIVATE_INVALID_TIMESTAMP"
    },
    {
      label: "calendar-impossible reported_at",
      mutate: (input) => {
        for (const report of input.cohort.reports) {
          if (report.kind === "repeat") report.reported_at = "2026-02-30T00:00:00Z";
        }
      },
      expectedCode: "INVALID_TIMESTAMP",
      sentinel: "2026-02-30T00:00:00Z"
    },
    {
      label: "null reported_at",
      mutate: (input) => {
        input.cohort.reports[2].reported_at = null;
      },
      expectedCode: "SCHEMA_ERROR"
    },
    {
      label: "missing occurred_at",
      mutate: (input) => {
        delete input.cohort.reports[2].occurred_at;
      },
      expectedCode: "SCHEMA_ERROR",
      expectedPath: "/cohort/reports/2/occurred_at"
    },
    {
      label: "unknown enum kind",
      mutate: (input) => {
        input.cohort.reports[2].kind = "Repeat";
      },
      expectedCode: "SCHEMA_ERROR"
    },
    {
      label: "unrecognized nested report key",
      mutate: (input) => {
        input.cohort.reports[2].PRIVATE_NESTED_KEY = "PRIVATE_NESTED_SENTINEL";
      },
      expectedCode: "UNKNOWN_PROPERTY",
      sentinel: "PRIVATE_NESTED_KEY"
    }
  ];

  for (const testCase of cases) {
    const root = makeAuthoritySnapshot();
    try {
      const input = combinedInput();
      testCase.mutate(input);
      const res = runCli(writeInput(root, input), root);
      assert.equal(res.status, 1, `${testCase.label}: expected exit 1, got ${res.status}`);
      const output = parseEnvelope(res);
      assert.equal(output.valid, false, testCase.label);
      const issue = output.issues.find(i => i.code === testCase.expectedCode);
      assert.ok(issue, `${testCase.label}: missing ${testCase.expectedCode} in ${JSON.stringify(output.issues)}`);
      if (testCase.expectedPath) assert.equal(issue.path, testCase.expectedPath, testCase.label);
      if (testCase.expectedCode === "UNKNOWN_PROPERTY") assert.equal(issue.path, "/", testCase.label);
      if (testCase.sentinel) assertNoLeak(res, testCase.sentinel);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

// --- DEF-02: exact id+revision and locator SHA binding, no id-only lookup ---

test("DEF-02: task and cohort sources require exact current ledger revision plus locator SHA", () => {
  // 1. Nonexistent task revision declared consistently in sources and task_ref.
  {
    const root = makeAuthoritySnapshot();
    try {
      const input = combinedInput();
      for (const source of input.sources) {
        if (source.ref.id === "SRC-003") source.ref.revision = "nonexistent-revision";
      }
      for (const report of input.cohort.reports) {
        if (report.task_ref && report.task_ref.id === "SRC-003") report.task_ref.revision = "nonexistent-revision";
      }
      const res = runCli(writeInput(root, input), root);
      assert.equal(res.status, 1);
      const output = parseEnvelope(res);
      assert.equal(output.valid, false);
      assert.ok(output.issues.some(i => i.code === "TASK_REF_MISSING"), JSON.stringify(output.issues));
      assert.ok(!JSON.stringify(output.issues).includes("nonexistent-revision"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // 2. Task revision changed without the matching source declaration.
  {
    const root = makeAuthoritySnapshot();
    try {
      const input = combinedInput();
      for (const report of input.cohort.reports) {
        if (report.task_ref && report.task_ref.id === "SRC-003") report.task_ref.revision = "r2";
      }
      const res = runCli(writeInput(root, input), root);
      assert.equal(res.status, 1);
      const output = parseEnvelope(res);
      assert.ok(output.issues.some(i => i.code === "TASK_REF_MISSING"), JSON.stringify(output.issues));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // 3. Verified source bytes differ from the ledger locator for the declared revision.
  {
    const root = makeAuthoritySnapshot();
    try {
      const input = combinedInput();
      const source = input.sources.find(s => s.ref.id === "SRC-001");
      source.path = "fixtures/synthetic-task-evidence.json";
      source.sha256 = "884e1156daf1594827d322a6bd66468d63c4ab09546b5cf27db1eb16070509f4";
      const res = runCli(writeInput(root, input), root);
      assert.equal(res.status, 1);
      const output = parseEnvelope(res);
      assert.equal(output.valid, false);
      assert.ok(output.issues.some(i => i.code === "OBSOLETE_BINDING"), JSON.stringify(output.issues));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

// --- DEF-03: no identity or provenance projection from unvalidated input ---

test("DEF-03: invalid revision/projection never leaks objects or declared-unverified hashes", () => {
  const root = makeAuthoritySnapshot();
  try {
    const input = combinedInput();
    input.revision = "";
    input.public_projection.campaign_id = { private_contact: "PRIVATE_PROJECTION_SENTINEL" };
    const res = runCli(writeInput(root, input), root);

    assert.equal(res.status, 1);
    assertNoLeak(res, "PRIVATE_PROJECTION_SENTINEL");
    assertNoLeak(res, "private_contact");

    const output = parseEnvelope(res);
    assert.equal(output.valid, false);
    assert.equal(output.campaign_id, null);
    assert.equal(output.input_revision, null);
    assert.deepEqual(output.provenance, []);
    assert.ok(output.limitations.includes("public_identity_unavailable"));
    assert.ok(output.issues.some(i => i.code === "SCHEMA_ERROR"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("DEF-03b: valid input without public projection renders null identity and unavailable aliases", () => {
  const root = makeAuthoritySnapshot();
  try {
    const input = combinedInput();
    input.public_projection = null;
    const res = runCli(writeInput(root, input), root);

    assert.equal(res.status, 0);
    const output = parseEnvelope(res);
    assert.equal(output.valid, true);
    assert.equal(output.campaign_id, null);
    assert.equal(output.input_revision, null);
    assert.ok(output.limitations.includes("public_identity_unavailable"));
    assert.ok(output.provenance.length >= 4);
    assert.ok(output.provenance.some(p => p.alias === "unavailable"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// --- DEF-04: four-decimal capacity hours remain exact ---

test("DEF-04: capacity amount 0.0001 yields hours 0.000100, not 0.000000", () => {
  const root = makeAuthoritySnapshot();
  try {
    const investment = readJson(path.join(AUTHORITY_ROOT, "fixtures/synthetic-investment.json"));
    investment.scenarios[0].items.find(item => item.id === "cost-hours-prep-01").amount = "0.0001";
    const investmentPath = path.join(root, "fixtures/investment-subcent-hours.json");
    fs.writeFileSync(investmentPath, JSON.stringify(investment, null, 2));
    const investmentSha = sha256File(investmentPath);

    // Keep the ledger locator, input hash, and source hash mutually consistent.
    const ledger = readJson(path.join(root, "evidence.json"));
    const src002 = ledger.records.find(record => record.id === "SRC-002");
    src002.data.locator.path = "fixtures/investment-subcent-hours.json";
    src002.data.locator.sha256 = investmentSha;
    const ledgerPath = path.join(root, "evidence.json");
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    const ledgerSha = sha256File(ledgerPath);

    const input = combinedInput();
    input.ledger.sha256 = ledgerSha;
    input.investment = { path: "fixtures/investment-subcent-hours.json", sha256: investmentSha };
    const source = input.sources.find(s => s.ref.id === "SRC-002");
    source.path = "fixtures/investment-subcent-hours.json";
    source.sha256 = investmentSha;

    const res = runCli(writeInput(root, input), root);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const output = parseEnvelope(res);
    assert.equal(output.valid, true);
    assert.equal(output.measures.hours_total.value, "0.000100");
    assert.equal(output.measures.hours_per_repeat.value, "0.000100");
    assert.equal(output.measures.cash_total.value, "12.000000");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// --- DEF-05: the shipped schema document is actually applied ---

test("DEF-05: shipped schema enforces types, enums, patterns, unique/required/closed fields", () => {
  const cases = [
    { label: "participant role type", mutate: (i) => { i.cohort.participants[0].role = 42; }, path: "/cohort/participants/0/role" },
    { label: "campaign id pattern", mutate: (i) => { i.campaign.id = "Bad_ID"; }, path: "/campaign/id" },
    { label: "campaign state enum", mutate: (i) => { i.campaign.state = "draft"; }, path: "/campaign/state" },
    { label: "source hash pattern", mutate: (i) => { i.sources[0].sha256 = "ABC"; }, path: "/sources/0/sha256" },
    { label: "metric ref revision required", mutate: (i) => { delete i.metric_bindings.activation.revision; }, path: "/metric_bindings/activation/revision" },
    { label: "alias minLength", mutate: (i) => { i.public_projection.source_aliases[0].alias = ""; }, path: "/public_projection/source_aliases/0/alias" },
    { label: "duplicate cash item ids", mutate: (i) => { i.cost_mapping.cash_item_ids = ["cost-cash-ad-01", "cost-cash-ad-01"]; }, path: "/cost_mapping/cash_item_ids/1" },
    { label: "window calendar validity", mutate: (i) => { i.campaign.acquisition_window.end = "2026-02-30T00:00:00Z"; }, path: "/campaign/acquisition_window/end" }
  ];

  for (const testCase of cases) {
    const root = makeAuthoritySnapshot();
    try {
      const input = combinedInput();
      testCase.mutate(input);
      const res = runCli(writeInput(root, input), root);
      assert.equal(res.status, 1, `${testCase.label}: expected exit 1, got ${res.status}`);
      const output = parseEnvelope(res);
      assert.equal(output.valid, false, testCase.label);
      const issue = output.issues.find(i => i.path === testCase.path);
      assert.ok(issue, `${testCase.label}: expected issue at ${testCase.path}, got ${JSON.stringify(output.issues)}`);
      if (testCase.path.endsWith("/end")) assert.equal(issue.code, "INVALID_TIMESTAMP", testCase.label);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

// --- DEF-06: installed standard/flattened layouts with PM schemas; explicit schema gaps ---

test("DEF-06: standard and flattened installed packages execute; missing PM schema is a capability gap", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mkt-install-"));
  const skillSource = path.join(REPO_ROOT, "skills/marketing/marketing-measurement");
  const evidenceSource = path.join(REPO_ROOT, "skills/product-management/product-evidence");
  const investmentSource = path.join(REPO_ROOT, "skills/product-management/product-investment");
  const inputPath = COMBINED_FIXTURE;

  function installStandard() {
    const skillsRoot = path.join(tmp, "standard/skills");
    fs.cpSync(skillSource, path.join(skillsRoot, "marketing/marketing-measurement"), { recursive: true });
    fs.cpSync(evidenceSource, path.join(skillsRoot, "product-management/product-evidence"), { recursive: true });
    fs.cpSync(investmentSource, path.join(skillsRoot, "product-management/product-investment"), { recursive: true });
    return path.join(skillsRoot, "marketing/marketing-measurement/scripts/report-marketing.mjs");
  }

  function installFlattened() {
    const flatRoot = path.join(tmp, "flat");
    fs.cpSync(skillSource, path.join(flatRoot, "marketing-measurement"), { recursive: true });
    fs.cpSync(evidenceSource, path.join(flatRoot, "product-management-product-evidence"), { recursive: true });
    fs.cpSync(investmentSource, path.join(flatRoot, "product-management-product-investment"), { recursive: true });
    return flatRoot;
  }

  function runInstalled(scriptPath) {
    return spawnSync("node", [
      scriptPath,
      inputPath,
      "--authority-root", AUTHORITY_ROOT,
      "--as-of", AS_OF
    ], {
      cwd: tmp,
      encoding: "utf-8"
    });
  }

  try {
    const standardScript = installStandard();
    const standardRes = runInstalled(standardScript);
    assert.equal(standardRes.status, 0, standardRes.stderr || standardRes.stdout);
    assert.equal(parseEnvelope(standardRes).valid, true);

    const flatRoot = installFlattened();
    const flatScript = path.join(flatRoot, "marketing-measurement/scripts/report-marketing.mjs");
    const flatRes = runInstalled(flatScript);
    assert.equal(flatRes.status, 0, flatRes.stderr || flatRes.stdout);
    assert.equal(parseEnvelope(flatRes).valid, true);

    // Explicit PM schema preflight: scripts alone are insufficient.
    const investmentSchema = path.join(flatRoot, "product-management-product-investment/assets/investment.schema.json");
    fs.rmSync(investmentSchema);
    const missingInvestmentSchema = runInstalled(flatScript);
    assert.equal(missingInvestmentSchema.status, 2);
    const missingOut = parseEnvelope(missingInvestmentSchema);
    assert.ok(missingOut.issues.some(i => i.code === "CAPABILITY_GAP"));

    const evidenceSchema = path.join(flatRoot, "product-management-product-evidence/assets/product-evidence.schema.json");
    fs.rmSync(evidenceSchema);
    const missingEvidenceSchema = runInstalled(flatScript);
    assert.equal(missingEvidenceSchema.status, 2);
    assert.ok(parseEnvelope(missingEvidenceSchema).issues.some(i => i.code === "CAPABILITY_GAP"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
