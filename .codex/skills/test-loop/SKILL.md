---
name: test-loop
description: "Plan, generate, and heal an executable E2E test suite from approved acceptance criteria (web and mobile)."
metadata:
  triggers:
    keywords:
    - test loop
    - workflow
---
# Test Loop Skill

> [!IMPORTANT]
> Plan, generate, and heal an executable E2E test suite from approved acceptance criteria (web and mobile).

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Test Loop Workflow

Goal: Turn approved ACs into an executable, traced E2E suite, and classify any failure as a repair or a real bug instead of leaving it to manual triage.

## Steps
1. Load scope:
   - `slug`, `operator_profile` (carried, not re-inferred), `AC-*`, SRS lanes, build/app target, matched testing skills for the target stack.
2. Plan:
   - Run `specialist-test-planner` to produce `test_plan_path` and `selector_gaps`
     (the specialist's `PLAN:` becomes this workflow's `test_plan_path`;
     `SELECTOR_GAPS:` becomes `selector_gaps`).
   - BLOCKED (no stable `AC-*` trace) if no stable `AC-*` trace exists; route to `plan-feature`/`design-solution`.
   - BLOCKED (HALT: <trigger>) when the planner returns a `HALT:` trigger; ask before generating, never invent expected results.
3. Prepare selectors:
   - Run `specialist-testid-inserter` on `selector_gaps`; in interactive mode stop for approval on its `APPROVAL: required` file list; in autonomous mode pass `approved_production_edits` only when the operator granted it, else carry gaps forward as `selector_gaps_remaining[]`; every gap not in `INSERTED:` (unresolved `SKIPPED`, `BLOCKED`, or declined approval) also lands in `selector_gaps_remaining[]`.
   - For `lane: web`, build or extend one page object per screen per `quality-engineering-playwright-pom-generation`; record paths in `page_objects[]`; gaps a page object emits re-run the first bullet before step 4.
4. Generate:
   - One scenario per `specialist-integration-test-generator` call, seed-first, using the MCP/tool matching the scenario's lane; a `Test: BLOCKED` naming a missing page object routes back to step 3.
   - Skip scenarios whose only elements are in `selector_gaps_remaining[]`; list them under Selector Gaps Remaining, never generate against an unstable locator.
5. Run and heal:
   - Run the generated suite once; per failure, run `specialist-test-healer` with the run artifact; append its block to `heal_verdicts[]` as `{test, class, verdict, route, evidence}`.
   - `HEALED` only with `RERUNS: 3/3 green` and `ASSERTION_DELTA: none`; `REAL_BUG_DO_NOT_HEAL` appends to `real_bugs[]` and routes to `dev-fix`; `QUARANTINE_CANDIDATE` opens a ticket per `quality-engineering-flaky-triage` and appends `{test, ticket, expiry, bucket}` to `flake_quarantine[]`; `BLOCKED` with `ROUTE: testid-inserter` (no stable locator target) returns to step 3; `BLOCKED` (no evidence artifact) reruns the test once with tracing on, then stays in `heal_verdicts[]` unresolved and is listed under `missing_evidence`.
   - Screenshot failures follow `quality-engineering-visual-baseline`: a baseline changes only through a reviewed diff with a named approver, never by `--update-snapshots` inside this loop.
6. Handoff:
   - Compute Automation Health per `quality-engineering-automation-health` and carry `release_confidence`.
   - Route to `verify-work` with the generated suite and any unresolved `real_bugs[]`.

## Runtime Contract
- Use after `implement-feature` reaches GREEN, or whenever ACs have E2E/mobile lanes without executable coverage.
- Required inputs: slug, stable `AC-*` trace, a runnable build/app target.
- Return BLOCKED (no build target or AC trace) only when the build target cannot be established or `AC-*` is missing.
## Handoff Payload
- `slug`, `operator_profile`, `test_plan_path`, `assumed_results[]`, `halt_triggers[]`, `page_objects[]`, `generated_tests[]`, `heal_verdicts[]`, `flake_quarantine[]`, `selector_gaps_remaining[]`, `real_bugs[]`, `release_confidence`, outcome report, next workflow.
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
feature_status: implemented | partially_implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: verify-work | dev-fix
## Next Workflow
verify-work | dev-fix
## Cost Report
Call `get_session_cost(workflow="test-loop")` before final handoff.
```

