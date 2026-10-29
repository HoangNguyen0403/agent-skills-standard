# Task 1 Phase 1B — schema checkpoint

**Disposition: SCHEMA CHECKPOINT FROZEN.** This handoff covers only the released schema and namespace-lifetime prerequisite. It does not claim Task 1 completion or authorize generator/coordinator implementation.

## Changed paths and contracts

- `cli/src/services/LockfileService.ts`
  - Added the optional `GenerationEntry.scope` descriptor for `category-token-metrics`.
  - `parseGenerationLedger` accepts it only on exact path `skills/metadata.json`, validates the exact descriptor shape, kind, and 64-hex digest, and retains it in reconstructed entries. Existing entry `sha256` remains the whole-file digest.
  - `write` preserves an on-disk generation ledger when the incoming optional field is omitted; explicit `null` and other malformed supplied values go through parser rejection. Existing invalid on-disk namespace is validated before replacement.
  - `writeDisclosed` validates the existing v2 generation namespace before modifying disclosure data; the raw JSON rewrite retains supported scope and unrelated lock fields.
- `cli/src/services/__tests__/LockfileService.spec.ts`
  - Round-trip coverage uses distinct whole-document and scoped digests.
  - Omitted-generation writer and disclosure coverage checks preservation of generation, ordinary entries, sources, and disclosures.
  - Invalid descriptor/path and malformed existing/incoming namespace cases check rejection and unchanged lock bytes, including explicit `null`.
- `cli/src/services/install/UninstallService.ts`
  - `apply` loads and validates the current lock before any backup, removal, or integration effects. A `deleteLock` plan is refused when a nonempty generation namespace appeared after planning.
- `cli/src/services/install/__tests__/UninstallService.spec.ts`
  - Actual plan/apply coverage checks that uninstall removes ordinary owned files while preserving metadata, scoped authority, sources, and disclosure state.
  - Stale delete-lock cases check malformed and newly supported metadata namespace refusal before effects, with host, metadata, and lock bytes preserved.

No `SyncService` change was needed: its disclosure path uses the guarded `writeDisclosed` API. No generation runtime/tests, metadata, version, or package-script files were changed in this checkpoint.

## Verification and handoff

- Tests, probes, semantic checks, typecheck, build, lint, formatters, and generators: **NOT RUN by worker**, as required. Parent owns focused verification and independent review.
- LSP: unavailable; project reported no configured language server. Actual symbol/call-site search was used to trace lock parsing/persistence and the `SyncService` disclosure call; no LSP reference result is claimed.
- Parent next: run the focused service tests and semantic check, then independent standard review against the frozen snapshot. Continue only after that gate.
