Design sign-off is blocked. The request violates the **“no score without evidence”** and **“score against evidence, not intent”** guardrails. Leadership urgency cannot substitute for verification; unsupported claims must be marked **UNVERIFIED**.

Stop approval and restart the review from ground truth. Verify:

- Requirements, NFRs, scope, and owners.
- Current peak QPS, storage, bandwidth, and incident history.
- Critical-path bottlenecks and failure timelines.
- Failover drill results and measured RTO.
- Data access patterns, growth, caching, queues, drain rate, DLQ, and recovery behavior.
- User-visible observability, owned alerts, runbooks, rollout controls, rollback triggers, migration reversibility, and cost sizing.
- Component ownership and 3 a.m. operational responsibility.

Every finding needs a bounded owner-ready action and exit proof. Keep actions **open|blocked** until independently approved with a named approver, decision, and checked release-gate authority. A proposed design or review approval does not prove deployment or product release.
