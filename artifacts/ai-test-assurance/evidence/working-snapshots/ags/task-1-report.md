# T1 technical-design report

- Status: done_with_concerns.
- Deliverable: `docs/srs/srs-ai-test-assurance.md`, contract revision 1, ready for independent review and digest freeze; not self-approved.
- Scope: AGS design document and this mandated report only. TestGuard implementation worktree remained read-only. No implementation, dependency changes, commits, deployments, profile changes, agent creation or secret access.
- Current authority recorded: requester “okay start implement the plan” approves Subagent-Driven implementation, not release/blocking activation or pilot/provider spending.

## Acceptance map

| AC | Concrete deliverable |
| --- | --- |
| T1-1 | SRS §3: exact schema_version=1 scan envelope; successful file/test accounting; complete/incomplete/error/not_applicable separate from blocker severity; exit precedence 2 > 3/1/0 by decision table; --allow-empty, unsupported/diff handling; stdout/stderr/I/O behavior; proposed 0.2.0 SemVer boundary and migration inventory. |
| T1-2 | SRS §4–6: extended existing intent record, explicit Snapshot/Execution/Bundle types, exact inventory/raw-byte digests and caller-selected current identity, dirty/config/dependency freshness, bounded containment validation, local-untrusted only, intended-assertion fault conditions, invalid build/setup/timeout handling. Receipt commands are never run. |
| T1-3 | SRS §1 and §7: observed consumers/conventions; exact T2–T8 owner paths and execution commands; canonical vs generated ownership and safe generator copy-back. Validator path scripts/test-assurance; controls scripts/evals/test-quality-controls.test.ts as orchestrator requested. |
| T1-4 | SRS §8: generator-safe and evaluator-only manifests, filesystem isolation, digest freezing, separate arm outputs, strata/denominators, contamination invalidation, no actual held-out faulty implementation included. |

## Key decisions

1. TestGuard array → versioned object, no legacy shim. Proposed release boundary 0.2.0 under declared pre-1.0 SemVer; no actual release authorized.
2. Complete nonempty no-blocker scan exits 0; complete blocker 1; incomplete/error/unsupported/disallowed empty 2; explicitly authorized genuine empty 3. Partial analysis retains blockers/findings and exits 2.
3. --diff fails explicitly because current engine does full traversal; config_applied=false discloses current config limitation without implementing unrelated features.
4. Local TS validator requires an explicit declared/executed/fault level. It checks supplied byte identities/classification only, never attests execution or authorizes rollout.
5. Existing trace remains compatible document audit, with explicit document-only labels; no-source success is not execution/release assurance.
6. Fault challenge binds source-only before/after variant inventories; test/config/dependency/environment/command stay frozen. Build/setup failures and timeouts are not fault detection.
7. T6 uses current matcher primitives on bounded adversarial/paraphrase controls, not a false claim of arbitrary semantic validation. Shared matcher scope stays excluded.

## Inspection evidence

Read TestGuard engine/discovery, CLI, violation JSON tags, reporter implementation references, release/CI/docs consumers; AGS trace, outcome validation convention, package dependencies/commands, scorer/checkAssertion and parity regression, intent/healing sources and generator canonical/export lifecycle. Evidence ledger in SRS §1 links observed paths/ranges. No unresolved schema/exit/freshness design decision prevents implementation after independent review.

## Verification performed and limits

- Static contract walkthrough: all six PRD scan table rows; incomplete+blocker; explicit empty; unsupported+allow-empty; declared-only links; source/test/dependency/config drift; intended assertion vs build/setup/timeout outcomes. Expected classifications are explicit in SRS.
- No builds, tests, lint, formatter, pilot or runtime checks were run by T1, as assigned. Commands in SRS are downstream specifications, not claimed results.
- Parent notification reports locked AGS dependencies, 19 baseline trace/parity passes and focused TestGuard package passes; not re-executed or independently verified here.
- MCP compliance audit recorded software-requirements and worker-ownership skills; design-solution, required decision-discipline and requirements-modeling reference were additionally loaded directly. MCP warned no product-management skill in its own loading history; the required modeling reference was read directly and is not represented in that MCP count.
- Behavioral find tool unavailable due provider 402 insufficient credits; used scoped direct reads/literal searches instead. Publication not blocked.
- Exact token/provider cost unavailable; no cost or savings estimate.

## Remaining concerns / next gate

- Independent reviewer must approve/freeze contract digest before dependent implementation. T1 cannot satisfy its own independent review.
- External JSON dashboard consumers are not inventoried outside these authorized repositories; release notice is required, not a fabricated migration claim.
- Local current snapshot commit/dirty fields and review identities are caller assertions; hashes do not attest execution, scope sufficiency, oracle correctness or approver identity.
- Host-specific generated export paths depend on selected config; T8 must put the actual derived paths in its allowlist and preserve canonical SDD evidence.
- Pilot corpus/oracle owner/budget/provider authority remain T7 prerequisites, not blockers to T2–T6. Per-case pilot commands freeze with the approved corpus; no fictitious runner targets are specified.

Recommended next action: independent technical review of SRS §3–6 invariants and owner table, then orchestrator digest freeze and bounded authorized dispatch. No consequential blocker identified requiring premium or additional human design choice.

## Scoped independent-review correction

- Applied the orchestrator's two contract rulings only; no additional discovery or implementation.
- SRS §4.2, §5, §6 and failure table now agree: historical input additions/modifications/deletions, disappearing selected historical roots, and structurally valid current inventories differing from the readable tree are stale/exit 1. Missing caller current.json/repository root, malformed current schema, unsafe paths, unreadable inputs and missing/tampered captured evidence artifacts are invalid/exit 2. Invalid takes precedence when both conditions exist. Historical input absence is not a captured-output error.
- SRS §4.2 defines strict VariantManifest JSON: schema_version 1; nonempty sorted unique changes with path/before_sha256/after_sha256; unknown keys/version invalid; source-root-only paths; nonnull differing digest side; exact before/after inventory equality including null for absent paths; changes exhaust the complete source inventory difference.
- Corrected SRS SHA-256: `670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5`.
- Only command executed: `rtk proxy shasum -a 256 docs/srs/srs-ai-test-assurance.md`, producing the digest above. No tests/build/lint/formatters/checks/delegation. Independent scoped rereview remains pending.
