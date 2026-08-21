# Sdlc

Route a task to the next synced SDLC workflow based on current artifacts and repo state.

**Input:** $ARGUMENTS

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

Execute the following steps for **$ARGUMENTS**.


# SDLC Router Workflow

Goal: Select the next native workflow without loading every workflow body, while preserving a traceable BA -> PM -> IT Department handoff for offshore delivery.

## Steps

1. Inspect state:
   - User request; infer `operator_profile` (business | hybrid | technical) per `common-operator-profile` and carry it in every Handoff Payload.
   - Search `docs/brd/`, `docs/prd/`, and `docs/srs/` for a matching `[slug]`; if absent, use the newest BRD or `git status`. Slug = lowercase kebab-case, minted once at `brainstorm-feature`, reused verbatim downstream; never re-derived.
   - If multiple candidates exist, list them and ask whether to focus, consolidate, or sequence.
   - Baseline reference: `docs/requirements-standards-baseline.md`
   - Existing ticket, BRD-lite brief, PRD, SRS/FRS design, implementation plan, task list, walkthrough, UAT signoff, deployment report, release notes, and retro
   - Jira, ADO, Zephyr, or other MCP context when already configured
   - Changed files and current test status
   - Offshore delivery context: business owner, product owner, implementation owners, QA owner, timezone/cadence constraints, environments, release window, and dependency teams
   - Requirement trace health: `BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> test evidence`

2. Choose next workflow (apply tie-break order when multiple bullets match: (1) workflow explicitly named by the operator or by the latest `recommended_next_workflow`, (2) production-incident/urgent-regression signals, (3) earliest missing artifact along the chain below — never skip forward past a gap, (4) cross-cutting audits only on request or as a pre-release gate):
   - Unclear idea, missing business case, missing stakeholder owner, or missing measurable value (BRD-lite / Why, BA-owned intake) -> `brainstorm-feature`
   - BRD-lite exists or business direction is clear but product scope, priorities, acceptance criteria, rollout, or delivery plan are unclear (PRD / What, PM-owned planning) -> `plan-feature`
   - PRD exists but technical behavior/contracts unclear (SRS/FRS / How) -> `design-solution`
   - Architecture, auth, trust boundaries, compliance controls, or agent/runtime safety need deeper technical validation -> `design-solution`
   - BRD-lite, PRD, or SRS/FRS exists but readiness unclear -> `implementation-readiness`
   - Approved plan with BRD/PRD/SRS trace and testable ACs needs code -> `implement-feature`
   - Production incident or urgent regression -> `incident-hotfix`
   - Bug ticket needs fix (non-urgent) -> `dev-fix`
   - Ticket or cross-functional change needs specialist fanout, AC coverage, and PR metadata review -> `review-ticket`
   - PR diff needs focused merge-risk review -> `code-review`
   - Code complete but unproven -> `verify-work`
   - Fix implemented and ticket has a UAT/Jira flow -> `verify-bug`
   - `verify-work` PASS on a feature, business acceptance not yet granted -> `uat-signoff`
   - Business acceptance granted and release window open -> `deploy-release`
   - Deployed and needs user-facing communication -> `publish-notes`
   - Trace health unknown before release or handoff -> `traceability-audit`
   - Session ending with unfinished work or context handoff -> `session-report`
   - Deployed or communicated, capture standards/process lessons -> `retro-learn`
   - Repo-wide health/debt question with no single feature in scope -> `codebase-review`

3. Enforce handoff quality:
   - BA output must include business objective, stakeholder/validation owner, AS-IS/TO-BE, SMART metric, scope fence, risks, assumptions, and BRD objective IDs.
   - PM output must link each PRD requirement and AC to a BRD objective, name requirement owners/status/priority, define rollout/ops, and identify whether `design-solution` is required.
   - IT Department handoff must include implementation owner candidates, affected repos/modules, test lanes, environments, release/rollback notes, and open blockers.
   - Never route directly to implementation when BRD/PRD/SRS trace, owner, or testable ACs are missing; route to BA/PM/design first.
   - This applies even when the request explicitly says "implement" or names a specific feature/module: if `docs/brd/` and `docs/prd/` have no matching `[slug]` for it yet, the FIRST slice dispatched must be a `brainstorm-feature` or `plan-feature` intake slice (owner `ba-agent`/`pm-agent`) — never an `implementation-readiness`/`design-solution`/`implement-feature` slice as slice-01. Missing repo roots, OAuth/client IDs, or session-policy decisions are a sign the BRD/PRD step was skipped, not questions to resolve inline in an implementation slice.
   - Keep payloads runtime-neutral; adapters may map them to task boards, MCP, Jira, GitHub, ADO, Zephyr, or local files.

4. Set runtime state:
   - Interactive: ask max 3 blocking questions.
   - Autonomous/channel: continue only when required artifacts and owners are known; otherwise return BLOCKED.
   - Emit next workflow, handoff payload, verification command, and owner.

## Runtime Contract
- Use to select the next workflow without loading every workflow body.
- Required inputs: user request plus repo/artifact state.
- Return BLOCKED only in autonomous/channel mode when required artifacts or owners are unknown.
## Handoff Payload
- `slug`, `operator_profile`, recommended workflow, requirement layer, handoff owner, required input, blocking gaps, offshore delivery notes.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# SDLC Route

## Recommended Workflow

## Requirement Layer

## Handoff Owner

## Required Input

## Blocking Gaps

## Offshore Delivery Notes

## Outcome Report
feature_status: not_started | requirements_ready | design_ready | partially_implemented | implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow:

## Next Workflow

## Verification Command
## Cost Report
Call `get_session_cost(workflow="sdlc")` before final handoff.
```
