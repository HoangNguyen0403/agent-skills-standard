# Task 4 — GREEN corrective status (checks not run)

Status: source corrections complete for the catalog + SDD-preservation scope. No tests,
typechecks, builds, linters or formatters were run by this agent.

## Settled source files (this round)

- `cli/src/services/SyncService.ts`
  - `cleanupOldFolders` preserves `.agent/sdd` bytes/paths; migrates only legacy
    `.agent/*` children into `.agents` with the existing non-overwrite copy options;
    removes only migrated children; keeps the `.agent` root when anything remains.
  - Catalog conflict verification now reads native bytes once and records
    `nativeConflicts` for expected exports that do not match the generated digest.
- `cli/src/services/LockfileService.ts`
  - `readJsonStrict` uses the existing `js-yaml` core parser to reject duplicate JSON
    keys before `JSON.parse`, preserving the original error via `{ cause }`.
  - `load` validates the complete outer v2 lock with a Zod schema (`lockV2Schema`) plus
    the custom catalog validation, then constructs the typed lock (no partial-object
    assertion).
  - `writeDisclosed` publishes through the same validated atomic helper as `write`.
- `cli/src/services/WorkflowSyncService.ts`
  - Records a binding for every aliased provider while writing each physical path once;
    conflicting same-path digests are refused.
- `mcp/src/services/WorkflowIndex.ts`
  - Duplicate-key strict lock snapshot, enclosing version/shape validation (v1 →
    unverified, non-2 → unavailable), aliased-provider digest agreement, and
    `nativeConflicts` folded into `parityIssues`/`nativeParity`.
  - Caught parser errors preserve `{ cause }`.

## Settled tests (regressions)

- `cli/src/services/__tests__/SyncInstallLifecycle.spec.ts` — real temp consumer:
  `.agent/sdd` packet + `plan-path` retained, legacy content migrated, legacy root
  removed only when no SDD tree remains.
- `cli/src/services/__tests__/SyncService.spec.ts` — migration tests updated to
  per-entry copy/removal; SDD-only root retention; `readdir` mock typed via the
  `Promise<string[]>` overload.
- `cli/src/services/__tests__/LockfileService.spec.ts` — aliased providers allowed;
  conflicting aliases rejected; duplicate JSON keys rejected; disclosure atomicity
  (normal + failure preserves prior bytes).
- `cli/src/services/__tests__/WorkflowCatalogInstall.spec.ts` — provider-only,
  shared-path multi-binding, conflict parity, incomplete no-prune, edited canonical,
  unowned/override, removed agent.
- `cli/src/services/__tests__/WorkflowSyncService.spec.ts` — canonical ownership meta;
  missing `CollectedSkill`/`InstallWriter` imports added.
- `cli/src/services/install/__tests__/UninstallService.spec.ts` — transferred to
  Personal Delivery `25b891a2-b177-4dba-a44b-9c08115ef5aa`; not edited after transfer.
- `mcp/test/WorkflowIndex.spec.ts` — managed lookup, conflicts, duplicate keys,
  unsupported lock version, alias parity, traversal/symlink cases.

## Baseline-only TSC item

`SyncService.applyIndices` `RegistryMetadata` → `RemoteMetadata` weak-type error is
pre-existing. Evidence: `git diff HEAD --unified=0 -- cli/src/services/SyncService.ts`
contains no hunk in `applyIndices` / `withMetadata(meta)`. Not changed (narrow-fix rule).

## Verification (parent; not run here)

```bash
rtk pnpm --filter ./cli test \
  src/services/__tests__/SyncInstallLifecycle.spec.ts \
  src/services/__tests__/SyncService.spec.ts \
  src/services/__tests__/LockfileService.spec.ts \
  src/services/__tests__/WorkflowCatalogInstall.spec.ts \
  src/services/__tests__/WorkflowSyncService.spec.ts \
  src/services/__tests__/WorkflowAcquisition.spec.ts \
  src/commands/__tests__/SyncCommand.spec.ts
rtk pnpm --filter ./mcp test test/WorkflowIndex.spec.ts test/Tools.spec.ts
```
