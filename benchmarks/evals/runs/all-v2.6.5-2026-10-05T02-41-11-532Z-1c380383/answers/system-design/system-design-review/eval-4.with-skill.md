## Handoff: Clinical Access Architecture Review

Scope is limited to the supplied case. No repository files were inspected or modified.

**Verdict: HOLD — not ready for approval or production cutover.**

The proposed proxy’s protection of sensitive clinical records is undocumented at runtime/deployment level. Jurisdiction/privacy approval, dual-generation cutover, and restore-drill evidence remain unresolved.

### Provisional scorecard

System profile: sensitive clinical-record access, critical authorization path, high-risk rollout and recovery.

All nine axes are applicable. Weighting: Requirements 15%, Capacity 5%, Redundancy 15%, Data scaling 10%, Caching 5%, Async offload 5%, Observability 15%, Rollout 20%, Cost proportionality 10%.

| Axis | Score | Evidence |
|---|---:|---|
| Requirements | 0/10 | Only the proposed protection purpose is established; jurisdiction, approver, ownership, and acceptance criteria are unresolved. |
| Capacity evidence | 0/10 | No current QPS, storage, bandwidth, or traffic-change evidence supplied. |
| Redundancy | 0/10 | Recovery is described, but no restore-drill result or measured recovery evidence exists. |
| Data scaling | 0/10 | No access-pattern, ownership, growth, or data-volume evidence supplied. |
| Caching | 0/10 | No measured hot path, TTL, invalidation, or safety analysis supplied. |
| Async offload | 0/10 | No workload or queue/drain-rate evidence supplied. |
| Observability | 0/10 | No runtime/deployment proof or owned alert evidence for the proxy. |
| Rollout | 0/10 | Client generations A and B use different authorization paths; joint cutover is unproven. |
| Cost proportionality | 0/10 | No traffic, risk, or spend sizing supplied. |

**Score: 0/90 applicable-axis points; weighted score: 0/100.** This is an evidence score, not a claim that every mechanism is absent.

### Findings and bounded actions

| ID / severity | Risk and consequence | Smallest bounded action | Owner role | Exit proof / gate |
|---|---|---|---|---|
| **F-CLINICAL — Critical** | The proxy is described as protecting access to a sensitive clinical record, but runtime and deployment enforcement are unverified. Authorization may not be applied on the actual critical path. | Capture runtime and deployment evidence showing proxy placement, authorization enforcement, identity propagation, and deny behavior for the protected path. | Clinical-access service owner with platform operator | Dated runtime/deployment evidence reviewed by an independent approver; release gate remains closed until accepted. |
| **F-JURISDICTION — High** | The applicable jurisdiction/privacy decision and approver are unresolved, so the design lacks an authoritative policy boundary. | Record the applicable jurisdiction/privacy decision, rationale, decision owner, and approver record. | Privacy/legal decision owner | Separate approval record naming the approver, decision, and gate authority. A role alone is not acceptance. |
| **F-CUTOVER — High** | Generations A and B have different authorization paths, and there is no evidence that both cut over. One generation could bypass the intended control. | Inventory both paths, instrument traffic and authorization outcomes by client generation, and perform a reversible staged cutover with rollback criteria. | Release/migration owner | Evidence that both generations use the intended path, with rollback trigger and independent release approval. |
| **F-RESTORE — High** | Recovery is described but untested; actual recoverability, integrity, and access behavior are unknown. | Run a restore drill and record target versus observed RTO/RPO, data-integrity checks, authorization checks, issues, and remediation. | SRE/disaster-recovery owner | Dated drill report accepted by an independent approver; recovery gate remains open until then. |

### Roadmap

1. **Stop the bleeding:** place clinical-access protection, jurisdiction approval, and production cutover on hold pending F-CLINICAL and F-JURISDICTION evidence.
2. **Structural next:** prove both client-generation paths converge on the intended authorization control; maintain a reversible rollout and rollback trigger.
3. **Recovery validation:** complete and document the restore drill before treating recovery as implemented.
4. **Re-score:** update the nine-axis scorecard only when artifacts, runtime/deployment captures, measured drills, and approval records exist.
5. **Operability:** name the team operating the authorization path and restore process at 3am, with runbooks and owned alerts.

All actions remain `open` until scoped exit proof and a separate approval record exist. No deployment, publication, or product-release approval is inferred.

```yaml
improvement_plan:
  status: response_only
  path: null
  missing:
    - architecture/improvement-plan-clinical-access.md was not written
    - architecture/reviews/review-clinical-access.md was not linked to the improvement plan
    - architecture/README.md was not linked to the review or improvement plan
```

Proposed persistence path: `architecture/improvement-plan-clinical-access.md`.
