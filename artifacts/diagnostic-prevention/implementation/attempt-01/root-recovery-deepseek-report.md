# R0 — interrupted-root restoration operator (Personal - DeepSeek)

Status: `R0 SOURCE FROZEN` — authored, not executed, not syntax-checked, not dry-run.
Phase R1 not started. No root effect of any kind has been performed in R0.

## Authority and environment

- Workspace `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`, branch
  `feat/diagnostic-prevention-improvements`, BASE `52ac482a5b948d9d26df4c3a2617afec74d1cf54`.
- Profile used: `omp/river/deepseek-ai/DeepSeek-V4.1-Flash-1017`, write/low. No substitution,
  no delegation, no permission or configuration change.
- Contract: `root-recovery-deepseek-brief.md` Phase R0 only.
- R0 writes were limited to the two files below. No production/helper/test/docs/metadata/
  installed-output/lock/source-log change; the original checkout was not touched.

## Deliverables

| Path | Role |
| --- | --- |
| `artifacts/diagnostic-prevention/implementation/attempt-01/restore-interrupted-root.mjs` | One-off bounded operator (dry-run default, `--apply` for the single audited restoration). |
| `artifacts/diagnostic-prevention/implementation/attempt-01/root-recovery-deepseek-report.md` | This report (append-only in later phases). |

The operator is deliberately not wired into the CLI, `scripts/generation`, package scripts or
any test suite. It is a single-file Node 26 ESM script executed by the parent.

## What the operator does

Default invocation is a **read-only dry-run**: it hashes and lstats root data, runs four
batched read-only Git queries, and writes only its own fresh evidence directory under
`A/`. `--apply` adds exactly the two already-approved actions:

1. **Restore the 15 audited `PUBLISHED_CANDIDATE` destinations** from the exact
   `publication-before` bytes: exclusive private temp in the destination directory, verify the
   temp digest, re-check candidate digest + regular-file leaf + every ancestor directory
   immediately before the rename, preserve the current destination permission bits, rename,
   record the effect, then verify the restored digest.
2. **Quarantine the single pinned interrupted temporary** by moving the whole inventoried
   directory into a newly created mode-0700 directory under `A/`:
   `root-interrupted-temp-quarantine-01/.ags-tmp-Ati9K9`, then re-verify directory/payload
   device, inode, mode, sole-child name and payload digest at the new path.

The operator never runs the generator, never reads the surviving stage directory, never reads
or writes `.skills-lock.json`, never composes ownership, never resets/updates/stages Git, never
deletes evidence and never rolls back a partially applied restoration.

## Pins verified at runtime (hard-coded, refuse on any drift)

- core helper `scripts/generation/isolated-stage.ts` = `7f2d8e75…968a612`
- core helper test `scripts/generation/isolated-stage.test.ts` = `9c028737…4f9b0e`
- effect audit `A/root-interrupted-effect-audit-01.json` = `6294f5b5…780d7e5`
- publication-before proof = `7918b85b…d82679b`
- adoption proof = `af0cf808…05123690`
- candidate archive `root-interrupted-candidates-01.tar` = `2525bd68…4b0a543b`
- source archive `root-interrupted-source-01.tar` = `762696e0…dcf7aa167`, 2023936 bytes
- pinned interrupted temporary: path, device `16777231`, directory inode `345126518`, mode
  `0700`, sole child `payload` device `16777231`/inode `345126519`/mode `0644`/SHA
  `0e1bad24…430a22`
- physical workspace realpath, `git rev-parse --show-toplevel` realpath, `HEAD == BASE`

## Preflight gates (all before any effect; fixed refusal codes)

Reached state is recorded in `checks[]` of the receipt, including partial checks when a later
gate refuses.

1. `pinned-input-identities` — every pin above matches (hash and, where pinned, byte size).
2. `audit-and-proof-links` — proof has exactly 96 records with unique safe relative paths and
   ledger `sha256: null`; audit has exactly 96 records whose paths equal the proof path set,
   whose `beforeSha256`/`archivedSha256` agree with the proof, whose
   `publicationBeforeProofSha256` equals the pinned proof hash, and whose states are exactly
   `15 PUBLISHED_CANDIDATE / 80 ORIGINAL_BEFORE / 1 LEDGER_UNCHANGED`.
3. `archive-metadata-links` — the two archive metadata JSONs point at the pinned archive hashes,
   96 candidate files, the pinned source byte size, and `baseCommit == BASE`.
4. `candidate-archive-members` — the candidate archive lists exactly 96 unique members equal to
   the audit path set, and 95 member payloads (`tar -xOf`, no extraction to disk) hash to the
   audit `candidateSha256`. The staged lock member is enumerated but its bytes are never read
   and never used as authority.
5. `archived-before-images` — all 95 `publication-before/<path>` images are regular,
   non-symlinked, ancestor-clean and hash to the recorded before digests.
6. `destination-state` — exactly the 96-destination current state: 15 equal their candidate
   digest, 80 equal their before digest, `.skills-lock.json` absent. Any other/missing/
   non-regular/symlinked destination is refused rather than overwritten.
7. `git-preflight` — toplevel is the physical workspace, `HEAD == BASE`, ledger is not in the
   index, each of the 15 targets has exactly one stage-0 regular index entry whose mode and
   object id equal its BASE tree entry; full `git ls-files --stage -z` bytes plus HEAD are
   hashed into `indexIdentity`.
8. `config-conditions` — `.skillsrc` and `.skillsrc.yaml`: when tracked at BASE, the index entry
   must be BASE-identical and the working-tree bytes must equal the BASE blob; when absent at
   BASE, the path must not be in the index and its observed digest/absence is pinned for the
   post-transaction comparison.
9. `interrupted-temp` — exact pinned directory/payload identities as listed above.
10. `quarantine-destination` — `A/root-interrupted-temp-quarantine-01` absent.
11. `attempt-receipt-absent` — the interrupted attempt still has no `receipt.json`.

## Apply effects and truthful journal

- One exclusive claim `A/.restore-interrupted-root.claim` (`wx`, 0600, pid + start + mode + out)
  with an ownership-verified release; a foreign or mismatched claim is preserved and surfaces a
  nonzero exit.
- `journal.jsonl` (`wx`) receives an fsynced line per event, in order:
  `RESTORE_OUTPUT/renamed` (immediately after each rename, before digest verification),
  `RESTORE_OUTPUT/verified` (per path, after restored digest + mode verification),
  `QUARANTINE_TEMP/renamed`, `QUARANTINE_TEMP/verified`, `FINAL_VERIFICATION/verified`.
- Failure mode: partial journal retained, no automatic rollback, status
  `APPLY_FAILED_PARTIAL_JOURNAL_RETAINED` (effects exist) or `APPLY_REFUSED` (no effect),
  exit 1.
- Final verification: all 95 destinations equal their recorded before bytes, ledger absent,
  `HEAD` unchanged, index identity identical to preflight, config digests unchanged, quarantined
  payload digest/identities preserved.

## Parent commands (exact)

Run from the workspace root (`cd /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`);
the operator refuses when `realpath(cwd)` differs from the pinned workspace.

Dry-run (read-only; creates only its own evidence directory):

```
node artifacts/diagnostic-prevention/implementation/attempt-01/restore-interrupted-root.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/restore-operator-evidence-run-01
```

Approved restoration (fresh evidence directory, one shot):

```
node artifacts/diagnostic-prevention/implementation/attempt-01/restore-interrupted-root.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/restore-operator-evidence-run-02 --apply
```

Exit codes: `0` dry-run or apply fully verified, `1` refused/failed, `2` usage. `--out` must
resolve beneath `A/`, must not exist, and its parent directory must already exist (the operator
creates only the single final directory, never intermediate parents). A failed apply is not
retryable with the same `--out`; any retry needs a new evidence directory and a fresh review.

Expected dry-run receipt: `status: "DRY_RUN_OK"`, `dryRun.plannedRestores: 15`,
`dryRun.mutatingEffectsPerformed: 0`, `effects: []`.

Expected apply receipt: `status: "APPLIED_AND_VERIFIED"`, `effects.length: 15`,
`quarantine.sourceRemoved: true`, `finalVerification` populated.

## Design decisions the parent should confirm

1. **Config condition.** `.skillsrc` is expected to be tracked at BASE. A tracked config whose
   working-tree bytes differ from its BASE blob is refused as `CONFIG_CONDITION_DRIFT` rather
   than silently tolerated, because config is the generation-authority input named by the brief.
   If an authored, uncommitted `.skillsrc` edit is intentional at apply time, that is a material
   change to the conditions the brief pins and needs an explicit parent decision before R1.
2. **Candidate provenance is proven, not assumed.** Candidate digests are taken from the pinned
   audit and additionally re-derived from the pinned candidate archive (95 `tar -xOf` reads).
   The staged lock is enumerated for completeness only.
3. **Quarantine layout.** The whole directory is moved *into* a freshly created
   `root-interrupted-temp-quarantine-01/`, so the preserved path is
   `A/root-interrupted-temp-quarantine-01/.ags-tmp-Ati9K9`. Because that directory must not
   pre-exist, a second `--apply` is refused by design.
4. **Claim lifetime.** A crash between claim acquisition and release leaves the claim file. The
   operator then refuses `CLAIM_HELD`; recovery of that leaf is a parent decision, not an
   operator wildcard.
5. **Private temp naming.** Restoration temps are `.ags-restore-<pid>-<hex>` inside the
   destination directory, created with `wx`, removed only when the recorded dev/inode still
   matches. A hard kill between create and rename can leave one such leaf; the operator never
   sweeps `.ags-*` wildcards and reports only what it demonstrably owns.
6. **Git cost.** Four read-only batch queries (`rev-parse` toplevel, `rev-parse HEAD`,
   `ls-files --stage -z`, `ls-tree -r -z BASE`) plus one `cat-file blob` per tracked config.
   No per-path subprocess loop; this is the same batching shape R1 must adopt at the unchanged
   generation guard boundaries.
7. **Refusal diagnostics** carry fixed machine codes; the human detail may name a path or
   digest because the receipt is the parent's only forensic artifact for a refused run.

## Standards notes (loaded through the AGS MCP during R0)

`load_skills_for_files` matched `javascript/javascript-language` and
`common/common-best-practices`. The operator follows both where they do not conflict with the
frozen contract: ESM imports/`const`, `async/await` with `try/catch`, template literals, strict
`===`, guard-clause refusals and an `Error` subclass instead of thrown strings.

Deliberate, documented deviations:

- Pinned hashes/inodes/commit are hard-coded literals, not env/config. They are the authority
  being pinned; making them configurable would defeat the guarantee.
- Phase functions (`preflight`, `restoreOne`, `quarantineTemp`, `finalVerification`) exceed the
  30-line advisory. R0 owns exactly one operator file, so phase-level function boundaries are
  kept over module splitting; the alternative (extra files under `A/`) is outside R0 scope.
- Refusal details may name a path/digest even though the diagnostic-hygiene skill prefers fixed
  codes only; the receipt is the parent's sole forensic artifact for a refused run, and the
  machine code remains fixed and non-interpolated.

## Evidence limits (explicit)

- The worker ran **zero** commands: no dry-run, no test, no syntax check, no hash verification,
  no Git query, no formatter. Therefore this report proves **authorship only**.
- Operator behavior, Node syntax validity, tar/bsdtar member semantics, `fs.FileHandle.write`
  partial-write handling and the exact `git ls-files`/`ls-tree` record shapes are
  `[INFERENCE]` from the pinned source and the API contracts, not observations.
- No claim that the 15 candidate files are currently restorable beyond the audited state, and no
  claim that the retained temporary identities still hold; both are re-established by the
  parent's dry-run.
- Prior 55 generator / 1282 CLI tests, static safety review and 95 pinned-BASE proofs remain
  valid only within their recorded scope. This is **not** RootPASS, not a generation receipt,
  not evidence of atomicity, and not a rollback facility.
- Root remains: 15 candidate + 80 before destinations, ledger absent, interrupted attempt
  without a receipt, retained temporary untouched.

## Next (parent-owned)

1. Review `restore-interrupted-root.mjs` source independently (no execution by this worker).
2. Run the dry-run command above from the workspace root and inspect
   `restore-operator-evidence-run-01/receipt.json` + `journal.jsonl`.
3. Only then execute the approved restoration and verify SDD/current state independently.
4. R1 (batched Git identity reads in `scripts/generation/isolated-stage.ts`) stays unreleased
   until restoration is qualified.

STOP — awaiting explicit R1 release.

---

# R0 corrective batch 01 — review round 1 findings A–E

Status: `R0 CORRECTED SOURCE FROZEN`. Authored only; still no execution by this worker.
R1 not released.

Inputs: `A/root-restoration-review-round-1.md` (FINAL CHANGES REQUESTED, findings A–E plus the
permission-mode drift note). The pre-correction operator is preserved by the parent at
`A/restore-interrupted-root-before-correction-01.source` (SHA-256 `7022e9d3…9fb0c28`,
47160 bytes); that preservation and its `node --check` are parent/static evidence, not executed
RED. The source was corrected in place; no other file changed except this report append.

## A — invocation-level effect state is now synchronous

- `restoreOne(target, state)`: immediately after `fs.rename` resolves, a `RESTORE_OUTPUT` effect
  object is pushed into `state.effects` before any awaited journal write or readback. The effect
  carries `renamed: true, verified: false`; `verified`, `restoredSha256` and
  `destinationModeAfter` are set only by the later verification step.
- `quarantineTemp(state)`: `state.quarantine` is assigned immediately after the directory
  rename, before journaling; `verified` flips to `true` only after the container/source/payload
  re-checks pass.
- `applyPlan` no longer pushes effects; the deleted local success-only `renamed`/`failure`
  bookkeeping and the `restoreOne` return object are gone.
- `execute` derives partial status from `state.effects.length > 0 || state.quarantine !== null`
  (`APPLY_FAILED_PARTIAL_JOURNAL_RETAINED`), never from "the function returned".
- `writeReceipt` emits `effects` plus `effectCounts { applied, verified, quarantineApplied,
  quarantineVerified }`. Receipt publication failure is caught: `state.outcomeStatus` keeps the
  achieved outcome, `state.status` becomes `RECEIPT_PUBLICATION_FAILED`,
  `state.receiptWriteError` is retained, and the stdout summary still reports
  `appliedRestores`, `verifiedRestores`, `quarantined`, `quarantineVerified`. No post-mutation
  path can report a bare zero-effect `REFUSED`.
- Journal persistence is evidence, not the effect record: `recordJournal` appends failures to
  the same failure list instead of aborting state capture, and the final-verification journal
  line now uses it too.

## B — authority JSON and archives consume the pinned bytes

- `verifyPins` now reads each pinned input exactly once, applies a fresh ancestor check
  (`useCache: false`) at that read, and returns `Map<pinId, {bytes, sha256, size, rel}>`.
- `preflight` parses the audit and publication-before proof from those retained buffers
  (`pinnedBytes(...).bytes` → `parseJsonBuffer`), so the plan can no longer be built from a
  second, unverified read of the same path.
- `materializeCandidateArchive` writes the pinned candidate-archive bytes to a fresh exclusive
  `candidate-archive-verified.tar` (mode `0400`, fsynced, owner-only under the evidence
  directory), re-hashes the copy, and every `tar -tf`/`tar -xOf` query runs against that private
  copy. The checks entry records the copy path/hash/size. The raw staged lock member is still
  never read.
- The two archive-metadata JSONs keep their single-read link checks and now also pass through
  the fresh ancestor check inside `readJson`.

## C — fresh topology and container identity where they are load-bearing

- Every pinned input read is preceded by an uncached ancestor check (same helper, no global
  cache disable, no abstraction layer).
- `quarantineTemp` performs uncached ancestor checks on the source chain immediately before the
  move and on the quarantine destination chain immediately before `mkdir`, re-inspects the
  source (`QUARANTINE_SOURCE_DRIFT`), captures the newly created container's device/inode/mode,
  and re-verifies that container identity after the move
  (`QUARANTINE_CONTAINER_IDENTITY_DRIFT`).
- `finalVerification` runs an uncached ancestor check for each of the 95 final destinations, and
  for the final quarantine member chain; it also re-verifies the created container's
  device/inode/0700 mode (`FINAL_QUARANTINE_CONTAINER_INVALID`).
- Preflight-only reads may still use the cache; effect and final boundaries do not.

## D — claim and cleanup lifetime

- `acquireClaim` opens the claim with `wx`, records the created leaf's device/inode before
  writing, writes the record with a partial-write loop, fsyncs and closes inside its own
  `try/catch`. On any acquisition failure it runs `discardOwnedClaim` (close, identity-checked
  unlink) before the caller ever sees a claim; a failed EEXIST is still the fixed `CLAIM_HELD`,
  and an acquisition failure with retained cleanup problems is reported as
  `CLAIM_ACQUISITION_FAILED` with every retained detail appended.
- `releaseClaim` requires a regular, non-symlink leaf with the created device/inode and identical
  bytes before unlinking; foreign or substituted leaves are preserved with fixed codes
  (`CLAIM_IDENTITY_MISMATCH`, `CLAIM_NOT_REGULAR`, `CLAIM_MISSING_BEFORE_RELEASE`).
- `restoreOne` collects failures: primary defect first, then retained handle-close failure
  (`RESTORE_TEMP_CLOSE_FAILED`) and owned-temp unlink failure
  (`RESTORE_TEMP_CLEANUP_FAILED`). `combineFailures` keeps the primary code and appends every
  retained secondary code/detail; nothing is suppressed by an earlier error.
- `quarantineTemp` uses the same accumulation, and its pre-move failure path removes only the
  empty container it created (`discardOwnedDirectory`, identity checked) and reports
  `QUARANTINE_CONTAINER_CLEANUP_FAILED` if that cleanup itself fails.

## E — config absence is a full presence/type condition

- Absent-at-BASE config: refuse if the path is in the index, refuse if present in the worktree,
  and refuse `SYMLINK`/`NOT_REGULAR`/`TOO_LARGE`/unreadable results; only `MISSING` counts as
  absence. The observation is now `{ baseTracked: false, present: false }`.
- Tracked-at-BASE config: unchanged — BASE-identical stage-0 regular index entry, working-tree
  bytes equal to the BASE blob, plus a recorded digest and mode.
- `assertConfigCondition` re-applies the full condition at the end: tracked → regular, digest
  equal, mode equal (`FINAL_CONFIG_DRIFT` / `FINAL_CONFIG_MODE_DRIFT`); absent → must still be
  absent and must not have become an invalid object (`FINAL_CONFIG_PRESENT` /
  `FINAL_CONFIG_INVALID`). A nullable digest no longer aliases invalid filesystem objects.

## Mode drift

`restoreOne` re-checks `lastLook.mode` against the captured destination mode between the final
content check and the rename and refuses `RESTORE_MODE_DRIFT_BEFORE_RENAME`; the operator never
re-applies an older captured mode after an intervening user `chmod`.

## Unchanged invariants

15 restore targets only, 80 untouched destinations, metadata authored bytes untouched, ledger
absence, Git index preservation, exact quarantine pins, `wx` evidence/claim/private-temp scope,
no stage-lock authority, no live-stage dependency, no threshold/mTime shortcuts, no new
root/force/resume API, no retry, no delegation.

## Superseded expectations from the earlier report

- The apply receipt no longer reports `quarantine.sourceRemoved`; the quarantine effect state is
  `{ renamed, verified, quarantineDirectory, quarantineMode, containerDevice, containerInode,
  directoryMode, payloadMode, device, directoryInode, payloadInode, payloadSha256 }` and receipt
  totals live in `effectCounts`.
- A successful apply is `status: "APPLIED_AND_VERIFIED"` with `effectCounts.applied: 15`,
  `effectCounts.verified: 15`, `effectCounts.quarantineVerified: true`; the summary prints
  `appliedRestores`, `verifiedRestores`, `quarantineVerified`, `outcomeStatus`.
- Config decision 1 is now strictly two-branch: a tracked `.skillsrc` still requires BASE-identical
  index plus BASE-blob bytes; an absent-at-BASE `.skillsrc.yaml` must be absent in both index and
  worktree, and any other presence/type is refused instead of being hashed.

## Corrective evidence limits

- Zero commands run by this worker: no `node --check`, no dry-run, no test, no hash/Git query.
  Corrected syntax and runtime behavior are `[INFERENCE]`; only the parent's static review and
  live dry-run can qualify this revision.
- The preserved pre-correction source is parent-held static review evidence, not an executed
  failing-before run.
- Root state is unchanged and unverified by this worker. R1 remains unreleased.

STOP — R0 CORRECTED SOURCE FROZEN; awaiting revision-bound independent review and explicit R1
release.

---

# R1 — batched Git identity reads (released batch)

Status: `SOURCE FROZEN`. Authored only; no command has been executed by this worker for R1 and
no root/adoption/reapply authority is claimed or used. R0's custom operator remains rejected and
unexecuted; the parent's native restoration/independent review are taken as given context.

## Changed files

| Path | Change |
| --- | --- |
| `scripts/generation/isolated-stage.ts` | Replaced the per-retained-path Git identity subprocess loops with one batched NUL index listing plus one recursive immutable-HEAD-tree listing at the same capture and guard boundaries. |
| `scripts/generation/isolated-stage.test.ts` | Extended the real-producer wrapper with a Git identity-mutation hook and appended 6 behavioral identity-boundary tests (61 total, all 55 prior cases untouched). |
| `artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs` | New parent-run root-scale qualification helper (no production imports, no live-root writes). |
| `artifacts/diagnostic-prevention/implementation/attempt-01/root-recovery-deepseek-report.md` | This append only. |

No producer/CLI/schema/config/dependency/package/docs/metadata/generated-output edits; no
installation, network, commit or Git index mutation in the real worktree.

## Source change contract

- New internal helpers: `splitGitListingRecord` (split at the FIRST tab), `captureGitListingSnapshot`
  (`git ls-tree -r -z <head>` + `git ls-files --stage -z`, parsed into path-keyed maps),
  `gitTreeEntryFromSnapshot`, `gitIndexEntryFromSnapshot`, `currentGitHead`.
- `captureGitInvocationIdentity` keeps the physical-root check and HEAD resolution, then builds
  every requested path identity from ONE snapshot. `assertGitInvocationIdentity` keeps the
  per-guard HEAD comparison and re-reads ONE fresh snapshot before comparing every requested path
  against the captured tree/index identity. Guard call sites are unchanged (initial capture, every
  publication guard through `assertStableState`, ledger publication).
- Subprocess arithmetic (not measured): with N requested paths the old code ran ~1+2N spawns per
  capture and ~1+2N per guard; the new code runs 4 per capture (toplevel, HEAD, index, tree) and 3
  per guard (HEAD, index, tree). At N≈1998 and 95 publication guards that is the advisor's ~379k
  fan-out reduced to ~285 spawns.
- Preserved semantics: absent vs `100644`/`100755` vs unsupported mode (`null`); nonzero stages
  and duplicate-stage ambiguity (throw `Git index has ambiguous stages for "<path>".`); duplicate
  tree records (throw `Git tree has ambiguous entries for "<path>".`); exact mode + object-id
  equality through `sameGitEntry`; HEAD/root/error behavior; unrelated rows cannot satisfy a
  requested path because lookup is exact-key.
- Deliberate reference to the old pathspec behavior: a requested directory-shaped path with more
  than one nested index record still throws the same ambiguity error (one nested record still
  yields `null`), reproduced from precomputed prefix counts. No pathspec is passed for retained
  paths, so glob/tab/space names can no longer expand or miss.
- Unchanged out-of-scope callers: adoption/`gitBlob` still use the existing per-path
  `gitTreeEntry`/`gitIndexEntry` helpers (once-per-adoption, not the publication guard loop).
- One diagnostic message changed shape: a failed full index listing now throws
  `Cannot inspect Git index: <stderr>` instead of the per-path `Cannot inspect Git index for
  "<path>": <stderr>`. No existing test asserts either string; the tree-listing message is
  unchanged.

## Added behavioral coverage (permanent, real-producer fixtures)

1. `a Git index mode change on a retained output blocks publication and preserves the staged mode`
2. `a Git index deletion of a retained output blocks publication and preserves the absence`
3. `an unsupported symlink index mode on a retained output blocks publication`
4. `unmerged index stages for a requested path block publication as ambiguous`
5. `an unrelated unusual-name index row changing during generation does not block publication`
   (space- and tab-containing unrelated rows committed in the fixture BASE; output still
   publishes, unrelated deletion survives, tab row still listed)
6. `a HEAD change during generation blocks publication`

Shared fixture helper `prepareIdentityGuardFixture` performs the established baseline
apply → `commitFixtureBase` → lock removal → wrapper install → canonical edit, and the wrapper's
new env-driven `FIXTURE_GIT_MUTATION` hook records `git-mutation` in the fixture hook journal so
each refusal is conditioned on an observed injection. Mutations in tests 1–4 target an
**unchanged declared output** (`common-beta` mirror) while the adopted changed output is
`common-alpha`, so the refusal necessarily comes from `assertGitInvocationIdentity` at a
publication guard rather than the per-path adoption proof. Existing index-only target/config
tests remain as the staged-only and config drift coverage.

## Root-scale smoke interface

- Command: `node <A>/root-scale-generation-smoke.mjs --out <A>/<fresh-dir> [--keep-fixture]`.
- Flags: `--out` (required, exclusive, beneath `A/`), `--keep-fixture` (retain the temp fixture
  only when the run failed), `--help`. Exit codes 0 qualified, 1 failed/mismatched, 2 usage.
- Pipeline: `git archive` of the pinned BASE → overlay current `cli/src`, `scripts/generation`
  (tests removed), three producer scripts, package/tsconfig → link existing root/CLI
  `node_modules` → baseline with the three real producers → `git init` + synthetic identity +
  commit of the whole baseline topology (node_modules excluded) → delete the fixture-only lock
  → overlay current `skills/` and the two changed workflows → real
  `node --import tsx scripts/generation/index.ts --adopt-base <fixtureBase>` → real `--check`.
- Evidence written exclusively under the fresh output directory: `summary.json`,
  `apply-receipt.json`, `check-receipt.json`, `canonical-metadata.json`, `apply.stdout/stderr.txt`,
  `check.stdout/stderr.txt`, `baseline-<producer>.stdout/stderr.txt`,
  `trace2-baseline/apply/check.jsonl`, `changed-byte-mismatches.json` (only on mismatch),
  `fixture-generation-logs/` (failure only). `summary.json` records fixture BASE, declared /
  changed / verified counts, per-stage and overall durations, per-phase Git trace2 `cmd_start`
  counts, changed-byte and ownership-class verification, metadata nonmetric + scope checks,
  HEAD/index/config preservation, source identities, deadlines and cleanup state.
- Bands (explicitly reported, never padded): declared 1800–2200, changed 80–110. Outside either
  band the run exits nonzero with `QUALIFICATION_MISMATCH` and the exact band reason.
- Deadlines: 1800 s apply, 600 s check, 900 s per baseline producer; a timeout is reported as a
  first-class failure and the child is SIGKILLed.

## Exact parent commands (from the workspace root)

```
node --import tsx --test scripts/generation/isolated-stage.test.ts
node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-smoke-run-01
pnpm exec prettier --check scripts/generation/isolated-stage.ts scripts/generation/isolated-stage.test.ts
```

## Source-only decision risks

1. Full `ls-tree -r` and `ls-files` listing size is now proportional to the repository, not the
   changed set. The smoke's `trace2-apply.jsonl` counts and apply duration are the evidence that
   decides whether that trade is acceptable; this worker measured nothing.
2. The batched index command-failure message no longer names the requested path (fixed shape,
   same failure class). If a future test depends on per-path text it must be added deliberately.
3. Adoption/`gitBlob` retain per-path Git queries by design (out of the released scope); they are
   not on the publication guard loop.

## Evidence limits (R1)

- Zero commands executed for R1: no `node --check`, tests, typecheck, prettier, generator, smoke,
  hash or Git query. Syntax, formatting, runtime behavior and test greenness are `[INFERENCE]`.
- Boundary deviation, stated plainly: while reading context I ran three read-only shell
  invocations (`wc`/`grep -c`, `grep -rn`, `grep -n`) for source inspection after the
  no-shell-reads clause. No hashes, builds, tests, probes, formatters or writes were performed;
  every later read used the dedicated read/grep tools.
- The smoke is passing-after tooling that has not run; no historical failing-before, no root
  PASS, no Node 20, host-enforcement, cost or release claim.
- Root remains the parent-verified 95-before state with the ledger absent; R1 grants no check,
  adoption or reapply authority.

STOP — R1 SOURCE FROZEN; awaiting parent suite/smoke execution and independent affected review.

---

# R1 corrective batch 01 — review round 1 findings A–E

Status: `SOURCE FROZEN`. Authored only; this worker executed nothing. The failed
`root-scale-smoke-run-01`, its retained fixture, all native evidence, the R0 history and the
previously appended R1 text are preserved unchanged.

## R1-A — lawful fixture staging

- `commitFixtureBase` no longer passes exclusion pathspecs (which Git rejects as ignored
  positive candidates). It enumerates the fixture's real top-level entries, asks Git itself via
  one `git check-ignore --stdin -z` call which of them are ignored, and stages only the
  remaining positive names with `git add --all -- <names>`. No blanket `--force`, no ignore-file
  edit, no evidence/dependency root named as a candidate.
- Dependency links are then removed from the index explicitly
  (`git rm --cached -r --ignore-unmatch -- node_modules|cli/node_modules`) and the resulting
  tracked inventory is asserted: no tracked path equals or descends from either dependency
  prefix, no `artifacts/` evidence path is tracked, and the prerequisite baseline outputs
  (`AGENTS.md`, `.skillsrc`, `skills/index.json`, `skills/metadata.json`,
  `docs/agent-capabilities.md`, at least one `.github/skills/` mirror) are present. Counts are
  recorded in the stage entry.

## R1-B — owned subprocess lifetime

- Every fixture child (`git`, `tar`, baseline producers, public entrypoint) is spawned
  `detached: true`, making it its own session/process-group leader; the recorded group id is
  the child pid.
- The deadline SIGKILLs the whole group. A post-exit grace timer (5 s) also kills the group when
  the direct child exits but inherited stdout/stderr descriptors keep the `close` event pending,
  so `close` cannot outlive the deadline regardless of descendants.
- After `close`, `reapOwnedGroup` repeatedly probes `kill(-pgid, 0)` for up to 10 s, re-kills,
  and reports `groupReaped`. An unresolved group records the command/group id, forces
  `retainFixture`, makes the run `FAILED`, and therefore blocks both qualification and fixture
  deletion.
- Cleanup failure is now a first-class failure: `FIXTURE_CLEANUP_FAILED` sets `status: FAILED`
  and exit code 1 even if the measurement itself was green. Retained-fixture path and error are
  reported.

## R1-C — real Trace2 measurement

- Parser now reads the documented EVENT format: `start` events (argv) and `cmd_name` events
  (identity), instead of the non-existent `cmd_start`. Missing files, unreadable files,
  malformed/unnamed lines and zero commands in the apply trace are hard failures
  (`TRACE2_MISSING`, `TRACE2_INVALID_LINES`, `TRACE2_NO_COMMANDS`).
- Invocations are classified from argv after skipping global options: `ls-files --stage -z`
  without `--` = batched identity listing; with `--` = per-path proof query;
  `ls-tree ... -r` = batched tree listing; without `-r` = proof query. The summary records
  `commandStarts`, `byName`, `lsFilesBatched`, `lsFilesPathspec`, `lsTreeRecursive`,
  `lsTreePathspec`, `batchedListings`, `proofQueries`, `uniqueSessions`, a bounded
  `commandSequence` (first 40 names), three sample argvs and an interpretation string.
- Usable evidence is required: apply trace must show at least one batched index listing and one
  recursive tree listing, and total Git commands must stay under
  `declared + 6 * changed + 200` (`GIT_COMMAND_CEILING_EXCEEDED` otherwise). The old per-guard
  cost `2 * declared * changed` is recorded for comparison. Baseline traces must parse but may
  legitimately contain zero Git commands, which is reported explicitly rather than as silence.

## R1-D — independent bytes and authority preservation

- Before overlay/apply the helper runs the real public `--check` on the baseline fixture, records
  its PASS receipt, the exact declared path set and per-path baseline digests.
- The baseline producer lock is captured as evidence, then replaced by a minimal lock holding
  exactly one deliberately unrelated authority entry (a fixture-owned file with
  owner/source/agent/sha256). This keeps destinations unknown/unowned while giving the run a
  pre-existing unrelated authority to preserve.
- After apply/check the helper asserts: exact changed == verified sets (duplicates rejected),
  changed ⊆ declared, every changed path's bytes differ from its baseline bytes, every unchanged
  declared path keeps baseline bytes AND acquires no `entries`/`generation.entries` ownership,
  changed paths keep their baseline producer class (`cli` vs `generation`) with unchanged
  owner/source/agent for CLI classes and a non-empty `source` for generation classes,
  `skills/metadata.json` is generation-owned with a matching category-token-metrics scope, and
  the injected unrelated entry is byte-for-byte unchanged. Byte expectation is the real
  check-mode producer re-derivation plus baseline comparison — never the freshly written lock.

## R1-E — fixture Git isolation

- A sanitized environment builder strips `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, object/
  common-dir/namespace/prefix/ceiling/discovery routing, `GIT_CONFIG*` (including numbered
  `GIT_CONFIG_KEY_n`/`VALUE_n`) and ambient `GIT_TRACE*` variables, then sets
  `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null`. Stripped names are recorded in the
  summary. The same environment is propagated to `git`, baseline producers and the public
  entrypoint; the pinned BASE archive read uses it too.
- Fixture-local config sets user identity and `commit.gpgsign=false`, and
  `core.hooksPath` points at an owned empty directory outside the fixture. After initialization
  the harness verifies `rev-parse --show-toplevel` equals the fixture realpath,
  `--absolute-git-dir` is inside the fixture, and the local `core.hooksPath` equals the owned
  empty directory; any mismatch fails (`FIXTURE_GIT_TOPLEVEL_MISMATCH`,
  `FIXTURE_GIT_DIR_MISMATCH`, `FIXTURE_HOOKS_NOT_ISOLATED`).

## Minor compatibility precision

`captureGitListingSnapshot` now builds `indexPrefixCounts` from descendant **records**
(`records.length`), not distinct index keys. A requested directory-shaped path whose single
descendant carries several unmerged stages therefore still counts >1 and throws the old
ambiguity error instead of returning `null`. No public API change and no new test: declared
outputs are file paths, so the directory-prefix fallback is not reachable through the existing
contract; the behavior is documented rather than claimed as fully equivalent.

## Test-file layout

No behavioral test was added or removed: all 61 cases are unchanged. Formatting was fixed by
hand with the dedicated tools (no formatter run): the fixture helper's explicit return type was
dropped, a `stagedIndexLines` helper replaced three repeated parenthesized `(await …).trim()`
expressions, and two `assert.ok` calls were wrapped. No formatter command was executed, so the
parent's `prettier --check` remains the authority for residual formatting.

## Exact parent commands (workspace root)

```
node --import tsx --test scripts/generation/isolated-stage.test.ts
node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-smoke-run-02
pnpm exec prettier --check scripts/generation/isolated-stage.ts scripts/generation/isolated-stage.test.ts
```

A new exclusive evidence directory is required (`run-01` is preserved). The helper refuses an
existing output directory.

## Superseded details from the earlier R1 appendix

The earlier appendix's smoke evidence list and setup description are superseded where they differ:
the helper now also writes `baseline-lock.json`, `injected-unrelated-lock.json`,
`baseline-check-receipt.json`, `baseline-declared-digests.json` and `baseline-check.*.txt`;
`trace2-*.jsonl` are parsed as documented EVENT records; and process-group/cleanup failures force
a non-green, non-deleting outcome.

## Limits (unchanged honesty)

- Zero commands executed for this batch: no tests, typecheck, prettier, generator, smoke, hash or
  Git query. Test greenness, formatting, Trace2 record shapes, `git check-ignore --stdin -z`
  input framing, process-group semantics and the whole fixture acceptance remain `[INFERENCE]`.
- The corrective run has not executed; `run-01`'s setup failure stands as observed, not RED, and
  no apply/check/counts are claimed.
- Root remains the parent-verified 95-before/ledger-absent state; no root command, adoption,
  reapply, model substitution or additional corrective attempt is authorized or performed.

STOP — R1 CORRECTED SOURCE FROZEN; awaiting parent suite/smoke/prettier execution and independent
affected review.
