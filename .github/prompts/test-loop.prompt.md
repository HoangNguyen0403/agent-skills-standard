---
description: "Plan, generate, and heal an executable E2E test suite from approved acceptance criteria (web and mobile)."
---

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
3. Prepare selectors (Phase P1, not yet implemented):
   - Run `specialist-testid-inserter` on `selector_gaps`; stop for approval when production files change in interactive mode.
4. Generate (Phase P1, not yet implemented):
   - One scenario per `specialist-integration-test-generator` call, seed-first, using the MCP/tool matching the scenario's lane.
5. Run and heal (Phase P3, not yet implemented):
   - Run once; per failure, run `specialist-test-healer`. `HEALED` requires 3 green reruns. `REAL_BUG_DO_NOT_HEAL` routes to `dev-fix`. `QUARANTINE_CANDIDATE` routes to `quality-engineering-flaky-triage` with a ticket.
6. Handoff:
   - Route to `verify-work` with the generated suite and any unresolved `real_bugs[]`.

## Runtime Contract
- Use after `implement-feature` reaches GREEN, or whenever ACs have E2E/mobile lanes without executable coverage.
- Required inputs: slug, stable `AC-*` trace, a runnable build/app target.
- Return BLOCKED (no build target or AC trace) only when the build target cannot be established or `AC-*` is missing.
## Handoff Payload
- `slug`, `operator_profile`, `test_plan_path`, `generated_tests[]`, `heal_verdicts[]`, `flake_quarantine[]`, `selector_gaps_remaining[]`, `real_bugs[]`, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template
```md
# Test Loop Report: [Name]
## Scope
## Plan
## Generated Tests
## Heal Verdicts
## Real Bugs Found
## Outcome Report
feature_status: implemented | partially_implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: verify-work | dev-fix
## Next Workflow
verify-work | dev-fix
## Cost Report
Call `get_session_cost(workflow="test-loop")` before final handoff.
```
