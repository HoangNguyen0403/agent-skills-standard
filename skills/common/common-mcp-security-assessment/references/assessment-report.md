# Assessment Report, Canonical Evidence & Persistence Contract

Defines the six-section Markdown report, supplied-input envelope, canonical `cyber-evidence` binding, fidelity rules, and no-clobber persistence behavior.

## 1. Supplied-Input Envelope & Persistence Separation

Distinguish **analysis admission** (safe supplied-artifact review) from **persistence authorization** (host file write):

- **Analysis admission (required for safe review)**:
  - `scope_ref` & `accountable_owner`: Authorized assessment scope and owner role; never inferred from target metadata.
  - `input_refs`: Explicit supplied paths or exported text with stable labels and digests where provided. Resolve relative paths only inside the authorized root; reject symlink escapes or out-of-scope references without falling back to ambient home/repo collection.
  - `taxonomy_ref`: `165fe0f78ef104459237b4a8e0f6e78db9b02391` (OWASP MCP Top 10 2025).
  - `data_eligibility`: Operator confirmation that inputs are sanitized and provider/account transfer is permitted.
- **Partial / name-only inputs (admissible without complete inventory)**:
  - Missing `integration_refs`, `transport`, `package_identity`, `capabilities`, or policy records do **not** block review or trigger collection; assign stable per-assessment IDs where absent, retain missing attributes as `unknown`, and identify sanitized artifacts needed next.
- **Persistence authorization (separate host write grant)**:
  - `output_ref`: Explicitly authorized no-clobber destination (`artifacts/mcp-security-review.md` only when within granted output scope). Missing or denied `output_ref` holds file persistence only (`unpersisted`); safe supplied-artifact analysis and rendered Markdown output still proceed.
## 2. Six-Section Markdown Report Layout

Produce one standalone Markdown report containing these six sections in order (do not overwrite or merge into branch `artifacts/security-review.md`):

1. **Scope and Provenance**: `scope_ref`, `accountable_owner`, installed workflow/skill identities, `taxonomy_ref`, `input_refs` (with digests/provenance), assessment `inspected_at` timestamp distinct from each artifact's `collected_at` / `target_revision`, and `output_ref` + persistence state.
2. **Integration Inventory**: One entry per `integration_ref` capturing `transport`, `package_identity` (name, version, runnable-supplied flag) or `endpoint_identity`, `capabilities`, `credential_reference_names` (names only, never values), `privilege_boundaries`, `control_boundaries` (`client`/`server`/`host`), `evidence_refs`, and explicit `unknown` markers for absent attributes.
3. **OWASP Coverage**: Exactly ten summary rows (`MCP01`–`MCP10`, preserving `MCP06` Intent Flow Subversion alias) with columns: `category_id`, `integration_refs`, `coverage` (`assessed` | `partial` | `not-assessed` | `not-applicable`), `controls_reviewed`, `controls_unassessed`, `evidence_refs`, `finding_refs`, `limitations`; followed by per-control breakdown (`boundary`, `evidence_lane`, `conclusion`, `rationale`).
4. **Findings**: Attributable records using canonical `cyber-evidence` fields without forking enums. Only emit findings supported by supplied evidence; never invent placeholder findings to populate a clean category.
5. **Evidence Lanes and Limits**: Separate `supplied-static`, `supplied-runtime` (with original collection time, revision, tool/version, completion/errors), and `executed-by-assessor` (target runtime checks: not executed in this offline workflow). Record missing/stale/failed scanner artifacts and any blocked target-execution requests.
6. **Remediation and Handoff**: Actionable remediation steps bound to accountable owner roles (`Engineer`, `Security`, `Host Operator`, `Integrator`), required sanitized inputs to close remaining gaps, and next workflow guidance. Never emit auto-fixes, credential rotation commands, or executable exploit payloads.

## 3. Canonical Evidence & Fidelity Rules

Reuse `cyber-evidence` (`skills/cybersecurity/cyber-evidence/references/evidence-record.md`) base fields and enums directly:

- **Base fields**: `engagement_scope_ref` (`scope_ref`), `skill_version`, `source`, `observed_at` (inspection time), `finding_status` (`confirmed` | `suspected` | `blocked` | `not-tested` | `false-positive`), `evidence_refs`, `limitations`, `accountable_owner`.
- **Finding extensions**: `finding_id`, `integration_ref`, `control`, `category_id` (`MCP01`–`MCP10`), `severity_rationale` (mark `unknown` if basis absent; no invented CVSS score), `confidence`, `impact`, `remediation_owner`, `retest_expectation`.
- **Scanner admission**:
  - Uncorroborated scanner-only positive $\rightarrow$ `suspected` (never `confirmed` without independent corroboration such as separate source + policy/approval evidence).
  - Stale/revision-mismatched negative or failed/empty scanner output $\rightarrow$ cannot establish a current clean result; retain explicit gap/limitation.
  - No arbitrary age cutoff; applicability breaks on revision mismatch or intervening control change.
- **Blocked/failed retest preservation**:
  - When a prior `confirmed` or `suspected` finding is retested and the retest step blocks or fails, **preserve** the prior `finding_status` (`confirmed` or `suspected`) and append the new retest `limitations`.
  - Never overwrite a corroborated finding to `not-tested` or `false-positive`, and never copy step `blocked` mechanically into `finding_status`. `false-positive` requires independent invalidating evidence.
- **Bounded conclusions**:
  - Clean static inspection with unassessed runtime controls $\rightarrow$ state `"No findings identified in reviewed supplied static controls"` while keeping runtime gaps explicit.
  - Never emit global `"MCP is safe"`, health badges, injection-immunity claims, or numerical security scores.

## 4. Safe No-Clobber Persistence

Report persistence is a host-enforced output effect separate from offline analysis:

1. Verify `output_ref` lies within the authorized output root with no symlink escape and no pre-existing file at that path.
2. Persist only using a host operation that guarantees create-new / no-clobber semantics (`O_EXCL` / exclusive create) against concurrent writes.
3. **Collision or missing create-new proof**: Do **not** overwrite existing content and do **not** fall back to check-then-overwrite. Keep the rendered report in the session response, mark persistence `unpersisted` / `blocked`, and request a distinct authorized destination path.
4. Reruns with identical inputs target a distinct authorized path so historical reports remain intact.
