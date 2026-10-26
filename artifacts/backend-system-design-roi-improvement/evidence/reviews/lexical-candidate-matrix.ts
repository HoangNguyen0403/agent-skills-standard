/**
 * T5 lexical candidate matrix — PREPARED, NOT EXECUTED by T5.
 *
 * Owner: T6 (consolidated no-model checks after the canonical source + eval freeze).
 * This script reports lexical probes only; it cannot decide semantic soundness
 * or paraphrase acceptance.
 * Run from the repository root, local dependency only (no npx, no network):
 *   rtk node --import tsx .agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.ts
 *
 * Writes: .agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.json
 * Exit: 0 when the targeted lexical probes produce their expected text-level results.
 *
 * Lane A is an informational tally against existing same-family evals. Full-eval
 * acceptance requires every assertion of a different prompt to pass, so a low
 * count is expected by construction and says nothing about assertion quality.
 * The per-assertion tally is the only useful output.
 * Lane B was removed: its provisional verdict-shaped regex gates overclaimed
 * denial safety and meaning. Semantic calibration belongs to independent L2.
 *
 * Scope limits: lexical acceptance/rejection of supplied text only. Not semantic
 * adjudication, not model output, not candidate runtime behaviour. L3 unavailable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Assertion } from "../../../../scripts/evals/types.ts";
import { checkAssertion } from "../../../../scripts/evals/scorer.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const packetPath = path.join(
  root,
  "benchmarks/evals/backend-system-design-roi-heldout.json",
);
const outPath = path.join(
  root,
  ".agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.json",
);

const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

/** Lane A: payment uses the current unknown-outcome eval (IP #5), not retired IP #2. */
const existing = {
  "ROI-PAY-01": [
    ["system-design-data-architecture", 5],
    ["system-design-data-architecture", 6],
    ["system-design-integration-patterns", 5],
    ["system-design-resilience-ops", 5],
  ],
  "ROI-TEN-01": [
    ["system-design-data-architecture", 9],
    ["system-design-data-architecture", 10],
    ["system-design-resilience-ops", 7],
  ],
  "ROI-OVL-01": [
    ["system-design-building-blocks", 2],
    ["system-design-resilience-ops", 2],
  ],
} satisfies Record<string, [string, number][]>;

const evalsBySkill: Record<string, Map<number, { assertions: Assertion[] }>> = {};
for (const skill of new Set(Object.values(existing).flat().map(([s]) => s))) {
  const file = path.join(root, `skills/system-design/${skill}/evals/evals.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    evals: { id: number; assertions: Assertion[] }[];
  };
  evalsBySkill[skill] = new Map(data.evals.map((e) => [e.id, e]));
}

/** Targeted text-level edge probes for the T6 real-scorer smoke. */
const lexicalProbes = [
  {
    name: "finite-bound phrase passes",
    assertion: {
      type: "contains_any",
      value: [
        "stream lifetime and drain deadline are finite",
        "buffer, stream lifetime and drain deadline are finite",
      ],
    },
    candidate: "The buffer, stream lifetime and drain deadline are finite.",
    expected: true,
  },
  {
    name: "infinite is not mistaken for finite",
    assertion: {
      type: "contains_any",
      value: [
        "stream lifetime and drain deadline are finite",
        "buffer, stream lifetime and drain deadline are finite",
      ],
    },
    candidate: "Buffers grow to an infinite size.",
    expected: false,
  },
  {
    name: "safe denial may miss lexical anchor",
    assertion: {
      type: "contains_any",
      value: [
        "which effects are reversible",
        "compensation to be defined before it is implemented",
      ],
    },
    candidate:
      "The past-four-steps cutoff is retired; not every step requires compensation. Choose coordination from reversibility and recovery constraints.",
    expected: false,
  },
  {
    name: "safe denial of exactly-once wording stays lexical-only",
    assertion: {
      type: "contains_any",
      value: [
        "unknown outcome",
        "never retrying blindly",
      ],
    },
    candidate:
      "We cannot claim exactly-once across systems; a lost reply is unresolved, and we reconcile before any further effect.",
    expected: false,
  },
] as const;

const probeResults = lexicalProbes.map((probe) => ({
  name: probe.name,
  expected: probe.expected,
  actual: checkAssertion(probe.assertion as Assertion, probe.candidate, 1),
}));
const probeMismatches = probeResults.filter(
  (probe) => probe.actual !== probe.expected,
);

const rows = [];
let laneAAssertions = 0;
let laneAAssertionsPassed = 0;
let laneAPairs = 0;
let laneAPairsAccepted = 0;

for (const cal of packet.calibration) {
  const family = cal.case_id.replace(/-C\d+$/, "");
  const existingResults = {};
  for (const [skill, id] of existing[family]) {
    const ev = evalsBySkill[skill].get(id);
    if (!ev) throw new Error(`Missing eval ${skill}#${id}`);
    for (const semanticsVersion of [1, 2] as const) {
      const results = ev.assertions.map((a) =>
        checkAssertion(a, cal.answer, semanticsVersion),
      );
      laneAAssertions += results.length;
      laneAAssertionsPassed += results.filter(Boolean).length;
      laneAPairs += 1;
      if (results.every(Boolean)) laneAPairsAccepted += 1;
      existingResults[`v${semanticsVersion}:${skill}#${id}`] = {
        allAssertionsPassed: results.every(Boolean),
        assertionsPassed: results.filter(Boolean).length,
        assertionsTotal: results.length,
      };
    }
  }
  rows.push({
    candidate: cal.case_id,
    type: cal.example_type,
    authorExpectedVerdict: cal.expected_verdict,
    laneAExistingEvals: existingResults,
  });
}

const summary = {
  generatedBy: "T5 lexical candidate matrix (prepared for T6; not executed)",
  packetDigest: "record recomputed by the runner; compare with the T5 report manifest",
  calibrationCandidates: rows.length,
  laneA: {
    evalPairsScored: laneAPairs,
    evalPairsFullyAccepted: laneAPairsAccepted,
    assertionsScored: laneAAssertions,
    assertionsPassed: laneAAssertionsPassed,
    interpretation:
      "Full-eval acceptance needs every assertion of an eval written for a different prompt to pass. A low count is expected by construction and is NOT evidence that existing assertions are unusable; read the per-assertion tally in rows instead.",
  },
  adversarialLexicalProbes: {
    results: probeResults,
    mismatches: probeMismatches.length,
    interpretation:
      "These targeted examples check scorer substring behavior only. They do not establish semantic soundness, general denial safety, or paraphrase acceptance.",
  },
  rows,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");

for (const probe of probeResults) {
  console.log(
    `${probe.name}\texpected=${probe.expected}\tactual=${probe.actual}\t${probe.actual === probe.expected ? "ok" : "MISMATCH"}`,
  );
}
console.log(
  `laneA eval pairs fully accepted ${laneAPairsAccepted}/${laneAPairs} (${laneAAssertionsPassed}/${laneAAssertions} assertions); lexical probe mismatches ${probeMismatches.length} (${outPath})`,
);
process.exitCode = probeMismatches.length === 0 ? 0 : 1;
