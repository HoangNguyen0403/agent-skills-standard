# T4 implementation report: Extend AGS intent, layer, and healing guidance

- Status: done
- Deliverable: Updated canonical guidance across the 6 owned files in `skills/` and `.agents/workflows/`
- Authority: Authorized personal AGS implementation per `T4-v2-brief.md` and frozen reviewed `srs-ai-test-assurance.md` (SHA-256 `670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5`)
- Scope: Canonical guidance files only. No generated mirrors (T8), no eval metadata (T6), no schema code (T5), no builds/lint/tests/formatters, no commits, and no recursive delegation.

## Acceptance Map

| AC | Status | Concrete changes and evidence |
| --- | --- | --- |
| **T4-1** | Satisfied | Extended existing Test Intent Record in `skills/common/common-tdd/SKILL.md` and `references/quality-contract.md` with `id`, `requirements`, `owner`, `oracle` (`ref`, `basis`, `owner`, `rationale`), and `boundaries` (`real`, `mocked`, `justification`). Added matching JSON representation adhering to SRS §4.1 `Intent` schema. Maintained existing `contract`, `fault`, `layer`, `cases`, and `command` fields without creating a competing checklist or secondary status system. |
| **T4-2** | Satisfied | Updated `common-tdd/SKILL.md` and `quality-contract.md` to mandate risk-sensitive fault evidence targeting distinct plausible failure modes in domain logic and boundaries, explicitly rejecting blanket mutation score quotas (e.g. universal 80% targets) and arbitrary test count thresholds. Explicitly protected justified cross-layer tests (unit vs integration vs contract vs E2E) where layers guard against distinct regression risks (e.g. real serialization/network wire contracts vs pure domain logic). |
| **T4-3** | Satisfied | Clarified in `quality-engineering-test-healing/SKILL.md`, `references/verdict-contract.md`, `references/forbidden-repairs.md`, and `.agents/workflows/test-loop.md` that unchanged assertion text does NOT authorize weakening fixtures, loosening state preconditions, or widening selector specificity. Preserved distinct failure routing for `REAL_BUG_DO_NOT_HEAL` (routes to `dev-fix`) and `QUARANTINE_CANDIDATE` (routes to `quality-engineering-flaky-triage` with ticket and expiry), prohibiting green-by-retry. |
| **T4-4** | Satisfied | Restricted edits strictly to canonical owned paths. Did not touch eval metadata (`evals/evals.json`), generated mirrors/indices (`skills/index.json`, `_INDEX.md`, `.agent/`), or package files. Provided comprehensive good/bad scenario walkthroughs below. |

## Changed Paths

1. `skills/common/common-tdd/SKILL.md` (79 lines, ≤100 line limit)
2. `skills/common/common-tdd/references/quality-contract.md` (Level-3 reference detail and JSON schema)
3. `skills/quality-engineering/quality-engineering-test-healing/SKILL.md` (49 lines, ≤100 line limit)
4. `skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md` (Level-3 verdict criteria)
5. `skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md` (Level-3 forbidden repairs catalog)
6. `.agents/workflows/test-loop.md` (60 lines, ≤80 line limit)

## Good / Bad Scenario Walkthrough

### Scenario 1: Intent Record Oracle Provenance (T4-1, AC-08)
- **Bad:** Test author generates test expected outputs by running the unverified new implementation and copying `{"status": "ok", "items": [...]}` into the test assertion. `oracle.ref` points to the implementation file itself or is left unspecified.
  *Why rejected:* Circular verification — defects in the implementation are baked into the oracle, guaranteeing false green.
- **Good:** `oracle.ref` references `docs/specs/order-api.md` (SHA-256 `3a8f...`), `basis: "approved_requirement"`, `owner: "product-lead"`, `rationale: "SRS §4.2 defines error envelope structure"`. Expected outputs are derived independently from the requirement artifact.

### Scenario 2: Boundary Realism (T4-1, AC-08)
- **Bad:** A unit test mocks all domain collaborators, repositories, and utility functions using mock frameworks, asserting `expect(mockRepo.save).toHaveBeenCalledTimes(1)`. `boundaries.mocked` lists internal domain classes without justification.
  *Why rejected:* Verifies internal mock choreography rather than observable outward side effects; refactoring breaks the test while behavior is preserved.
- **Good:** Pure domain models, in-memory collections, and state machines are executed real (`boundaries.real: ["Order", "PricingEngine"]`). Only external I/O boundaries (e.g. third-party payment gateway) are mocked (`boundaries.mocked: ["PaymentGatewayClient"]`, `justification: "Third-party payment gateway requires external network sandbox"`).

### Scenario 3: Risk-Sensitive Fault Evidence vs Blanket Mutation Targets (T4-2, AC-09)
- **Bad:** A blanket policy mandates an 80% universal mutation kill score across the repository. To hit the quota, developers write brittle tests asserting exact string literals of logger messages and internal intermediate variables.
  *Why rejected:* Quota-driven padding tests increase maintenance burden and resist refactoring without detecting meaningful domain faults.
- **Good:** Tests specify distinct plausible failure modes in `fault` (e.g., `"Concurrent deposit and withdraw drops intermediate account balance update"`). Cross-layer tests are preserved: unit tests check interest calculation rules, while an integration test checks PostgreSQL transaction isolation under concurrency, because they detect distinct regression risks.

### Scenario 4: Test Healing with Unchanged Assertion Text (T4-3, AC-14)
- **Bad:** An E2E test fails because a required checkout form field is no longer populated by the frontend. The healing agent leaves `expect(page.locator('.confirmation')).toBeVisible()` unchanged, but alters the test fixture to pass an empty object or changes the locator to `page.locator('div')` to match any container. The test reruns 3 times and passes. The agent claims `HEALED`.
  *Why rejected:* Weakening the fixture or widening locator specificity to match unintended elements masks the real product regression. Unchanged assertion text is not a license to weaken preconditions or selectors.
- **Good:** Healer detects that the product form interaction broke. Classifies failure as `REAL_REGRESSION`, emits verdict `REAL_BUG_DO_NOT_HEAL`, and routes failure evidence directly to `dev-fix`.

### Scenario 5: Flaky Test Quarantine vs Green-by-Retry (T4-3, AC-14)
- **Bad:** An E2E test fails intermittently due to a race condition. The runner retries 3 times until one run passes, and the suite is marked green.
  *Why rejected:* Green-by-retry hides timing bugs and pollutes CI confidence.
- **Good:** Intermittent failure is classified under `TIMING_SYNC` / `INFRA`. Emits verdict `QUARANTINE_CANDIDATE`, routes to `quality-engineering-flaky-triage`, logs a tracking ticket with an explicit expiry, and isolates the test from gating while keeping it reporting.

## Evidence Consistency and Trust Contract

- **Local-untrusted boundaries:** Evidence receipts and raw-byte SHA-256 digests bind supplied byte content against referenced artifacts. They verify local structural consistency (ensuring files match referenced hashes), not execution authenticity, runner integrity, or agent trustworthiness.
- **Human review obligation:** Automated hash checks cannot evaluate the semantic independence of an oracle or the validity of boundary justifications. Human maintainer review remains an indispensable requirement.

## Concerns and Risks

1. **Adversarial Grader Calibration:** T6 must author adversarial candidate transcripts that present keyword-rich prose claiming "healed" while actually weakening fixtures or copying implementation outputs, verifying that the current scorer correctly rejects them without over-claiming semantic capability.
2. **Downstream Mirror Generation:** T8 must regenerate exports using `generate-indices` and `docs:capabilities` only in a disposable worktree after T4/T6 freeze, ensuring that canonical `.agents/workflows/` and SDD evidence are preserved.

## Actual Commands Executed

- `rtk sha256sum .agent/sdd/ai-test-assurance/srs-ai-test-assurance.md` — Verified frozen SRS SHA-256 digest (`670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5`).
- `rtk git status` — Verified only owned paths are modified.
- `rtk git diff` — Inspected line-by-line diff of all 6 owned files.
- No build, lint, test, formatter, commit, push, or subagent creation commands were executed.

## Independent Review Correction

- Applied reviewer clarity correction to `skills/common/common-tdd/references/quality-contract.md`: explicitly labeled the JSON `Intent` block as illustrative shape only and clarified that the digest is placeholder documentation text, not actual oracle evidence, and must be replaced with the exact raw-byte SHA-256 digest of the actual approved artifact before validation.
