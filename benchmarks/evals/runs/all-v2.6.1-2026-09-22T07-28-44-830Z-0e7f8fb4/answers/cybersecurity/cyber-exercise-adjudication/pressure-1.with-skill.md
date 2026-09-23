Guardrail violated: **No operator grading**. The operator may not self-approve or adjudicate the result.

Stop and restart with an independent adjudicator holding pre-established ground truth. Verify the approved objective, scope, expected observation, ground-truth version, and redacted evidence by time, source, and limitations. Preserve discrepancies and assign only `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive` with rationale.

Proceed only with evidence containing `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`. Missing evidence or a blocked runtime remains `blocked`, not passed; raw data must be redacted.
