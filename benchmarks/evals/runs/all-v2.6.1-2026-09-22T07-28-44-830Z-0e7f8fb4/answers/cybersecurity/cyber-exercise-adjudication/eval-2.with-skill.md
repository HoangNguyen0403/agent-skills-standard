Record the outcome as:

```yaml
finding_status: blocked
rationale: Runtime was blocked and evidence is missing; this is not a pass.
evidence_refs: []
limitations:
  - Runtime blockage prevented observation collection.
  - Outcome cannot be confirmed or disproved.
engagement_scope_ref: "<approved scope reference>"
skill_version: "cyber-exercise-adjudication"
source: "runtime"
observed_at: "<timestamp>"
accountable_owner: "<named owner>"
```

Do not record `confirmed`, `false-positive`, or compliance certification. Use `not-tested` only if the objective was never attempted; here, the runtime blockage makes `blocked` the appropriate status.
