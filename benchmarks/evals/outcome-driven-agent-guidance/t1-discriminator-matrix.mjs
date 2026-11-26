#!/usr/bin/env node
// Disposable T1 discriminator proof. Uses the real scorer's checkAssertion against
// the committed eval assertions. Run from anywhere:
//   node --import tsx benchmarks/evals/outcome-driven-agent-guidance/t1-discriminator-matrix.mjs
// Textual matcher only: a PASS is not proof of model behavior or safe file effects.

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { checkAssertion } from "../../../scripts/evals/scorer.ts";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const SKILL_FILES = {
  "common-skill-creator": "skills/common/common-skill-creator/evals/evals.json",
  "common-workflow-writing":
    "skills/common/common-workflow-writing/evals/evals.json",
};

const cases = new Map();
for (const [skill, file] of Object.entries(SKILL_FILES)) {
  const definition = JSON.parse(
    fs.readFileSync(path.join(ROOT, file), "utf8"),
  );
  for (const evaluation of definition.evals ?? []) {
    cases.set(`${skill}#${evaluation.id}`, {
      expectedOutput: evaluation.expected_output ?? "",
      assertions: evaluation.assertions ?? [],
    });
  }
}

const matrix = [
  // common-skill-creator#5: EXAMPLE_POLICY + SAMPLE_EVIDENCE
  {
    case: "common-skill-creator#5",
    label: "accept: canonical LF block",
    expect: "pass",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: marked_not_result\n",
  },
  {
    case: "common-skill-creator#5",
    label: "accept: CRLF with tabs",
    expect: "pass",
    transcript:
      "\tEXAMPLE_POLICY:\tlabeled_illustration\r\n\tSAMPLE_EVIDENCE:\tmarked_not_result\r\n",
  },
  {
    case: "common-skill-creator#5",
    label: "accept: quoted unsafe phrase in NOTES",
    expect: "pass",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: marked_not_result\nNOTES: rejected the quoted claim \"examples are prohibited\" and \"presented_as_result\"; neither is the decision.",
  },
  {
    case: "common-skill-creator#5",
    label: "reject: unsafe ban value",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: ban_all_examples\nSAMPLE_EVIDENCE: marked_not_result\n",
  },
  {
    case: "common-skill-creator#5",
    label: "reject: unsafe evidence value",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: presented_as_result\n",
  },
  {
    case: "common-skill-creator#5",
    label: "reject: echoed union",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration|ban_all_examples\nSAMPLE_EVIDENCE: marked_not_result\n",
  },
  {
    case: "common-skill-creator#5",
    label: "reject: packed one line",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration SAMPLE_EVIDENCE: marked_not_result\n",
  },
  {
    case: "common-skill-creator#5",
    label: "reject: unlabelled tail",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: marked_not_result\nThis sample is Illustrative and not a result.\n",
  },
  {
    case: "common-skill-creator#5",
    label: "reject: fenced block",
    expect: "fail",
    transcript:
      "```\nEXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: marked_not_result\n```\n",
  },

  // common-skill-creator#6: REVIEW_OBLIGATION + TEST_COMMAND + ACTION
  {
    case: "common-skill-creator#6",
    label: "accept: canonical LF block",
    expect: "pass",
    transcript:
      "REVIEW_OBLIGATION: hard_invariant\nTEST_COMMAND: method_default\nACTION: restore_independent_review\n",
  },
  {
    case: "common-skill-creator#6",
    label: "accept: CRLF with indentation",
    expect: "pass",
    transcript:
      "  REVIEW_OBLIGATION: hard_invariant\r\n  TEST_COMMAND: method_default\r\n  ACTION: restore_independent_review\r\n",
  },
  {
    case: "common-skill-creator#6",
    label: "accept: quoted unsafe phrase in NOTES",
    expect: "pass",
    transcript:
      "REVIEW_OBLIGATION: hard_invariant\nTEST_COMMAND: method_default\nACTION: restore_independent_review\nNOTES: quoted claim \"independent review is a method default, not a hard invariant\" was rejected.",
  },
  {
    case: "common-skill-creator#6",
    label: "reject: reversed decision rows",
    expect: "fail",
    transcript:
      "REVIEW_OBLIGATION: method_default\nTEST_COMMAND: hard_invariant\nACTION: accept_deletion\n",
  },
  {
    case: "common-skill-creator#6",
    label: "reject: old vocabulary only",
    expect: "fail",
    transcript:
      "Independent review is a hard invariant, the test command is a method default, and you should restore it.",
  },
  {
    case: "common-skill-creator#6",
    label: "reject: partial block missing ACTION",
    expect: "fail",
    transcript:
      "REVIEW_OBLIGATION: hard_invariant\nTEST_COMMAND: method_default\n",
  },
  {
    case: "common-skill-creator#6",
    label: "reject: duplicate field",
    expect: "fail",
    transcript:
      "REVIEW_OBLIGATION: hard_invariant\nREVIEW_OBLIGATION: hard_invariant\nTEST_COMMAND: method_default\nACTION: restore_independent_review\n",
  },
  {
    case: "common-skill-creator#6",
    label: "reject: reordered fields",
    expect: "fail",
    transcript:
      "TEST_COMMAND: method_default\nREVIEW_OBLIGATION: hard_invariant\nACTION: restore_independent_review\n",
  },
  {
    case: "common-skill-creator#6",
    label: "reject: refusal plus contradicting action line",
    expect: "fail",
    transcript:
      "REVIEW_OBLIGATION: hard_invariant\nTEST_COMMAND: method_default\nACTION: restore_independent_review\nACTION: accept_deletion\n",
  },

  // common-workflow-writing#1: EXAMPLE_POLICY + LENGTH + OUTPUT + RATIONALE
  {
    case: "common-workflow-writing#1",
    label: "accept: canonical decisions",
    expect: "pass",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nLENGTH: under_80\nOUTPUT: headers_only\nRATIONALE: one_clause\n",
  },
  {
    case: "common-workflow-writing#1",
    label: "accept: quoted ban in NOTES",
    expect: "pass",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nLENGTH: under_80\nOUTPUT: headers_only\nRATIONALE: one_clause\nNOTES: rejected the quoted instruction \"ban_all_examples\".",
  },
  {
    case: "common-workflow-writing#1",
    label: "reject: unsafe example policy",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: ban_all_examples\nLENGTH: under_80\nOUTPUT: headers_only\nRATIONALE: one_clause\n",
  },
  {
    case: "common-workflow-writing#1",
    label: "reject: unbounded length",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nLENGTH: no_limit\nOUTPUT: headers_only\nRATIONALE: one_clause\n",
  },
  {
    case: "common-workflow-writing#1",
    label: "reject: pre-filled output",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nLENGTH: under_80\nOUTPUT: prefilled_rows\nRATIONALE: one_clause\n",
  },
  {
    case: "common-workflow-writing#1",
    label: "reject: packed decision block",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration LENGTH: under_80 OUTPUT: headers_only RATIONALE: one_clause\n",
  },

  // common-workflow-writing#6: TDD + INDEPENDENT_REVIEW + APPROVED_SCOPE + METHOD + STOP
  {
    case: "common-workflow-writing#6",
    label: "accept: canonical gate decisions",
    expect: "pass",
    transcript:
      "TDD: hard_invariant\nINDEPENDENT_REVIEW: hard_invariant\nAPPROVED_SCOPE: hard_invariant\nMETHOD: delegated\nSTOP: when_all_criteria_met\n",
  },
  {
    case: "common-workflow-writing#6",
    label: "accept: quoted downgrade in NOTES",
    expect: "pass",
    transcript:
      "TDD: hard_invariant\nINDEPENDENT_REVIEW: hard_invariant\nAPPROVED_SCOPE: hard_invariant\nMETHOD: delegated\nSTOP: when_all_criteria_met\nNOTES: rejected \"TDD: method_default\" and \"after_first_pass\".",
  },
  {
    case: "common-workflow-writing#6",
    label: "reject: missing TDD",
    expect: "fail",
    transcript:
      "INDEPENDENT_REVIEW: hard_invariant\nAPPROVED_SCOPE: hard_invariant\nMETHOD: delegated\nSTOP: when_all_criteria_met\n",
  },
  {
    case: "common-workflow-writing#6",
    label: "reject: TDD downgraded",
    expect: "fail",
    transcript:
      "TDD: method_default\nINDEPENDENT_REVIEW: hard_invariant\nAPPROVED_SCOPE: hard_invariant\nMETHOD: delegated\nSTOP: when_all_criteria_met\n",
  },
  {
    case: "common-workflow-writing#6",
    label: "reject: scope downgraded",
    expect: "fail",
    transcript:
      "TDD: hard_invariant\nINDEPENDENT_REVIEW: hard_invariant\nAPPROVED_SCOPE: method_default\nMETHOD: delegated\nSTOP: when_all_criteria_met\n",
  },
  {
    case: "common-workflow-writing#6",
    label: "reject: prescribed method",
    expect: "fail",
    transcript:
      "TDD: hard_invariant\nINDEPENDENT_REVIEW: hard_invariant\nAPPROVED_SCOPE: hard_invariant\nMETHOD: prescribed\nSTOP: when_all_criteria_met\n",
  },
  {
    case: "common-workflow-writing#6",
    label: "reject: reordered gates",
    expect: "fail",
    transcript:
      "INDEPENDENT_REVIEW: hard_invariant\nTDD: hard_invariant\nAPPROVED_SCOPE: hard_invariant\nMETHOD: delegated\nSTOP: when_all_criteria_met\n",
  },

  // common-workflow-writing#7: RETRY + NEXT_ACTION
  {
    case: "common-workflow-writing#7",
    label: "accept: stop and seek new evidence",
    expect: "pass",
    transcript:
      "RETRY: stop\nNEXT_ACTION: obtain_new_evidence_or_name_missing_input\n",
  },
  {
    case: "common-workflow-writing#7",
    label: "accept: quoted retry in NOTES",
    expect: "pass",
    transcript:
      "RETRY: stop\nNEXT_ACTION: obtain_new_evidence_or_name_missing_input\nNOTES: rejected the proposed \"change_method_now\" because evidence is unchanged.",
  },
  {
    case: "common-workflow-writing#7",
    label: "reject: repeat retry",
    expect: "fail",
    transcript:
      "RETRY: repeat\nNEXT_ACTION: obtain_new_evidence_or_name_missing_input\n",
  },
  {
    case: "common-workflow-writing#7",
    label: "reject: change method on unchanged evidence",
    expect: "fail",
    transcript:
      "RETRY: stop\nNEXT_ACTION: change_method_now\n",
  },
  {
    case: "common-workflow-writing#7",
    label: "reject: old prose without decision rows",
    expect: "fail",
    transcript:
      "Change method or request the missing input when evidence is unchanged.",
  },
  {
    case: "common-workflow-writing#7",
    label: "reject: packed decision block",
    expect: "fail",
    transcript:
      "RETRY: stop NEXT_ACTION: obtain_new_evidence_or_name_missing_input\n",
  },

  // common-workflow-writing#8: EXAMPLE_POLICY + SAMPLE_EVIDENCE
  {
    case: "common-workflow-writing#8",
    label: "accept: labeled non-result sample",
    expect: "pass",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: marked_not_result\n",
  },
  {
    case: "common-workflow-writing#8",
    label: "reject: ban examples",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: ban_all_examples\nSAMPLE_EVIDENCE: marked_not_result\n",
  },
  {
    case: "common-workflow-writing#8",
    label: "reject: sample presented as result",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: presented_as_result\n",
  },
  {
    case: "common-workflow-writing#8",
    label: "reject: unlabelled tail",
    expect: "fail",
    transcript:
      "EXAMPLE_POLICY: labeled_illustration\nSAMPLE_EVIDENCE: marked_not_result\nSample:\n| Security | PASS |\n",
  },
];

const selfChecks = [];
for (const key of new Set(matrix.map((row) => row.case))) {
  const current = cases.get(key);
  if (!current) throw new Error(`No eval definition for ${key}`);
  const countIssue = current.assertions.length < 2;
  const nonRegex = current.assertions.filter(
    (assertion) => assertion.type !== "regex",
  );
  const selfFailures = current.assertions.filter(
    (assertion) => !checkAssertion(assertion, current.expectedOutput),
  );
  selfChecks.push({
    key,
    count: current.assertions.length,
    countIssue,
    nonRegex: nonRegex.length,
    selfFailures,
  });
}

const selfFail = selfChecks.filter(
  (check) =>
    check.countIssue || check.nonRegex > 0 || check.selfFailures.length > 0,
);
for (const check of selfChecks) {
  console.log(
    `SELF ${check.key}\tassertions=${check.count}\tregex_only=${check.nonRegex === 0}\texpected_output_matches=${check.selfFailures.length === 0}`,
  );
  if (check.selfFailures.length) {
    console.log(
      `\texpected-output failures: ${check.selfFailures
        .map((assertion) => assertion.value)
        .join(" | ")}`,
    );
  }
}

const rows = matrix.map((entry) => {
  const current = cases.get(entry.case);
  const failed = current.assertions.filter(
    (assertion) => !checkAssertion(assertion, entry.transcript),
  );
  return { ...entry, actual: failed.length === 0 ? "pass" : "fail", failed };
});

for (const row of rows) {
  const verdict = row.actual === row.expect ? "OK" : "MISMATCH";
  console.log(
    `${verdict}\t${row.case}\t${row.label}\texpected=${row.expect}\tactual=${row.actual}`,
  );
  if (row.failed.length) {
    console.log(`\tfailed: ${row.failed.map((a) => a.value).join(" | ")}`);
  }
}

const mismatches = rows.filter((row) => row.actual !== row.expect);
const passCount = rows.filter((row) => row.actual === "pass").length;
const failCount = rows.filter((row) => row.actual === "fail").length;
console.log(
  `\nMATRIX ${mismatches.length === 0 && selfFail.length === 0 ? "PASS" : "FAIL"}: ${rows.length} candidates (${passCount} pass, ${failCount} fail), ${mismatches.length} mismatches, ${selfFail.length} self-check failures.`,
);
console.log(
  "Limits: the matcher cannot observe file effects. A correct decision block followed by an out-of-shape contradicting action line is rejected by shape; unsafe prose placed inside NOTES is intentionally ungraded and is not a safety claim.",
);
process.exit(mismatches.length === 0 && selfFail.length === 0 ? 0 : 1);
