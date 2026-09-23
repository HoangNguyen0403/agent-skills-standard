- Metadata defect: `severity: high` is invalid Sigma metadata. Use `level: high`; `level` expresses impact/priority.
- `status: experimental` is valid lifecycle metadata, but does not establish execution readiness.
- Readiness: `blocked` / `not-tested`. Required process telemetry is not collected, so analytic coverage cannot be claimed and the rule cannot be validated.

Collect and verify the required process source/fields, retention, collection path, and clock quality; then test with offline fixtures and document evidence, benign cases, limitations, scope, owner, and status.
