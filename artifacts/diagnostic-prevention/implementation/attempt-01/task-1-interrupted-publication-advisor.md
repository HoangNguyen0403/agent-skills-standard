# Task 1 interrupted publication — standard advisor

## Decision

Treat this as an interrupted, partially applied transaction with unresolved effect inventory, not a failed provider call or an atomic failure. Keep root writes frozen until the parent's per-path audit settles. Standard analysis suffices; no premium or implementation retry is authorized here.

The minimum source correction is batching the existing read-only Git identity queries while retaining every current guard boundary and exact identity comparison. That corrects a demonstrated scaling defect; it does not itself recover the missing active ownership ledger.

For operator recovery, prefer an explicitly approved, exact compare-and-restore of only audited attempt-produced changes, followed by a freshly qualified normal invocation. This reuses the existing authority path and avoids inventing resume semantics. Forward completion is possible only through an explicitly approved, independently reviewed, transaction-specific operator procedure that also finalizes ownership for already-published paths. Neither option is authorized by this report.

## Evidence and limits

Parent-reported: reviewed source identity `7f2d8e75...68a612`; 55 generator and 1282 CLI tests passed, lint/style/build and nine-file Prettier equivalence proof passed, final independent safety approval passed. A root check found 95 stale outputs (88 mirror files, six workflows, metric-only metadata) and applied zero. The subsequent approved BASE adoption hit an external 1200-second tool deadline. Targeted process lookup found no matching generator nodes. These are attributed observations, not checks executed by this advisor; targeted lookup is not a universal child/process-lifetime proof.

Direct read-only inspection:

- Current helper snapshot `scripts/generation/isolated-stage.ts#E63B`; no shell hash command run here, so the full source SHA remains parent-attributed.
- `artifacts/generation-logs/attempt-2026-10-29T07-41-49-505Z-fd751a/generation.log:200–207` records capability phase exit zero, canonical/host parity, and independent pinned-BASE reconstruction for 95 paths.
- Lines 208–222 record 15 completed `Published & verified` operations. These are evidence of effects, NOT an exact final effect count: another rename could precede interruption without its log line, and appendLog deliberately swallows logging failures (`3206–3211`).
- The attempt listing contains log, adoption and publication-before evidence; no receipt is listed. `publication-before/proof.json:383–385` records the original `.skills-lock.json` as absent. The surviving stage directory is readable and contains candidate outputs and a staged lock. It is not active authority.
- Adoption proof records contain old/current digests; metadata additionally has `scopeSha256` (`adoption/proof.json:475–479`). They do not constitute a persisted active ledger or a sealed per-path candidate digest manifest.
- Output renames happen individually (`2991–2995`, `3634–3649`). Ledger publication follows the entire output loop (`3652–3664`); successful receipt follows ledger verification (`3700–3712`). This is deliberately not cross-file atomicity.

No source edits, commands, probes, tests, generators, root writes, cleanup, rollback, process control, delegation, or permissions were performed. Only this requested report was created. Original RED and Node20 limitations are unchanged.

## Evidenced scaling cause versus deadline

`captureGitInvocationIdentity():1707–1734` performs one `git ls-tree` and one `git ls-files --stage` subprocess sequentially for every retained path. `assertGitInvocationIdentity():1737–1772` repeats both queries for every path at every guard.

`assertStableState():3350–3394` also recursively captures source inventory and hashes all declared destinations. It runs before generation/proof boundaries and is passed into every `publishStagedFile` as `beforeRename` (`3637–3645`), which invokes it immediately before each rename (`2991`). Ledger replacement uses it again.

For N retained identity paths, each publication guard therefore launches approximately 2N+1 sequential Git subprocesses, plus full filesystem work. With approximately 1996 targets and 95 output publications, that is roughly 379,000 Git subprocesses in the output guards alone, excluding initial capture, proof, other guards and ledger publication. Exact N includes configuration/lock paths and is not independently counted here.

This repeated O(changed outputs × retained paths) process fan-out is source-established. It is a strong explanation for root-scale latency missed by small fixtures. It is NOT timed attribution: no per-phase timing establishes what fraction of the 1200 seconds it consumed. Full-tree hashing is another remaining cost. The tool deadline is the external termination condition; it does not show generator failure, deadlock, provider exhaustion, or execution of catch/finally. The surviving stage and absent receipt are consistent with interruption bypassing normal finalization, not proof of a particular kill signal.

## Safe batching contract and qualification

Batching can preserve the exact guard semantics. At each EXISTING guard, obtain a fresh NUL-delimited index listing and a recursive regular-blob listing from the captured immutable HEAD tree; build maps keyed by exact repository path, then compare the same requested path identities. A full listing filtered by exact path avoids pathspec interpretation, command-line size limits and per-path spawning. Do not use status text, mtime, a cached live index, or one index snapshot reused across renames.

Preserve current distinctions: absent entry; stage-zero regular 100644/100755 entry; unsupported mode/nonzero stage mapping to null; multiple records for a requested path causing ambiguous-stage failure; exact mode/object ID equality; HEAD/root and command-error behavior. Split a Git record at its FIRST tab so valid tabs in paths remain part of the path; preserve NUL framing and spaces. Such a filename parser correction must be explicit and tested rather than silently presented as byte-for-byte legacy behavior. Unrelated index paths must not expand the checked authority scope. A batched read improves temporal coherence but does not eliminate filesystem/index races or provide hostile-writer atomicity.

Before root re-execution, a newly authorized bounded source owner must deliver the batch-only change; parent qualifies on temporary repositories: old/new identities for regular, absent, executable, symlink/unsupported, staged-only modification, deletion, unmerged stages, HEAD/config drift and unusual paths; preservation of staged user changes; existing drift/partial-publication/ownership regressions; and a representative approximately-1996-path/95-change apply/check smoke with retained duration and per-boundary query counts. Keep the guard frequency unchanged. If full inventory hashing still exceeds the operational window, return that measured bottleneck rather than weakening checks. Independent review and a deadline/process-lifetime plan precede another root mutation. Existing functional authorization is consumed; this report grants no writer or retry.

## Recovery choices and required approvals

### Common prerequisite: audit before choosing

Parent should retain a fresh, separate audit record for all 95 paths: archived before digest, current digest, surviving candidate digest, path type/topology, and classification BEFORE / CANDIDATE / OTHER / ABSENT. Verify archives against their recorded proof, candidate outputs against frozen producer/content inputs and parity, current Git/config/source identity, lock absence, metadata nonmetric preservation and token-metric scope, evidence/SDD retention, and exact leftover private temporary paths. Any divergent path or missing provenance blocks its recovery. Do not infer candidate provenance merely from equal bytes. Do not blanket-delete `.ags-tmp-*`; an interrupted lease's in-memory identity is gone.

Preserve the old attempt and surviving stage/evidence before any approved recovery. A new seal can attest bytes available NOW, not retroactively supply an execution-time candidate seal.

### A — exact restoration, then existing command (recommended lowest semantic novelty)

Requires explicit human/operator approval for restoration of the audited attempt effects, plus an authorized source-performance correction and renewed root execution decision. For each path conclusively attributable to this attempt and currently equal to its verified candidate, restore only its archived exact before bytes using immediate digest/type checks and post-write verification. Preserve other/currently divergent paths. Preserve metadata's full archived authored bytes, never replace it with the BASE metadata blob. Do not reset Git, restore the whole tree, delete evidence, or manufacture a lock. Audit any interrupted temporaries separately.

Once every relevant output is exactly back at the original before-state and the index/config/source/lock conditions still qualify, the normal command can independently re-prove all 95 under the existing scoped BASE and metric-only authority in a fresh attempt. Explicit restoration intentionally undoes known generated effects; it is not an automatic rollback or a new claim that nothing happened.

### B — forward completion from audited transaction evidence

Requires explicit approval for a bounded operator procedure beyond current command behavior, independently reviewed before writes. Bind exactly these 95 paths, this attempt, pinned BASE proof, before bytes, verified candidate bytes, current inputs/index and metadata scope. Finish only still-BEFORE paths with immediate rechecks. Record already-CANDIDATE paths as inherited verified effects of this interrupted transaction ONLY where the audit establishes that provenance. Compose ordinary CLI entries and generation/metric authority through existing plan-derived metadata, preserve unrelated previous authority, and publish/read back the ledger last. Do NOT copy the staged lock wholesale.

This is not a proposal for a general resume API. It requires more recovery-specific proof than A. If that proof cannot be established from surviving artifacts and fresh validation, choose A or remain frozen; no generic equal-byte adoption waiver.

A blind normal rerun is inadequate: already-published files now equal candidate bytes, so they fall outside `outOfDateFiles`/`changedUnknownExisting` (`3471–3481`, `3519–3521`) and will not acquire ownership when the ledger is finalized for remaining paths. Their original approved proof remains valuable, but the current invocation API does not consume it as inherited publication authority. A longer deadline alone therefore does not repair the interrupted transaction's ledger semantics.

## Stop/go

STOP until the independent per-path audit, exact process-lifetime disposition, approved recovery choice, newly authorized bounded performance correction, root-scale qualification and affected independent review are complete. Then parent may seek/record the appropriate operator execution approval. Completion requires final 95-path bytes and ownership, preserved sources/SDD/unrelated authority, check-only parity and truthful new receipts. Prior passing tests and safety review remain valid within their scope; they did not establish root-scale completion under the tool deadline. No root PASS, absence of effects, atomicity, rollback, retry or premium authorization is supplied here.
