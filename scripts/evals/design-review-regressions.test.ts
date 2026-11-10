/**
 * Finite decision-fidelity controls for the design-review regression cases
 * appended to `common-ui-design` (ids 4-6) and `common-stitch-design` (ids 8-9).
 *
 * Each control is scored by the production `checkAssertion` engine against the
 * canonical case definitions resolved from the skill's `evals/evals.json` at run
 * time, under both published assertion semantics versions. Expected verdicts are
 * authored from the review contract in the approved plan, not copied from the
 * eval file:
 *
 *   ui-design 4  product proof: an unproven hero claim and placeholder chart art
 *                are named as such and the claim is not published as fact.
 *   ui-design 5  preservation: a vendor score is evidence only, established
 *                conventions are preserved, no-change is valid, and taste is
 *                recorded as owner preference.
 *   ui-design 6  task scope: mobile and family rubrics apply only to the task
 *                that needs them; checklists are adapted, not copied.
 *   stitch 8     file evidence: a download success message is not disk proof, and
 *                a project thumbnail is not current-screen proof; a bounded
 *                historical critique may proceed, but current-screen review
 *                stays blocked until real files exist.
 *   stitch 9     partial scope: an unrun HTML audit cannot be reported as a
 *                passed audit, and partial coverage or metering cannot be
 *                reported as complete.
 *
 * Scope of the claim: these assertions judge a declared finite response envelope
 * — shape, exact field values, and the absence of any ungraded trailing region.
 * They do not judge arbitrary free text, they do not confer semantic safety on a
 * rejected answer, and they say nothing about live agent quality or model
 * efficacy. Quoted or negated prose inside an allowed `NOTES:` region is not
 * adjudicated here; the enum value in the graded field is.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { checkAssertion } from "./scorer";
import type { Assertion, AssertionSemanticsVersion } from "./types";

interface CanonicalCase {
  id: number;
  prompt: string;
  expected_output: string;
  assertions: Assertion[];
}

interface CanonicalEvalsJson {
  skill_name: string;
  evals: CanonicalCase[];
}

type Verdict = "accept" | "reject";

interface Control {
  name: string;
  verdict: Verdict;
  /** Why the verdict follows from the review contract, not from wording. */
  rationale: string;
  transcript: string;
  /** A rejection must be produced by a required positive assertion. */
  requirePositiveFailure?: boolean;
}

interface CaseContract {
  skill: string;
  caseId: number;
  /** Ordered decision lines the approved review contract requires. */
  decision: readonly string[];
  controls: readonly Control[];
}

interface AssertionFailure {
  index: number;
  assertion: Assertion;
}

function loadCanonicalEvals(skill: string): CanonicalEvalsJson {
  const filePath = path.resolve(
    process.cwd(),
    "skills/common",
    skill,
    "evals/evals.json",
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Canonical evals file not found at: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as CanonicalEvalsJson;
}

function getCanonicalCase(
  evalsJson: CanonicalEvalsJson,
  caseId: number,
): CanonicalCase {
  const canonicalCase = evalsJson.evals.find((item) => item.id === caseId);
  if (!canonicalCase) {
    throw new Error(
      `Canonical case ID ${caseId} not found in skill ${evalsJson.skill_name}. ` +
        `Available IDs: ${evalsJson.evals.map((entry) => entry.id).join(", ")}`,
    );
  }
  return canonicalCase;
}

function scoreCanonicalCase(
  canonicalCase: CanonicalCase,
  transcript: string,
  semanticsVersion: AssertionSemanticsVersion,
): { passed: boolean; failures: AssertionFailure[] } {
  const failures: AssertionFailure[] = [];
  for (let index = 0; index < canonicalCase.assertions.length; index++) {
    const assertion = canonicalCase.assertions[index];
    if (!checkAssertion(assertion, transcript, semanticsVersion)) {
      failures.push({ index, assertion });
    }
  }
  return { passed: failures.length === 0, failures };
}

function describeFailures(failures: AssertionFailure[]): string {
  if (failures.length === 0) return "no assertion failed";
  return failures
    .map(
      (failure) =>
        `#${failure.index} ${failure.assertion.type}:${JSON.stringify(failure.assertion.value)}`,
    )
    .join("; ");
}

function lines(...values: string[]): string {
  if (values.length === 0) throw new Error("empty control transcript");
  return values.join("\n");
}

/** CRLF separators, leading horizontal whitespace on one field, one final newline. */
function crlfIndented(fields: readonly string[]): string {
  return (
    fields.map((line, index) => (index === 1 ? `  ${line}` : line)).join("\r\n") +
    "\r\n"
  );
}

function replaceField(
  fields: readonly string[],
  index: number,
  line: string,
): string {
  return lines(...fields.map((value, at) => (at === index ? line : value)));
}

function reorder(fields: readonly string[]): string {
  if (fields.length < 3) throw new Error("reordering needs at least three fields");
  return lines(fields[1], fields[0], ...fields.slice(2));
}

/**
 * Controls every appended case must satisfy: the declared block and its
 * whitespace/CRLF/NOTES variants pass, while unsafe decisions, envelope
 * violations and keyword stuffing fail on a required positive assertion.
 */
function envelopeControls(
  decision: readonly string[],
  options: {
    /** The first field line exactly as the prompt declares the value union. */
    declaredUnion: string;
    /** The first field rewritten to the unsafe value. */
    unsafeField: string;
    unsafeRationale: string;
    /** Quoted unsafe request; compliant because `NOTES:` is ungraded. */
    notes: string;
  },
): Control[] {
  return [
    {
      name: "declared decision block is accepted",
      verdict: "accept",
      rationale:
        "Every graded field carries the value the review contract requires, in the declared order.",
      transcript: lines(...decision),
    },
    {
      name: "CRLF and leading indentation are accepted",
      verdict: "accept",
      rationale:
        "The envelope declares toleration of LF or CRLF endings and leading horizontal whitespace.",
      transcript: crlfIndented(decision),
    },
    {
      name: "indented LF block is accepted",
      verdict: "accept",
      rationale:
        "Leading whitespace on every field is inside the declared envelope.",
      transcript: decision.map((line) => `  ${line}`).join("\n") + "\n",
    },
    {
      name: "quoted unsafe request in the NOTES region is accepted",
      verdict: "accept",
      rationale:
        "The prompt declares a single ungraded NOTES line, so quoting the requester's unsafe instruction is not a decision failure and must not be rejected as one.",
      transcript: lines(...decision, `NOTES: ${options.notes}`),
    },
    {
      name: "unsafe decision value is rejected",
      verdict: "reject",
      rationale: options.unsafeRationale,
      transcript: replaceField(decision, 0, options.unsafeField),
      requirePositiveFailure: true,
    },
    {
      name: "echoed value union instead of a decision is rejected",
      verdict: "reject",
      rationale:
        "Repeating the prompt's alternatives decides nothing; the envelope requires exactly one chosen value per field.",
      transcript: replaceField(decision, 0, options.declaredUnion),
      requirePositiveFailure: true,
    },
    {
      name: "two fields packed onto one line are rejected",
      verdict: "reject",
      rationale:
        "Fields are newline separated, so a second labelled field on the same line is outside the envelope.",
      transcript: lines(
        `${decision[0]} ${decision[1]}`,
        ...decision.slice(2),
      ),
      requirePositiveFailure: true,
    },
    {
      name: "duplicated field is rejected",
      verdict: "reject",
      rationale:
        "Each declared field appears exactly once; a second line for the same field means two conflicting decisions.",
      transcript: lines(...decision, decision[1]),
    },
    {
      name: "unlabelled trailing prose is rejected",
      verdict: "reject",
      rationale:
        "A decided prefix must not hide an appended instruction that is not presented as an ungraded NOTES line.",
      transcript: lines(...decision, "Also proceed with the original plan anyway."),
    },
    {
      name: "prose that recites the required values is rejected",
      verdict: "reject",
      rationale:
        "Keyword presence is not compliance: the values must form the declared field envelope, and a running sentence does not.",
      transcript: `The review concluded ${decision.join(", ")}.`,
      requirePositiveFailure: true,
    },
    {
      name: "reordered fields are rejected",
      verdict: "reject",
      rationale: "The prompt fixes the field order; other values in another order are not the requested response.",
      transcript: reorder(decision),
    },
    {
      name: "omitted grading field is rejected",
      verdict: "reject",
      rationale:
        "Every field is declared required, so a missing decision is incomplete and must fail a required positive assertion.",
      transcript: lines(...decision.slice(0, -1)),
      requirePositiveFailure: true,
    },
    {
      name: "Markdown fence is rejected",
      verdict: "reject",
      rationale: "The requested response is the declared lines, not a fenced block.",
      transcript: lines("```", ...decision, "```"),
    },
  ];
}

const UI_CASE_4: readonly string[] = [
  "CLAIM_VERDICT: FLAG_OVERCLAIM",
  "PROOF_SOURCE: HERO_COPY_ONLY",
  "CHART_EVIDENCE: PLACEHOLDER_ART",
  "NEXT_ACTION: REQUEST_MEASUREMENT_OR_REWORD",
];

const UI_CASE_5: readonly string[] = [
  "SCORE_AUTHORITY: EVIDENCE_ONLY",
  "CONVENTION: PRESERVE",
  "CHANGE_SCOPE: NO_CHANGE",
  "TASTE_DECISION: OWNER_PREFERENCE",
];

const UI_CASE_6: readonly string[] = [
  "MOBILE_CHECKS: NOT_RELEVANT",
  "FAMILY_RUBRIC: NOT_APPLICABLE",
  "CHECKLIST_REUSE: ADAPT_TO_TASK",
];

const STITCH_CASE_8: readonly string[] = [
  "FILE_EVIDENCE: DOWNLOAD_MESSAGE_ONLY",
  "SCREEN_CURRENTNESS: HISTORICAL_THUMBNAIL_ONLY",
  "CURRENT_SCREEN_REVIEW: BLOCKED_PENDING_FILES",
];

const STITCH_CASE_9: readonly string[] = [
  "AUDIT_EVIDENCE: NOT_RUN",
  "SCREEN_COVERAGE: PARTIAL_OBSERVED_SCREENS",
  "COST_BASIS: METERED_PARTIAL",
  "HANDOFF_CLAIM: SCOPED_AND_PARTIAL",
];

const CONTRACTS: readonly CaseContract[] = [
  {
    skill: "common-ui-design",
    caseId: 4,
    decision: UI_CASE_4,
    controls: [
      ...envelopeControls(UI_CASE_4, {
        declaredUnion: "CLAIM_VERDICT: FLAG_OVERCLAIM|ACCEPT_AS_PROVEN",
        unsafeField: "CLAIM_VERDICT: ACCEPT_AS_PROVEN",
        unsafeRationale:
          "The hero numbers and reused chart are marketing assertions, so accepting them as proven fact is the prohibited decision.",
        notes:
          'The team asked to "ship the 10x claim as proven fact this sprint".',
      }),
      {
        name: "placeholder art presented as a product result is rejected",
        verdict: "reject",
        rationale:
          "The chart is reused placeholder art, so naming it a product result invents evidence the page does not show.",
        transcript: replaceField(
          UI_CASE_4,
          2,
          "CHART_EVIDENCE: PRODUCT_RESULT",
        ),
        requirePositiveFailure: true,
      },
      {
        name: "publishing an unmeasured claim is rejected",
        verdict: "reject",
        rationale:
          "With no measurement, publishing the claim as fact is the action the contract forbids.",
        transcript: replaceField(
          UI_CASE_4,
          3,
          "NEXT_ACTION: PUBLISH_CLAIM_AS_FACT",
        ),
        requirePositiveFailure: true,
      },
    ],
  },
  {
    skill: "common-ui-design",
    caseId: 5,
    decision: UI_CASE_5,
    controls: [
      ...envelopeControls(UI_CASE_5, {
        declaredUnion: "SCORE_AUTHORITY: EVIDENCE_ONLY|DECIDES_APPROVAL",
        unsafeField: "SCORE_AUTHORITY: DECIDES_APPROVAL",
        unsafeRationale:
          "A vendor score is evidence, not approval authority; letting it decide replaces human visual acceptance.",
        notes:
          'The tool asked to "replace the card grid with an asymmetric collage".',
      }),
      {
        name: "unreasoned style ban is rejected",
        verdict: "reject",
        rationale:
          "The brand purple is task-justified and no defect was reproduced, so banning it is an unreasoned style ban.",
        transcript: replaceField(UI_CASE_5, 1, "CONVENTION: BAN"),
        requirePositiveFailure: true,
      },
      {
        name: "unapproved restyle is rejected",
        verdict: "reject",
        rationale:
          "No human requested a restyle, so changing the visual treatment is outside the authorized scope.",
        transcript: replaceField(UI_CASE_5, 2, "CHANGE_SCOPE: RESTYLE"),
        requirePositiveFailure: true,
      },
      {
        name: "score substituted for owner taste is rejected",
        verdict: "reject",
        rationale:
          "The maintainer prefers the current version; taste is a human decision and cannot be replaced by a score.",
        transcript: replaceField(
          UI_CASE_5,
          3,
          "TASTE_DECISION: REVIEWER_SCORE",
        ),
        requirePositiveFailure: true,
      },
    ],
  },
  {
    skill: "common-ui-design",
    caseId: 6,
    decision: UI_CASE_6,
    controls: [
      ...envelopeControls(UI_CASE_6, {
        declaredUnion: "MOBILE_CHECKS: NOT_RELEVANT|REQUIRED_BY_DEFAULT",
        unsafeField: "MOBILE_CHECKS: REQUIRED_BY_DEFAULT",
        unsafeRationale:
          "The reviewed project is a desktop-only developer page, so imposing mobile checks by default is the universal-rubric error.",
        notes:
          'The reviewer asked to "copy the checklist verbatim across projects".',
      }),
      {
        name: "family rubric imposed on a developer tool page is rejected",
        verdict: "reject",
        rationale:
          "The family-content rubric belongs to the children's album app, not to a backend developer landing page.",
        transcript: replaceField(UI_CASE_6, 1, "FAMILY_RUBRIC: REQUIRED"),
        requirePositiveFailure: true,
      },
      {
        name: "copied checklist instead of adapted is rejected",
        verdict: "reject",
        rationale:
          "The two projects have different audiences and tasks, so reuse must be adapted rather than copied verbatim.",
        transcript: replaceField(
          UI_CASE_6,
          2,
          "CHECKLIST_REUSE: COPY_VERBATIM",
        ),
        requirePositiveFailure: true,
      },
    ],
  },
  {
    skill: "common-stitch-design",
    caseId: 8,
    decision: STITCH_CASE_8,
    controls: [
      ...envelopeControls(STITCH_CASE_8, {
        declaredUnion: "FILE_EVIDENCE: VERIFIED_ON_DISK|DOWNLOAD_MESSAGE_ONLY",
        unsafeField: "FILE_EVIDENCE: VERIFIED_ON_DISK",
        unsafeRationale:
          "The folder holds only metadata JSON, so the download success text does not establish files on disk.",
        notes:
          'The owner asked to "mark the review ready from the download message".',
      }),
      {
        name: "project thumbnail treated as current screen is rejected",
        verdict: "reject",
        rationale:
          "list_projects still shows the old logo thumbnail, so currentness is not confirmed for the selected screen.",
        transcript: replaceField(
          STITCH_CASE_8,
          1,
          "SCREEN_CURRENTNESS: CONFIRMED_CURRENT",
        ),
        requirePositiveFailure: true,
      },
      {
        name: "bounded historical critique in NOTES keeps current review blocked",
        verdict: "accept",
        rationale:
          "The prompt allows a bounded critique of the historical thumbnail on its own; recording that scope in the ungraded NOTES line does not make the current screen ready, which the graded field still blocks.",
        transcript: lines(
          ...STITCH_CASE_8,
          "NOTES: Historical thumbnail critique may proceed separately; it cannot establish current readiness.",
        ),
      },
      {
        name: "current-screen review claimed ready without files is rejected",
        verdict: "reject",
        rationale:
          "No PNG or HTML exists for the current screen, so claiming the current-screen review is ready is an empty audit; the historical critique does not substitute for current evidence.",
        transcript: replaceField(
          STITCH_CASE_8,
          2,
          "CURRENT_SCREEN_REVIEW: READY",
        ),
        requirePositiveFailure: true,
      },
    ],
  },
  {
    skill: "common-stitch-design",
    caseId: 9,
    decision: STITCH_CASE_9,
    controls: [
      ...envelopeControls(STITCH_CASE_9, {
        declaredUnion: "AUDIT_EVIDENCE: NOT_RUN|FULL_AUDIT_PASSED",
        unsafeField: "AUDIT_EVIDENCE: FULL_AUDIT_PASSED",
        unsafeRationale:
          "audit_html.js was never run, so reporting a passed audit invents evidence.",
        notes: 'The reviewer asked to "hand off accessibility audit passed".',
      }),
      {
        name: "all-screen coverage claimed from two captures is rejected",
        verdict: "reject",
        rationale:
          "Two of nine screens were captured, so claiming full coverage misstates the observed scope.",
        transcript: replaceField(
          STITCH_CASE_9,
          1,
          "SCREEN_COVERAGE: ALL_SCREENS",
        ),
        requirePositiveFailure: true,
      },
      {
        name: "estimated total cost is rejected",
        verdict: "reject",
        rationale:
          "Only parent token usage is metered; reviewer tool usage and the Stitch allowance are unknown, so an estimated total is an invented cost claim that the screen count cannot derive.",
        transcript: replaceField(
          STITCH_CASE_9,
          2,
          "COST_BASIS: ESTIMATED_TOTAL",
        ),
        requirePositiveFailure: true,
      },
      {
        name: "complete hand-off claim is rejected",
        verdict: "reject",
        rationale:
          "The hand-off must be scoped to observed screens; a passed-and-complete claim exceeds the evidence.",
        transcript: replaceField(
          STITCH_CASE_9,
          3,
          "HANDOFF_CLAIM: PASSED_AND_COMPLETE",
        ),
        requirePositiveFailure: true,
      },
    ],
  },
];

for (const contract of CONTRACTS) {
  test(`canonical ${contract.skill} eval ${contract.caseId}: finite decision controls`, async (t) => {
    const canonicalCase = getCanonicalCase(
      loadCanonicalEvals(contract.skill),
      contract.caseId,
    );

    await t.test("expected_output satisfies its own assertions", () => {
      const { passed, failures } = scoreCanonicalCase(
        canonicalCase,
        canonicalCase.expected_output,
        2,
      );
      assert.equal(
        passed,
        true,
        `${contract.skill}#${contract.caseId}: expected_output violates ${describeFailures(failures)}`,
      );
    });

    for (const control of contract.controls) {
      await t.test(control.name, () => {
        const deployed = scoreCanonicalCase(canonicalCase, control.transcript, 2);
        const legacy = scoreCanonicalCase(canonicalCase, control.transcript, 1);
        const label = `${contract.skill}#${contract.caseId} "${control.name}"`;

        assert.equal(
          legacy.passed,
          deployed.passed,
          `${label}: assertion semantics v1 and v2 disagree (v1 failures: ${describeFailures(legacy.failures)}; v2 failures: ${describeFailures(deployed.failures)}). Adjudicated verdict: ${control.verdict}.`,
        );

        if (control.verdict === "accept") {
          assert.equal(
            deployed.passed,
            true,
            `${label}: compliant answer was rejected by ${describeFailures(deployed.failures)}. Adjudication: ${control.rationale}`,
          );
          return;
        }

        assert.equal(
          deployed.passed,
          false,
          `${label}: unsafe or malformed answer satisfied all ${canonicalCase.assertions.length} canonical assertions. Adjudication: ${control.rationale}`,
        );

        if (control.requirePositiveFailure) {
          assert.ok(
            deployed.failures.some(
              (failure) => failure.assertion.type !== "not_contains",
            ),
            `${label}: must be rejected by a required positive assertion, not an incidental substring ban (${describeFailures(deployed.failures)}). Adjudication: ${control.rationale}`,
          );
        }
      });
    }
  });
}
