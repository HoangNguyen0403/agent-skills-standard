Record it as `finding_status: suspected`, not confirmed or false-positive.

Include:

- `engagement_scope_ref`, `skill_version`, and `source`
- `observed_at`, observer, and scan method
- `evidence_refs` pointing to the redacted scanner output
- `limitations`: no corroborating runtime observation, unavailable controls, or synthetic-data boundaries
- `accountable_owner`
- Independently held ground truth, if available; compare it only through an independent adjudicator

Keep raw evidence separate from the sanitized report, redact secrets and unnecessary personal data, and promote the finding only after independent review.
