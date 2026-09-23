Do not approve it. The **unsupported runtime** guardrail requires a stop, and the **no silent scope change** rule requires re-authorization.

Proceed only after:

- Pause/stop the exercise and record the decision.
- Confirm fresh authorization, approved scope, exclusions, runtime support, roles, and synthetic-data boundary.
- Use an offline inject design unless the network boundary is independently verified.
- Restart only with recorded authority and runtime-gate approval.

Required evidence: authorization and scope references, runtime-support verification, boundary/exclusion evidence, synthetic-data confirmation, accountable owner, timestamps, and control-log entries with `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, and `limitations`.
