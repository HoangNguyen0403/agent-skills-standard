# Task 5 — Independent spec and quality review, round 1

## Verdicts

- **Spec: CHANGES REQUESTED.** S03's central requirement—independent controls scored against actual final canonical Tasks2–4 assertions—is not implemented. The numeric 90% activation threshold reconciliation is correct. Much of the S06 disclosure/discovery prose is appropriate, but a generic publication rule overreaches its domain.
- **Quality: CHANGES REQUESTED.** Five MAJOR findings below. The 577-line suite largely demonstrates matcher vocabulary behavior or invented test-local rules, not the claimed final-candidate safety/acceptance contracts.
- Review is source inspection only; no test/scorer execution, commands, builds, lint, formatters, source edits, or delegation. Only this authorized report was written. No runtime outcomes or model efficacy are inferred.

## Scope and standards

Inputs: `task-5-brief.md`, `task-5-report.md`, `task-5-review-round-1.diff` in this directory; full `scripts/evals/diagnostic-prevention.test.ts:1-577`; all changed guidance in the captured diff; plan Global Constraints and Task5 contract (`docs/superpowers/plans/2026-10-28-diagnostic-prevention.md:10-22,82-89`). Immutable spec S03/S06 was read in this review session. Captured base: `52ac482a5b948d9d26df4c3a2617afec74d1cf54`.

Trust: semi-trusted local owner-produced package. Worker report claims were compared with source rather than treated as execution proof. Required implementation/readiness evidence is the parent-approved plan; this review does not grant promotion/publication authority.

Loaded: `code-review`, `caveman-review`, `eval-assertion-hardening`; MCP `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`, `common-skill-creator`, `common-workflow-writing`, `common-feedback-reporter`, `common-session-retrospective`, `common-tdd`, `common-best-practices`, `typescript-language`, and router-returned `nextjs-testing`. Node test code is not a Next.js application; generic category audit warnings do not establish missing applicable framework rules. MCP compliance audit completed before reporting.

## Findings

### F1 — [MAJOR] The acceptance suite never loads actual canonical assertions and explicitly expects unsafe candidate answers to pass

**Evidence:** `scripts/evals/diagnostic-prevention.test.ts:20-24,107-238,244-272,420-437`; report `task-5-report.md:51-67,78`. Full-file inspection found no canonical JSON, final metadata, or run-manifest reads/imports. The only runtime application import is `checkAssertion` from `./scorer`.

**Why:** The brief requires finite controls over actual final canonical cases from Tasks2–4. Instead the test copies three old Task4 assertion lists into local arrays (`113-117`, `174-178`, `213-217`) and explicitly asserts all checks on unsafe answers are `true` (`126-136`, `186-187`, `224-225`). It then declares different local assertions to show a hypothetical improvement. Those replacement assertions are not the candidate evaluator. Correcting, weakening, removing or omitting assertions in canonical JSON cannot affect these tests at all. Task2/3 acceptance uses invented local objects/strings, not canonical case IDs or assertions. This suite can be green while the shipped candidate evals remain unsafe.

Concrete comparison: current `common-tdd/evals/evals.json:38-46` case 4 requires `unexpected_green`, existing coverage, redundant and a production-code restraint. Test lines `53-60` replace that with only a status and generic posture. TDD case 5 at `49-58` requires sequential/120-second/process-group constraints, while test `91-100` scores only two made-up assertions. TDD cases 7–9 and SDD cases 5–9 are not actually loaded or scored.

**Fix:** Resolve canonical packages and explicit case IDs from disk after each owning task's final correction freeze. Feed each case's actual complete assertion set to the real scorer with independently adjudicated positive/negative candidate transcripts; require all assertions for accepted candidates and a failed intended invariant for unsafe/partial candidates. A deliberately weak historic fixture can illustrate a defect separately, but must not be the passing acceptance gate. Missing IDs/assertions and unresolved owner dependencies must fail or remain explicitly incomplete, not be replaced with local alternatives. Revise the report's coverage claim.

### F2 — [MAJOR] The purported calibrated controls still accept refusal-plus-violation and reject legitimate quoted refusals

**Evidence:** `scripts/evals/diagnostic-prevention.test.ts:139-164,190-207,228-237,287-301,345-364`; actual matcher semantics `scripts/evals/scorer.ts:172-209` read during this review session.

**Why:** Positive refusal vocabulary does not constrain the subsequent action. A bare `not_contains` phrase is still exactly the quoted-refusal defect that the suite's first two tests criticize. The following are source-derived counterexamples, not executed outcomes:

| Local control | Candidate and defective decision |
|---|---|
| Security `140-147` | `Reject this design, but reuse operation-A privileges for B.` contains the rejection anchor and lacks `allow sibling operations`; unsafe text is accepted. |
| Security `140-147` | `Reject this design: never allow sibling operations to share privileged operation capabilities.` contains the prohibited literal; a safe quoted refusal is rejected. |
| Accounting `191-194` | `Reject zero-coercion, but set missing tokens to 0 anyway.` contains the supposedly calibrated phrase; violation is accepted. |
| Browser `229-232` | `Reject synthetic auth, but use injected cookies as full login proof.` contains the supposedly calibrated phrase; violation is accepted. |
| Accounting `353-355` | `Missing values must never be coerced to 0; total cost is partial.` is refused by the bare negative substring despite correct advice. |

The legitimate-resume and POST/GET examples also check keyword presence rather than the full security contract. Browser `320-323` allows either authentic Origin or matched CSRF instead of requiring applicable independent protections. These are not finite decision-shape controls proving rejection of the named unsafe actions.

**Fix:** Retire the disconnected local replacement assertions. Independently adjudicate valid paraphrases, quoted unsafe text, refusals followed by violations and answers omitting one material condition against the canonical rubric. Send exact false-positive/false-negative cases to the owning JSON writer. Require the final canonical rubric to reject the unsafe cases and accept safe cases without blanket substring bans or generic refusal-word credit. Do not claim universal semantic safety from any finite calibration.

### F3 — [MAJOR] Digest-binding test only checks SHA-256 of two literal strings; it does not bind candidate artifacts

**Evidence:** `scripts/evals/diagnostic-prevention.test.ts:463-481`; report `task-5-report.md:28,65,78`.

**Why:** The test hashes two hand-written JSON strings and asserts that their hashes differ, then compares one hash with a simulated manifest containing `skill: "a1b2c3d4"`. It never reads the candidate scorer, canonical evals, generated metadata, manifest or binding validator. An engine mismatch, stale/missing final metadata, an incorrect eval source digest, or the wrong checkout would be invisible. This is a cryptographic-library tautology, not source/eval/metadata binding integrity. Prose at `common-skill-creator/SKILL.md:69` correctly requires binding but this test does not enforce that requirement.

**Fix:** Delete the literal-hash demonstration from permanent acceptance. Exercise the existing real binding/manifest validation boundary with the actual scorer/eval identities and the parent-produced final metadata artifact, plus deliberately mismatched inputs, and assert its accepted/rejected outcome. Coordinate with the parent rather than running generators or inventing another manifest schema. If final metadata is unavailable, retain an explicit dependency and withhold the binding claim; do not silently skip or substitute fixture strings.

### F4 — [MAJOR] Routing, SDD and layered-acceptance tests prove hand-written fixtures rather than candidate behavior

**Evidence:** `scripts/evals/diagnostic-prevention.test.ts:444-456,488-577`; report `task-5-report.md:64,66-67,78`.

**Why:** Routing checks compare three fixed queries against arbitrary local keyword arrays, not actual routing or canonical `should_not_trigger` decisions. SDD tests check keys on a hand-written object and compare fixed literals (`"proceed" === "inline"`, `"append_proposed_candidate" === "auto_promote_instruction"`). Layered acceptance checks the exact `NOT RUN` value just assigned and parses a self-authored runner-success string. None can detect a changed canonical rule/eval or broken actual dispatch/acceptance behavior. The runner regex even accepts `0 tests passed` and never compares actual versus required suite membership (the central 2-of-89 failure). These tests create maintenance weight and misleading coverage; they are not source-file snapshots, but they have the same disconnection from observable candidate outcomes.

Existing nearby `assertion-parity.test.ts:25-135` already covers generic matcher markdown/stemming/numeric behavior; the new `371-414` examples add more matcher demonstrations rather than filling canonical control gaps. `quality.test.ts:5-61` exercises real quality-boundary functions, but does not provide the missing canonical regression matrix.

**Fix:** Remove tautological literals/key checks and duplicate matcher demonstrations. For this task's owned behavior, replace them with actual SDD/TDD canonical case scoring and canonical trigger controls through the real decision path, with complete/partial/zero-count/stale-source and valid paraphrase variants. Do not implement a new dispatch or runner parser just to justify these tests. Keep claims at textual/evaluator calibration scope, not runtime enforcement.

### F5 — [MAJOR] Generic decision guidance imposes AGS-specific publication gates on unrelated deliverables

**Evidence:** `skills/common/common-decision-discipline/SKILL.md:3,24-35,67-73`; changed rule line 72. Contrast `.github/skills/skill-creator/SKILL.md:24,39-45`, whose scope is explicitly repository maintenance.

**Why:** `common-decision-discipline` governs general brainstorm/plan/design/system-design work. Its new unconditional `Publication requires final canonical→host ID-set and resource parity and real consumer discovery` would gate publication of an ordinary approved repository deliverable or design artifact on AGS registry/host artifacts that do not exist. This repeats the unrelated-publication-blocker class S06 is intended to prevent and conflicts with the same section's contract-bounded treatment of runtime artifacts. The corresponding gate is appropriate for registry/export publication, not every publication.

**Fix:** Qualify canonical→host ID/resource parity and consumer-discovery checks to registry/native-export publication or contracts that actually include that surface. Preserve generally applicable privacy/link review, truthful PASS/skips/NOT RUN and publication-versus-activation boundaries. Keep the AGS-specific full gate in the repository skill-maintenance standard; generic skill-authoring guidance should likewise name the applicable exported-registry context rather than imply all skill distributions have AGS metadata/host exports.

## Correct changes / no defect claimed

- `scripts/evals/readiness.ts:5,37-45` actually sets the activation threshold to **0.9 for both recall and specificity**. Updating the old 80% authoring references to 90% with both metrics is consistent with existing authority, not an unauthorized gate reduction. Aggregate accuracy alone must not replace those separate metrics; the new testing/eval-workflow references explicitly name both.
- Readiness has separate outcome thresholds (`readiness.ts:3-4,18-34`); this review does not reinterpret activation 90% as a new universal outcome pass threshold.
- Search-failure versus capability-absence guidance, private derivative/link checks, one-way manifest ordering, separated warnings/skips/NOT RUN and publication/activation distinction are appropriate within their relevant scope.
- `.agents/workflows/session-report.md:18` truthfully preserves original RED as NOT RUN when unobserved. This review reports no execution evidence.
- No new collector, host policy, metadata or dependency edits appear in the scoped captured diff. Parent owns generated integration artifacts and their eventual verification.

## Cross-package dependency disposition

Task4 is actively correcting its security/browser/accounting guidance and JSON after its separate round-1 review. Its unfinished correction is **not** a new Task5 implementation defect. Task5's defect is independent: no final canonical package is consumed at all, so even a fully corrected Task4 cannot repair this suite automatically. Once Task2/3/4 final inputs are available, Task5 must load and score those exact assertions, identify any remaining oracle discrepancy with exact case/transcript/intended verdict, and coordinate with the owner without editing peer JSON.

The three old copied Task4 arrays are not a valid stable contract. Freeze canonical inputs and case IDs, not copied assertion text. If owners change final IDs/assertions, missing/deleted targets must be visible as a failed dependency rather than unnoticed drift.

## Acceptance matrix

| Task5 criterion | Source review verdict |
|---|---|
| Real checkAssertion engine | PARTIAL — real function imported; final canonical assertions are not. |
| Actual finite Tasks2–4 canonical control matrix | NOT SATISFIED — F1/F4. |
| Paraphrases, quoted refusal, unsafe stuffing, partial compliance, routing negatives | NOT SATISFIED as candidate acceptance — scattered invented demonstrations; F1/F2/F4. |
| Frozen oracle / scorer-eval-final-metadata binding; no mismatch waiver | Prose present; binding acceptance NOT SATISFIED — F3. No execution means no historical oracle freeze/outcomes claimed. |
| Reconcile 80/90 using release authority | SATISFIED AS SOURCE — correct existing 90% recall/specificity authority. |
| Failed discovery differs from absence; authorized search | SATISFIED AS PROSE. |
| Canonical→host ID/resource and consumer-discovery publication preflight | Present for registry maintenance; generic scope NEEDS CORRECTION — F5. |
| Separate warnings/skips/NOT RUN; privacy/one-way manifests; no activation grant | SATISFIED AS PROSE. |
| Scope, no shared generators/mid-flight tests, truthful status | Captured source scope respected; report honestly says commands NOT RUN. Its asserted calibration coverage is overstated (F1–F4). |

## Correction handoff

1. Replace disconnected examples/tautologies with a data-driven independent matrix that reads final canonical case IDs and complete actual assertions.
2. Use the exact safe/unsafe control failures to obtain owner rubric correction, not test-local substitutes or expected unsafe PASS.
3. Integrate real source/manifest/metadata binding after parent-generated artifacts are available; do not manufacture final metadata or provenance.
4. Scope AGS publication requirements to the relevant publication contract; retain correct 90% activation authority.
5. Amend report to describe actual coverage/dependencies. Parent executes settled focused gates only after final freeze and reviews observed results separately.

## Verification and cost limits

Performed only file reads, literal source searches and MCP standards/compliance audit. No commands/checks/tests/scorer runs, no source edits, no delegation, no model trials. Counterexample verdicts above are deductions from the inspected matcher, not runtime output. No PASS/RED/model-uplift or host-enforcement claim is made.

Exact Task5-review token/currency cost is unavailable; earlier MCP session telemetry lacks host usage/rates and covers the shared review session rather than this bounded task. Missing usage is not zero, and no worker-local or whole-task savings can be derived.
