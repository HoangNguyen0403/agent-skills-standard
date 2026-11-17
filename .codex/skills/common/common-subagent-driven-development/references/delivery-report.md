# Delivery Report

Put this decision block at the top of the implementer report. It records evidence; it does not approve a merge, authorize release, or activate report-only review.

## Decision

- **Verdict:** `READY | NOT READY | BLOCKED` — technical report status only.
- **Human action:** explicit review/approval still required; name the requested action or blocker owner.
- **Review level:** `not-assessed; current human review applies` (M1 default); include basis. An attention list is minimum coverage, never a limit on review.
- **Human-attention hunks:** paths and ranges, including every finding-bearing file and reviewer nomination.

## Criteria and Evidence

For each frozen criterion, record required/applicable status, result, scope reason where needed, and proof reference/digest. Results: `PASS | FAIL | NOT RUN | BLOCKED | NOT APPLICABLE`. Required FAIL prevents READY; required missing execution blocks readiness; NOT APPLICABLE requires a reason. Behavioral evals not run remain NOT RUN, with the authority limit stated beside them.

## Frozen Source Identity

Before checks or phase-one review, load this full procedure and freeze one scope manifest. The orchestrator computes identity; the implementer does not supply it.

- Resolve and record the selected full `BASE` and actual `HEAD`. Scope is every literal validated owned path plus every source/dependency path in the assignment; resolve directories recursively and include ignored and untracked entries. Missing or ambiguous dependency scope blocks the check.
- Freeze the exact evidence/report inventory before review. Exclude only explicitly listed run-owned regular non-symlink files inside the designated artifact scope; reject traversal, symlink components, aliases, tracked source, and changed source endpoints. Bind the inventory into the scope identity. Exclude report bytes to avoid self-hashing; separately hash every proof file. Never add exclusions after freeze.
- Compute a read-only manifest from byte-path-sorted, length-delimited records: scope paths; BASE/actual HEAD; index stage/mode/blob entries; filesystem kind/mode/content digests; and the exact artifact inventory. Preserve raw path bytes. Include ignored and untracked filesystem entries; do not use broad path or ignore exclusions.
- Freeze `scope_digest` and source identity before and after every deterministic check and each phase freeze; include them with each receipt. A mismatch, changed scope, missing path or altered proof is stale evidence: reopen the affected check and never report PASS from it.
- Retain verifier-owned raw output and artifacts durably with path and SHA-256. The reviewer/verifier must not write to or mutate the shared implementation worktree. If scope, isolation, no-write boundary, or durable artifact ownership is unknown, block execution and remain static-only.


## Criteria and Evidence

For each frozen criterion, record required/applicable status, result, scope reason where needed, and proof reference/digest. Results: `PASS | FAIL | NOT RUN | BLOCKED | NOT APPLICABLE`. Required FAIL prevents READY; required missing execution blocks readiness; NOT APPLICABLE requires a reason. Behavioral evals not run remain NOT RUN, with the authority limit stated beside them.

- **Verified:** observed technical results for this source identity, with receipt links.
- **Not verified:** missing, stale, claimed-only, or otherwise unobserved behavior and acceptance/release decisions.

## Change and Review Evidence

- **Gate / rollback:** parsed C2 value, control invariant, rollback action and reversibility; include one-way authorization reference where applicable. A version pin maps to `revert` + `revertible`; describe the prior pin in the control narrative. A reference is not authenticated approval.
- **Open findings:** severity `Blocker | Major | Nit`, evidence, Why, Fix, and `Prevent-by` mechanism.
- **Blind phase:** frozen phase-one artifact path and SHA-256, source revision, and dirty identity. Do not overwrite earlier snapshots.
- **Reproduction:** independently observed command/output and identity, or explicit static-only gap. Only `PASS`/`FAIL` claimed and observed reproduction statuses mean execution; any `NOT RUN`, `BLOCKED`, or `NOT APPLICABLE` status requires a concrete nonempty `reproduction_gap`, including when the attempted reproduction object is retained. Reproduction is forbidden unless provenance, host-verified isolation without credentials/publication authority, default-deny egress, a verified no-write boundary to the shared implementation worktree, verifier-owned durable artifacts and the orchestrator-published command are all verified.
- **Residual risk:** concrete unresolved risk, owner, and required input; otherwise `none identified`.

A report-local `READY` never changes lifecycle status, proves reviewer independence or isolation, authenticates actors, or substitutes for human merge approval. Structural tests do not prove reviewer behavior; unless behavior has separately authorized live evidence, record AC-ART-01 and AC-ART-08 behavioral outcomes as NOT RUN and keep structural contract results separate. Unsupported same-reviewer resume is BLOCKED; replacement review restarts the complete blind phase.
## `delivery-report.json` Sidecar v1

The checker consumes strict JSON with `schema_version: 1` and exactly these top-level fields: `dispatch`, `source_identity`, `artifact_inventory`, `baseline_receipt`, `verdict`, `change_class`, `reversibility`, `review_level`, `actors`, `criteria`, `blind_phase`, `orchestrator_check_receipt`, `reviewer_reproduced`, `reproduction_gap`, `gate`, `findings`, `human_attention`, `reviewer_nominations`, and `policy_evidence`.

- `dispatch` freezes full `base_oid`, actual `head_oid`, policy path/digest, criterion inventory, exact artifact inventory/scope, and `scope_inventory_sha256`. The caller supplies a separate external dispatch receipt with that digest plus the exact owned/source/dependency scope paths and kinds; the checker requires report/receipt agreement.
- `source_identity` repeats base/head and policy digest, and carries the orchestrator-frozen manifest and dirty identity. The manifest binds BASE/HEAD blobs, index records, filesystem path/kind/mode/content, policy identity, exact inventory, and the external scope/inventory digest.
- Every run artifact must be inside the declared run directory, regular, non-executable, non-symlink, untracked, and non-aliasing. Each exclusion except the report must be referenced through a recognized evidence field and digest verified; unused entries refuse. Any overlap with an external frozen owned/source/dependency path refuses even if referenced as proof. Scope declarations are consistency evidence, not authentication; arbitrary evidence formats remain allowed.
- The criterion inventory is JSON `{ "schema_version": 1, "criteria": [{ "id", "required", "applicable" }] }`. Report criteria exactly match those IDs; every `scope_reason` is string/null, with a nonempty reason required for NOT APPLICABLE. Required statuses use the frozen inventory.
- Baseline receipt JSON binds the selected `base_oid` and criterion-inventory digest. Blind-phase receipt binds actual source revision, dirty identity, and phase-artifact digest. The orchestrator check receipt binds the same source identity and lists each command, cwd, exit code, raw-output proof, result, required flag, and scope reason; only READY requires at least one required check and PASS for every required criterion/check. NOT READY and BLOCKED may truthfully retain failed or unrun required criteria.
- `gate` holds parsed C2 flag, control, rollback, reversibility, and optional one-way authorization reference. Review-level grants and calibration references are declarations only; report-only is ALWAYS DISABLED.
- Findings use severity `Blocker | Major | Nit`, path, open state, evidence, Why, Fix, and `prevent_by` enum `lint | type | test | eval | runtime | guidance | none`. `human_attention` covers every trunk diff unit plus all finding-bearing and nominated units.

`check --report <path> --policy <repo-path> --base <full-oid> --dispatch-receipt <absolute-external-json>` derives HEAD and all three base-to-head/index/worktree lanes. Exit 0 means declared consistency only; 1 names a well-formed refusal; 2 means malformed JSON/schema/policy or unusable Git input. No exit authenticates a caller, actor, grant, chronology, scope provenance, isolation, or human approval.

Git inspection disables lazy fetching and replacement refs for every invocation. The checker does not invoke hooks, filters, external diff/textconv, or repository writes; missing local objects fail closed. Revalidation checks source identity, external receipt digest, and every evidence digest again before returning.
