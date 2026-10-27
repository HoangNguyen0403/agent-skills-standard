# Immutable review snapshot T4-guidance

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala
Base: 92d06c420f6a41f08e11579423e4e3eacdb7880d
Captured: 2026-10-26T16:44:40.844Z

## Tracked diff

diff --git a/.agents/workflows/test-loop.md b/.agents/workflows/test-loop.md
index 0ee4f80b..4c8d01ea 100644
--- a/.agents/workflows/test-loop.md
+++ b/.agents/workflows/test-loop.md
@@ -24,7 +24,7 @@ Goal: Turn approved ACs into an executable, traced E2E suite, and classify any f
    - Skip scenarios whose only elements are in `selector_gaps_remaining[]`; list them under Selector Gaps Remaining, never generate against an unstable locator.
 5. Run and heal:
    - Run the generated suite once; per failure, run `specialist-test-healer` with the run artifact; append its block to `heal_verdicts[]` as `{test, class, verdict, route, evidence}`.
-   - `HEALED` only with `RERUNS: 3/3 green` and `ASSERTION_DELTA: none`; `REAL_BUG_DO_NOT_HEAL` appends to `real_bugs[]` and routes to `dev-fix`; `QUARANTINE_CANDIDATE` opens a ticket per `quality-engineering-flaky-triage` and appends `{test, ticket, expiry, bucket}` to `flake_quarantine[]`; `BLOCKED` with `ROUTE: testid-inserter` (no stable locator target) returns to step 3; `BLOCKED` (no evidence artifact) reruns the test once with tracing on and re-runs the healer; if still no artifact, it stays in `heal_verdicts[]` unresolved and is listed under `missing_evidence`.
+   - `HEALED` only with `RERUNS: 3/3 green`, `ASSERTION_DELTA: none`, and fixture/selector integrity preserved; unchanged assertion text does not authorize weakening fixtures or widening selectors. `REAL_BUG_DO_NOT_HEAL` appends to `real_bugs[]` and routes to `dev-fix`; `QUARANTINE_CANDIDATE` opens a ticket per `quality-engineering-flaky-triage` and appends `{test, ticket, expiry, bucket}` to `flake_quarantine[]`; `BLOCKED` with `ROUTE: testid-inserter` (no stable locator target) returns to step 3; `BLOCKED` (no evidence artifact) reruns the test once with tracing on and re-runs the healer; if still no artifact, it stays in `heal_verdicts[]` unresolved and is listed under `missing_evidence`.
    - Screenshot failures follow `quality-engineering-visual-baseline`: a baseline changes only through a reviewed diff with a named approver, never by `--update-snapshots` inside this loop.
 6. Handoff:
    - Compute Automation Health per `quality-engineering-automation-health` and carry `release_confidence`.
diff --git a/skills/common/common-tdd/SKILL.md b/skills/common/common-tdd/SKILL.md
index ff6edd3d..f8d1235f 100644
--- a/skills/common/common-tdd/SKILL.md
+++ b/skills/common/common-tdd/SKILL.md
@@ -32,17 +32,22 @@ A passing test is insufficient; the test must prove an owned behavior and a dist
 
 ## Before writing a test
 
-Compare against the existing suite before adding or removing cases. Ensure the scenario is not already covered upstream or in nearby layers.
+Compare against the existing suite before adding or removing cases. Ensure the scenario is not already covered upstream or in nearby layers. Preserve justified cross-layer tests when layers catch distinct regression risks.
 
-Create one Test Intent Record per behavior/risk:
+Create one Test Intent Record per behavior/risk (see `references/quality-contract.md` for schema):
 
-- `contract`: observable contract — an application-owned result or outward side effect
-- `fault`: distinct plausible fault this test catches
-- `layer`: smallest honest unit, component, contract, integration, or E2E layer
+- `id`: unique stable intent identifier
+- `requirements`: traceable requirement IDs (at least one)
+- `owner`: accountable owner
+- `contract`: observable contract — application-owned result or outward side effect
+- `fault`: distinct plausible fault this test catches (risk-sensitive, not blanket mutation quota)
+- `layer`: smallest honest layer (`unit`, `integration`, `contract`, `e2e`)
 - `cases`: minimal distinct equivalence classes; use a parameterized test for equivalent inputs
 - `command`: exact focused single-run command
+- `oracle`: independent oracle ref (path + sha256), basis (`approved_requirement`, `external_specification`, `independently_reviewed_example`), owner, and rationale; never copied solely from implementation
+- `boundaries`: explicit `real` vs `mocked` boundaries with justification
 
-Reject tests that duplicate existing suite coverage, assert internal mock choreography over outward side effects, depend on time/network/order, or invent numeric four-pillar scores without measured evidence.
+Reject tests that duplicate existing coverage without distinct risk, assert internal mock choreography, copy expected output from implementation, or invent numeric four-pillar scores without empirical evidence. Evidence receipts bind local consistency under `local-untrusted` trust; they cannot replace human review of oracle independence.
 ## Bounded loop
 
 1. Run configured lint/type checks, inspect nearby tests, and derive the smallest command.
@@ -57,11 +62,11 @@ Reject tests that duplicate existing suite coverage, assert internal mock choreo
 - Honor project timeouts; otherwise use a 120-second fallback to bound a focused command.
 - On timeout, terminate only the agent-owned process group and verify child cleanup.
 - Never watch, blanket-kill, or retry an unchanged failure. Record the new hypothesis or corrective change first.
-- Coverage percentages are diagnostic tools, never an admission criterion. Without a configured threshold, report risk gaps and never add padding tests for an arbitrary percentage.
+- Risk-sensitive fault evidence: focus on plausible regressions in critical paths; never add padding tests for coverage percentages or blanket mutation scores.
 
 ## Red flags and rationalizations
 
-- Stop on: `add tests after`, `too small`, `passed first run`, `run the full suite again`, or `mock every collaborator`.
+- Stop on: `add tests after`, `too small`, `passed first run`, `run the full suite again`, `mock every collaborator`, or `implementation is the oracle`.
 - Urgency, manual testing, test count, or a coverage target never bypasses the intent record, expected RED, bounded command, or fault proof.
 
 ## Test shape
diff --git a/skills/common/common-tdd/references/quality-contract.md b/skills/common/common-tdd/references/quality-contract.md
index 0ba79805..6282c0e5 100644
--- a/skills/common/common-tdd/references/quality-contract.md
+++ b/skills/common/common-tdd/references/quality-contract.md
@@ -2,27 +2,72 @@
 
 ## Test Intent Record
 
-Record one row before each behavior/risk group:
+Record one record before each behavior/risk group. Serialized representations in evidence bundles and documentation describe the same record:
 
 | Field | Required evidence |
 | --- | --- |
+| `id` | Unique stable intent identifier |
+| `requirements` | Nonempty array of traceable requirement IDs |
+| `owner` | Accountable human maintainer or agent identity |
 | `contract` | Observable result or side effect owned by the application |
-| `fault` | Plausible regression that would make the test fail |
-| `layer` | Smallest honest layer and why broader behavior is not needed |
+| `fault` | Plausible regression this test catches; risk-sensitive, not blanket quota |
+| `layer` | Smallest honest layer (`unit`, `integration`, `contract`, `e2e`); preserve justified cross-layer tests |
 | `cases` | Minimal distinct equivalence classes; merge equivalent inputs |
 | `command` | Exact focused, single-run command |
+| `oracle` | Object `{ ref: { path, sha256 }, basis, owner, rationale }` where basis is `approved_requirement`, `external_specification`, or `independently_reviewed_example`. Implementation-copied expected output is unacceptable |
+| `boundaries` | Object `{ real: string[], mocked: string[], justification: string }` documenting boundary realism |
 
-The record is an agent handoff artifact, not a comment requirement inside test code.
+The record is an agent handoff and evidence artifact, not a comment requirement inside test code.
+
+### Serialized Contract (JSON)
+
+Matches SRS §4.1 `Intent` schema:
+
+```json
+{
+  "id": "INTENT-CLI-FLAG-01",
+  "requirements": ["REQ-03", "AC-08"],
+  "owner": "maintainer-core",
+  "contract": "Unrecognized CLI flag returns exit 2 with invalid_usage diagnostic",
+  "fault": "Flag parser silently ignores unknown flags and proceeds with defaults",
+  "layer": "unit",
+  "cases": ["unknown flag --unknown", "unknown short flag -z"],
+  "command": "rtk proxy go test -run TestFlags ./pkg/engine",
+  "oracle": {
+    "ref": { "path": "docs/specs/cli.md", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
+    "basis": "external_specification",
+    "owner": "spec-maintainer",
+    "rationale": "SRS §3.2 table specifies invalid_usage diagnostic and exit 2"
+  },
+  "boundaries": {
+    "real": ["pkg/engine/flags.go"],
+    "mocked": [],
+    "justification": "Pure in-process flag parsing requires no mocked dependencies"
+  }
+}
+```
+
+## Evidence Consistency & Trust Limits
+
+- **Local-untrusted evidence:** Evidence receipts and SHA-256 digests bind supplied byte content against referenced artifacts. They verify local structural consistency, not execution authenticity or agent trustworthiness.
+- **Human review obligation:** Hashes cannot prove semantic independence of an oracle or validity of boundary justifications. A human reviewer remains necessary to confirm that the oracle is not copied from implementation output.
+- **No fabricated oracles:** `oracle.ref` must point to an existing requirement, specification, or independently reviewed example artifact. Expected output copied solely from implementation output is unacceptable.
+
+## Risk-Sensitive Fault Evidence
+
+- **Plausible faults over blanket metrics:** Focus tests on distinct, plausible failure modes (boundary transitions, domain constraints, error paths). Do not use blanket mutation score quotas (e.g. arbitrary 80% thresholds) or test count targets as quality proxies; they incentivize brittle tests asserting incidental internal details.
+- **Preserve justified cross-layer tests:** When integration, contract, or E2E layers catch failure modes that unit tests cannot observe (such as real serialization, protocol negotiation, race conditions, or environment boundaries), retain them. Do not force artificial layer collapse or mock away the very boundary being tested.
 
 ## Admission checks
 
 - Before proposing a new test, compare against the existing suite; discard if the behavior and fault are already covered by nearby or upstream tests.
 - For existing tests: never auto-delete on apparent static duplication alone. Recommending deletion requires proof of no unique behavioral contribution plus measured full-suite dynamic coverage/mutation impact; otherwise suggest review or refactoring.
 - Keep a case only when it detects a distinct fault, boundary, or contract rule.
+- Preserve justified cross-layer coverage: if a unit test tests logic and an integration test tests wire protocol with real serialization, both are justified because they guard against different plausible faults.
 - Prefer public behavior and state transitions over private methods, call counts, or mock existence.
 - Verify one logical contract per test; multiple assertions are allowed when verifying related aspects or outward side effects of that single contract.
 - Distinguish outward side effects from internal mock choreography: verify what the system produces or changes externally, not how collaborators are invoked internally.
-- Coverage percentages are diagnostic rather than admission gates; never write padding tests to hit an arbitrary target.
+- Coverage percentages and mutation quotas are diagnostic rather than admission gates; never write padding tests to hit an arbitrary target.
 - The Four Pillars (Protection against Regressions, Resistance to Refactoring, Fast Feedback, Maintainability) provide a qualitative reasoning framework, not a static numeric score (avoid inventing formulas like $P \times R \times F \times M$ per test without rigorous empirical measurement across all four dimensions).
 - Route cross-component behavior to integration/contract tests. Do not label a mock-heavy orchestration test as a unit test.
 - Use deterministic fixtures, explicit cleanup, and stable clocks/data. A test that passes only in one order is not evidence.
diff --git a/skills/quality-engineering/quality-engineering-test-healing/SKILL.md b/skills/quality-engineering/quality-engineering-test-healing/SKILL.md
index 3bbc848c..4197d2da 100644
--- a/skills/quality-engineering/quality-engineering-test-healing/SKILL.md
+++ b/skills/quality-engineering/quality-engineering-test-healing/SKILL.md
@@ -30,16 +30,15 @@ Move the locator up the selector ladder (e.g., `getByRole` if the ID changed); r
 
 ## Forbidden Repairs
 
-Never weaken an assertion. Never add `test.skip`/`fixme`; a test that must stop gating goes to quarantine per `quality-engineering-flaky-triage` with a ticket + expiry, and keeps running. Never widen a matcher. Never inflate a timeout by more than 2x. Never blind `--update-snapshots`. Never catch-and-continue. Never touch production code — that is `REAL_REGRESSION`, not a heal.
+Never weaken an assertion. Unchanged assertion text does NOT authorize weakening fixtures, state preconditions, or locator specificity (e.g., replacing targeted test seeds with generic/empty defaults or widening selectors to match unintended elements). Never add `test.skip`/`fixme`; a test that must stop gating goes to quarantine per `quality-engineering-flaky-triage` with a ticket + expiry, and keeps running. Never widen a matcher. Never inflate a timeout by more than 2x. Never blind `--update-snapshots`. Never catch-and-continue. Never touch production code — that is `REAL_REGRESSION`, not a heal.
 
 ## Verdicts
 
-`HEALED` (repair verified by 3 consecutive green reruns, ASSERTION_DELTA: none) · `REAL_BUG_DO_NOT_HEAL` (route to dev-fix) · `QUARANTINE_CANDIDATE` (flaky, route to flaky-triage) · `BLOCKED` (no evidence artifact, or no stable locator target: route to `specialist-testid-inserter`).
+`HEALED` (repair verified by 3 consecutive green reruns, ASSERTION_DELTA: none, fixture and selector integrity preserved) · `REAL_BUG_DO_NOT_HEAL` (product behavior changed or real defect exposed; route to dev-fix) · `QUARANTINE_CANDIDATE` (intermittent failure across isolated reruns; route to flaky-triage) · `BLOCKED` (no evidence artifact, or no stable locator target: route to `specialist-testid-inserter`).
 
 ## Red Flags
 
-"the assertion was too strict anyway" · "the product changed so update the expected value" · "just add retries so it goes green" — do not heal with these rationalizations. All three are `REAL_BUG_DO_NOT_HEAL` or `QUARANTINE_CANDIDATE` in disguise, never `HEALED`.
-
+"the assertion is unchanged so loosening the fixture is fine" · "broaden selector so any element matches" · "the assertion was too strict anyway" · "the product changed so update the expected value" · "just add retries so it goes green" — do not heal with these rationalizations. All are `REAL_BUG_DO_NOT_HEAL` or `QUARANTINE_CANDIDATE` in disguise, never `HEALED`.
 ## References
 
 - [Failure Taxonomy Signals](references/failure-taxonomy.md)
diff --git a/skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md b/skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md
index 4a833be6..f4738445 100644
--- a/skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md
+++ b/skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md
@@ -3,6 +3,8 @@
 | Forbidden | Why |
 |---|---|
 | Weaken/remove an assertion | Turns a real regression into a silent pass. |
+| Weaken fixture, seed data, or precondition with unchanged assertion text | Masks real defects by bypassing preconditions or feeding vacuous data; unchanged assertion text does not authorize fixture weakening. |
+| Widen selector to match unintended elements | Silently passes against an incorrect DOM node while leaving the broken element interaction unverified. |
 | `test.skip`/`fixme` as a heal | Removes coverage; quarantine with ticket + expiry keeps the test running and reporting. |
 | Widen a matcher (`toContain` instead of `toEqual`) | Hides a value regression. |
 | Timeout inflation >2x | Masks a real performance regression as a healed test. |
diff --git a/skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md b/skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md
index 31c8502b..48c8f197 100644
--- a/skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md
+++ b/skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md
@@ -1,9 +1,13 @@
 # Verdict Contract
 
 - `HEALED`: repair applied, 3 consecutive sequential foreground reruns pass,
-  `ASSERTION_DELTA: none` (assertion count and matcher strength unchanged).
+  `ASSERTION_DELTA: none` (assertion count and matcher strength unchanged),
+  and fixture/selector/data baseline integrity preserved. Unchanged assertion
+  text alone does not permit weakened fixtures, looser selectors matching
+  unintended elements, or relaxed state preconditions.
 - `REAL_BUG_DO_NOT_HEAL`: evidence shows an intentional or unintentional
-  product behavior change; hand off to `dev-fix` with the failure evidence.
+  product behavior change, regression, or exposed defect; hand off to `dev-fix`
+  with the failure evidence. Never suppress a real bug by altering test preconditions.
 - `QUARANTINE_CANDIDATE`: fails intermittently across isolated reruns with no
   code change between runs; hand off to `quality-engineering-flaky-triage`, which opens the ticket; never left green-by-retry.
 - `BLOCKED` (no evidence artifact): no trace/screenshot/log artifact available

