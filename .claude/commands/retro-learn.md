# Retro Learn

Convert delivery findings into skill, eval, workflow, and documentation improvements.

**Input:** $ARGUMENTS

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

Execute the following steps for **$ARGUMENTS**.


# Retro Learn Workflow

Goal: Turn defects, missed expectations, and delivery friction into durable standards improvements.

## Steps

1. Gather evidence:
   - Review findings
   - Bugs found during verification
   - Security findings
   - User corrections
   - Failed or slow checks
   - Token or context pain
   - `session-report` artifacts
2. Classify:
   - Skill rule gap
   - Eval coverage gap
   - Workflow gap
   - Documentation gap
   - Tooling gap
   - Specialist gap
   - Environment-only issue
3. Decide action:
   - Existing skill should prevent it: update `SKILL.md` and `evals/evals.json`.
   - No skill covers it: propose a new skill.
   - Workflow caused drift: update `.agents/workflows`.
   - Specialist caused drift: add budget, fallback, or output-format rule.
   - Tooling can catch it: add or update an audit script.
   - Incident or Blocker finding: add a permanent case to the preventing skill's `evals/evals.json`, not only `SKILL.md` prose.
4. Verify and persist:
   - Run changed skill validation.
   - Run eval alignment.
   - Write the run record to `artifacts/runs/[slug]/[compactISO]-retro-learn.json` when file writes are allowed.
   - Record remaining follow-ups.

## Runtime Contract
- Use after delivery findings, corrections, or friction need converting into durable standards improvements.
- Required inputs: review findings, verification results, or session-report artifacts to classify.
- Return BLOCKED only when no evidence exists to classify.
## Handoff Payload
- `slug`, root causes, skill/eval updates, follow-ups, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Retro: [Name]

## Evidence

## Root Causes

| Finding | Category | Action |
| --- | --- | --- |
| [finding] | [category] | [action] |

## Skill Or Eval Updates

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: retro-learn, feature_status: implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: null, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

## Follow-Ups

## Cost Report
Call `get_session_cost(workflow="retro-learn")` before final handoff.
```
