# Task 1 Phase1B — coordinator source freeze

**Status: COORDINATOR SOURCE FROZEN. Task 1 is not complete.** Parent-owned tests, semantic qualification, CLI checks, and independent safety review remain pending. No root generation, check, adoption, publication, or release was performed by this worker.

## Changed paths

- `scripts/generation/isolated-stage.ts`
- `scripts/generation/isolated-stage.test.ts`
- `CONTRIBUTING.md` — isolated-generation subsection only
- `artifacts/diagnostic-prevention/implementation/attempt-01/task-1-phase1b-coordinator-report.md`

No changes to `scripts/generation/index.ts`, the accepted schema files, `package.json`, generated outputs, or prior frozen receipts.

## Implemented contract

- **Snapshot/plan:** captures declared destination and lock digests, source/resource/configuration/producer inventory, and Git HEAD/tree/index identities. Evidence paths are checked before creating the run log; in-repository evidence is confined to `artifacts/generation-logs`. Source topology and dependency changes are checked through publication.
- **Candidate production/validation:** retains the real token, index, and capability producers in a fresh stage. Stage ownership seeding remains stage-local. Candidate checks retain configured/index/mirror/workflow/specialist/resource validation and require the capability document to equal the producer's rendered bytes.
- **Changed-set authority:** only changed declared outputs are eligible for publication or ownership updates. Equal-byte unknown files remain unclaimed. Explicit base adoption reconstructs prior producer outputs and, for metadata only, compares the prior, current-worktree, and regular Git-index token-metrics projections. Scoped metadata edits outside `token_metrics` remain authored; metric changes preserve those fields, while producer nonmetric mutations, owned-metric tampering, and unsupported active JSON formatting fail closed.
- **Publication/receipt:** before-bytes are archived in the isolated evidence directory. Destination, lock, input, and Git state are revalidated before each rename; each staged digest is checked after publication. Rename effects and verified effects are tracked separately, with the ownership ledger published last and unrelated prior ledger data retained.

The documentation preserves the Task 1 candidate/review gate and records the exact metadata scope and two-space/final-newline serialization prerequisite. It does not authorize root execution or release.

## Added behavioral coverage (NOT RUN)

- `metric refresh preserves authored metadata and binds the exact scoped projection`
- `scoped metadata authority permits authored nonmetric edits without rewriting bytes`
- `token producer nonmetric metadata mutation is refused before publication`
- `tampered scoped token metrics refuse before invoking the producer`
- `metric refresh refuses unsupported metadata serialization without publication`
- `scoped base adoption compares token metrics across nonmetric worktree and index edits`
- `evidence directory overlap is rejected before creating a run log`
- `public pnpm command forwards stale-check, apply, and passing-check with receipts`

Existing test controls and frozen receipts were retained. The public-path fixture uses the copied repository package script; the added test asserts failed stale-check receipt and no output changes, successful apply receipt and host mirror parity, unchanged unowned Beta bytes/authority, and passing-check receipt.

## Verification state

**Worker checks: NOT RUN**, as directed. No test, probe, typecheck, build, lint, formatter, generator, shell command, or root operation was executed. The exact added test names above are authored coverage, not observed results. Parent owns all execution, complete fixture/public smoke runs, affected CLI checks, and separate independent safety review.

Parent-owned verification commands identified by the project scripts (NOT RUN):

```bash
node --import tsx --test scripts/generation/isolated-stage.test.ts
pnpm --filter ./cli test
```

The parent still owns baseline-attributed semantic qualification, independent safety review, and the decision whether any later root operation is authorized.

## Handoff

Inspect the four changed paths and execute the parent-owned qualification only after this freeze. Treat any failure as new evidence; do not reinterpret this source freeze as Task 1 acceptance or permission for root generation.

## Corrective source-freeze amendment — consolidated findings A–E

**Status remains COORDINATOR SOURCE FROZEN; Task 1 is not complete.** This amendment preserves the earlier freeze history and records the single consolidated corrective pass. No production changes were made to `scripts/generation/index.ts`, accepted schema files, generated outputs, or frozen receipts.

### Corrective dispositions

- **A — changed-set proof:** pinned-base producer proof now runs only after stage generation and only for unknown existing outputs whose candidate bytes differ. Unchanged unknown mixed `AGENTS.md` is not proved, adopted, or claimed. Replaced the former no-op negative with a real changed mixed-output refusal and added an unchanged mixed-`AGENTS.md` plus changed-mirror adoption control.
- **B — configuration Git identity:** `.skillsrc` and `.skillsrc.yaml` are included in the retained Git identity set and are revalidated at each stable-state boundary. Added a child-time index-only `.skillsrc` mutation control that checks refusal, unchanged worktree bytes and outputs, and preservation of the staged index blob.
- **C — exact directory transitions:** candidate inventory now captures every declared output parent before staging. Publication records only directories it creates, verifies each by filesystem identity, allows only declared outputs/owned descendants in those directories, and removes only same-identity empty owned directories on refusal; retained paths are reported. The absent-host Copilot case asserts that the rule, workflow, specialist, category index, mirrors, and resource outputs are declared before the child, then checks apply and check.
- **D — exact private temporary lifetime:** publication uses a private same-filesystem directory and exact payload path, verifies directory/file identities and digest, and removes only those verified paths. No suffix-wide ignores or source-tree rebaselining. Added a real producer-hook regression for a temp-looking sibling of a canonical package resource; it requires recorded post-producer injection, refusal before publication, and preserved sibling bytes.
- **E — public command spelling:** docs and the public-path test now use `pnpm generate-indices --check`, `pnpm generate-indices`, and `pnpm generate-indices --adopt-base <full-commit-sha>` without an extra `--`.

### Corrective coverage (NOT RUN)

- `base adoption ignores unchanged unmarked AGENTS while adopting a changed mirror`
- `base adoption rejects a changed mixed AGENTS output the prior producer cannot rewrite`
- `a wholly absent configured Copilot host is planned before apply and passes check`
- `a foreign temp-looking sibling of a package resource blocks publication and survives`
- `a Git index-only configuration change blocks publication and preserves the worktree`
- Existing `public pnpm command forwards stale-check, apply, and passing-check with receipts` now invokes the supported pnpm argument spelling.

### Verification and handoff

**Worker checks: NOT RUN.** No tests, probes, typecheck, build, lint, formatter, generator, shell command, or root operation was executed. All prior 49-test and review evidence predates this amendment; the prior 39-pass/10-failure receipt was not rerun or reinterpreted. B1/B2 ledger-corruption paths are not claimed as passing. Parent owns replay, semantic qualification, independent safety review, and any later root clearance.
