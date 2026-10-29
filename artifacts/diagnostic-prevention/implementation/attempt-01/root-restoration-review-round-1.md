# R0 exact interrupted-root restoration — independent review round 1

## Scoped verdict and revision

- **Spec compliance: CHANGES REQUESTED.** The bounded happy-path restoration exists, but authority-byte binding, config/topology refusal, failure effect reporting, and cleanup lifetime are incomplete.
- **Quality/security: CHANGES REQUESTED.** Five consequential findings are batched below with bounded corrections. No general recovery framework or production redesign is requested.
- **Operator source-review prerequisite for parent live dry-run/apply: NOT SATISFIED by this revision.** No dry-run/apply or R1 release is authorized by this review. Existing explicit user recovery approval remains intact but does not waive these implementation defects.

Reviewed the complete 1422-line `restore-interrupted-root.mjs` (`read` snapshot `00DD`), full R0/review briefs, owner freeze report, checkpoints 11/12, and actual pinned audit/proof/archive-manifest schema excerpts. Parent binds this frozen revision to SHA-256 **7022e9d3546dd32654d3c14e69480a907673cd91e2fec716abe7d0f6f9fb0c28** (message `4812bbb7-9cdf-4c4d-82f5-bcb716c7edff`). This reviewer did not execute a checksum command.

Parent reports `rtk proxy node --check` exited 0 for that operator. This is **syntax-only**, not evaluation, dry-run, root effect, permission test, cleanup test, or restoration evidence. No dry-run/apply has been reported and R1 remains unreleased.

This report is the only new file written by the reviewer. No commands, tests, probes, source edits, root writes, delegation, model/permission/config changes or premium calls were performed. Source approval and current-root authority are not inferred from earlier generator 55/CLI 1282 results.

## Complete consequential findings

### R0-A — Major: successful renames can still be reported as zero-effect APPLY_REFUSED

**Locations:** `restoreOne:1031-1042,1068-1093`; `applyPlan:1225-1231`; `quarantineTemp:1124-1158`; `execute:1343-1350`; receipt/summary `1289-1291,1401-1403`; receipt-write fallback `1377,1410-1418`.

`restoreOne` sets a local `renamed` flag and awaits journal persistence and readback, but `state.effects` is updated only after the entire function returns successfully. If the **first** destination rename succeeds and its journal write, readback, or mode verification fails, `state.effects` remains empty. `execute` selects `APPLY_REFUSED`, the receipt lists no restoration effects, and the summary says `appliedRestores: 0`, despite an actual root replacement. A successful journal line may be the only evidence of that rename; if the journal write itself fails, even that line is unavailable.

Quarantine has the same pattern: the whole directory is moved before the journal/readback, while `state.quarantine` is assigned only when the function returns. A later failure can hide the successful move from the receipt/summary. Separately, if the final receipt write throws after root effects, `main` emits generic `status: REFUSED` without retained effect state.

**Concrete failure:** destination rename succeeds; post-rename `digestFile` fails with an I/O error. The current caller never pushes an effect, and reports a no-effect refusal. This is not merely a durability limitation or a cross-file atomicity concern; the in-process state already knows the rename happened but discards that fact at the API boundary.

**Smallest correction:** insert an effect record into invocation state synchronously/immediately after each successful rename, before any awaited journal/readback operation; track verified status separately. Do the same for quarantine. Derive partial-failure status/counts from those actual effects, including quarantine, not only successfully completed restorations. Keep a failure summary carrying this state if receipt publication fails; never fall back to an unqualified no-effect `REFUSED` after known effects. Preserve the journal, no automatic rollback, and separate applied/verified reporting.

### R0-B — Major: parsed authority JSON is not the pinned byte sequence that was verified

**Locations:** `verifyPins:451-473`; `readJson:438-448`; `preflight:894-906`; archive consumption `602-640`.

`verifyPins` hashes the pinned audit and publication-before proof, discards their verified buffers, then `preflight` separately reopens/parses those paths with `readJson`. The returned `info.sha256` from these consumed reads is never compared with the corresponding pin. Shape checks and the audit's embedded proof-hash string do not bind the newly consumed records to the actual pinned bytes.

**Concrete interleaving:** after the first pin read but before the second read, an evidence writer/replacement changes a validly shaped proof or audit. The operator can build its restore path/digest map from the unpinned second read while reporting `pinned-input-identities` as passed. This does not require a byte-level race inside an atomic filesystem syscall; the two separate reads are explicit phase boundaries. The cooperative/non-hostile-writer disclaimer is not a substitute for checking the bytes used as authority.

**Smallest correction:** parse the same immutable buffers returned by the successful pinned read, or compare each consumed `readJson.info.sha256` to the hard-coded pin before parsing/using it. Keep the resulting plan bounded to that verified snapshot. For archives consumed later through `tar`, retain/re-establish their pinned identity at the consumption boundary or consume a verified private snapshot, rather than relying only on a discarded earlier read. No stage-lock authority, expanded target set, live-stage dependency, or new configurable trust root is needed.

### R0-C — Major: fresh no-symlink topology checks do not cover quarantine and final success

**Locations:** pinned input reads `451-458`; cached topology helper `187-206`; retained-temp preflight `930-931`; `quarantineTemp:1096-1124`; `finalVerification:1164-1172,1201-1206`.

Restoration correctly calls `assertAncestorDirs(..., false)` immediately before replacing each target. Quarantine does not: `inspectTemp` lstats the final directory/payload but follows any symlink in their ancestors. Its only ancestor check is earlier cached preflight. The quarantine destination's artifact ancestors likewise are not freshly checked immediately before its mkdir/move. Final verification hashes all 95 leaves without checking their parent topology. Pinned inputs are also hashed without applying the existing ancestor checker to those input paths.

**Concrete interleaving:** after preflight, the retained temporary's parent is moved and replaced with a symlink pointing to that same directory tree. `inspectTemp` still sees exactly the pinned directory/payload inode and bytes through the alias, and the operator moves it despite the forbidden symlink-parent condition. A matching-byte symlinked parent for one of the untouched 80 can also satisfy final digest checks and produce final success despite invalid topology. These are missing checks at explicit phases, not a demand for hostile-writer-atomic path operations.

**Smallest correction:** use the existing fresh ancestor checks for every pinned input when read, both quarantine source/destination chains immediately before effects, and all 95 final destination paths plus the final quarantine chain. Verify the quarantine container is the created regular directory with the required mode/identity when used. Retain the exact temp inode/type/sole-child/digest checks and no-wildcard whole-directory quarantine. Do not globally disable caching or introduce a filesystem abstraction framework; add the missing bounded checks where topology is load-bearing.

### R0-D — Major: claim acquisition and private-temp cleanup failures can be orphaned or hidden

**Locations:** `acquireClaim:362-379`; assignment/finally `1330-1353`; claim release `383-395`; restoration close/cleanup `1045-1065`.

`acquireClaim` performs `writeFile(..., wx)` and returns its ownership token only after the full write succeeds. A create-then-partial-write failure (for example ENOSPC) can leave the claim on disk while the caller's `claim` is still null; its finally does not release or report the owned partial claim. The next operator invocation refuses `CLAIM_HELD` until manual intervention. Acquiring exclusively is necessary but does not by itself cover acquisition aftermath.

Private restoration cleanup has a distinct error-loss bug: `removeOwnedTemp` failure is promoted only when there is no primary failure (`1060`), and handle-close failure is likewise discarded when one already exists (`1049`). A candidate-drift refusal plus temp-unlink failure therefore reports only the first error while silently retaining a private file. The R0 contract explicitly requires cleanup errors to surface.

Claim release compares bytes but does not retain/check the created claim's filesystem identity/type. The bounded ownership contract should not unlink a substituted leaf merely because its bytes happen to match.

**Smallest correction:** establish an owned handle/identity immediately after exclusive claim creation and cover its writing/closing aftermath with cleanup, including partial-write failure; release only the demonstrably created claim, reporting any retained path/error. Preserve byte checks and add the created regular leaf's identity/type check. Always append/retain restoration close/unlink failures alongside a primary error instead of suppressing them. No claim sweeping, automatic foreign cleanup, or retry is authorized.

### R0-E — Major: absent-BASE config conflates missing with symlink/nonregular/oversize and weakens original config conditions

**Locations:** `captureConfigConditions:803-840`; `finalVerification:1193-1199`; digest result taxonomy `153-166`.

For an absent-BASE configuration, any `digestFile` failure becomes `sha256: null`, including `SYMLINK`, `NOT_REGULAR`, and `TOO_LARGE`, not just `MISSING`. Final verification repeats the same collapse. An absent config replaced by a dangling symlink/directory can therefore be accepted as unchanged absence. The branch also accepts a newly present untracked regular config by hashing it, although the brief requires retaining the original BASE/config conditions and the original adoption proof's absent-BASE condition did not permit introducing that config. The owner report documents this alternative behavior but does not supply authority to broaden the condition.

**Smallest correction:** distinguish absence from every invalid/unreadable result and refuse the latter. Under the released original BASE/config condition, an absent-BASE config must remain absent in both index and worktree; a tracked one must retain its regular BASE-identical index/blob condition. If a different current config state is genuinely required, return that exact fact for a parent decision rather than silently accepting it. Final comparison must preserve this full presence/type condition, not a nullable digest that aliases invalid filesystem objects. Do not modify or reset config/index state.

## Other obligations and design assessment

- **Dry-run/argument boundary:** default execution does not call `applyPlan`; only explicit `--apply` does. Unknown flags refuse, output must be a fresh exclusive directory under A with an existing safe parent, and receipts/journal use exclusive creation. No root/force/resume API was added. Claim acquisition still needs R0-D's failure treatment even in dry-run.
- **Exact scope:** the pinned audit/proof shape checks require 96 unique matching paths, 15 candidate/80 original-before/1 absent ledger. All 95 archived before-images are checked, candidate archive membership/digests are checked, and raw staged lock bytes are not read as authority. R0-B must bind the consumed plan records to those actual pins.
- **Restoration happy path:** only the 15 audit-selected candidates are passed to restore; exact before-image bytes are reread/hashed, copied through an exclusive private leaf, chmodded to the captured current permission bits, synced, renamed and read back. The code does not write the other 80 or the ledger. As part of the immediate pre-rename drift check, retain/refuse permission-mode drift too rather than silently restoring an earlier mode if the user's chmod changed during preparation.
- **Git:** fresh read-only batched root/HEAD/index/tree queries validate BASE-identical regular index entries for the 15 targets and the absent indexed ledger. Full raw listing plus HEAD identity is compared at the end; unrelated staged rows are not reset/staged/updated. No per-target Git process loop was introduced. R0-E must retain the config side of the same scope.
- **Quarantine:** the fixed path/dev/inode/mode/sole-payload/digest checks are explicit and are correctly described as current observed evidence, not a retroactive authenticated lease. Quarantine is whole-directory and exclusive, not deletion. R0-A/C must close effect recording/topology around that move.
- **Complexity:** no finding is based on 1422 lines alone. The consequential maintainability issue is duplicated local-versus-invocation effect state and authority reads separated from verified bytes. The bounded fixes above can reuse the existing phase helpers and state; another pipeline/framework or production rewrite is unnecessary.
- **R1 and SDD:** production performance edits remain unreleased. Parent independently owns SDD verification and any later qualified regeneration/adoption. This operator cannot substitute a restoration receipt for generation completion.

## Evidence and disposition limits

Current root evidence remains parent-reported 15 candidate + 80 before destinations, active ledger absent, retained exact payload untouched. No effect of this proposed operator was exercised by this reviewer or reported by parent beyond syntax checking. None of the failure examples above is fabricated executed output; they are static source-path counterexamples requiring correction before this safety gate can approve.

The existing user decision is a bounded restoration/quarantine → fix → reapply plan, not broad permission for retries, unknown-file overwrite, host-policy changes, release, production edits in R0, Node 20 claims, or an agent-supplied human approval. Prior generator/CLI green and prior static generator approval do not qualify this new operator.

Loaded/refreshed JavaScript and common best-practice rules, retained common security/audit guidance, and consulted exclusive-output-claim-lifetime plus Node CLI boundary-hardening guidance. MCP consultation was audited. Session telemetry was requested; exact host usage/pricing is unavailable.

**Next:** parent resolves one bounded corrective implementation assignment under its existing routing/approval rules, preserves this frozen revision and all prior root evidence, then obtains revision-bound independent review before the operator's live dry-run/apply. This report itself grants no additional writer/retry or execution authority.

**FINAL — R0 scoped spec and quality/security CHANGES REQUESTED; reviewer frozen.**
