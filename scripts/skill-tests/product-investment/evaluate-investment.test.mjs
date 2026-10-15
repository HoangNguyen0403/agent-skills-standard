// scripts/skill-tests/product-investment/evaluate-investment.test.mjs
// Comprehensive behavior test suite for evaluateInvestment library and CLI (t01-v2)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluateInvestment } from "../../../skills/product-management/product-investment/scripts/evaluate-investment.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CALCULATOR_CLI = path.resolve(__dirname, "../../../skills/product-management/product-investment/scripts/evaluate-investment.mjs");
const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

// --- 1. Baseline & Contract Invariants ---

test("1. Direct Library: Baseline Positive Return (AC-005)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  const output = evaluateInvestment(fixture);

  assert.equal(output.schema_version, 1);
  assert.equal(output.tool, "investment-calculator");
  assert.equal(output.analysis_id, "analytics-export-v1");
  assert.equal(output.currency, "USD");
  assert.equal(output.money_scale, 2);
  assert.equal(output.issues.length, 0);
  assert.equal(output.results.length, 1);

  const res = output.results[0];
  assert.equal(res.scenario_id, "base");

  // Benefit: 150000.00, Cost: 100000.00 -> Net: 50000.00
  assert.deepEqual(res.benefit, { status: "available", value: "150000.00", reason: null });
  assert.deepEqual(res.cost, { status: "available", value: "100000.00", reason: null });
  assert.deepEqual(res.net_value, { status: "available", value: "50000.00", reason: null });

  // ROI: (150000 - 100000)/100000 = 0.500000, ROI%: 50.000000, B/C: 1.500000
  assert.deepEqual(res.roi, { status: "available", value: "0.500000", reason: null });
  assert.deepEqual(res.roi_percent, { status: "available", value: "50.000000", reason: null });
  assert.deepEqual(res.benefit_cost, { status: "available", value: "1.500000", reason: null });

  // Payback reached at period 1, terminal balance 50000.00
  assert.deepEqual(res.payback, {
    status: "reached",
    period: 1,
    reason: null,
    terminal_balance: "50000.00"
  });

  // NPV: period 0 (-100000.00) + period 1 (150000.00 / 1.1) = -100000 + 136363.636... = 36363.64
  assert.deepEqual(res.npv, { status: "available", value: "36363.64", reason: null });
});

test("2. Direct Library: Closed Payback Keys and Paired Timing Metadata Receipt (Section 7.4 / N1)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  const output = evaluateInvestment(fixture);
  const res = output.results[0];

  // Verify closed 4-key payback output contract
  assert.deepEqual(Object.keys(res.payback).sort(), ["period", "reason", "status", "terminal_balance"]);
  assert.deepEqual(res.payback, {
    status: "reached",
    period: 1,
    reason: null,
    terminal_balance: "50000.00"
  });

  // Section 7.4 consumer oracle: timing metadata pairing outside closed calculator output
  assert.ok(Number.isInteger(res.payback.period));
  assert.ok(res.payback.period >= 0 && res.payback.period <= fixture.horizon.periods);
  // Terminal balance must match undiscounted cumulative net cash flow at the end of horizon
  assert.equal(res.payback.terminal_balance, "50000.00");

  // Confirm no output API pollution: calculator output does not leak input horizon or convention keys
  assert.equal(Reflect.has(res.payback, "horizon"), false);
  assert.equal(Reflect.has(res.payback, "convention"), false);
  assert.equal(Reflect.has(res.payback, "start_date"), false);
});

// --- 2. Rational Presentation Half-Away Rounding Ties ---

test("3. Direct Library: Exact Rational Half-Away Tie Oracles (+/-)", () => {
  // Oracle Vector 1: B = 2000001, C = 2000000 (net/C = +1/2000000 = +0.0000005)
  // Half away rounds up: ROI 0.000001, percent 0.000050, B/C 1.000001
  const inputPos = {
    schema_version: 1,
    analysis_id: "rational-pos-tie",
    currency: "USD",
    money_scale: 0,
    price_basis: "nominal",
    price_date: "2026-10-01",
    horizon: { start_date: "2026-10-01", period: "year", periods: 1 },
    cohort: "test",
    counterfactual: "test",
    accounting_boundary: "test",
    discount: null,
    scenarios: [
      {
        id: "base",
        label: "Base",
        assumptions: ["+0.0000005 ratio"],
        items: [
          {
            id: "c-item",
            side: "cost",
            category: "development",
            mechanism_id: "m-c",
            period: 0,
            amount: "2000000",
            currency: "USD",
            basis: "cash_cost",
            netted_cost_categories: [],
            rationale: "c",
            evidence_ids: ["CLM-001"]
          },
          {
            id: "b-item",
            side: "benefit",
            category: "expansion",
            mechanism_id: "m-b",
            period: 1,
            amount: "2000001",
            currency: "USD",
            basis: "gross_revenue",
            netted_cost_categories: [],
            rationale: "b",
            evidence_ids: ["CLM-002"]
          }
        ],
        nonmonetary: []
      }
    ]
  };

  const outPos = evaluateInvestment(inputPos);
  assert.equal(outPos.issues.length, 0);
  const resPos = outPos.results[0];
  assert.equal(resPos.roi.value, "0.000001");
  assert.equal(resPos.roi_percent.value, "0.000050");
  assert.equal(resPos.benefit_cost.value, "1.000001");

  // Oracle Vector 2: B = 1999999, C = 2000000 (net/C = -1/2000000 = -0.0000005)
  // Half away rounds down away from zero: ROI -0.000001, percent -0.000050, B/C 1.000000
  inputPos.scenarios[0].items[1].amount = "1999999";
  const outNeg = evaluateInvestment(inputPos);
  assert.equal(outNeg.issues.length, 0);
  const resNeg = outNeg.results[0];
  assert.equal(resNeg.roi.value, "-0.000001");
  assert.equal(resNeg.roi_percent.value, "-0.000050");
  assert.equal(resNeg.benefit_cost.value, "1.000000");
});

// --- 3. Exact NPV Half-Away Ties & Numerical Range Oracles ---

test("4. Direct Library: Exact NPV Half-Away Rounding Ties (+/-)", () => {
  // Annual rate r = 1.0 (100%).
  // Case A: C = 1 at t=0, B = 3 at t=1.
  // Discount factor at t=1 is (1+1)^(-1) = 0.5.
  // NPV = -1 + 3 * 0.5 = +0.5 minor unit. Round half away from zero -> +1.
  const inputA = {
    schema_version: 1,
    analysis_id: "npv-pos-tie",
    currency: "USD",
    money_scale: 0,
    price_basis: "nominal",
    price_date: "2026-10-01",
    horizon: { start_date: "2026-10-01", period: "year", periods: 1 },
    cohort: "test",
    counterfactual: "test",
    accounting_boundary: "test",
    discount: { rate: "1.00000000", convention: "effective_annual", price_basis: "nominal" },
    scenarios: [
      {
        id: "base",
        label: "Base",
        assumptions: ["+0.5 minor unit"],
        items: [
          {
            id: "c0",
            side: "cost",
            category: "development",
            mechanism_id: "m-c",
            period: 0,
            amount: "1",
            currency: "USD",
            basis: "cash_cost",
            netted_cost_categories: [],
            rationale: "c0",
            evidence_ids: ["CLM-001"]
          },
          {
            id: "b1",
            side: "benefit",
            category: "expansion",
            mechanism_id: "m-b",
            period: 1,
            amount: "3",
            currency: "USD",
            basis: "gross_revenue",
            netted_cost_categories: [],
            rationale: "b1",
            evidence_ids: ["CLM-002"]
          }
        ],
        nonmonetary: []
      }
    ]
  };

  const outA = evaluateInvestment(inputA);
  assert.equal(outA.issues.length, 0);
  assert.equal(outA.results[0].npv.value, "1");

  // Case B: C = 1 at t=0, B = 1 at t=1.
  // NPV = -1 + 1 * 0.5 = -0.5 minor unit. Round half away from zero -> -1.
  inputA.scenarios[0].items[1].amount = "1";
  const outB = evaluateInvestment(inputA);
  assert.equal(outB.issues.length, 0);
  assert.equal(outB.results[0].npv.value, "-1");

  // Case C: Non-100% rate r = 0.04 (4%), t = 1 year, factor = 25/26.
  // 39 / 1.04 = 37.5 -> half away from zero rounds to +38.
  // Signed negative: -39 / 1.04 = -37.5 -> half away from zero rounds to -38.
  const inputC = structuredClone(inputA);
  inputC.discount.rate = "0.04";
  inputC.scenarios[0].items[0].amount = "0"; // C = 0 at t=0
  inputC.scenarios[0].items[1].amount = "39"; // B = 39 at t=1
  const outCPos = evaluateInvestment(inputC);
  assert.equal(outCPos.issues.length, 0);
  assert.equal(outCPos.results[0].npv.value, "38");

  inputC.scenarios[0].items[0].amount = "39"; // C = 39 at t=1
  inputC.scenarios[0].items[0].period = 1;
  inputC.scenarios[0].items[1].amount = "0";  // B = 0
  const outCNeg = evaluateInvestment(inputC);
  assert.equal(outCNeg.issues.length, 0);
  assert.equal(outCNeg.results[0].npv.value, "-38");

  // Case D: Additional non-100% tie vectors (13/1.04=12.5 -> 13; 65/1.04=62.5 -> 63; 91/1.04=87.5 -> 88)
  for (const [amount, expected] of [["13", "13"], ["65", "63"], ["91", "88"]]) {
    const inputVec = structuredClone(inputA);
    inputVec.discount.rate = "0.04";
    inputVec.scenarios[0].items[0].amount = "0";
    inputVec.scenarios[0].items[1].amount = amount;
    const resPos = evaluateInvestment(inputVec);
    assert.equal(resPos.issues.length, 0);
    assert.equal(resPos.results[0].npv.value, expected);

    inputVec.scenarios[0].items[0].amount = amount;
    inputVec.scenarios[0].items[0].period = 1;
    inputVec.scenarios[0].items[1].amount = "0";
    const resNeg = evaluateInvestment(inputVec);
    assert.equal(resNeg.issues.length, 0);
    assert.equal(resNeg.results[0].npv.value, `-${expected}`);
  }

  // Case E: Multi-period non-100% tie vector (t = 2 years, r = 0.04)
  // (1 + 0.04)^2 = 1.0816 = 676 / 625. For amount 338 at t=2:
  // 338 * 625 / 676 = 625 / 2 = 312.5 -> rounds half away to +313 (and -313).
  const inputMulti = structuredClone(inputA);
  inputMulti.horizon.periods = 2;
  inputMulti.discount.rate = "0.04";
  inputMulti.scenarios[0].items[0].amount = "0";
  inputMulti.scenarios[0].items[1].period = 2;
  inputMulti.scenarios[0].items[1].amount = "338";
  const outMultiPos = evaluateInvestment(inputMulti);
  assert.equal(outMultiPos.issues.length, 0);
  assert.equal(outMultiPos.results[0].npv.value, "313");

  inputMulti.scenarios[0].items[0].period = 2;
  inputMulti.scenarios[0].items[0].amount = "338";
  inputMulti.scenarios[0].items[1].amount = "0";
  const outMultiNeg = evaluateInvestment(inputMulti);
  assert.equal(outMultiNeg.issues.length, 0);
  assert.equal(outMultiNeg.results[0].npv.value, "-313");
});

test("5. Direct Library: Monthly Intermediate Timing & Long Horizon NPV Oracles", () => {
  // Oracle: Monthly r = 0.44. Period t = 6 months.
  // (1 + 0.44)^(-6/12) = 1.44^(-0.5) = 1 / 1.2 = 5/6 exactly.
  // C = 5 at t=0, B = 6 at t=6.
  // NPV = -5 + 6 * (5/6) = 0 exactly.
  const inputMonthly = {
    schema_version: 1,
    analysis_id: "npv-monthly-exact",
    currency: "USD",
    money_scale: 0,
    price_basis: "nominal",
    price_date: "2026-10-01",
    horizon: { start_date: "2026-10-01", period: "month", periods: 6 },
    cohort: "test",
    counterfactual: "test",
    accounting_boundary: "test",
    discount: { rate: "0.44000000", convention: "effective_annual", price_basis: "nominal" },
    scenarios: [
      {
        id: "base",
        label: "Base",
        assumptions: ["Exact 5/6 discount factor"],
        items: [
          {
            id: "c0",
            side: "cost",
            category: "development",
            mechanism_id: "m-c",
            period: 0,
            amount: "5",
            currency: "USD",
            basis: "cash_cost",
            netted_cost_categories: [],
            rationale: "c0",
            evidence_ids: ["CLM-001"]
          },
          {
            id: "b6",
            side: "benefit",
            category: "expansion",
            mechanism_id: "m-b",
            period: 6,
            amount: "6",
            currency: "USD",
            basis: "gross_revenue",
            netted_cost_categories: [],
            rationale: "b6",
            evidence_ids: ["CLM-002"]
          }
        ],
        nonmonetary: []
      }
    ]
  };

  const outM = evaluateInvestment(inputMonthly);
  assert.equal(outM.issues.length, 0);
  assert.equal(outM.results[0].npv.value, "0");

  // Oracle: Long horizon 600 periods with annual r = 1.0.
  // C = 0 at t=0, B = 1 at t=600.
  // 1 / 2^600 is negligible (< 0.5 minor units) -> rounds to 0.
  inputMonthly.horizon.period = "year";
  inputMonthly.horizon.periods = 600;
  inputMonthly.discount.rate = "1.00000000";
  inputMonthly.scenarios[0].items[0].amount = "0";
  inputMonthly.scenarios[0].items[1].period = 600;
  inputMonthly.scenarios[0].items[1].amount = "1";

  const outLong = evaluateInvestment(inputMonthly);
  assert.equal(outLong.issues.length, 0);
  assert.equal(outLong.results[0].npv.value, "0");
});

test("6. Direct Library: NPV B+C Domain Exceeded (> 1e12 minor units) RFC6901 Path & Envelope", () => {
  // Input where B + C = 1000000000001 minor units with discount
  const input = {
    schema_version: 1,
    analysis_id: "npv-domain-limit",
    currency: "USD",
    money_scale: 0,
    price_basis: "nominal",
    price_date: "2026-10-01",
    horizon: { start_date: "2026-10-01", period: "year", periods: 1 },
    cohort: "test",
    counterfactual: "test",
    accounting_boundary: "test",
    discount: { rate: "0.05000000", convention: "effective_annual", price_basis: "nominal" },
    scenarios: [
      {
        id: "base",
        label: "Base",
        assumptions: ["Exceeds 1e12 domain"],
        items: [
          {
            id: "c0",
            side: "cost",
            category: "development",
            mechanism_id: "m-c",
            period: 0,
            amount: "1",
            currency: "USD",
            basis: "cash_cost",
            netted_cost_categories: [],
            rationale: "c",
            evidence_ids: ["CLM-001"]
          },
          {
            id: "b1",
            side: "benefit",
            category: "expansion",
            mechanism_id: "m-b",
            period: 1,
            amount: "1000000000000", // B + C = 1000000000001 > 1e12
            currency: "USD",
            basis: "gross_revenue",
            netted_cost_categories: [],
            rationale: "b",
            evidence_ids: ["CLM-002"]
          }
        ],
        nonmonetary: []
      }
    ]
  };

  const output = evaluateInvestment(input);
  assert.equal(output.results.length, 0);
  assert.equal(output.issues.length, 1);

  const iss = output.issues[0];
  assert.equal(iss.code, "NUMERIC_RANGE");
  assert.equal(iss.severity, "error");
  // F2 resolution: RFC6901 path points to scenario array index /scenarios/0, NOT /scenarios/base/npv
  assert.equal(iss.path, "/scenarios/0");
  assert.equal(iss.record_id, null);
});

// --- 4. Closed Input Schema & Gregorian Calendar Date Rejections (F1, F2) ---

test("7. Direct Library: Rejection of Unknown Keys at All Input Levels (F1)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));

  // Vector A: Unknown root key (the exact parent smoke failure vector)
  const inputRoot = { ...fixture, undeclared_financial_assumption: "must not silently ignore unknown contract fields" };
  const outRoot = evaluateInvestment(inputRoot);
  assert.equal(outRoot.results.length, 0);
  const issRoot = outRoot.issues.find((i) => i.path === "/undeclared_financial_assumption");
  assert.ok(issRoot, "Expected issue at /undeclared_financial_assumption");
  assert.equal(issRoot.code, "INVALID_FIELD");
  assert.equal(issRoot.record_id, null);

  // Vector B: Unknown horizon key
  const inputHorizon = JSON.parse(JSON.stringify(fixture));
  inputHorizon.horizon.unknown_horizon_field = "unexpected";
  const outHorizon = evaluateInvestment(inputHorizon);
  assert.equal(outHorizon.results.length, 0);
  assert.ok(outHorizon.issues.some((i) => i.path === "/horizon/unknown_horizon_field"));

  // Vector C: Unknown discount key
  const inputDiscount = JSON.parse(JSON.stringify(fixture));
  inputDiscount.discount.unknown_discount_field = "unexpected";
  const outDiscount = evaluateInvestment(inputDiscount);
  assert.equal(outDiscount.results.length, 0);
  assert.ok(outDiscount.issues.some((i) => i.path === "/discount/unknown_discount_field"));

  // Vector D: Unknown scenario key
  const inputScenario = JSON.parse(JSON.stringify(fixture));
  inputScenario.scenarios[0].unknown_scenario_field = "unexpected";
  const outScenario = evaluateInvestment(inputScenario);
  assert.equal(outScenario.results.length, 0);
  assert.ok(outScenario.issues.some((i) => i.path === "/scenarios/0/unknown_scenario_field"));

  // Vector E: Unknown item key
  const inputItem = JSON.parse(JSON.stringify(fixture));
  inputItem.scenarios[0].items[0].unknown_item_field = "unexpected";
  const outItem = evaluateInvestment(inputItem);
  assert.equal(outItem.results.length, 0);
  assert.ok(outItem.issues.some((i) => i.path === "/scenarios/0/items/0/unknown_item_field"));
});

test("8. Direct Library: Real Gregorian Date Validation Rejections (F1)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));

  // Impossible February 30th date
  fixture.price_date = "2026-02-30";
  const outPriceDate = evaluateInvestment(fixture);
  assert.equal(outPriceDate.results.length, 0);
  assert.ok(outPriceDate.issues.some((i) => i.path === "/price_date" && i.code === "INVALID_FIELD"));

  // Impossible month 13 date
  fixture.price_date = "2026-10-01";
  fixture.horizon.start_date = "2026-13-01";
  const outStartDate = evaluateInvestment(fixture);
  assert.equal(outStartDate.results.length, 0);
  assert.ok(outStartDate.issues.some((i) => i.path === "/horizon/start_date" && i.code === "INVALID_FIELD"));
});

test("9. Direct Library: Nonmonetary and Evidence_ids Array Element Validation (F1)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));

  // Invalid nonmonetary: contains number 17
  fixture.scenarios[0].nonmonetary = [17];
  const outNm = evaluateInvestment(fixture);
  assert.equal(outNm.results.length, 0);
  assert.ok(outNm.issues.some((i) => i.path === "/scenarios/0/nonmonetary"));

  // Invalid evidence_ids: contains false and non-CLM/SRC ID
  fixture.scenarios[0].nonmonetary = ["Valid string"];
  fixture.scenarios[0].items[0].evidence_ids = [false, "DEC-001"];
  const outEv = evaluateInvestment(fixture);
  assert.equal(outEv.results.length, 0);
  assert.ok(outEv.issues.some((i) => i.path === "/scenarios/0/items/0/evidence_ids"));
});

test("10. Direct Library: Blank Cohort, Blank Rationale, and Netted Categories Integrity (F1)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));

  // Blank cohort
  fixture.cohort = "";
  const outCohort = evaluateInvestment(fixture);
  assert.equal(outCohort.results.length, 0);
  assert.ok(outCohort.issues.some((i) => i.path === "/cohort"));

  // Blank item rationale
  fixture.cohort = "enterprise";
  fixture.scenarios[0].items[0].rationale = "";
  const outRat = evaluateInvestment(fixture);
  assert.equal(outRat.results.length, 0);
  assert.ok(outRat.issues.some((i) => i.path === "/scenarios/0/items/0/rationale"));

  // Non-empty netted_cost_categories on non-contribution_margin item
  fixture.scenarios[0].items[0].rationale = "valid";
  fixture.scenarios[0].items[0].netted_cost_categories = ["development"]; // side is cost!
  const outNetted = evaluateInvestment(fixture);
  assert.equal(outNetted.results.length, 0);
  assert.ok(outNetted.issues.some((i) => i.path === "/scenarios/0/items/0/netted_cost_categories"));
});

test("11. Direct Library: Duplicate Capacity Tuple (side, category, mechanism_id, period) Rejection (F1)", () => {
  const input = {
    schema_version: 1,
    analysis_id: "duplicate-capacity-tuple",
    currency: "USD",
    money_scale: 2,
    price_basis: "nominal",
    price_date: "2026-10-01",
    horizon: { start_date: "2026-10-01", period: "year", periods: 1 },
    cohort: "test",
    counterfactual: "test",
    accounting_boundary: "test",
    discount: null,
    scenarios: [
      {
        id: "base",
        label: "Base",
        assumptions: ["Duplicate capacity mechanisms in period 1"],
        items: [
          {
            id: "cap-1",
            side: "capacity",
            category: "capacity",
            mechanism_id: "shared-bot",
            period: 1,
            amount: "10.0000",
            currency: null,
            basis: "capacity_hours",
            netted_cost_categories: [],
            rationale: "r1",
            evidence_ids: ["CLM-001"]
          },
          {
            id: "cap-2",
            side: "capacity",
            category: "capacity",
            mechanism_id: "shared-bot", // Duplicate mechanism in period 1!
            period: 1,
            amount: "20.0000",
            currency: null,
            basis: "capacity_hours",
            netted_cost_categories: [],
            rationale: "r2",
            evidence_ids: ["CLM-002"]
          }
        ],
        nonmonetary: []
      }
    ]
  };

  const output = evaluateInvestment(input);
  assert.equal(output.results.length, 0);
  assert.ok(output.issues.some((i) => i.path === "/scenarios/0/items/1/mechanism_id" && i.code === "INVALID_FIELD"));
});

// --- 5. Error Precedence, Sorting, and Deduplication (F2) ---

test("12. Direct Library: Zero Cost vs Empty Benefit Precedence", () => {
  // Known zero cost (amount: "0.00") and no benefit items (unknown_benefit).
  // Precedence rule: "Ratios inspect unknown cost first, then known zero_cost, then unknown benefit."
  // Cost is known zero -> Ratios are undefined with reason zero_cost!
  const input = {
    schema_version: 1,
    analysis_id: "zero-cost-unknown-benefit",
    currency: "USD",
    money_scale: 2,
    price_basis: "nominal",
    price_date: "2026-10-01",
    horizon: { start_date: "2026-10-01", period: "year", periods: 1 },
    cohort: "test",
    counterfactual: "test",
    accounting_boundary: "test",
    discount: null,
    scenarios: [
      {
        id: "base",
        label: "Base",
        assumptions: ["Known zero cost"],
        items: [
          {
            id: "c0",
            side: "cost",
            category: "development",
            mechanism_id: "m-c",
            period: 0,
            amount: "0.00",
            currency: "USD",
            basis: "cash_cost",
            netted_cost_categories: [],
            rationale: "r",
            evidence_ids: ["CLM-001"]
          }
        ],
        nonmonetary: []
      }
    ]
  };

  const output = evaluateInvestment(input);
  assert.equal(output.issues.length, 0);
  const res = output.results[0];

  assert.equal(res.cost.status, "available");
  assert.equal(res.benefit.status, "unavailable");
  assert.equal(res.net_value.status, "unavailable");

  // Ratios are undefined with reason zero_cost due to precedence over unknown_benefit
  assert.deepEqual(res.roi, { status: "undefined", value: null, reason: "zero_cost" });
  assert.deepEqual(res.roi_percent, { status: "undefined", value: null, reason: "zero_cost" });
  assert.deepEqual(res.benefit_cost, { status: "undefined", value: null, reason: "zero_cost" });
});

test("13. Direct Library: Issue Deduplication and ASCII Sorting Order (F2)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  // Inject multiple errors in non-alphabetical order
  fixture.price_date = "2026-02-30"; // /price_date
  fixture.cohort = ""; // /cohort
  fixture.analysis_id = "INVALID_UPPERCASE_ID"; // /analysis_id

  const output = evaluateInvestment(fixture);
  assert.equal(output.results.length, 0);
  assert.ok(output.issues.length >= 3);

  // Verify ASCII ordering of paths: /analysis_id < /cohort < /price_date
  for (let i = 0; i < output.issues.length - 1; i++) {
    const a = output.issues[i];
    const b = output.issues[i + 1];
    assert.ok(a.path <= b.path);
    if (a.path === b.path) {
      assert.ok(a.code <= b.code);
    }
    // Verify record_id is present
    assert.equal(a.record_id, null);
  }
});

// --- 6. CLI Safe File Reads, Diagnostics, and Exit Precedence (F3, F9) ---

test("14. CLI: Flags: exact --help alone exits 0; -h rejected with exit 2 (F9)", () => {
  // exact --help alone exits 0
  const runHelp = spawnSync(process.execPath, [CALCULATOR_CLI, "--help"], { encoding: "utf-8" });
  assert.equal(runHelp.status, 0);
  assert.ok(runHelp.stdout.includes("Usage: node evaluate-investment.mjs"));
  assert.equal(runHelp.stderr, "");

  // -h rejected with exit 2 and INVALID_ARGUMENT (per frozen contract)
  const runShortH = spawnSync(process.execPath, [CALCULATOR_CLI, "-h"], { encoding: "utf-8" });
  assert.equal(runShortH.status, 2);
  const parsedShort = JSON.parse(runShortH.stdout);
  assert.equal(parsedShort.issues[0].code, "INVALID_ARGUMENT");
  assert.equal(parsedShort.issues[0].record_id, null);
  assert.equal(runShortH.stderr, "");
});

test("15. CLI: Symlink Input Rejection (IO_ERROR, Exit 2, Empty stderr) (F3)", () => {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "calc-symlink-test-")));
  try {
    const targetPath = path.join(FIXTURES_DIR, "baseline-positive.json");
    const linkPath = path.join(tmpDir, "symlink-input.json");
    fs.symlinkSync(targetPath, linkPath);

    const run = spawnSync(process.execPath, [CALCULATOR_CLI, linkPath], { encoding: "utf-8" });
    assert.equal(run.status, 2);
    const parsed = JSON.parse(run.stdout);
    assert.equal(parsed.issues[0].code, "IO_ERROR");
    // F3: Fixed functional message without echoing absolute path
    assert.equal(parsed.issues[0].message, "Unable to read input file.");
    assert.equal(parsed.issues[0].record_id, null);
    assert.equal(run.stderr, "");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("16. CLI: Fixed Functional Messages Without Leakage on Nonexistent & Malformed Inputs (F3)", () => {
  // Nonexistent file
  const runMissing = spawnSync(process.execPath, [CALCULATOR_CLI, "/path/to/nonexistent/secret-file.json"], { encoding: "utf-8" });
  assert.equal(runMissing.status, 2);
  const parsedMissing = JSON.parse(runMissing.stdout);
  assert.equal(parsedMissing.issues[0].code, "IO_ERROR");
  // F3: Absolute path must NOT be echoed in message
  assert.equal(parsedMissing.issues[0].message, "Unable to read input file.");
  assert.ok(!parsedMissing.issues[0].message.includes("secret-file"));
  assert.equal(runMissing.stderr, "");

  // Malformed JSON
  const invalidJsonPath = path.join(FIXTURES_DIR, "invalid-json.txt");
  const runInvalid = spawnSync(process.execPath, [CALCULATOR_CLI, invalidJsonPath], { encoding: "utf-8" });
  assert.equal(runInvalid.status, 2);
  const parsedInvalid = JSON.parse(runInvalid.stdout);
  assert.equal(parsedInvalid.issues[0].code, "INVALID_JSON");
  // F3: Engine raw syntax error details not leaked
  assert.equal(parsedInvalid.issues[0].message, "Input file contains invalid JSON.");
  assert.equal(runInvalid.stderr, "");
});

test("17. CLI: Undeclared Financial Assumption Rejection (Parent W1-boundary-smoke vector)", () => {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "calc-smoke-test-")));
  try {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
    fixture.undeclared_financial_assumption = "must not silently ignore unknown contract fields";
    const testFile = path.join(tmpDir, "smoke-undeclared.json");
    fs.writeFileSync(testFile, JSON.stringify(fixture, null, 2), "utf-8");

    const run = spawnSync(process.execPath, [CALCULATOR_CLI, testFile], { encoding: "utf-8" });
    // Expected exit: 1, expected code: INVALID_FIELD, results: []
    assert.equal(run.status, 1);
    const parsed = JSON.parse(run.stdout);
    assert.equal(parsed.results.length, 0);
    assert.equal(parsed.issues.length, 1);
    assert.equal(parsed.issues[0].code, "INVALID_FIELD");
    assert.equal(parsed.issues[0].path, "/undeclared_financial_assumption");
    assert.equal(parsed.issues[0].record_id, null);
    assert.equal(run.stderr, "");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("RFC6901 unknown-key locators are escaped and diagnostics stay value-independent", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  fixture.discount["private/token~marker"] = "sensitive-payload";
  const output = evaluateInvestment(fixture);
  const issue = output.issues.find((entry) => entry.path === "/discount/private~1token~0marker");
  assert.ok(issue);
  assert.equal(issue.message, "Unknown discount field");
  assert.ok(!JSON.stringify(output).includes("sensitive-payload"));

  const invalidId = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  invalidId.scenarios[0].items[0].id = "private-item-id";
  invalidId.scenarios[0].items[0].evidence_ids = ["SRC-private"];
  const invalidOutput = evaluateInvestment(invalidId);
  assert.ok(invalidOutput.issues.some((entry) => entry.path.endsWith("/evidence_ids")));
  assert.ok(!JSON.stringify(invalidOutput).includes("private-item-id"));
});

test("Duplicate same-tuple numeric faults coalesce and preserve sorted output", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  fixture.money_scale = 0;
  fixture.discount = null;
  fixture.scenarios[0].items = fixture.scenarios[0].items.filter((item) => item.side === "benefit").slice(0, 1);
  fixture.scenarios[0].items[0].amount = "9007199254740991";
  for (let index = 0; index < 2; index++) {
    fixture.scenarios[0].items.push({
      ...fixture.scenarios[0].items[0],
      id: `benefit-${index}`,
      mechanism_id: `mechanism-${index}`,
      amount: "9007199254740991"
    });
  }
  const output = evaluateInvestment(fixture);
  const rangeIssues = output.issues.filter((entry) => entry.path === "/scenarios/0/items" && entry.code === "NUMERIC_RANGE");
  assert.equal(rangeIssues.length, 1);
});

test("CLI rejects FIFO and directory inputs without blocking or reading contents", () => {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "calc-special-input-")));
  try {
    const fifoPath = path.join(tmpDir, "input.fifo");
    const made = spawnSync("mkfifo", [fifoPath], { encoding: "utf-8" });
    assert.equal(made.status, 0, made.stderr);
    const fifoRun = spawnSync(process.execPath, [CALCULATOR_CLI, fifoPath], {
      encoding: "utf-8",
      timeout: 3000
    });
    assert.equal(fifoRun.status, 2);
    assert.equal(JSON.parse(fifoRun.stdout).issues[0].code, "IO_ERROR");
    assert.equal(fifoRun.stderr, "");

    const directoryRun = spawnSync(process.execPath, [CALCULATOR_CLI, tmpDir], { encoding: "utf-8" });
    assert.equal(directoryRun.status, 2);
    assert.equal(JSON.parse(directoryRun.stdout).issues[0].code, "IO_ERROR");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Payback must remain above zero through the horizon after recrossing", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  fixture.horizon.periods = 2;
  fixture.scenarios[0].items.push({
    ...fixture.scenarios[0].items.find((item) => item.side === "cost"),
    id: "later-cost",
    mechanism_id: "later-cost",
    period: 2,
    amount: "100000.00"
  });
  const output = evaluateInvestment(fixture);
  assert.equal(output.issues.length, 0);
  assert.deepEqual(output.results[0].payback, {
    status: "not_reached",
    period: null,
    reason: "no_payback_within_horizon",
    terminal_balance: "-50000.00"
  });
});

test("Known zero benefit preserves a loss and zero discount preserves undiscounted NPV", () => {
  const loss = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  loss.discount = null;
  loss.scenarios[0].items = loss.scenarios[0].items.filter((item) => item.side === "cost");
  loss.scenarios[0].items.push({
    id: "zero-benefit",
    side: "benefit",
    category: "expansion",
    mechanism_id: "no-return",
    period: 1,
    amount: "0.00",
    currency: "USD",
    basis: "gross_revenue",
    netted_cost_categories: [],
    rationale: "Explicitly modeled zero cash benefit",
    evidence_ids: ["CLM-002"]
  });
  const lossOutput = evaluateInvestment(loss);
  assert.equal(lossOutput.issues.length, 0);
  assert.equal(lossOutput.results[0].benefit.value, "0.00");
  assert.equal(lossOutput.results[0].roi.value, "-1.000000");
  assert.equal(lossOutput.results[0].payback.status, "not_reached");

  const undiscounted = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  undiscounted.discount.rate = "0";
  const zeroRateOutput = evaluateInvestment(undiscounted);
  assert.equal(zeroRateOutput.issues.length, 0);
  assert.equal(zeroRateOutput.results[0].npv.value, "50000.00");
});

test("Discount and decimal grammar boundaries reject negative, excess, and exponent values", () => {
  const base = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  for (const rate of ["-0.01", "1.01", "1.000000001", "1e-3"]) {
    const input = structuredClone(base);
    input.discount.rate = rate;
    const output = evaluateInvestment(input);
    assert.ok(output.issues.some((entry) => entry.path === "/discount/rate" && entry.code === "INVALID_FIELD"), rate);
  }
  const upperRate = structuredClone(base);
  upperRate.discount.rate = "1";
  assert.equal(evaluateInvestment(upperRate).issues.length, 0);

  for (const amount of ["-1.00", "1e3", "NaN", "Infinity", "1.001"]) {
    const input = structuredClone(base);
    input.scenarios[0].items[0].amount = amount;
    const output = evaluateInvestment(input);
    assert.ok(output.issues.some((entry) => entry.path.endsWith("/amount") && entry.code === "INVALID_AMOUNT"), amount);
  }
});

test("Capacity is reported separately and excluded from monetary totals", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  input.scenarios[0].items.push({
    id: "capacity-only",
    side: "capacity",
    category: "capacity",
    mechanism_id: "hours-saved",
    period: 1,
    amount: "120.0000",
    currency: null,
    basis: "capacity_hours",
    netted_cost_categories: [],
    rationale: "Informational capacity only",
    evidence_ids: ["CLM-003"]
  });
  const output = evaluateInvestment(input);
  assert.equal(output.issues.length, 0);
  assert.equal(output.results[0].benefit.value, "150000.00");
  assert.equal(output.results[0].cost.value, "100000.00");
  assert.deepEqual(output.results[0].capacity, [{ id: "capacity-only", hours: "120.0000", period: 1 }]);
});

test("Unknown cash remains unavailable and distinct from explicit zero", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "unknown-flows.json"), "utf-8"));
  const result = evaluateInvestment(input);
  assert.equal(result.issues.length, 0);
  const row = result.results[0];
  assert.deepEqual(row.benefit, { status: "unavailable", value: null, reason: "unknown_benefit" });
  assert.deepEqual(row.cost, { status: "available", value: "25000.00", reason: null });
  assert.deepEqual(row.net_value, { status: "unavailable", value: null, reason: "unknown_cash_flow" });
  assert.deepEqual(row.roi, { status: "unavailable", value: null, reason: "unknown_benefit" });
  assert.deepEqual(row.payback, { status: "unavailable", period: null, reason: "unknown_cash_flow", terminal_balance: null });
  assert.deepEqual(row.npv, { status: "unavailable", value: null, reason: "missing_discount" });

  const discountedUnknown = structuredClone(input);
  discountedUnknown.discount = { rate: "0.10000000", convention: "effective_annual", price_basis: "nominal" };
  assert.deepEqual(evaluateInvestment(discountedUnknown).results[0].npv, {
    status: "unavailable", value: null, reason: "unknown_cash_flow"
  });
});
test("Frozen scenario envelope excludes scenario rationale and rejects unlisted fields", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  delete input.scenarios[0].rationale;

  const valid = evaluateInvestment(input);
  assert.deepEqual(valid.issues, []);
  assert.equal(valid.results[0].net_value.value, "50000.00");

  input.scenarios[0].items[0].rationale = "";
  const missingItemRationale = evaluateInvestment(input);
  assert.deepEqual(missingItemRationale.results, []);
  assert.ok(missingItemRationale.issues.some(({ code, path }) =>
    code === "INVALID_FIELD" && path === "/scenarios/0/items/0/rationale"
  ));

  input.scenarios[0].items[0].rationale = "Valid item rationale";
  input.scenarios[0].rationale = "Unshipped scenario-only field";
  const unknownField = evaluateInvestment(input);
  assert.deepEqual(unknownField.results, []);
  assert.deepEqual(unknownField.issues.map(({ code, path, record_id }) => ({ code, path, record_id })), [
    { code: "INVALID_FIELD", path: "/scenarios/0/rationale", record_id: null }
  ]);
});

test("Mixed known and null costs keep every monetary consumer result unavailable", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "mixed-null-cost.json"), "utf-8"));
  const output = evaluateInvestment(input);

  assert.deepEqual(output.issues, []);
  assert.equal(output.results.length, 1);
  const row = output.results[0];
  assert.deepEqual(row.benefit, { status: "available", value: "0.00", reason: null });
  assert.deepEqual(row.cost, { status: "unavailable", value: null, reason: "unknown_cost" });
  assert.deepEqual(row.net_value, { status: "unavailable", value: null, reason: "unknown_cash_flow" });
  assert.deepEqual(row.roi, { status: "unavailable", value: null, reason: "unknown_cost" });
  assert.deepEqual(row.roi_percent, { status: "unavailable", value: null, reason: "unknown_cost" });
  assert.deepEqual(row.benefit_cost, { status: "unavailable", value: null, reason: "unknown_cost" });
  assert.deepEqual(row.payback, {
    status: "unavailable", period: null, reason: "unknown_cash_flow", terminal_balance: null
  });
  assert.deepEqual(row.npv, { status: "unavailable", value: null, reason: "unknown_cash_flow" });
});

test("Contribution margin treats repeated netted categories as membership and rejects explicit overlap", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "double-counted-cost.json"), "utf-8"));
  input.scenarios[0].items[0].netted_cost_categories = ["operations", "operations"];
  input.scenarios[0].items.splice(1, 1);
  const membership = evaluateInvestment(input);
  assert.equal(membership.issues.length, 0);
  assert.equal(membership.results[0].benefit.value, "100000.00");
  assert.equal(membership.results[0].cost.status, "unavailable");

  input.scenarios[0].items.push({
    id: "development-expense", side: "cost", category: "development", mechanism_id: "build-cost",
    period: 1, amount: "20000.00", currency: "USD", basis: "cash_cost", netted_cost_categories: [],
    rationale: "Distinct from already netted operations", evidence_ids: []
  });
  const distinct = evaluateInvestment(input);
  assert.equal(distinct.issues.length, 0);
  assert.equal(distinct.results[0].cost.value, "20000.00");

  input.scenarios[0].items.push({
    ...input.scenarios[0].items[1], id: "overlapping-operations", category: "operations",
    mechanism_id: "other-operations"
  });
  const overlap = evaluateInvestment(input);
  assert.deepEqual(overlap.results, []);
  assert.deepEqual(overlap.issues.map(({ code, path, record_id }) => ({ code, path, record_id })), [
    { code: "DOUBLE_COUNTED_COST", path: "/scenarios/0/items", record_id: null }
  ]);
});

test("Monetary mechanism, item identity, currency, and basis conflicts reject the whole analysis", () => {
  const base = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  const cases = [
    {
      mutate(input) { input.scenarios[0].items.push({ ...input.scenarios[0].items[1], id: "other-benefit", amount: "10.00" }); },
      issue: { code: "DOUBLE_COUNTED_BENEFIT", path: "/scenarios/0/items/2/mechanism_id" }
    },
    {
      mutate(input) { input.scenarios[0].items.push({ ...input.scenarios[0].items[0], id: "other-cost", amount: "10.00" }); },
      issue: { code: "DOUBLE_COUNTED_COST", path: "/scenarios/0/items/2/mechanism_id" }
    },
    {
      mutate(input) { input.scenarios[0].items[1].id = input.scenarios[0].items[0].id; },
      issue: { code: "DUPLICATE_ITEM", path: "/scenarios/0/items/1/id" }
    },
    {
      mutate(input) { input.scenarios[0].items[0].currency = "EUR"; },
      issue: { code: "INCOMPATIBLE_UNITS", path: "/scenarios/0/items/0/currency" }
    },
    {
      mutate(input) { input.scenarios[0].items[1].basis = "cash_cost"; },
      issue: { code: "INVALID_FIELD", path: "/scenarios/0/items/1/basis" }
    }
  ];
  for (const { mutate, issue } of cases) {
    const input = structuredClone(base);
    mutate(input);
    const output = evaluateInvestment(input);
    assert.deepEqual(output.results, []);
    assert.ok(output.issues.some((entry) => entry.code === issue.code && entry.path === issue.path), JSON.stringify({ issue, issues: output.issues }));
    assert.equal(output.issues.every((entry) => entry.record_id === null && entry.severity === "error" && typeof entry.message === "string"), true);
  }
});

test("Scenarios are evaluated base/downside/upside independently and any invalid scenario rejects all results", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  const downside = structuredClone(input.scenarios[0]);
  downside.id = "downside";
  downside.label = "Downside";
  downside.items[0].id = "downside-cost";
  downside.items[0].mechanism_id = "downside-cost";
  downside.items[1].id = "downside-benefit";
  downside.items[1].mechanism_id = "downside-benefit";
  downside.items[1].amount = "50000.00";
  const upside = structuredClone(input.scenarios[0]);
  upside.id = "upside";
  upside.label = "Upside";
  upside.items[0].id = "upside-cost";
  upside.items[0].mechanism_id = "upside-cost";
  upside.items[1].id = "upside-benefit";
  upside.items[1].mechanism_id = "upside-benefit";
  input.scenarios = [upside, input.scenarios[0], downside];
  const ordered = evaluateInvestment(input);
  assert.deepEqual(ordered.results.map((entry) => entry.scenario_id), ["base", "downside", "upside"]);
  assert.deepEqual(ordered.results.map((entry) => entry.benefit.value), ["150000.00", "50000.00", "150000.00"]);

  input.scenarios[2].items[0].currency = "EUR";
  const invalidDownside = evaluateInvestment(input);
  assert.deepEqual(invalidDownside.results, []);
  assert.ok(invalidDownside.issues.some((entry) =>
    entry.code === "INCOMPATIBLE_UNITS" && entry.path === "/scenarios/2/items/0/currency"
  ));
});

test("Known zero cost and nonmonetary-only analysis never fabricate cash ratios or payback", () => {
  const zero = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "zero-cost.json"), "utf-8"));
  const zeroResult = evaluateInvestment(zero);
  assert.equal(zeroResult.issues.length, 0);
  assert.deepEqual(zeroResult.results[0].cost, { status: "available", value: "0.00", reason: null });
  assert.deepEqual(zeroResult.results[0].benefit, { status: "available", value: "50000.00", reason: null });
  assert.deepEqual(zeroResult.results[0].roi, { status: "undefined", value: null, reason: "zero_cost" });
  assert.deepEqual(zeroResult.results[0].payback, {
    status: "not_applicable", period: null, reason: "no_investment_outflow", terminal_balance: "50000.00"
  });

  const qualitative = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  qualitative.scenarios[0].items = [];
  qualitative.scenarios[0].nonmonetary = ["Reduced deployment uncertainty"];
  const qualitativeResult = evaluateInvestment(qualitative);
  assert.equal(qualitativeResult.issues.length, 0);
  assert.deepEqual(qualitativeResult.results[0].benefit, { status: "unavailable", value: null, reason: "unknown_benefit" });
  assert.deepEqual(qualitativeResult.results[0].cost, { status: "unavailable", value: null, reason: "unknown_cost" });
  assert.deepEqual(qualitativeResult.results[0].roi, { status: "unavailable", value: null, reason: "unknown_cost" });
  assert.deepEqual(qualitativeResult.results[0].payback, {
    status: "unavailable", period: null, reason: "unknown_cash_flow", terminal_balance: null
  });
  assert.deepEqual(qualitativeResult.results[0].nonmonetary, ["Reduced deployment uncertainty"]);
});

test("Payback reports final durable recovery after an earlier temporary crossing", () => {
  const input = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  input.horizon.periods = 4;
  input.scenarios[0].items[0].amount = "10.00";
  input.scenarios[0].items[1].amount = "6.00";
  input.scenarios[0].items[1].period = 1;
  input.scenarios[0].items.push(
    { ...input.scenarios[0].items[1], id: "second-return", mechanism_id: "second-return", period: 2 },
    { ...input.scenarios[0].items[0], id: "later-outflow", mechanism_id: "later-outflow", period: 3, amount: "3.00" },
    { ...input.scenarios[0].items[1], id: "final-return", mechanism_id: "final-return", period: 4, amount: "2.00" }
  );
  const output = evaluateInvestment(input);
  assert.equal(output.issues.length, 0);
  assert.deepEqual(output.results[0].payback, {
    status: "reached", period: 4, reason: null, terminal_balance: "1.00"
  });
});

test("Scenario, item, horizon, and file-size limits accept the boundary and reject one over", () => {
  const base = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));
  const scenarios = structuredClone(base);
  const downside = structuredClone(scenarios.scenarios[0]);
  downside.id = "downside";
  downside.label = "Downside";
  const upside = structuredClone(scenarios.scenarios[0]);
  upside.id = "upside";
  upside.label = "Upside";
  scenarios.scenarios.push(downside, upside);
  assert.equal(evaluateInvestment(scenarios).results.length, 3);
  scenarios.scenarios.push(structuredClone(upside));
  assert.ok(evaluateInvestment(scenarios).issues.some((entry) => entry.code === "LIMIT_EXCEEDED" && entry.path === "/scenarios"));

  const itemBoundary = structuredClone(base);
  itemBoundary.scenarios[0].items = Array.from({ length: 1000 }, (_, index) => ({
    id: `capacity-${index}`, side: "capacity", category: "capacity", mechanism_id: `hours-${index}`,
    period: 0, amount: "1.0000", currency: null, basis: "capacity_hours", netted_cost_categories: [],
    rationale: "Boundary capacity entry", evidence_ids: []
  }));
  assert.equal(evaluateInvestment(itemBoundary).issues.length, 0);
  itemBoundary.scenarios[0].items.push({ ...itemBoundary.scenarios[0].items[0], id: "capacity-1000", mechanism_id: "hours-1000" });
  assert.ok(evaluateInvestment(itemBoundary).issues.some((entry) => entry.code === "LIMIT_EXCEEDED"));

  const horizon = structuredClone(base);
  horizon.horizon.periods = 600;
  assert.equal(evaluateInvestment(horizon).issues.length, 0);
  horizon.horizon.periods = 601;
  assert.ok(evaluateInvestment(horizon).issues.some((entry) => entry.path === "/horizon/periods"));

  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "calc-size-boundary-")));
  try {
    const body = JSON.stringify(base);
    const exact = path.join(tmpDir, "exact.json");
    fs.writeFileSync(exact, body + " ".repeat(1048576 - Buffer.byteLength(body)));
    const accepted = spawnSync(process.execPath, [CALCULATOR_CLI, exact], { encoding: "utf-8" });
    assert.equal(Buffer.byteLength(fs.readFileSync(exact)), 1048576);
    assert.equal(accepted.status, 0);
    assert.deepEqual(JSON.parse(accepted.stdout).results[0].roi, { status: "available", value: "0.500000", reason: null });

    const over = path.join(tmpDir, "over.json");
    fs.writeFileSync(over, body + " ".repeat(1048577 - Buffer.byteLength(body)));
    const rejected = spawnSync(process.execPath, [CALCULATOR_CLI, over], { encoding: "utf-8" });
    assert.equal(Buffer.byteLength(fs.readFileSync(over)), 1048577);
    assert.equal(rejected.status, 2);
    assert.deepEqual(JSON.parse(rejected.stdout).issues.map(({ code, severity, path: issuePath, record_id, message }) =>
      ({ code, severity, path: issuePath, record_id, message })), [{
      code: "LIMIT_EXCEEDED", severity: "error", path: "", record_id: null,
      message: "Input file exceeds maximum size limit of 1 MiB."
    }]);
    assert.equal(rejected.stderr, "");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("CLI invoked through a symlink executes without changing import-only behavior", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-entry-test-"));
  const symlinkPath = path.join(tmpDir, "calculator-link.mjs");
  try {
    const fixturePath = path.join(FIXTURES_DIR, "baseline-positive.json");
    fs.symlinkSync(CALCULATOR_CLI, symlinkPath);
    const physical = spawnSync(process.execPath, [CALCULATOR_CLI, fixturePath], { encoding: "utf8" });
    const linked = spawnSync(process.execPath, [symlinkPath, fixturePath], { encoding: "utf8" });

    assert.equal(physical.status, 0, physical.stderr);
    assert.equal(linked.status, physical.status, linked.stderr);
    assert.equal(linked.stdout, physical.stdout);
    assert.equal(linked.stderr, physical.stderr);
    assert.equal(JSON.parse(linked.stdout).tool, "investment-calculator");

    const imported = spawnSync(process.execPath, [
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(pathToFileURL(CALCULATOR_CLI).href)}); process.stdout.write("IMPORT_ONLY\\n");`,
    ], { encoding: "utf8" });
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout, "IMPORT_ONLY\n");
    assert.equal(imported.stderr, "");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Rejected money_scale stops scale-dependent parsing and preserves INVALID_FIELD", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "baseline-positive.json"), "utf-8"));

  // Huge rejected scale (100,000,000) stops scale-dependent parsing
  fixture.money_scale = 100000000;
  const outHuge = evaluateInvestment(fixture);
  assert.equal(outHuge.results.length, 0);
  assert.deepEqual(outHuge.issues, [
    {
      code: "INVALID_FIELD",
      severity: "error",
      path: "/money_scale",
      record_id: null,
      message: "money_scale must be an integer between 0 and 4"
    }
  ]);

  // Negative rejected scale
  fixture.money_scale = -1;
  const outNeg = evaluateInvestment(fixture);
  assert.equal(outNeg.results.length, 0);
  assert.deepEqual(outNeg.issues, [
    {
      code: "INVALID_FIELD",
      severity: "error",
      path: "/money_scale",
      record_id: null,
      message: "money_scale must be an integer between 0 and 4"
    }
  ]);

  // Non-integer scale
  fixture.money_scale = 2.5;
  const outFloat = evaluateInvestment(fixture);
  assert.equal(outFloat.results.length, 0);
  assert.deepEqual(outFloat.issues, [
    {
      code: "INVALID_FIELD",
      severity: "error",
      path: "/money_scale",
      record_id: null,
      message: "money_scale must be an integer between 0 and 4"
    }
  ]);
});

test("CLI drains output completely across piped stdout with exact exit semantics", () => {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "calc-drain-test-")));
  try {
    // 1. Valid execution piped through consumer: exits 0, valid JSON output
    const validFixturePath = path.join(FIXTURES_DIR, "baseline-positive.json");
    const validRun = spawnSync(process.execPath, [CALCULATOR_CLI, validFixturePath], {
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024
    });
    assert.equal(validRun.status, 0);
    assert.equal(validRun.stderr, "");
    const validJson = JSON.parse(validRun.stdout);
    assert.equal(validJson.tool, "investment-calculator");
    assert.equal(validJson.results.length, 1);
    assert.equal(validJson.issues.length, 0);

    // 2. Invalid execution with large issue output (~1.5 MB): exits 1, complete JSON, no truncation
    const fixture = JSON.parse(fs.readFileSync(validFixturePath, "utf-8"));
    fixture.scenarios[0].items = Array.from({ length: 1000 }, () => ({}));
    const filePath = path.join(tmpDir, "many-errors.json");
    fs.writeFileSync(filePath, JSON.stringify(fixture));

    const invalidRun = spawnSync(process.execPath, [CALCULATOR_CLI, filePath], {
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024
    });

    assert.equal(invalidRun.status, 1);
    assert.equal(invalidRun.stderr, "");
    assert.ok(invalidRun.stdout.length > 65536, `Expected stdout to exceed 64KB pipe buffer, got ${invalidRun.stdout.length}`);
    const invalidJson = JSON.parse(invalidRun.stdout);
    assert.equal(invalidJson.tool, "investment-calculator");
    assert.equal(invalidJson.results.length, 0);
    assert.ok(invalidJson.issues.length >= 1000);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
