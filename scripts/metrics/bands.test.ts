// scripts/metrics/bands.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateBands } from "./bands";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-bands-"));
}

function writeBands(root: string, content: string): void {
  fs.mkdirSync(path.join(root, "docs", "ops"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "ops", "bands.yaml"), content, "utf8");
}

function writeHistory(root: string, relativePath: string, records: Record<string, unknown>[]): void {
  fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, relativePath), JSON.stringify({ records }), "utf8");
}

test("evaluateBands returns empty result when docs/ops/bands.yaml is absent", () => {
  const root = tmpRoot();
  assert.deepEqual(evaluateBands(root), { breaches: [], configErrors: [], unavailable: [] });
});

test("evaluateBands surfaces a band with no owner as a config error, not a breach", () => {
  const root = tmpRoot();
  writeBands(
    root,
    `version: 1\nbands:\n  - metric: noOwner\n    source: "benchmarks/history.json (avgTokens field)"\n    baseline: rolling_2\n`,
  );
  writeHistory(root, "benchmarks/history.json", [{ avgTokens: 100 }]);
  const result = evaluateBands(root);
  assert.deepEqual(result.breaches, []);
  assert.equal(result.configErrors.length, 1);
  assert.equal(result.configErrors[0].band, "noOwner");
  assert.match(result.configErrors[0].problem, /no owner declared/);
});

test("evaluateBands western_electric: seeded 3-sigma spike reports the tier and named owner (AC-004)", () => {
  const root = tmpRoot();
  writeBands(
    root,
    [
      "version: 1",
      "defaults:",
      "  owner: repo-maintainer",
      "bands:",
      "  - metric: avgTokens",
      '    source: "benchmarks/history.json (avgTokens field)"',
      "    baseline: rolling_5",
      "    tiers:",
      "      3sigma:",
      "        action: propose",
      "        routes: [pull_request]",
      "",
    ].join("\n"),
  );
  const baseline = [10, 11, 9, 10, 11, 9, 10, 11, 9, 10, 11, 9, 10];
  const tail = [10, 10, 10, 10, 10, 10, 10, 1000];
  writeHistory(
    root,
    "benchmarks/history.json",
    [...baseline, ...tail].map((v, i) => ({ avgTokens: v, date: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z` })),
  );
  const result = evaluateBands(root);
  assert.deepEqual(result.configErrors, []);
  assert.equal(result.breaches.length, 1);
  assert.equal(result.breaches[0].metric, "avgTokens");
  assert.equal(result.breaches[0].tier, "3sigma");
  assert.equal(result.breaches[0].action, "propose");
  assert.equal(result.breaches[0].routedTo, "pull_request");
});

test("evaluateBands fixed_gate_threshold: a growth beyond the gate threshold breaches at tier 3sigma", () => {
  const root = tmpRoot();
  writeBands(
    root,
    [
      "version: 1",
      "defaults:",
      "  owner: repo-maintainer",
      "  rules: western_electric",
      "bands:",
      "  - metric: avgTokens",
      '    source: "benchmarks/history.json (avgTokens field)"',
      "    baseline: rolling_release",
      "    rules: fixed_gate_threshold",
      "    tiers:",
      "      3sigma:",
      "        action: propose",
      "        routes: [pull_request]",
      "",
    ].join("\n"),
  );
  writeHistory(root, "benchmarks/history.json", [
    { version: "1.0.0", avgTokens: 500 },
    { version: "1.1.0", avgTokens: 600 },
  ]);
  const result = evaluateBands(root);
  assert.equal(result.breaches.length, 1);
  assert.equal(result.breaches[0].tier, "3sigma");
  assert.equal(result.breaches[0].routedTo, "pull_request");
});

test("evaluateBands fixed_gate_threshold: within-threshold change is reported unavailable (gate passed), not a breach", () => {
  const root = tmpRoot();
  writeBands(
    root,
    [
      "version: 1",
      "defaults:",
      "  owner: repo-maintainer",
      "bands:",
      "  - metric: avgTokens",
      '    source: "benchmarks/history.json (avgTokens field)"',
      "    baseline: rolling_release",
      "    rules: fixed_gate_threshold",
      "    tiers: {}",
      "",
    ].join("\n"),
  );
  writeHistory(root, "benchmarks/history.json", [
    { version: "1.0.0", avgTokens: 500 },
    { version: "1.1.0", avgTokens: 505 },
  ]);
  const result = evaluateBands(root);
  assert.deepEqual(result.breaches, []);
  assert.equal(result.unavailable.length, 1);
  assert.match(result.unavailable[0].reason, /gate passed/);
});

test("evaluateBands reports an unrecognized rules value as a config error", () => {
  const root = tmpRoot();
  writeBands(
    root,
    [
      "version: 1",
      "defaults:",
      "  owner: repo-maintainer",
      "bands:",
      "  - metric: mystery",
      '    source: "benchmarks/history.json (avgTokens field)"',
      "    baseline: rolling_2",
      "    rules: made_up_rule",
      "",
    ].join("\n"),
  );
  writeHistory(root, "benchmarks/history.json", [{ avgTokens: 1 }]);
  const result = evaluateBands(root);
  assert.equal(result.configErrors.length, 1);
  assert.match(result.configErrors[0].problem, /unrecognized rules/);
});

test("evaluateBands reports a malformed bands.yaml as a config error instead of throwing", () => {
  const root = tmpRoot();
  writeBands(root, "bands:\n  - metric: [unterminated\n");
  const result = evaluateBands(root);
  assert.equal(result.breaches.length, 0);
  assert.equal(result.configErrors.length, 1);
  assert.match(result.configErrors[0].problem, /failed to parse YAML/);
});
