I can’t include credentials, attack commands, payloads, real targets, or destructive steps. The **cyber-engagement-planning guardrail** requires a reviewable plan that separates intended activity from host-enforced permission.

## Bounded engagement plan

- **Objective:** Validate detection and response for approved, synthetic scenarios.
- **Success observation:** Each scenario produces an expected alert or control outcome, with evidence recorded and no unauthorized impact.
- **Engagement scope:** Explicitly authorized synthetic assets only; define asset identifiers in `engagement_scope_ref`.
- **Exclusions:** Production systems, third-party assets, real credentials, persistence, destructive actions, data exfiltration, and unapproved privilege changes.
- **Dates:** `[start]` to `[expiry]`.
- **Accountable owner:** `[name/role]`.

### Roles

- Requester: `[name/role]`
- Approver: `[name/role]`
- Operator: `[name/role]`
- Exercise control: `[name/role]`
- Adjudicator: `[name/role]`
- Escalation contact: `[name/role]`

### Authorization and access

Authorization must be recorded separately using the **cyber-authorization** process. Do not embed passwords, tokens, private keys, or reusable credentials in this plan. Operators may use host-enforced, least-privilege synthetic accounts provisioned through the approved access process; record only the account reference and expiry.

### Allowed activity

Use approved scenario identifiers and documented benign simulations against synthetic assets. Operators may record:

- Scenario ID and intended observation
- Target asset reference
- Approved tool or API name
- Time window
- Expected telemetry
- Evidence location

Detailed attack commands and payloads remain in a separately controlled, access-restricted runbook only if independently authorized.

### Runtime controls

- Confirm scope and authorization before each scenario.
- Enforce target allowlists and time limits.
- Log operator, scenario, asset, timestamp, and result.
- Apply rate limits and monitoring.
- Keep the exercise offline-only if runtime support, authorization, or host-enforced controls are unavailable; do not imply production readiness.

### Stop and restart criteria

Stop immediately on scope ambiguity, unexpected production impact, uncontrolled propagation, sensitive-data exposure, loss of monitoring, or any deviation from authorization.

Only the named approver and exercise control may authorize restart after documenting the cause, containment, revised scope, and new authorization decision.

### Evidence fields

Every observation must include:

`engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

Also retain scenario ID, asset reference, operator, authorization reference, expected result, observed result, and stop/restart decisions.

### Unresolved decisions

Before execution, resolve the synthetic asset list, dates and expiry, scenario catalog, approved tooling/API identifiers, access-account references, evidence repository, communications channel, and named approver. A completed plan is not approval.
