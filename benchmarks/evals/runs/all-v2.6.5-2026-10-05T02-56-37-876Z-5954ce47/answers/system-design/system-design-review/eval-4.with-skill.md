## Review handoff

Review: `architecture/reviews/review-clinical-access.md`  
Architecture entry: `architecture/README.md`

### Profile and scoring

Profile: security-sensitive clinical-access architecture with unresolved jurisdiction and unknown operational scale. All nine axes are applicable; denominator is `10 × 9 = 90`.

Weighting: Requirements 20%, Redundancy 15%, Observability 15%, Rollout 15%, Capacity 10%, Data scaling 10%, Caching 5%, Async offload 5%, Cost proportionality 5%.

| Axis | Score | Evidence |
|---|---:|---|
| Requirements | 0/10 | Feature claim exists, but functional/NFR/out-of-scope requirements and owners are not evidenced. |
| Capacity evidence | 0/10 | No QPS, storage, bandwidth, or current traffic evidence. |
| Redundancy | 0/10 | Recovery is described, but no restore-drill result or measured RTO is provided. |
| Data scaling | 0/10 | No access-pattern, ownership, growth, or bounded-table evidence. |
| Caching | 0/10 | No measured hot path or cache contract is evidenced. |
| Async offload | 0/10 | No queue, drain-rate, DLQ, or burst-work evidence. |
| Observability | 0/10 | No runtime/deployment evidence, instrumentation, owned alerts, or runbooks. |
| Rollout | 0/10 | Client generations A and B have different authorization paths; cutover evidence is absent. |
| Cost proportionality | 0/10 | No traffic/risk-based sizing or cost ownership evidence. |

**Verdict: 0/90, release-blocked, evidence insufficient.** Unsupported claims are `UNVERIFIED`; no cache, queue, replica, or proxy receives credit from vocabulary alone.

### Semantic review

The design trace is currently only:

`client generation A/B → proposed proxy → sensitive clinical record`

The worst unverified hop is the authorization boundary at the proposed proxy. The review does not establish that the proxy is deployed, enforced at runtime, applied to both client generations, or connected to the applicable privacy decision. Proposed HLD/LLD material would not prove deployment or product release.

Lifecycle: `proposed`  
Source kind: `document`  
Evidence confidence: `documented` for the stated design claims; `unverified` for runtime, deployment, cutover, and recovery outcomes.

## Findings

### F-CLINICAL — Critical

- **Axis:** Requirements, Observability, Rollout
- **Evidence:** A proposed proxy is described as protecting access to a sensitive clinical record, but runtime and deployment evidence is absent.
- **Consequence:** The review cannot establish that the control is active, correctly positioned, or effective on the critical access path.
- **Smallest fix:** Produce deployment evidence and a bounded runtime verification covering the enforced authorization path, including permitted and denied behavior, with no unverified clinical or personal details.

### F-JURISDICTION — High, release-blocking

- **Axis:** Requirements, Rollout
- **Evidence:** The applicable jurisdiction/privacy decision and its approver are unresolved.
- **Consequence:** Policy requirements and release authority cannot be treated as settled.
- **Smallest fix:** Record the applicable jurisdiction/privacy decision, decision rationale, named approver, decision date, and gate authority.

### F-CUTOVER — High

- **Axis:** Rollout, Requirements, Observability
- **Evidence:** Client generations A and B use different authorization paths; no evidence shows both have cut over.
- **Consequence:** One generation may remain on an unverified or inconsistent authorization path.
- **Smallest fix:** Produce a generation-by-generation path inventory, cutover evidence for A and B, and a reversible rollout/rollback record with a metric-based trigger.

### F-RESTORE — High

- **Axis:** Redundancy
- **Evidence:** Recovery is described, but no restore-drill result is provided.
- **Consequence:** Recovery behavior, data integrity, access-control preservation, and measured recovery time remain unverified.
- **Smallest fix:** Execute and record a restore drill, including measured recovery results, integrity/access-control checks, operator, and observed gaps.

## Action register

| Action ID | Finding IDs | Risk / source / consequence | Bounded change | Role and dependencies | Scoped exit proof | Status | Release gate |
|---|---|---|---|---|---|---|---|
| A-CLINICAL | F-CLINICAL | Critical; documented design claim, no runtime/deployment source; proxy enforcement cannot be established. | Capture deployment evidence and run bounded authorization verification for the proposed proxy. | Proxy/service owner; depends on approved jurisdiction/privacy criteria and test scope. | Runtime/deployment artifacts plus recorded allowed/denied results; independent approval record names approver, decision, and checked gate authority. | open | Block release until runtime and deployment proof are reviewed. |
| A-JURISDICTION | F-JURISDICTION | High; applicable privacy decision and approver unresolved; requirements and release authority remain unsettled. | Obtain and record the jurisdiction/privacy decision and approver. | Privacy/compliance decision owner; gate authority must be named. | Decision record names jurisdiction, decision, approver, date, and gate authority; independently checked. | blocked | No release decision until the recorded decision exists. |
| A-CUTOVER | F-CUTOVER | High; documented A/B authorization divergence, no cutover evidence; inconsistent access control may persist. | Inventory both generations, verify their authorization paths, and complete a reversible cutover with rollback criteria. | Deployment/release owner and access-service on-call; depends on A-JURISDICTION and A-CLINICAL. | Separate evidence for generations A and B, rollout metrics, rollback trigger, and independent approval record. | open | Block release until both generations have verified paths or an explicitly approved exception. |
| A-RESTORE | F-RESTORE | High; recovery description is documented, but restore behavior is unverified. | Run a restore drill and record measured recovery and integrity/access-control results. | Recovery/operations owner and recovery on-call; depends on an approved test scope. | Drill record with observed results, gaps, remediation owner, and independent approval record. | open | Block release until recovery evidence is accepted or an explicitly approved exception exists. |

### Roadmap

**Now**

- Keep the release gate blocked.
- Assign the privacy/compliance decision owner and independent gate authority.
- Resolve F-JURISDICTION.
- Define the evidence scope for runtime, cutover, and restore verification.

**Next**

- Complete A-CLINICAL and A-CUTOVER.
- Verify both client generations independently.
- Execute A-RESTORE and record measured results.
- Re-score all nine axes using observed evidence.

**Later**

- Establish owned observability, runbooks, capacity measurements, and recurring restore/cutover drills.
- Reassess profile weighting when traffic, data volume, and operational constraints are evidenced.

## Persistence status

```yaml
improvement_plan:
  status: response_only
  path: null
  missing:
    - "No file write was performed in this isolated handoff; the review, architecture entry, and improvement plan were not modified or verified."
```

Intended plan location, if written by an authorized maintainer: `architecture/reviews/improvement-plan-clinical-access.md`.
