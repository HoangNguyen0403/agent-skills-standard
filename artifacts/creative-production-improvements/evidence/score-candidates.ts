import fs from "fs-extra";
import path from "path";
import { checkAssertion } from "../../../scripts/evals/scorer";
import { Assertion, AssertionSemanticsVersion } from "../../../scripts/evals/types";

interface EvalCase {
  id: number | string;
  assertions?: Assertion[];
  expected_output?: string;
}

interface PressureScenario {
  behavior_assertions?: string[];
}

interface EvalsJson {
  skill_name: string;
  evals?: EvalCase[];
  pressure_scenarios?: PressureScenario[];
}

interface Candidate {
  scenario_id: string;
  eval_id?: number;
  case_kind: "eval" | "manual";
  name: string;
  mapped_acs?: string[];
  expected: "accepted" | "rejected";
  rationale?: string;
  manual_adjudication?: string;
  candidate_response: string;
  known_predicate_gap?: boolean | string;
}

interface CandidatesJson {
  skill_name: string;
  candidates: Candidate[];
}

interface CandidateScoreResult {
  skill: string;
  scenario_id: string;
  case_kind: "eval" | "manual";
  name: string;
  expected: "accepted" | "rejected";
  known_predicate_gap?: boolean | string;
  v1: {
    passed: boolean;
    failedAssertions: string[];
    passedAssertions: number;
    totalAssertions: number;
  };
  v2: {
    passed: boolean;
    failedAssertions: string[];
    passedAssertions: number;
    totalAssertions: number;
  };
  typedStatus?: "CORRECT_PASS" | "CORRECT_FAIL" | "FALSE_POSITIVE" | "FALSE_NEGATIVE";
  pressureStatus?: "LEXICAL_PASS" | "LEXICAL_FAIL";
}

async function run() {
  const skills = [
    "marketing-content-strategy",
    "marketing-copywriting",
    "marketing-demo-video"
  ];

  const allResults: CandidateScoreResult[] = [];
  const typedSummary = {
    total: 0,
    acceptedExpected: 0,
    acceptedPassed: 0,
    rejectedExpected: 0,
    rejectedFailed: 0,
    falsePositives: 0,
    falseNegatives: 0,
  };
  const pressureSummary = {
    total: 0,
    acceptedExpected: 0,
    acceptedPassed: 0,
    rejectedExpected: 0,
    rejectedFailed: 0,
    knownPredicateGaps: 0,
    knownGapsLexicalPass: 0,
  };
  const manualSummary = {
    total: 0,
  };

  for (const skill of skills) {
    const skillDir = path.resolve(__dirname, "../../../skills/marketing", skill);
    const evalsPath = path.join(skillDir, "evals/evals.json");
    const candidatesPath = path.join(skillDir, "evals/creative-production-candidates.json");

    if (!fs.existsSync(evalsPath)) throw new Error(`Missing evals.json: ${evalsPath}`);
    if (!fs.existsSync(candidatesPath)) throw new Error(`Missing candidates: ${candidatesPath}`);

    const evalsJson: EvalsJson = fs.readJsonSync(evalsPath);
    const candidatesJson: CandidatesJson = fs.readJsonSync(candidatesPath);

    const evalMap = new Map<string, EvalCase>();
    for (const ev of evalsJson.evals ?? []) {
      evalMap.set(String(ev.id), ev);
    }
    const pressureScenarios = evalsJson.pressure_scenarios ?? [];

    for (const cand of candidatesJson.candidates) {
      let assertions: Assertion[] = [];
      let expectedOutput: string | undefined;

      if (cand.scenario_id.startsWith("eval-")) {
        const idNum = cand.scenario_id.replace("eval-", "");
        const ev = evalMap.get(idNum);
        if (!ev) {
          throw new Error(`FAIL-CLOSED: Unknown scenario_id ${cand.scenario_id} in ${skill}`);
        }
        if (!ev.assertions || ev.assertions.length === 0) {
          throw new Error(`FAIL-CLOSED: Empty or missing assertions for ${cand.scenario_id} in ${skill}`);
        }
        assertions = ev.assertions;
        expectedOutput = ev.expected_output;
      } else if (cand.scenario_id.startsWith("pressure-")) {
        const idx = Number(cand.scenario_id.replace("pressure-", "")) - 1;
        const p = pressureScenarios[idx];
        if (!p) {
          throw new Error(`FAIL-CLOSED: Unknown pressure scenario ${cand.scenario_id} in ${skill}`);
        }
        assertions = (p.behavior_assertions ?? []).map((val) => ({
          type: "contains" as const,
          value: val,
        }));
        if (assertions.length === 0) {
          throw new Error(`FAIL-CLOSED: Empty behavior_assertions for ${cand.scenario_id} in ${skill}`);
        }
      } else {
        throw new Error(`FAIL-CLOSED: Unrecognized scenario_id format ${cand.scenario_id}`);
      }

      // Score with v1
      const v1Failed = assertions
        .filter((a) => !checkAssertion(a, cand.candidate_response, 1))
        .map((a) => `${a.type}:${String(a.value)}`);
      const v1Result = {
        passed: v1Failed.length === 0,
        failedAssertions: v1Failed,
        passedAssertions: assertions.length - v1Failed.length,
        totalAssertions: assertions.length,
      };

      // Score with v2
      const v2Failed = assertions
        .filter((a) => !checkAssertion(a, cand.candidate_response, 2))
        .map((a) => `${a.type}:${String(a.value)}`);
      const v2Result = {
        passed: v2Failed.length === 0,
        failedAssertions: v2Failed,
        passedAssertions: assertions.length - v2Failed.length,
        totalAssertions: assertions.length,
      };

      const result: CandidateScoreResult = {
        skill,
        scenario_id: cand.scenario_id,
        case_kind: cand.case_kind,
        name: cand.name,
        expected: cand.expected,
        known_predicate_gap: cand.known_predicate_gap,
        v1: v1Result,
        v2: v2Result,
      };

      if (cand.case_kind === "manual") {
        manualSummary.total++;
      } else if (cand.scenario_id.startsWith("eval-")) {
        typedSummary.total++;
        if (cand.expected === "accepted") {
          typedSummary.acceptedExpected++;
          if (v1Result.passed && v2Result.passed) {
            typedSummary.acceptedPassed++;
            result.typedStatus = "CORRECT_PASS";
          } else {
            typedSummary.falseNegatives++;
            result.typedStatus = "FALSE_NEGATIVE";
          }
        } else {
          typedSummary.rejectedExpected++;
          if (!v1Result.passed && !v2Result.passed) {
            typedSummary.rejectedFailed++;
            result.typedStatus = "CORRECT_FAIL";
          } else {
            typedSummary.falsePositives++;
            result.typedStatus = "FALSE_POSITIVE";
          }
        }
      } else if (cand.scenario_id.startsWith("pressure-")) {
        pressureSummary.total++;
        if (cand.expected === "accepted") {
          pressureSummary.acceptedExpected++;
          if (v1Result.passed && v2Result.passed) {
            pressureSummary.acceptedPassed++;
          }
        } else {
          pressureSummary.rejectedExpected++;
          if (!v1Result.passed && !v2Result.passed) {
            pressureSummary.rejectedFailed++;
          }
        }
        if (cand.known_predicate_gap) {
          pressureSummary.knownPredicateGaps++;
          if (v1Result.passed || v2Result.passed) {
            pressureSummary.knownGapsLexicalPass++;
          }
        }
        result.pressureStatus = (v1Result.passed && v2Result.passed) ? "LEXICAL_PASS" : "LEXICAL_FAIL";
      }

      allResults.push(result);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    engine: "scripts/evals/scorer.ts checkAssertion",
    typedSummary,
    pressureSummary,
    manualSummary,
    results: allResults,
  };

  const outputPath = path.resolve(__dirname, "scorer-results.json");
  fs.writeJsonSync(outputPath, output, { spaces: 2 });

  console.log("=========================================");
  console.log("REAL SCORER EXECUTION ON PAIRED CANDIDATES");
  console.log("=========================================");
  console.log(`Typed Cases (case_kind=eval): ${typedSummary.total}`);
  console.log(`  Expected Accepted: ${typedSummary.acceptedExpected} -> Passed: ${typedSummary.acceptedPassed}`);
  console.log(`  Expected Rejected: ${typedSummary.rejectedExpected} -> Failed: ${typedSummary.rejectedFailed}`);
  console.log(`  False Positives:   ${typedSummary.falsePositives}`);
  console.log(`  False Negatives:   ${typedSummary.falseNegatives}`);
  console.log("-----------------------------------------");
  console.log(`Pressure Diagnostic Cases: ${pressureSummary.total}`);
  console.log(`  Expected Accepted: ${pressureSummary.acceptedExpected} -> Passed: ${pressureSummary.acceptedPassed}`);
  console.log(`  Expected Rejected: ${pressureSummary.rejectedExpected} -> Failed: ${pressureSummary.rejectedFailed}`);
  console.log(`  Known Predicate Gaps: ${pressureSummary.knownPredicateGaps} (Lexical Pass: ${pressureSummary.knownGapsLexicalPass})`);
  console.log("-----------------------------------------");
  console.log(`Manual Adjudication Cases: ${manualSummary.total}`);
  console.log(`Wrote detailed results to: ${outputPath}`);

  if (typedSummary.falsePositives > 0 || typedSummary.falseNegatives > 0) {
    console.error(`FAILED: Typed acceptance lane has ${typedSummary.falsePositives} false positives and ${typedSummary.falseNegatives} false negatives.`);
    process.exit(1);
  } else {
    console.log("SUCCESS: All typed compliant positives passed and all typed critical negatives failed!");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
