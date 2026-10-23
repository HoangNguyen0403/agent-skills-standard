# Task 4 report — shared canonical workflow catalog

Status: GREEN implemented; verification commands not run (per instruction). No production
verification claims.

Owner: workflow-install owner (Task 4), Personal domain, workspace
`/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule`.
Inputs read: AGENTS.md, SRS D4/VER-4, PRD REQ-8/REQ-9, plan Task 4, Task 3/5 briefs, actual
`WorkflowSyncService`, `SyncService`, `LockfileService`, `OwnershipWriter`, `UninstallService`,
`sync.ts`, `WorkflowIndex`, and existing specs.

## Shared paths (owned; edited in GREEN)

- `cli/src/services/WorkflowSyncService.ts`
- `cli/src/services/SyncService.ts`
- `cli/src/services/LockfileService.ts`
- `cli/src/services/install/UninstallService.ts`
- `cli/src/commands/sync.ts`
- `mcp/src/services/WorkflowIndex.ts`
- `mcp/src/tools/index.ts` — workflow list/get portions only, after Task 3 settlement
- `scripts/generate-indices.ts` — complete local acquisition wiring after Task 5 settlement

Ownership notes:

- Task 3 settled `mcp/src/tools/index.ts` delivery/reasoning/cost paths; only `listWorkflows` and
  `getWorkflow` were changed here. No delivery/cost code touched.
- Task 5 settled the `sync.ts` legacy Copilot-residue warning; it is preserved in `printSummary`.
- `cli/src/capabilities/agentCapabilities.ts` (Task 5-owned) was read-only. Same-path dedupe uses
  the current `workflowPath` values (Antigravity and Kiro both `.agents/workflows`).

## Settled sources (GREEN)

- `cli/src/services/LockfileService.ts` — `SHARED_WORKFLOW_AGENT`, versioned `workflowCatalog`
  schema, strict catalog validation (version, names, canonical/native path bounds, 64-hex digests,
  duplicate binding paths, binding↔canonical digest agreement), validation on load and before
  publish, same-directory temp-file + rename atomic publication.
- `cli/src/services/WorkflowSyncService.ts` — `WorkflowAcquisition`/`WorkflowWriteResult` contracts,
  `acquireWorkflows` (complete/disabled/incomplete), `assembleWorkflows` delegation, canonical pass
  to `.agents/workflows/<name>.md` under the shared marker, native derivation from the same content,
  same-path single write, binding records with deterministic output digests.
- `cli/src/services/SyncService.ts` — `acquireWorkflows` wrapper, pending write capture,
  `completeInstall.workflowAcquisition`, shared-marker prune handled before per-agent gate,
  incomplete never prunes, catalog built from post-reconciliation actual bytes, verified matching
  bindings only, prior provenance retained only when the actual digest still matches, prior catalog
  retained wholesale on incomplete acquisition, lock published last.
- `cli/src/services/install/UninstallService.ts` — catalog-driven canonical retention: shared body
  survives while an unremoved binding remains, is removed when the last binding is removed, edited
  residue reported via `keepEdited`; `apply` drops removed bindings and entries for removed
  canonical bodies.
- `cli/src/commands/sync.ts` — consumes `acquireWorkflows`, prints each failure, forwards the
  acquisition to finalization, and suppresses the success claim on incomplete acquisition. Task 5's
  legacy Copilot-residue warning in `printSummary` is preserved unchanged.
- `mcp/src/services/WorkflowIndex.ts` — `lookupWorkflow` and `listInstalledWorkflows`: single lock
  snapshot, strict catalog validation, canonical path equal to `.agents/workflows/<name>.md`,
  realpath/symlink containment, one byte read used for both digest and body, native parity from
  actual binding bytes, `local_source` only without a lock, `unverified` for legacy lock, explicit
  `unavailable` diagnostics with no fallback. No network.
- `mcp/src/tools/index.ts` — workflow list/get portions only: `list_workflows` prefers the managed
  catalog; `get_workflow` serves only managed/local-source results and returns explicit unavailable
  guidance when a lock exists. Skill delivery/cost paths untouched.
- `scripts/generate-indices.ts` — declares the local authoring workflow set as a complete
  acquisition so ownership finalization is explicit.

Test cross-check update: the edited-native regression now asserts the settled contract — the
binding is not published when actual bytes differ from the deterministic generated digest (the
manifest entry retains the prior digest). The writer-meta regression now expects the shared marker
for the canonical write and a single Antigravity same-path write.

## Test files (stage 1 regressions)

Concurrent owners also modified `mcp/src/server.ts`, `mcp/src/services/SessionTracker.ts`, CLI
capability/specialist tests, and skill sources; those paths were not edited by Task 4. Shared
`mcp/src/tools/index.ts`, `sync.ts`, and `scripts/generate-indices.ts` were edited only in the
workflow-owned portions after the parent authorized settlement.

- `cli/src/services/__tests__/WorkflowCatalogInstall.spec.ts` (new, real temp consumer + real
  `SyncService`/`OwnershipWriter`/lock writer)
- `cli/src/services/__tests__/WorkflowAcquisition.spec.ts` (new, acquisition status contract)
- `cli/src/services/__tests__/LockfileService.spec.ts` (appended `workflowCatalog` validation)
- `cli/src/services/install/__tests__/UninstallService.spec.ts` (appended shared-body lifecycle,
  installs through the real sync writer)
- `cli/src/commands/__tests__/SyncCommand.spec.ts` (appended acquisition-result output behavior;
  mock now exposes `acquireWorkflows` and retains `assembleWorkflows` so pre-GREEN tests still run)
- `mcp/test/WorkflowIndex.spec.ts` (appended managed-catalog lookup regressions against real temp
  install bytes and lock snapshots)
- `.agent/sdd/provider-neutral-delegation/task-4-report.md` (this report)

## Interfaces the GREEN stage must implement (tests pin these)

`WorkflowSyncService`:

```ts
export type WorkflowAcquisitionStatus = 'complete' | 'disabled' | 'incomplete';
export interface WorkflowAcquisition {
  status: WorkflowAcquisitionStatus;
  workflows: CollectedSkill[];
  failures: { path: string; reason: string }[];
}
acquireWorkflows(config, ref?, verifier?): Promise<WorkflowAcquisition>
```

- `disabled`: `workflows === false` or a deliberate empty array; no network discovery.
- `incomplete`: discovery failure, download failure, or verifier/integrity rejection.
- `complete`: discovery succeeded, including a legitimately empty registry or a selected workflow
  that no longer exists in the tree (authorizes owned prune of that workflow).
- Keep `assembleWorkflows` for existing callers and tests, but the sync command must use the
  acquisition result.

`SyncService`:

- `completeInstall` run input gains optional `workflowAcquisition?: WorkflowAcquisition`.
  Incomplete acquisition must suppress workflow pruning and retain prior lock/catalog provenance;
  `complete`/`disabled` may prune; omitted acquisition keeps the existing derive-from-array behavior.
- `writeWorkflows` installs each selected canonical body once at `.agents/workflows/<name>.md`
  through the supplied `InstallWriter`, then derives native exports from the same collected content.
  Canonical ownership entry uses a reserved shared marker (not an `Agent` value) that
  `completeInstall` handles before the per-agent prune check. Antigravity/Kiro native target is the
  canonical path: one write, one entry, one catalog binding.
- Lock `workflowCatalog` (version 1) is published last with the lock. Per workflow:
  `path`, `digest` (raw canonical bytes), `registry`, `requestedRef`, `resolvedCommit`,
  `nativeBindings[] { agent, path, outputDigest, canonicalDigest }`.
  `outputDigest` is the digest of the deterministic generated export, so a user-edited native file
  is detectable by comparing on-disk bytes. Edited/unowned/overridden canonical bytes produce no
  catalog entry (conflict, never certified). Incomplete acquisition retains the prior catalog entry
  unchanged.

`LockfileService`:

- `SkillsLockFile.workflowCatalog?: WorkflowCatalog` (versioned, optional).
- `WorkflowCatalog`, `WorkflowCatalogWorkflow`, `WorkflowCatalogBinding` exported types.
- `write` validates before publication: supported version, 64-hex digests, bounded relative
  canonical/native paths (no traversal/absolute), unique native output bindings. A rejected write
  leaves the previous lock bytes untouched.
- `load` rejects malformed/unsupported `workflowCatalog` explicitly (no silent legacy downgrade).

`UninstallService`:

- Canonical body is not an `Agent`-owned entry. Partial uninstall removes only selected agents'
  native bindings; the catalog entry and canonical body survive while another configured agent
  binding remains. When no configured surviving binding remains, the canonical body and catalog
  entry are removed. Full uninstall keeps and reports an edited canonical body in `keepEdited`
  (disclosed residue) while deleting the lock. Catalog bindings for removed agents are dropped.

`mcp/src/services/WorkflowIndex.ts`:

```ts
export type WorkflowLookupStatus =
  | 'managed' | 'local_source' | 'unverified' | 'unavailable';
export interface WorkflowLookupResult {
  status: WorkflowLookupStatus;
  name: string;
  source?: 'local_source';
  description?: string;
  body?: string;      // frontmatter-stripped, trimmed; only when verified
  digest?: string;    // sha256 of the raw canonical bytes
  nativeParity: boolean;
  parityIssues: string[];
  reason?: string;
}
lookupWorkflow(projectRoot, name): Promise<WorkflowLookupResult>
```

- Reads one lock snapshot; no network. Validates catalog name/schema/path/digest/duplicate and
  realpath/symlink containment under the project root before use.
- `managed`: canonical bytes verified against the catalog digest; body returned from those verified
  bytes; `nativeParity` true only when every listed binding's on-disk bytes match `outputDigest`
  (and `canonicalDigest` matches the catalog entry).
- `local_source`: no lock file; authored `.agents/workflows` readable with computed digest and
  `nativeParity: false`.
- `unverified`: present lock without catalog metadata; no body, sync required.
- `unavailable`: missing/mismatched canonical bytes, unlisted residue, malformed/unsupported
  metadata, duplicate bindings, traversal/symlink escape, or invalid lookup name. Never falls back
  to local or native content.

## Regression cases mapped to tests

`WorkflowCatalogInstall.spec.ts` (real temp project, real sync writers):

1. Provider-only install: canonical body written once; catalog path/digest/registry/ref/commit;
   native binding `outputDigest` and `canonicalDigest` agreement with actual bytes.
2. Antigravity+Kiro same path: single canonical/native write and one binding path.
3. Removed workflow: owned canonical and native outputs pruned, catalog/manifest entries dropped.
4. Deliberate empty selection: owned workflows pruned.
5. Incomplete acquisition: no prune, prior manifest entry and prior catalog entry retained.
6. Edited canonical: kept, catalog entry omitted, prior ownership digest retained (no new revision).
7. Edited native: kept; binding not published because actual bytes differ from the deterministic
   generated digest; manifest entry retains the prior digest.
8. Unowned authored canonical: preserved, `unknown`, no catalog entry; native still written.
9. Custom override at canonical path: preserved, no catalog entry.
10. Removed agent: codex native pruned, shared canonical retained, catalog binding dropped.

`WorkflowAcquisition.spec.ts`: disabled false/empty, discovery failure, partial download, verifier
integrity rejection, complete empty registry, complete removal of a selected workflow.

`LockfileService.spec.ts`: catalog round-trip; load rejects malformed catalog; write rejects
unsupported version, traversal, absolute path, bad digest, duplicate native bindings, preserving
the previous lock bytes.

`UninstallService.spec.ts` (installed via real sync): partial uninstall keeps canonical for the
surviving binding and drops the removed binding; last-binding removal deletes canonical and catalog
entry; full uninstall preserves and reports an edited canonical body.

`SyncCommand.spec.ts`: incomplete acquisition output names the failed path/reason and never prints
success; the acquisition object reaches finalization. Byte-level retention is covered by
`WorkflowCatalogInstall`, not by the command-level mock.

`WorkflowIndex.spec.ts`: managed verified body/digest/parity; edited native → no parity claim;
changed/missing canonical → unavailable; unlisted residue unavailable; no lock → local_source;
legacy lock → unverified; malformed catalog → unavailable (no local fallback); traversal path;
symlink escape; duplicate bindings; traversal lookup name.

## Final corrective round (5 findings; checks not rerun)

1. **Shared provider binding loss** — `writeWorkflows` still writes each physical
   path once but records a binding for every aliased provider. Catalog validation now
   allows multiple agents on one path only when `outputDigest`/`canonicalDigest`
   agree; same-agent duplicate pairs and conflicting digests are rejected. Uninstall
   retention now sees the surviving provider and keeps the canonical body. Regression:
   Antigravity+Kiro install → remove Antigravity → body + Kiro binding survive.
2. **False mixed parity** — catalog entries carry `nativeConflicts` for expected
   native exports whose actual bytes do not match the deterministic output digest.
   MCP adds those paths to `parityIssues` and requires zero conflicts for
   `nativeParity`. Regression: Claude edited + Codex verified → catalog has Codex
   binding plus Claude conflict; MCP parity false.
3. **Disclosure atomicity** — `writeDisclosed` now validates the catalog and publishes
   through the same temp-file+rename helper as `write`. Regression: read-only
   directory failure leaves the previous lock bytes intact; normal disclosure
   preserves the catalog. (The earlier symlink-delete finding was withdrawn; no
   redundant guards were added.)
4. **Duplicate JSON keys** — CLI `readJsonStrict` and the MCP single-snapshot reader
   parse with the existing `js-yaml` core parser first (which rejects duplicate
   mapping keys), then use strict `JSON.parse`. Regression: raw duplicate `dev-fix`
   keys are rejected/unavailable. No second catalog or new custom JSON parser.
5. **Enclosing lock version/shape** — MCP validates the lock root object and version
   before catalog use: v1 → `unverified`, any other non-2 version → `unavailable`
   even with a valid catalog; managed listing is refused. Regression: version 999
   with a valid catalog is unavailable.

## Gate corrections (fixture/wiring; checks not rerun)

- `WorkflowCatalogInstall.spec.ts` fixture now invokes `syncService.completeInstall(...)` directly;
  the earlier local function extraction lost `this` (10 crashes before assertions). No production
  `this` shim added.
- Deleted the incidental `assembleWorkflows` unsupported-type wiring test in
  `WorkflowSyncService.spec.ts` (it asserted a `downloadFilesConcurrent([])` call; a complete empty
  discovery correctly makes no download call). Not repinned, production unchanged.

## Residual uninstall gap (ownership transferred; not edited here)

Review found `nativeConflicts` is not integrated into uninstall retention/apply:

- retention reasons only over `nativeBindings`; a surviving provider whose export is a conflict
  has no binding, so canonical removal can be planned while an edited provider survives;
- `apply` filters bindings by removed agents but leaves `nativeConflicts` for removed agents,
  preserving a stale conflict and false-parity signal.

Ownership of `cli/src/services/install/UninstallService.ts` and
`cli/src/services/install/__tests__/UninstallService.spec.ts` was transferred to
Personal Delivery agent `25b891a2-b177-4dba-a44b-9c08115ef5aa`. Task 4 did not edit or retry those
files after transfer. The four other corrective fixes remain in place.

## Parent gate handoff (tests-ready; checks not run)

Exact production files delivered:

- `cli/src/services/LockfileService.ts`
- `cli/src/services/WorkflowSyncService.ts`
- `cli/src/services/SyncService.ts`
- `cli/src/services/install/UninstallService.ts`
- `cli/src/commands/sync.ts` (Task 5 legacy Copilot-residue note preserved at `printSummary`)
- `mcp/src/services/WorkflowIndex.ts`
- `mcp/src/tools/index.ts` (workflow list/get only)
- `scripts/generate-indices.ts` (complete local acquisition wiring)

Exact test files:

- `cli/src/services/__tests__/WorkflowCatalogInstall.spec.ts`
- `cli/src/services/__tests__/WorkflowAcquisition.spec.ts`
- `cli/src/services/__tests__/LockfileService.spec.ts`
- `cli/src/services/__tests__/WorkflowSyncService.spec.ts` (writer-meta contract updated)
- `cli/src/services/__tests__/SyncInstallLifecycle.spec.ts` (unchanged guard)
- `cli/src/services/install/__tests__/UninstallService.spec.ts`
- `cli/src/commands/__tests__/SyncCommand.spec.ts`
- `mcp/test/WorkflowIndex.spec.ts`
- `mcp/test/Tools.spec.ts` (unchanged integration guard)

Full catalog gate command for the parent (not run here):

```bash
rtk pnpm --filter ./cli test \
  src/services/__tests__/WorkflowCatalogInstall.spec.ts \
  src/services/__tests__/WorkflowAcquisition.spec.ts \
  src/services/__tests__/LockfileService.spec.ts \
  src/services/__tests__/WorkflowSyncService.spec.ts \
  src/services/__tests__/SyncInstallLifecycle.spec.ts \
  src/services/install/__tests__/UninstallService.spec.ts \
  src/commands/__tests__/SyncCommand.spec.ts
rtk pnpm --filter ./mcp test test/WorkflowIndex.spec.ts test/Tools.spec.ts
```

## Verification commands (not run; for the integration owner)

Focused suites that exercise the real temp consumer/writer path:

```bash
rtk pnpm --filter ./cli test \
  src/services/__tests__/WorkflowCatalogInstall.spec.ts \
  src/services/__tests__/WorkflowAcquisition.spec.ts \
  src/services/__tests__/LockfileService.spec.ts \
  src/services/__tests__/SyncInstallLifecycle.spec.ts \
  src/services/__tests__/WorkflowSyncService.spec.ts \
  src/services/install/__tests__/UninstallService.spec.ts \
  src/commands/__tests__/SyncCommand.spec.ts
rtk pnpm --filter ./mcp test test/WorkflowIndex.spec.ts test/Tools.spec.ts
```

Real temp-consumer smoke (CLI, after build): create a temp project with a `.skillsrc` pointing at a
local registry checkout, run `node <repo>/cli/dist/index.js sync --yes` in that temp directory, then
assert:

```bash
test -f .agents/workflows/dev-fix.md
node -e "const l=require('./.skills-lock.json');const e=l.workflowCatalog.workflows['dev-fix'];if(!e||!e.digest||!e.nativeBindings.length)process.exit(1)"
```

Then change the native export bytes and confirm MCP `get_workflow` reports the managed entry with
no native-parity claim; corrupt the canonical bytes and confirm explicit unavailable (no fallback).
No command above was executed in this stage.

## Open decisions / risks for the orchestrator

1. Duplicate raw JSON keys are rejected before ordinary parsing via the existing `js-yaml`
   core parser, with a thin CLI/MCP wrapper each (no new custom JSON parser, no second catalog).
   Aliased providers may share one native path only when digests agree; conflicting aliases are
   rejected.
2. Conflict policy is implemented as settled: edited/unowned/overridden canonical bytes produce no
   managed catalog entry; expected-but-unverified native exports are recorded in `nativeConflicts`
   so cohort parity is denied.
3. Verified bindings are published only when the on-disk bytes match the deterministic generated
   output digest; an edited export is a recorded conflict, never aligned.
4. Complete-vs-incomplete for a selected workflow absent from a fully fetched tree is `complete`
   (enables owned prune). A network/download/integrity failure is `incomplete`.
5. Interrupted publication uses validate-before-publish plus same-directory rename for both `write`
   and `writeDisclosed`; crash injection is not covered.
6. `SyncCommand` incomplete output uses stderr for the diagnosis and keeps the summary on stdout;
   only the absence of the success claim and presence of path/reason are contractual.
7. The catalog field is omitted when no workflows were ever configured and no prior catalog exists,
   so skills-only consumers keep `local_source`/legacy semantics until they sync workflows.

