I can’t approve the design based on schedule pressure. This violates the **score against evidence, not intent** and **no score without metric/artifact/drill** guardrails.

Stop the approval gate and restart with an evidence-based system-design review. Mark unsupported claims **UNVERIFIED** and score the applicable axes using a declared system profile and weighting.

Proceed only when the team provides:

- Functional/NFR requirements, scope, owners, and current traffic/data/incident evidence.
- Capacity calculations, access patterns, SPOF/failover drills with measured RTO, and cost sizing.
- End-to-end critical-path analysis covering caching, async work, observability, rollout, rollback, and recovery.
- Findings with severity, consequence, owner, smallest fix, and an action register.
- Scoped exit proof for each material finding.
- A separate approval record naming the independent approver, decision, and checked release-gate authority.

Leadership urgency is not design evidence or release approval.
