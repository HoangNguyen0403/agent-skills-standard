---
description: Plan, generate, and heal an executable E2E test suite from approved acceptance criteria (web and mobile).
---

# Test Loop Workflow

Goal: Turn approved ACs into an executable, traced E2E suite, and classify any failure as a repair or a real bug instead of leaving it to manual triage.

## Steps
1. Load scope:
   - `slug`, `operator_profile` (carried), `AC-*`, SRS lanes, build target (web/API/mobile build artifact digest/version), platform/OS matrix, permissions/reset readiness per C6, stack testing skills.
   - Driver preflight for each lane (`quality-engineering-playwright-cli` / `quality-engineering-appium-mcp` `scripts/preflight.sh`); record unavailable drivers in `driver_blocked[]` (STLC Stage 4).
2. Plan (STLC Stage 2-3, V-Model System Level):
   - Run `specialist-test-planner` per `quality-engineering-test-plan-authoring` to produce `test_plan_path` and `selector_gaps` using C1/C2/C6 templates and `skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`.
   - BLOCKED (no stable `AC-*` trace) if trace missing; BLOCKED (HALT: <trigger>) when planner triggers HALT.
3. Prepare selectors:
   - Run `specialist-testid-inserter` on `selector_gaps`; in interactive mode stop for approval on its `APPROVAL: required` list; in autonomous mode pass `approved_production_edits` only when granted, else carry gaps forward in `selector_gaps_remaining[]`.
   - For `lane: web`, build/extend page objects per `quality-engineering-playwright-pom-generation` into `page_objects[]`. Mobile uses stable accessibility IDs per `quality-engineering-selector-stability`.
4. Generate:
   - One scenario per `specialist-integration-test-generator` call, seed-first, via lane driver (web: `playwright-cli`/Playwright MCP; mobile: Appium MCP/platform runner). Unstable locator scenarios land in `selector_gaps_remaining[]`.
5. Run and heal (STLC Stage 5: Triage, Flaky Analysis, Defect Drafting):
   - Run generated suite; per failure, run `specialist-test-healer` into `heal_verdicts[]`.
   - `HEALED` only with `RERUNS: 3/3 green` and `ASSERTION_DELTA: none`; `REAL_BUG_DO_NOT_HEAL` logs to `real_bugs[]` (defect drafting for `dev-fix`); `QUARANTINE_CANDIDATE` routes to `quality-engineering-flaky-triage` into `flake_quarantine[]`; `BLOCKED` (missing driver/evidence) recorded in `missing_evidence`.
   - Visual baseline changes require reviewed diff with named approver per `quality-engineering-visual-baseline`.
6. Handoff (STLC Stage 6 Closure):
   - Calculate Automation Health (`quality-engineering-automation-health`), carry `release_confidence`, open defects, and residual risks per `skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`. Technical PASS validates test suite only; route to `verify-work`.
## Runtime Contract
- Use after `implement-feature` reaches GREEN, or whenever ACs have E2E/mobile lanes without executable coverage.
- Required inputs: slug, stable `AC-*` trace, a runnable build/app target.
- Return BLOCKED (no build target or AC trace) only when the build target cannot be established or `AC-*` is missing.
## Handoff Payload
- `slug`, `operator_profile`, `test_plan_path`, `assumed_results[]`, `halt_triggers[]`, `page_objects[]`, `generated_tests[]`, `driver_blocked[]`, `heal_verdicts[]`, `flake_quarantine[]`, `selector_gaps_remaining[]`, `real_bugs[]`, `release_confidence`, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template
```md
# Test Loop Report: [Name]
## Scope
## Plan
## Generated Tests
## Page Objects
## Selector Gaps Remaining
## Heal Verdicts
## Flake Quarantine
## Real Bugs Found
## Automation Health
feedback_loop_minutes: ; suite_reliability_pct: ; release_cadence: ; prod_escape_rate: ; release_confidence: high | medium | low
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: test-loop, feature_status: implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: verify-work, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
verify-work | dev-fix
## Cost Report
Call `get_session_cost(workflow="test-loop")` before final handoff.
```
