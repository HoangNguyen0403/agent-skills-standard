# Task 1 — Independent Static Safety Re-review, Round 5

**Status: FINAL — frozen review report.**

**Spec compliance: CHANGES REQUESTED.**  
**Quality/security: CHANGES REQUESTED.**  
**Root publication/adoption clearance: NOT GRANTED by this review.**

## Scope, authority and evidence

Reviewed the complete corrective production boundaries in `task-1-review-round-5.diff`, `task-1-route3-report.md`, prior R4-A through R4-E, Task 1 requirements, and the parent rulings at `progress.md:113–131`. Included new LockfileService/UninstallService namespace integration, prior producer reconstruction, active publication, candidate drift and ownership persistence. CONTRIBUTING source is outside this packet and was not edited or reapproved. Tasks 2–7 are not reopened.

The user's scoped adoption authorization is recognized: declared generated outputs pristine against pinned base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`, independently consistent with the prior producer, exclusive before-byte evidence, no edited/untracked output replacement, no `.agent` mutation, no blanket force or host-policy changes. New canonical SKILL/workflow content may legitimately differ from the old proof inputs. No repeat request for that same approval is made.

**Reviewer execution:** no tests, build, lint, generators, probes, adoption, rollout, formatting, commits, implementation edits or delegation. This report is the sole authorized write.

**Parent-attributed observed results, not reviewer executions:**

- Focused CLI: **31 PASS, 492 ms**.
- Full CLI: **64 files / 1271 PASS, 6.53 s**.
- CLI build: **PASS, 29 ms**.
- Rebuilt T09 consumer attempt 02: **PASS, 7.78 s**, 13 entries verified, no missing entries, decision/collector validation true.
- Coordinator attempt before fixture CLI dependency correction: **35 total / 1 PASS / 34 FAIL, 13.63 s**, shared setup missing `cross-fetch` due to missing CLI dependency link.
- Coordinator attempt after dependency correction: **35 total / 1 PASS / 34 FAIL, 24.399 s**, shared fixture `ReferenceError: plan is not defined` before `cliManaged` spreads. Parent authorized a **test-only** local `buildGenerationPlan(root)` initialization correction; production snapshot remains frozen. The latest viewed test source contains that initialization at line 204. No passing result for that later fixture revision was delivered before this report.

These coordinator outcomes are **setup failures, not behavioral RED**. No intended coordinator transition is qualified by the 34 shared failures. Current runtime is Node 26; Node 20 remains NOT RUN. Original preimplementation RED remains NOT RUN. Previous reports/failed attempts remain unchanged.

### Late parent typecheck evidence

Before final delivery, parent reported an explicit strict, no-emit TypeScript check of the two generation files using ES2022/NodeNext, Node types and `--ignoreConfig`; root tsconfig excludes this surface. Retained output: `artifact://98` (parent-owned). The earlier TS5112 invocation was configuration setup failure, not a semantic result.

The explicit check confirms four undefined `lockBaselineDigest` diagnostics at 2167/2174/2363/2473, independently supporting R5-A. It also reports test assertion message arguments of `string | undefined` and assignments to readonly `fs.rename` at 1082/1104/1115/1133. Correct the changed test typing using valid assertion-message values and the repository's supported mocking seam; do not suppress diagnostics or weaken behavioral assertions. Imported CLI ConfigService cast, SyncService Promise API/lib and RemoteMetadata diagnostics have not been baseline-attributed and are **not automatically classified as this change's regressions**. No overall generator typecheck PASS is claimed. The newest fixture-local plan fix is FINAL, test-only; no production correction or behavioral rerun was performed by this reviewer.

## Original R4 dispositions

| Prior finding | Round 5 disposition |
|---|---|
| R4-A: malformed ledger `try` | **Corrected statically.** Ledger temp cleanup now has catch/finally, preserves primary errors, invokes rename-effect callback before exact-byte readback verification (`1884–1971`). A separate undeclared coordinator variable blocks execution, R5-A. |
| R4-B: retained old output self-proves | **Materially corrected for pure generated mirrors/wrappers/indexes.** Pinned archive, old plan, lock removal and removal of pure generated targets force the actual base producer to recreate those files. The prior mirror/workflow unknown-preservation circular path no longer suffices. Mixed files have explicit poisoning or fail-closed refusal; limits below remain important. |
| R4-C: current canonical equality rejects legitimate updates | **Corrected statically.** Old proof uses the archived base; current source edits are allowed. Configuration/index binding remains separate. Changed-canonical positive test exists. Whole-file pristine output requirements are intentionally not waived for mixed source/output files such as metadata. |
| R4-D: ordinary install prunes canonical generation files | **Corrected in namespace design.** Canonical generation-only authority uses optional v2 `generation`, while actual CLI host entries retain owner/source/category/agent semantics. Lock writes and all-uninstall preserve the namespace; existing generation-owned AGENTS avoids index clearing. Parent CLI checks passed. Coordinator persistence still mishandles scoped previous entries, R5-B. |
| R4-E: invalid fixture/no lawful bootstrap | **Substantially corrected in source, runtime qualification still absent.** Alpha/Beta YAML now quoted with `metadata.triggers`; real producer baseline and real lock construction replace unauthorized first apply; child-phase failure and proof/adoption controls exist. Shared dependency/undefined-plan setup failures prevented intended transitions. Parent owns the newest test-only correction/results. |

Inherited resource variants match the actual producer's regex and fallback rules. Actual workflow alignment remains required; removing the prohibited copy-only test did not waive it. No new source finding is assigned to that authorized removal.

## Load-bearing remaining findings

### R5-A — [BLOCKER] Coordinator assigns `lockBaselineDigest` without declaring it

**Location:** `scripts/generation/isolated-stage.ts:2128–2138,2167–2174,2361–2367,2466–2474`.

The coordinator locals include stale/staged/applied/verified state, current/staged locks and adoption state, but no declaration for `lockBaselineDigest`. The first use is an assignment at line 2167. A literal search in the frozen production source finds only that assignment and subsequent reads—no declaration or import.

**Why:** Once fixture setup succeeds, the ordinary coordinator path reaches this assignment and throws `ReferenceError` in module strict mode before staging/generation. The catch returns a FAILED receipt. Thus normal check/apply/adoption cannot perform their approved behavior even though the module now parses and the CLI build passes (this root script is outside that build's acceptance surface). This is a static production finding; it was not executed or substituted for the parent's earlier setup failures.

**Bounded fix:** Declare invocation-local `let lockBaselineDigest: string | null = null` alongside current/staged lock state, preserving capture/recheck and error receipt behavior. Parent must then qualify actual coordinator scenario results, not merely module loading. Do not suppress the resulting error or bypass manifest drift checks.

### R5-B — [MAJOR] Copying the whole staged CLI manifest drops unrelated ownership and silently imports unapproved adoption

**Location:** `isolated-stage.ts:1884–1934`; producer semantics `OwnershipWriter.ts:88–91,120–155` and `SyncService.ts:198–222`.

`persistVerifiedOwnership()` initializes CLI entries from `stagedLock.entries` in preference to `previous.entries`. It then uses the staged registry/sources/disclosed map wholesale. The staged generator runs a full install lifecycle, which can prune entries outside this coordinator's declared output set and can automatically adopt equal-byte unknown host files. Those stage-only ownership changes are not filtered to the active publication/adoption decision.

**Concrete counterexamples:**

1. Active prior lock owns `.cursor/skills/...` while the current generation plan targets Copilot. The stage copies that file/lock; its install finalizer prunes the now-unselected Cursor entry and stage file. The coordinator intentionally publishes no deletion to that undeclared active path. Persisting the stage manifest nonetheless drops the active file's previous ownership entry. Active bytes survive but the approved generation loses unrelated authority/provenance outside its write scope.
2. A current lock exists, but one configured host mirror is not in it and already equals canonical bytes. Stage `OwnershipWriter.write()` adopts it through its equal-byte branch. Even with no changed output for that path and no scoped base adoption, wholesale stage-entry persistence can add it to active ownership. That contradicts unchanged-unknown no-op without silent adoption. The existing no-lock/no-outdated early return does not protect the case where a lock already exists or another approved file changes.

**Why:** Stage ownership is useful evidence of which producer emitted a changed host output; it is not authority for unrelated active ownership deletion/adoption. The requirement explicitly preserves prior entries, limits adoption to proved declared outputs, and treats undeclared active files as untouched.

**Bounded fix:** Start from the previous active entries. Overlay staged metadata only for the exact declared paths whose changed bytes were authorized and verified, or whose ownership adoption was explicitly approved and proved. Preserve every other previous entry and unrelated registry/source/disclosed metadata unless a separately authorized migration owns it. Do not import equal-byte unknown stage entries merely because the stage writer adopted them. Add two behavioral cases for the counterexamples above, asserting active byte and manifest retention/no new ownership. Keep the optional generation namespace and its existing CLI persistence tests.

### R5-C — [MAJOR] Candidate drift proof omits the producer sources that determine generated output

**Location:** `isolated-stage.ts:848–923,2145–2149,2247–2262,2369–2380,2437–2448`.

The inventory captures canonical skills/workflows, configuration, inherited root resources and host detection paths, excluding declared outputs. It does not capture `scripts/generate-indices.ts`, `scripts/calculate-tokens.ts`, `scripts/generate-capabilities-doc.ts`, or the CLI production sources those scripts import.

**Concrete counterexample:** After the stage copies source, a cooperating writer updates `cli/src/capabilities/agentCapabilities.ts` in the active checkout. The staged capability document still derives from the old table. Both final active inventory comparisons omit that file, so check/apply can accept a result that is stale relative to the final current producer. A concurrent edit to the actual WorkflowTransformer/IndexGenerator similarly escapes this inventory. This matters even when canonical skill bytes and destination baselines remain unchanged.

**Why:** Source-bound final generation includes the producer/transformer implementation, not only the content it transforms. This is an input completeness defect in the new drift guarantee, not a demand for hostile-writer isolation or for every repository file to be hashed.

**Bounded fix:** Include the actual staged producer scripts and their repository-local production dependency inputs, or bind a complete bounded producer source snapshot identity, in the before/staged/final comparisons. Exclude volatile dependency trees/logs and preserve documented dependency provenance. Add a deterministic producer-input drift case, e.g. capability table changed during staged execution, expecting a named source-drift failure and no publication. Keep the existing canonical-content drift test.

### R5-D — [MAJOR] Tracked/index adoption conditions are not revalidated at active publication

**Location:** `isolated-stage.ts:1512–1539,1562–1586,2428–2459`.

The proof checks `.skillsrc` and output Git index entries against the base, then runs candidate generation and later archives/publishes. Final guards recheck worktree bytes, candidate content and lockfile digests, but never re-read the Git index entries for proved adoption paths/configuration.

**Concrete counterexample:** Proof succeeds for a regular tracked mirror with index/base bytes equal. While the candidate stage runs, a cooperating user stages an alternate version of that path into the Git index without changing its worktree bytes. The final worktree digest still equals the recorded baseline; archive capture also checks only bytes. Apply can proceed although the scoped tracked/index condition is no longer true. The same applies to a staged-only configuration/custom-overrides change.

**Why:** The implementation and authorization explicitly include current tracked/index consistency. Like destination and source baselines, this evidence can drift during an asynchronous generation run. Initial Git proof alone is insufficient at publication time.

**Bounded fix:** Retain the exact proved regular tree/index entry identities for adopted paths and constrained config paths, then revalidate them immediately before archive/publication along with worktree baselines. Abort without overwriting index or worktree on mismatch. Add a staged-only drift negative; do not weaken the full-base/pristine condition or automatically reset user index changes.

## Prior-producer reconstruction: soundness and remaining execution constraints

The following assessment separates proof mechanisms from unrelated runtime availability:

- The old snapshot is created by `git archive` of the resolved full commit, not a worktree copy. Recursive symlinks/nonregular entries are rejected before old child execution. The proof plan is based on that archive; current canonical SKILL/workflow bytes are not injected into the old proof. This removes current/untracked content pollution from the old input tree.
- Pure category indexes, configured mirrors/resources, rules, wrappers, specialist exports, index JSON and capability docs are removed in the archived proof stage. The archived lock is removed. Therefore an inconsistent tracked **pure mirror/wrapper** cannot pass merely because the old ownership writer preserved the original bytes. Every requested target must exist as a regular file after execution and exactly equal the recorded blob. A poisoned tracked mirror negative is now materially relevant.
- Metadata token metrics are replaced with a sentinel and reconstructed. AGENTS marker regions are replaced; missing/unsupported regions fail closed. README metrics/badges are poisoned or explicitly refused when no independently rewriteable region is found. Generated skills README gets a sentinel requiring a rewrite. These techniques are not universal proof that arbitrary hand-authored parts are generated: outside-marker AGENTS prose, metadata version/routing fields and README category titles/descriptions are **old source inputs retained from Git**, not independent generator discoveries. They must remain identified as source portions; no permission to overwrite newly edited current source follows from reconstructing generated portions.
- `skills/README.md` generation consumes its existing headings/descriptions (`generate-indices.ts:207–244`) before rebuilding rows. A retained heading/description can legitimately be an authored input; poisoning an appended sentinel does not independently authenticate that heading as generated output. Do not report the whole document as derived from SKILL files alone. No extra finding is issued for preserving those explicitly understood old input portions, but they cannot be used to widen adoption beyond pristine whole-file authorization.
- Clearing full Claude `CLAUDE.md` in the proof may fail to reconstruct its authored prefix. That is a safe proof refusal, not authority to delete/ignore the prefix or to relax comparison. Unsupported mixed surfaces remain blocked or need explicit section-aware treatment; successful pure-output reconstruction must not waive them.
- Before-byte evidence uses exclusive writes/read-only mode and is captured before active publication for changed adopted paths. Read-only mode is cooperative filesystem protection, not host-enforced immutability. No stronger containment claim is made.

### Real-worktree metadata/version conflict must remain explicit

Current `skills/metadata.json` has authorized integration-owned version/source changes. It is both source and generated token-metric output. The whole-file adoption guard correctly refuses it if current bytes differ from the recorded base. That legitimate refusal is **not** evidence the integration edits are unauthorized, and not permission to force the base or current metadata over one another.

The current adoption implementation proves all unknown existing declared paths before deciding which paths actually need publication. Consequently a pristine subset of old mirrors may be blocked by an unrelated mixed output that cannot satisfy whole-file pristine proof. Do not silently relabel all such outputs as source-owned or weaken the guard to get a root PASS. Before actual root execution, the parent must identify which mixed outputs are already covered by trustworthy existing authority versus require a bounded section-aware ownership/publication treatment or an explicit additional scope decision. This review does not broaden the already recorded adoption approval. It also does not accept an indefinitely fail-closed command as a complete generation deliverable: every required prepared output still needs a safe final path and final consumer alignment.

## Namespace/lifetime assessment

- The distinct generation namespace corrects the R4 ordinary CLI category-pruning hazard. `LockfileService.write()` preserves and validates it; `UninstallService` avoids deleting the lock and clearing a generation-owned AGENTS index when it exists. Parent's focused/full CLI and consumer evidence supports those changed CLI surfaces within the reported scope.
- Actual host entry metadata is now derived using established skill ref, workflow key, specialist key, bridge agent and category index conventions rather than path-as-category strings. Claude mixed-authorship root rules are generation-owned rather than fake CLI bridge-owned.
- Ledger publication now has a complete temp lifetime, primary-error preservation, immediate rename-effect callback and exact serialized-byte readback check. Generated-file and ledger partial receipts distinguish applied from verified; no cross-file atomic transaction is claimed.
- Generation ledger entries are not self-hashed; no-op identity excludes `generatedAt`. Exclusive attempt directory reservation and fresh owned stage remain intact.
- Correct default publication policy remains: changed unknown requires explicit proof, edited-owned fails, absent outputs can be created, check never adopts. R5-B must prevent stage-local equal-byte adoption from leaking into that policy.
- No actual root generation/adoption or model/host capability claim follows from passing CLI tests or T09. Those results do not cover this root coordinator's missing variable or adoption race/manifest scope contracts.

## Bounded corrective batch and acceptance gate

1. Declare the per-invocation lock baseline state; retain all drift checks.
2. Filter staged ownership persistence to verified/explicitly authorized active paths, preserving unrelated prior authority and avoiding unchanged-unknown implicit adoption.
3. Bind producer source identity and recheck adoption Git/index conditions before publication.
4. Complete the parent-owned fixture setup correction; then run the covering coordinator scenarios on the new frozen source, retaining all prior setup failure results. Include the finite counterexamples above; do not weaken tests to hide authority refusals.
5. Resolve mixed-source/output final ownership safely within recorded scope; identify unavailable/unsupported proofs explicitly. Preserve metadata versions and authored source bytes.
6. Independent re-review and real final configured resource/ID/workflow alignment remain required before root publication clearance. Do not run root commands to reproduce the already established static defects.

## Rules, accounting and freeze

AGENTS.md, code-review, generator safety/evidence preservation and repository review/trust rules remain loaded from this session. MCP audit was called at the start and end of the static review, and file standards refreshed for the authorized source/test set. Generic React/product-routing warnings identify no missing React or product implementation lane here. Exact actor tokens/currency are unavailable; MCP session cost is partial and is not whole-task accounting.

**FINAL/frozen:** only this new report was written. Previous reports, immutable review diffs, source files, tests, ownership manifests, generated outputs and documentation remain untouched by this reviewer. Parent retains correction ownership and execution gating.
