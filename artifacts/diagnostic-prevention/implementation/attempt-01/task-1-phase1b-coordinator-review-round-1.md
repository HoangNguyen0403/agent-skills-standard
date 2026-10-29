# Task 1 Phase1B coordinator — independent review round 1

## Verdict and boundary

- **Spec compliance: CHANGES REQUESTED.** Exact changed-set authorization is still ordered incorrectly, and the retained Git identity set omits configuration identities used by adoption proof.
- **Quality/security: CHANGES REQUESTED.** Three Major findings below; no additional Blocker established by this static review. One is a publication identity gap; two reject supported operations, including one after creating an active directory.
- **No root generation/check/adoption/publication clearance.** Existing scoped BASE approval and the metadata exception remain valid; this report neither broadens nor re-requests them.
- Reviewed the coherent replacement frozen by `task-1-phase1b-coordinator-report.md`, not the previous R5 diff. Source references below are to `scripts/generation/isolated-stage.ts` snapshot `5C9A`; tests `59C4`; CONTRIBUTING `B163`.
- No implementation edits, commands, tests, builds, typechecks, probes, generators, delegation, or root effects were performed. This report is the sole new artifact written by this reviewer.

### Rules and authoritative inputs

Read the complete Phase1B coordinator brief, updated metadata-scope contract, advisor decision and continuation brief, current coordinator report, accepted schema review, actual coordinator/tests, and CONTRIBUTING generation subsection. Retained the approved Task 1 acceptance constraints and prior findings as historical context, not as a substitute for reviewing the replacement.

Refreshed project file standards and audited them before delivery. MCP audit records: `angular/angular-testing`, `common/common-architecture-audit`, `common/common-best-practices`, `common/common-security-audit`, `common/common-security-standards`, `common/common-tdd`, `nestjs/nestjs-testing`, `nextjs/nextjs-testing`, `system-design/system-design-principles`, `typescript/typescript-language`. The router reports category coverage warnings for react/product-management despite returning these file rules; these are consultation diagnostics, not evidence that generator behavior passed. Previously consulted generator/evidence-preservation and review instructions remain applicable.

## Consequential findings — complete corrective batch

### P1B-A — Major: adoption still proves all existing unknowns before deriving the changed set

**Location:** `isolated-stage.ts:2796-2802,2846-2879`; candidate digest comparison follows at `2956-2967`.

The pre-candidate branch calls `proveBaseProducerOutputs(..., unknownExisting, ...)` and requires proof for every unknown existing declared file. Restricting `adoptedPaths` to changed files later does not repair the earlier prerequisite. This violates brief responsibility 3: derive exact candidate-versus-active changes first; unchanged unknowns must not require unnecessary mixed-file proof.

**Concrete static counterexample:** an unknown tracked mirror needs a legitimate pristine-BASE update, while an unknown AGENTS/README file has authored content that the current producer preserves byte-for-byte. The latter needs no publication or ownership acquisition. With `--adopt-base`, the invocation nevertheless requires it to match the old Git blob and independently reconstruct as a whole old output. It may fail the mixed-region prerequisite (`1615-1618` or `1690-1693`) or the full-byte check (`1894-1902`) before producing the current candidate. An unchanged untracked declared output likewise fails the regular tracked-output requirement, even though it should only be validated and left unclaimed. These are supported no-op unknowns, not authorization failures for changed mixed outputs.

**Smallest bounded fix:** keep the initial full snapshot and destination/ownership checks; produce and validate the candidate; derive exact changed paths; form `changedUnknownExisting`; independently prove only that set, under the original invocation identities and before any publication. Continue excluding unchanged unknowns from archives, writes, and ownership. Preserve refusals for genuinely changed unsupported/untracked/edited outputs.

**Missing regression:** combine one changed pristine unknown mirror with one equal-byte unknown mixed output that cannot satisfy old whole-file proof. Assert successful bounded adoption of the changed mirror, unchanged mixed bytes, no mixed ownership/archive acquisition, and no proof prerequisite for that mixed file. Retain a separate rejection when that same mixed file actually changes.

### P1B-B — Major: configuration Git-index identities are checked once for proof but not retained through effects

**Location:** `isolated-stage.ts:1777-1804` versus `2803-2805,2838-2842`; worktree-only configuration inventory at `1056-1058`.

Old-producer adoption explicitly relies on each `CONFIG_FILE_CANDIDATES` path having the pinned-base regular Git index entry and current content. The invocation Git snapshot, however, contains only declared outputs and `.skills-lock.json`. Configuration files are not declared outputs. `assertStableState` therefore retains their worktree hashes but not the index/tree facts consulted by proof.

**Concrete static counterexample:** after initial adoption configuration checks, a producer-time/concurrent action stages a different `.skillsrc` blob while restoring/leaving its worktree bytes unchanged. HEAD, all output index entries, the lock, and the entire worktree inventory still match the invocation snapshot. Every later `assertStableState` can pass, and publication/ownership can succeed using configuration proof whose relevant index identity has changed. The existing index-only test targets a changed mirror, which is in `gitIdentityPaths`; it does not exercise this omission.

**Smallest bounded fix:** include all configuration candidates, including their absence and regular index/tree identities, in the initial retained Git identity universe. More generally, ensure that every mutable Git fact consulted by the authority proof is covered by the same immutable invocation record and revalidated before corresponding publication/ledger effects. Do not reset the user's index or replace this with a current-worktree-only comparison.

**Missing regression:** use an actual child-time hook to stage an alternate configuration blob without changing worktree configuration bytes; prove the index mutation occurred, require drift refusal before publication/ledger writes, and assert the foreign index state is preserved. Keep a positive unchanged-index adoption control.

### P1B-C — Major: creating a missing configured host directory invalidates the immutable source inventory against the coordinator's own effect

**Location:** `isolated-stage.ts:1011-1020,1062-1067,2817-2828,2476-2487`; configured target planning `482-485,593-624`. Supported detection directories include `.cursor` and `.github` (`cli/src/capabilities/agentCapabilities.ts:79,180`).

The input inventory records a missing configured host detection directory as `absent`. Candidate planning still declares that configured host's mirrors and indexes. During publication, `publishStagedFile` runs `ensureDir(destination parent)` before `beforeRename()`. Creating the first output under that previously absent host creates the detection directory. `beforeRename` immediately compares the new `directory` state against the original `absent` source inventory and refuses its own operation. There is no separate expected topology advanced for verified coordinator-created parents.

**Concrete static counterexample:** configure Copilot in `.skillsrc` but begin with no `.github` directory; canonical inputs and candidate generation are otherwise valid. The first publication under `.github/...` creates `.github`, then fails the source-inventory drift guard before renaming the output. The run can already have published earlier declared outputs, and it leaves a newly created active directory without successfully creating the requested host outputs. This contradicts supported absent-output creation and immutable-before-state versus expected-self-effect separation. Existing fixtures pre-create `.github/instructions` (`isolated-stage.test.ts:332-334`), so removal of a leaf mirror does not cover this case.

**Smallest bounded fix:** explicitly model required parent-directory creation as an owned, checked topology effect and advance only its expected state while retaining the immutable before-state. Preserve pre-effect absence/symlink/concurrent-drift guards; never refresh expected topology from arbitrary current filesystem observations. Alternatively separate source-authoritative detection facts from publication-created topology with an equally strict, bounded invariant. Do not simply ignore all directory drift.

**Missing regression:** actual apply to a configured host whose entire detection/output root is absent, followed by passing check and correct ledger/parity. Add a distinct foreign creation/symlink mutation case that still refuses. Ensure receipt/effect handling does not report a completely effect-free failure after its own parent creation.

## Four-contract assessment and retained corrections

### Snapshot and plan

The replacement inventories canonical content, workflows, producer scripts, local CLI production code, package/config inputs, and root resource variants. Declared destination bytes are separately retained and checked. Source topology is represented, and Git HEAD/output identities are retained. Producer-dependency drift coverage now targets a real loaded producer dependency. **P1B-B** leaves authority-relevant configuration Git facts outside that universe. **P1B-C** leaves an expected-self-topology gap.

### Candidate production and validation

Stage ownership normalization remains stage-only; it does not itself grant active authority. Real calculate-tokens, index, and capability phases remain, with failures propagated. Exact index/table sets, workflow/specialist transforms, resources, and rendered capabilities are checked. Fresh stage/evidence containment and preservation exclusions are retained. No new load-bearing pure-output proof poisoning bypass was established: prior clearable outputs are removed, the archived old lock is removed, and actual archived producers run against the old source snapshot. Current canonical changes are not incorrectly required to equal the old proof inputs.

Mixed-file handling deliberately has narrower supported reconstruction regions. That is a safe refusal for a genuinely changed file outside supported authority, not itself permission to force ownership. No new concrete required changed mixed path lacking authority can be established without a candidate run, which this reviewer is forbidden to perform. **P1B-A** is different: it unnecessarily demands authority for unchanged mixed files before that distinction can be made. Fix it before interpreting any current-root mixed-path failure as a missing user authorization.

### Changed-set authorization and scoped metadata

Only changed paths are ultimately passed to publication and ownership merging, fixing the prior silent equal-byte acquisition. But **P1B-A** violates the required ordering and proof scope.

Metadata uses an exact category-token-metrics projection, not a whole-file authorization shortcut. Nonmetric producer mutations are rejected; metric-changing candidates are composed from active metadata plus generated metric values. Unchanged metrics restore exact active bytes; actual metric changes require the approved canonical two-space/final-newline representation. Initial scoped adoption compares independently reconstructed old metric projections to both current worktree and regular index projections; full current identities are retained for drift. The accepted parser/persistence integration is not reopened here. No additional metadata scope broadening defect was found statically.

### Publication, merge, and receipts

Before-bytes are archived exclusively; actual output bytes are rehashed through stage/temp/published states. Expected destination digests advance to the already-validated stage digest, not a reread foreign value. Changed verified ownership merges into the previous ledger, preserving unrelated entries and registry/source/disclosed state instead of wholesale importing the stage ledger. Ledger replacement is last. Rename effects and verified paths are separate; a failed readback can retain the already-recorded output/ledger rename. These address the corresponding old R5 causes at source level, subject to parent execution. **P1B-B/C** still prevent accepting the complete lifetime contract.

CONTRIBUTING retains the candidate/review gate, check-only hook rule, non-adoption of unchanged unknowns, scoped metadata limit, format prerequisite, and ledger-last description. No documentation wording grants execution approval. Its claims should not be treated as verification of the two remaining lifetime gaps.

## Verification and evidence limits

- **Current replacement:** parent-owned full fixture/public-path suite and explicit semantic qualification were reported running/pending when assigned. No current result was supplied during this review; no PASS inferred. Added tests and their assertions were inspected, not executed.
- **Accepted schema prerequisite:** separate independent schema APPROVE and parent-reported focused 42 PASS/393 ms remain scoped to that prerequisite, not the new coordinator.
- **Historical foundation:** the brief records frozen replay/full-foundation four meaningful R5 behavioral failures plus a README Git-fixture omission and separately passing corrected README/workflow controls. Those are prior-version evidence, not current failures or current PASS.
- **Original RED:** NOT RUN. Earlier parse/setup failures are not behavioral RED.
- **Runtime:** parent evidence is Node 26.12.1, not Node 20 qualification. No host/model/runtime enforcement claim is made.
- **Cost:** MCP session telemetry was requested; host token usage and pricing are unavailable, so no exact cost is claimed.

## Required next action

One bounded correction batch for P1B-A/B/C and their distinct behavioral controls; retain all approved scope, existing regressions, immutable receipts, and schema qualification. Parent then executes the complete current fixture/public-path suite and baseline-attributed semantic checks, followed by independent safety re-review. No blanket force, extra adoption scope, root run, or inferred authorization.

**FINAL — reviewer frozen after writing this report.**

## Parent-attributed execution addendum — received after FINAL

This addendum preserves the original review above. Evidence was supplied by parent agent `fa39e940-38ca-442b-8d6b-bbc2f95ae819` in message `b4ddcb4f-1818-4886-b1d6-50f3271bf55a`; this reviewer did not rerun checks or independently execute the scenarios.

- Parent observed **49 cases: 39 PASS, 10 FAIL, 0 skipped; 97670.718083 ms**, retained at `artifact://131`. This replaces the earlier pending-results statement only for this subsequently supplied execution evidence; it does not retroactively turn the static review into executed verification.
- Parent reports strict semantic qualification retained only the same three BASE-attributed imported diagnostics and no owned diagnostics. This is not an overall typecheck PASS.
- Eight positive/ledger/ownership scenarios failed because the source inventory treated the coordinator's own sibling publication temporary file as foreign source: `skills/metadata.json.ags-tmp-*` or `skills/README.md.ags-tmp-*`.
- The post-rename ledger assertion was blocked before reaching the ledger by that publication failure. These traces do **not** establish a defect in ledger rename-effect tracking or demonstrate that the later callbacks/assertions ran.
- The public pnpm fixture failed with usage output because an extra `--` reached the existing strict CLI. The claimed public ingress sequence has therefore not been qualified by this run.

### P1B-D — Major: privately created publication temporaries invalidate source revalidation

**Observed parent evidence:** the eight scenarios above stop on the coordinator's own temporary path being inventoried as a foreign source addition.

**Source connection:** `publishStagedFile` creates the sibling temporary file at `2476-2484` before invoking `beforeRename` at `2486`; `captureCandidateSourceInventory` recursively captures ordinary files under `skills` at `1021-1044`. These are active coordinator effects, distinct from the missing-host-directory case P1B-C.

**Bounded fix:** account only for exact privately created expected temporary paths and their verified digests during lifetime checks, or relocate temporaries safely while retaining the required publication atomicity and topology checks. Preserve immutable before-state and record expected self-effects explicitly. Never blanket-ignore `.ags-tmp-*`, suffixes, or source subtrees; an unrelated or modified temporary-looking file must still cause drift refusal. Retain cleanup and partial-effect receipts.

**Verification needed:** rerun all blocked positive/ledger/ownership scenarios after correction, including the post-rename ledger control; add a distinct foreign temporary-looking file or mutation control so the fix cannot hide genuine drift.

### P1B-E — Major acceptance gap: the public pnpm invocation is not qualified

**Observed parent evidence:** the current public fixture reaches usage failure because the extra separator is forwarded to the strict CLI, rather than exercising stale-check → apply → passing-check.

**Bounded fix:** qualify the actual supported pnpm spelling against the existing package script and CLI, then align the public fixture and generation documentation with that spelling. The existing CONTRIBUTING adoption example at `223` uses the separator and requires the same qualification. Do not introduce a root override, ignore-unknown option, or parser relaxation to make an inaccurate invocation pass.

**Verification needed:** parent execution of the real copied-package pnpm ingress must reach the expected receipts, no-publication stale check, authorized apply/parity, unchanged unknown ownership, and passing check. A usage response is not behavioral coverage of those transitions.

### Updated disposition

Spec compliance and quality/security remain **CHANGES REQUESTED**. Parent's next single correction batch should cover P1B-A/B/C plus the two observed causes P1B-D/E. No root execution or adoption clearance follows from the 39 passing cases. Original RED remains NOT RUN; these current results are attributed execution evidence, not an invented historical RED claim. Reviewer remains frozen; only this authorized report addendum was edited.
