---
description: Turn a control-band breach or scheduled scan result into a tiered, evidence-backed response and a routed intake.
---

# Monitor Respond Workflow

Goal: Convert a deterministic signal into the smallest sanctioned action and route the rest, instead of debugging or fixing on the strength of an alert.

## Steps

1. Load the signal:
   - Read the control bands file (`docs/ops/bands.yaml`; schema in `common-sdlc-metrics`), the metric source, and the rolling baseline.
   - Confirm detection already ran deterministically; never classify a breach from narrative alone.
   - Classify with the declared rules: 1 point beyond 3 sigma; 2 of 3 beyond 2 sigma same side; 4 of 5 beyond 1 sigma same side; 8 consecutive same side.
2. Check for active harm first:
   - Users affected now, or the band's `harm_check` matches -> stop and route to `incident-hotfix`.
   - Otherwise continue at the tier the breach earned.
3. Act at tier, never above it:
   - 1 sigma: record the observation and stop.
   - 2 sigma: diagnose read-only with the tier's declared tools; produce evidence, not a change.
   - 3 sigma: propose a change as a pull request, or invoke a named pre-approved runbook from the band's routes.
   - Missing tier definition, tools, or routes -> return BLOCKED rather than widening scope.
4. Triage scheduled scan results:
   - `security-test` produces the scan artifact; this workflow owns the baseline-versus-current diff.
   - For each new finding, either act or dismiss with a recorded reason; both outcomes tune the band.
   - Carry unchanged findings forward without re-reporting them.
5. Route the outcome:
   - Diagnosis worth acting on -> `brainstorm-feature` with `source: control-band | security-scan`, so it enters the normal requirement chain.
   - Shipped fix -> `retro-learn` to add a permanent eval case for the class.
   - Repeated dismissals -> recalibrate the band before responding again.

## Runtime Contract
- Use when a control band breaches or a scheduled scan completes; reactive incidents with active harm go to `incident-hotfix`.
- Required inputs: bands file with baseline and tiers, plus the measured signal or scan artifact.
- Return BLOCKED when the bands file, baseline, tier definition, or scan baseline is missing.
## Handoff Payload
- `slug`, `source` (control-band | security-scan), tier reached, breach evidence, action taken, dismissal reasons, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Monitor Response: [Metric Or Scan]

## Signal

| Metric | Baseline | Observed | Rule Matched | Tier |
| --- | --- | --- | --- | --- |
| [metric] | [window] | [value] | [rule] | [tier] |

## Harm Check

## Action Taken

## Triage

| Finding | Decision | Reason |
| --- | --- | --- |
| [finding] | [act/dismiss] | [reason] |

## Band Calibration

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: monitor-respond, feature_status: partially_implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: brainstorm-feature, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

brainstorm-feature | incident-hotfix | retro-learn

## Cost Report
Call `get_session_cost(workflow="monitor-respond")` before final handoff.
```
