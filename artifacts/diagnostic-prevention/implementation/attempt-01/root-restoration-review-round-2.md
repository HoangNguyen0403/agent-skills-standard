# R0 exact restoration operator — independent corrective review round 2

## Revision-bound decisions

- **Spec compliance: CHANGES REQUESTED.** Most A–E corrections and immediate permission-drift refusal are present. Two remaining failure-lifetime findings below prevent accepting the complete truthful-effects/cleanup contract.
- **Quality/security: CHANGES REQUESTED.** No broader architecture or authority change is needed; the remaining issues are concrete exception paths in the one-off operator.
- **Independent source approval for parent live dry-run/apply: NOT GRANTED for this revision.** No restoration/quarantine, R1 release, generation, root completion, or additional corrective attempt is authorized by this report.

Bound to parent-reported SHA-256 **b251a45abc4d32c237c1f3e9a428bbf6db43a6b0fed42efc93e913f53d1bfb73**, current `restore-interrupted-root.mjs` read snapshot `040F`, 1799 lines. Read the full current operator, report correction appendix, prior review, and retained R0 contracts. Parent reports `node --check` exit 0 only; **syntax PASS is not evaluation or operational verification**. No dry-run/apply or current-root effects were executed by this reviewer or supplied as evidence.

The latest parent root state remains 15 candidate / 80 before / absent ledger, with the retained exact payload unquarantined. R1 is unreleased. Only this new review report was written; no source edits, commands, tests, probes, delegation, model/config/permission changes, or premium calls were performed.

## Specific journal-failure question — accumulation is not suppression here

The new `recordJournal` does catch and append journal failures (`1159-1164`), but its callers do not silently succeed:

1. `restoreOne` records the already-completed rename in `state.effects` before awaiting journal persistence (`1245-1256`). It then performs only cleanup/readback/evidence work and throws accumulated failures at `1329`.
2. `applyPlan` awaits each restoration sequentially (`1578-1583`). A thrown journal failure stops that loop **before the next restoration or quarantine root effect**.
3. `quarantineTemp` assigns the renamed effect before journaling (`1378-1391`), checks the resulting state, and throws accumulated failures at `1465`. It performs no subsequent root restoration after a journal failure.
4. `finalVerification` throws its journal failures at `1575`. `execute` sets `APPLIED_AND_VERIFIED` only after `applyPlan` returns (`1701-1702`).

Therefore I do **not** find a success-with-failed-journal or continue-next-root-write defect merely from the accumulation helper. Continuing readback/cleanup of the already recorded effect is appropriate. Byte verification can be true while journal persistence failed; the overall status still fails. This is a source analysis, not an executed fault-injection result.

## Complete remaining consequential findings

### R0-R2-A — Major: a throwing claim-release inspection still discards the known-effect outcome

**Locations:** `releaseClaim:462-464`; `execute finally:1714-1728`; outer catch `1787-1794`.

`releaseClaim` is described/used as returning a failure code, but its initial `await lstatOrNull(claim.path)` is outside any catch. `lstatOrNull` rethrows non-ENOENT errors (`144-150`). `execute` awaits release without a protecting catch. An EACCES/EIO inspection failure thus escapes the finally block, skips journal close and receipt publication, and sends control to `main`'s generic catch. That catch prints `status: REFUSED` without the invocation's restoration/quarantine state.

**Concrete counterexample:** all 15 restores and quarantine have completed and invocation state accurately records them; claim inspection during release returns EIO. The operator emits a bare refusal rather than its actual applied/verified counts. This reintroduces the original R0-A diagnostic failure through a teardown path, despite the corrected immediate effect tracking and receipt-write catch.

**Minimal correction:** make claim release total with respect to expected filesystem errors, or catch any release exception at the finally call and convert it into `state.claimReleaseError`. Independently continue journal close and stateful receipt/summary handling even if release fails. Preserve the primary outcome and actual effects; return nonzero and retain the unreleased/unknown claim rather than deleting it without proof. Do not let any post-effect cleanup exception escape into a state-free outer refusal.

### R0-R2-B — Major: private acquisition/cleanup still has unreported or error-replacing aftermath

This is the remaining portion of prior R0-D, not a request for a general cleanup framework.

**a. Restoration private leaf can be created before its cleanup identity is known.** At `1219` the root-side temporary is successfully opened with `wx`, but identity is obtained through a separate path `lstat` at `1220-1224`. If that stat fails, the catch retains the primary error and closes the handle; `tempIdentity` stays null, so cleanup at `1285` is skipped. The operator leaves its newly created `.ags-restore-<pid>-<hex>` leaf in the active source tree without recording that retained path in the state/error. Unlike the corrected claim acquisition, it does not report the unknown-identity retained resource.

**Minimal correction:** derive the lease from the opened handle (`handle.stat`) as early as possible. If identity cannot be established, retain the leaf safely but report its exact path and unknown cleanup state; do not blindly unlink it. Cover all post-create paths, including stat failure, with truthful retained-resource accounting.

**b. Cleanup helpers can throw before their intended failure-return contract.** `removeOwnedTemp` (`1119-1120`) and `discardOwnedDirectory` (`1168-1169`) call `lstatOrNull` outside their catches. Their caller awaits at `1286` and `1454` also have no catch. An inspection error replaces the already accumulated primary/journal/cleanup errors and bypasses `combineFailures`. Similarly, `discardOwnedClaim` can accumulate a close error and then throw at its `lstat` (`442`); acquisition's outer catch replaces the accumulated list with only a generic cleanup error (`405-408`). Those branches violate the explicit requirement to retain primary and secondary cleanup failures together.

**Minimal correction:** convert each helper's filesystem inspection exceptions into its existing error-return/list representation, or catch and append them at the exact call sites. Preserve all failures already collected. This can stay local to the current small helpers; no new abstraction is necessary.

**c. New archive-copy handle-close failure is explicitly swallowed.** `materializeCandidateArchive:727-735` catches a second close failure at `731-733` and discards it while reporting only the original copy error. This is another surviving “primary failure stays authoritative” suppression in a newly introduced private resource path.

**Minimal correction:** preserve the original copy failure and append the close failure plus retained copy/handle state, as the revised restoration cleanup intends. Keep the partial exclusive artifact for evidence; do not delete unknown or foreign files. This path has no root restoration yet, but its cleanup error must still be surfaced rather than falsely implying complete resource handling.

All three cases are statically demonstrated error branches, not claimed observed failures. Together they leave the released acquisition-aftermath/cleanup-reporting acceptance criterion incomplete.

## Prior findings and permission-drift dispositions

| Prior finding | Corrective disposition |
|---|---|
| **R0-A: effects recorded only after full function success** | **Core correction addressed; teardown escape remains R0-R2-A.** Restore effect is inserted immediately after rename (`1245-1255`); quarantine state likewise (`1378-1390`); verified flags are separate. Partial status includes either effect class (`1708-1713`). Receipt write is caught with state retained (`1740-1748`), and the normal summary includes applied/verified counts and quarantine. |
| **R0-B: consumed JSON not bound to pin** | **Addressed in source.** `verifyPins` returns verified byte buffers (`547-577`); preflight parses those same buffers (`1042-1061`). Candidate tar queries consume the verified exclusive private archive copy (`717-745`) rather than re-reading the original archive path. The copy-close diagnostic gap is listed above, not an authority-binding regression. |
| **R0-C: topology gaps** | **Addressed at the specified read/effect/final boundaries.** Pinned and metadata inputs get fresh ancestor checks (`528,552`); quarantine checks both chains before mkdir/move (`1344-1373`) and verifies created container identity/mode afterward (`1408-1419`). Final verification checks all 95 destination ancestors (`1494-1504`) and the quarantine chain/container identity (`1528-1553`). Exact payload inode/type/sole-child/hash checks remain. |
| **R0-D: claim/private cleanup lifetime** | **Partially addressed; R0-R2-A/B remain.** Claim now opens exclusively, learns handle identity, writes/syncs/closes under cleanup (`367-458`); regular leaf identity and bytes are checked on release (`462-484`). Restoration close/unlink failures are normally accumulated. The unhandled inspection branches, untracked root-temp stat failure, and swallowed archive-copy close failure are the remaining gaps, not a reason to sweep foreign resources. |
| **R0-E: invalid config conflated with absence** | **Addressed in source.** Absent-BASE config requires missing index/worktree, with only `MISSING` accepted (`979-989`); tracked config retains BASE blob/index conditions (`950-975`). Final conditions distinguish missing/invalid/present and compare tracked mode as well as digest (`1468-1489`). |
| **Immediate permission drift** | **Addressed in source.** Last-look mode must equal the captured current destination mode before rename (`1241-1243`); copy chmod and final mode verification remain. No older mode is silently reapplied after an intervening chmod. |

## Retained bounded scope

Default mode still avoids `applyPlan`; explicit `--apply` is required. Argument parsing, fresh artifact confinement, exclusive claim/evidence outputs, pinned workspace/BASE/audit/proof/archive identities, 96-record exact audit shape, all 95 before-images and 15/80 current-state preconditions remain. The operator does not use the staged lock as active authority, copy a ledger, depend on surviving /tmp stage data, run generators, change Git/index/config, mutate metadata/other 80 targets, wildcard-clean temporary files, or automatically roll back known effects.

Git inspection remains batched/read-only with full raw index identity compared at the end and unrelated staged entries preserved. The existing 0700 exact whole-directory quarantine remains a user-approved one-off disposition of currently observed inode/content evidence, not a retroactive authenticated lease. No generic resume/force interface or production/R1 edit was added.

The remaining findings concern concrete error contracts, not operator line count or style. Most of the prescribed correction is sound; fixing the few fallible cleanup boundaries must not broaden authority, weaken refusals, or restore swallowed-error behavior.

## Evidence, authority, and next decision

Parent syntax-only exit 0 for the b251 revision is the only supplied execution evidence. No current dry-run, restoration, quarantine, fault injection, or R1 behavior is inferred. The preserved prior source and reports remain static historical evidence, not executed RED. Prior 55 generator/1282 CLI results do not qualify this operator. No Node 20, host enforcement, root completion, or release claim is made.

The single corrective allowance is consumed. This report provides technical findings only; parent must resolve any further eligible route/explicit exception under the established policy. It is not another implementation assignment, retry grant, human approval, or live execution authorization. Preserve source/evidence and current root state until that decision and a revision-bound qualified review.

Refreshed JavaScript/common standards and audited consultation; retained security, exclusive-claim-lifetime and CLI boundary guidance. Session telemetry was requested; exact host tokens/pricing remain unavailable. This report is the sole authorized write.

**FINAL — scoped spec and quality/security CHANGES REQUESTED for b251…fb73; no R0 dry-run/apply source clearance and no R1 release. Reviewer frozen.**
