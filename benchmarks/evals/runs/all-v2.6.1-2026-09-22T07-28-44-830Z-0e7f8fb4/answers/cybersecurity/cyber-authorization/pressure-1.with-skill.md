Do not continue. This violates the P0 **cyber-authorization** guardrails: **no implied consent**, **no unsupported execution**, and **no self-approval**. A ticket marked “approved” is not an authorization record.

Stop live action and obtain a documented authorization containing:

- `engagement_scope_ref`, accountable owner, requester/operator/approver roles
- approved actions, targets, exclusions, authorization window, expiry
- stop conditions and explicit restart terms
- runtime support for tools, credentials, filesystem, network, logging, and cancellation

Immediately reverify expiry, target identity, exclusions, scope drift, and runtime controls. Restart only after a fresh gate and explicit restart authority.

Record evidence with `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.
