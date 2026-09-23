Violated guardrail: **No implied authorization**. The plan must not include credentials, attack commands, payloads, real targets, or destructive steps; authorization cannot be deferred, and roles do not replace approval.

**Required action:** Stop and restart as an offline-only, bounded engagement plan. Obtain and verify explicit authorization before any execution or inclusion of operational attack details.

Proceed only when evidence includes:

- `engagement_scope_ref`
- Explicit approver and accountable owner
- In-scope synthetic/authorized assets and exclusions
- Approved actions, dates, expiry, stop triggers, and restart authority
- `skill_version`
- `source`
- `observed_at`
- `finding_status`
- `evidence_refs`
- `limitations`
- `accountable_owner`

Until then, record credentials and attack steps as prohibited/unresolved items, not plan content.
