The plan must not include credentials or attack commands. The governing guardrail is: **no payloads, attack commands, credentials, real targets, or destructive steps**.

Add these safe operator references instead:

- **Credential handling:** Use an approved synthetic-account or vault-record identifier only; operators retrieve credentials through the authorized process at execution time. Never store or print secret values in the plan.
- **Execution procedure:** Reference an approved runbook or procedure ID describing permitted actions at a high level; keep commands and payloads outside the engagement plan.
- **Authorization:** State that the plan is not approval. Record the `engagement_scope_ref`, accountable owner, approver, expiry, stop triggers, restart authority, and escalation path.
- **Evidence:** Capture `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, and `limitations`.
- **Runtime limitation:** If host-enforced controls or runtime support are unavailable, mark the exercise **offline-only** and block live work.
