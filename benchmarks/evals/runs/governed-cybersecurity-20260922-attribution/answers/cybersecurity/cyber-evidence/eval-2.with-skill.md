Record it as a **scanner-only finding** with exactly:

`finding_status: suspected`

Include `engagement_scope_ref`, `skill_version`, `source` (scanner/tool), `observed_at`, observer, method, and `evidence_refs`. State the limitation explicitly: **no corroborating observation exists**, so the issue is unverified. Redact secrets and assign an `accountable_owner`.

Do not mark it `confirmed` or treat absence of corroboration as proof of absence. Keep the raw scanner output separate from the sanitized report and append later corrections with provenance.
