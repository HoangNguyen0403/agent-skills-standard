# Task 1 — Independent Spec, Quality and Security Re-review, Round 2

**Status: FINAL — frozen review report.**

**Spec compliance: CHANGES REQUESTED.**  
**Quality/security: CHANGES REQUESTED.**  
**Safety disposition: do not run the actual root generator/apply yet.** Fixture-only verification can continue under parent ownership.

## Scope and evidence

Reviewed `task-1-route2-report.md`, frozen cumulative `task-1-review-round-2.diff`, all nine original findings, the corrective helper/tests, and direct producer/ownership contracts needed to adjudicate them. Requirements remain Task 1 in `docs/superpowers/plans/2026-10-28-diagnostic-prevention.md` and approved spec H03/S06. No source edits, checks, tests, build, lint, formatters, generators or delegation performed by this reviewer. This report is the only authorized artifact write.

Parent supplied these observed results during review; they are **parent-attributed evidence**, not reviewer executions or independently inspected raw logs:

- `isolated-stage`: 12 tests, 5 PASS / 7 FAIL, 3596 ms.
- SyncService/lifecycle: 2 files, 80 PASS, 403 ms.
- No Node 20 binary available; actual runtime Node 26. The removed unsupported API can be assessed statically, but runtime-floor compatibility is NOT RUN.
- Original preimplementation RED remains NOT RUN. No historical RED is claimed.

## All nine original findings: dispositions

| Original finding | Disposition on frozen round 2 | Evidence / remaining work |
|---|---|---|
| 1. Wrong CLI root | **Closed statically** | `index.ts:8–9` resolves two parents. Coordinator compares realpaths; direct index generator uses realpath preflight. Foreign-cwd subprocess test exists. Root happy-path runtime not executed. |
| 2. Incomplete generated surface | **Partially corrected; open** | Configuration-derived mirrors, category indexes, workflows and specialists now declared. Repository-root LICENSE/NOTICE fallback and missing configured workflow sources are not covered; see R2-D. |
| 3. No actual host ID-set verification | **Open** | New validation consumes the wrong producer format for `_INDEX.md`; matching remains unrestricted subset membership. Complete mirror inventory is removed before bootstrap. See R2-A/E/F. |
| 4. Symlink/physical containment | **Partially corrected; open** | Declared destinations/ancestors use existing safePath checks and realpaths. Undeclared symlinked category inputs can still lead actual generator writes outside the stage; see R2-B. |
| 5. Nonexclusive attempts/stages | **Closed statically for the original scenario** | Validated attempt ID, exclusive `mkdir`, `wx` initial log/receipt, `mkdtemp` owned stage, cleanup limited to that stage. Existing-directory and repeat-ID tests exist; no concurrency execution claimed. |
| 6. Digests/drift/atomicity/partial results | **Substantially corrected; still open** | All declared destinations revalidated in check/apply; stage and temp digests checked; per-file rename and final digest check implemented. Last renamed file can disappear from the partial-effects receipt if post-rename verification fails; see R2-H. Ownership conflicts also remain, R2-C. |
| 7. Swallowed token failure | **Closed statically** | Cumulative diff contains calculator catch with `process.exit(1)`; coordinator rejects nonzero phases. Phase-failure fixture exists, but not all intended assertions were reached in parent run. |
| 8. Node 20 unsupported Promise API | **Closed statically; runtime-floor evidence absent** | `runInStage:730` uses Promise constructor, not `Promise.withResolvers`. No Node 20 execution available. |
| 9. Misleading/missing regressions | **Partially corrected; open** | Real coordinator/temp filesystem tests replace hash-only assertions and nested stage fixture. Fixture producer mismatches and early failures invalidate claimed coverage; see R2-G and parent results. |

Migration preservation remains sound in the reviewed source: automatic `.agent` copy/removal is stopped. The same-relative-path conflicting legacy/active note fixture is now present, checks both byte sequences across two cycles, and is included in the parent-reported passing lifecycle run.

## Remaining findings and minimal corrections

### R2-A — [BLOCKER] Actual `_INDEX.md` output is a table, but validation only parses bullet IDs

**Location:** `scripts/generation/isolated-stage.ts:77,564–570,585–608`.

The single `ROW_ID_PATTERN` recognizes `- **[category/skill]**:`. That is the shape of `skills/index.json` values, not canonical or native category `_INDEX.md` files. `IndexGeneratorServiceImpl.ts:185–198,210–227` emits table rows such as `| common-tdd | ... |` and `| **common-security-audit** | ... |`, using category-local IDs. Existing `skills/common/_INDEX.md:6–24` and `skills/specialists/_INDEX.md:6–23` confirm the actual producer format.

**Why:** A correct real generation produces no IDs recognized by the new `_INDEX.md` validator and fails parity for every nonempty canonical/host index. Fixing the current fixture-only failures will not fix actual generation. The stub at `isolated-stage.test.ts:38–57` emits invented bullet-format `_INDEX.md` bodies and therefore hides this production mismatch.

**Fix:** Parse each actual surface according to its producer contract: table rows in File Match/Keyword Match sections with category qualification and bold-marker handling for `_INDEX.md`; qualified bullet IDs for `skills/index.json`. Reject malformed/duplicate IDs within the owned scope. Add a narrow contract fixture produced by the actual index service, not a stub that invents its own output schema. Do not run the root generator to discover this already-established mismatch.

### R2-B — [MAJOR] Symlinked categories are omitted from the plan but followed by the real generator

**Location:** `isolated-stage.ts:153–176,265–292,672–691,902–926`; actual producer `scripts/generate-indices.ts:129–132,173–178`.

Plan discovery uses Dirent `isDirectory()`, which excludes symlinked category directories. Stage copy preserves those links. The actual generator instead uses `fs.statSync(...).isDirectory()`, follows them, and writes each generated canonical `_INDEX.md` with `fs.writeFile`.

**Why:** A `skills/extra-category` symlink to an external directory containing a valid skill can be absent from metadata/config, so configured-category validation does not reject it and it contributes no declared paths to safePath preflight. The copied absolute link remains in the stage; actual generation then writes `extra-category/_INDEX.md` through that link outside the stage—even for `--check`. This is an existing-link path, not a hostile timing-race claim. The declared-output guard alone is insufficient while actual output discovery differs.

**Fix:** Before any child runs, inspect the complete source topology that the generators can traverse and reject symlinked write ancestors, including categories omitted by plan enumeration. Align producer/discovery traversal rules or fail closed on every nondependency source link relevant to generated writes. Add a fixture with an unconfigured symlinked category and assert external bytes remain unchanged and no child executes.

### R2-C — [MAJOR] Stable user-edited/unknown host outputs are forcibly replaced without ownership adjudication

**Location:** `isolated-stage.ts:928–943,1042–1054`; existing contract `OwnershipWriter.ts:93–117` and `SkillSyncService.ts:182–185`.

The helper deletes declared mirrored packages, indexes, non-Claude rules, workflows and specialist exports from the stage, regenerates them, then renames them over active destinations whenever those destinations still equal the pre-run baseline. It does not determine whether the pre-run bytes are a user-edited owned file, a differing unknown file, or a configured override.

**Why:** A host mirror edited before this invocation passes the concurrency-baseline check. Deleting its stage copy bypasses the ownership writer's kept/unknown protections, and default apply overwrites the edit. A digest baseline detects concurrent changes; it does not grant ownership or authorize forced replacement. This contradicts Task 1's edited-destination refusal and S06's edited-owned conflict requirement. `custom_overrides` is not represented in the helper's loaded config either.

**Fix:** Classify destinations against authoritative ownership/approved generated-surface baselines and configured overrides before permitting active publication. Reject differing unknown or edited-owned destinations; do not silently force/adopt them because their path is declared. Keep deterministic stage regeneration separate from permission to replace active bytes. Test a preexisting edited-owned target and an unknown conflicting target with an unchanged pre-run digest; both must remain intact with an explicit conflict result.

### R2-D — [MAJOR] Configuration-derived discovery still omits real resource outputs and silently drops missing configured workflows

**Location:** `isolated-stage.ts:123–143,286–290,350–361,411–428,629–647`.

`listPackageFiles()` inventories only the package directory. Actual `collectLocalSkill()` additionally inherits repository-root LICENSE/NOTICE files unless a case-insensitive same-name package resource overrides them (`generate-indices.ts:56–74`). A root `LICENSE` exists; for example `skills/common/common-tdd` has no package-local license, so this fallback is relevant to the configured workspace. Those mirrored licenses are not declared, reset, compared or copied back by the helper.

Workflow inventory is only the intersection of `.skillsrc` keys and existing source `.md` files. A selected workflow whose source is absent contributes no expected wrapper and no error.

**Why:** License-only drift or missing inherited license bytes can evade `--check`, and apply omits required resource updates. A missing selected workflow can similarly disappear from discovery while the helper reports the remaining outputs complete. This is incomplete configured surface verification, not harmless preservation of an unrelated orphan.

**Fix:** Match the actual collector's inherited-root resource and override rules in one shared/reused declaration contract; bind mirror parity to the true source resource path. Validate configured workflow keys against canonical source keys before taking the final plan, then declare every resulting wrapper. Add inherited-license drift and absent-selected-workflow negatives. Preserve intentionally undeclared bytecode/orphans separately; do not conflate them with required resources.

### R2-E — [MAJOR] Unrestricted subset matching is not ownership-scoped ID-set parity

**Location:** `isolated-stage.ts:585–626`; Route 2 report lines 167–174.

The validator checks only `expectedIds.filter(id => !rows.has(id))`. It ignores every extra row, duplicates, malformed IDs, known canonical skills excluded by configuration, and previously owned retired rows. The same policy applies to canonical generated indexes/index.json, where arbitrary legacy rows are not an ownership-preservation requirement.

**Why:** After correcting R2-A, an index containing all selected IDs plus a known-but-excluded skill passes. So does an owned retired discovery row. Preserving unknown files does not authorize advertising them as current configured discovery. The report's decision to allow every unknown/legacy row makes a material unapproved reduction from complete configured ID-set verification.

**Fix:** Compare exact expected sets within authoritative owned/configured discovery scope. Classify out-of-scope preserved unknown files/rows explicitly using provenance; fail on malformed IDs, duplicates, unexpected owned IDs and known configured exclusions. Do not delete unknown files to achieve equality. Canonical generated sets should match the producer's complete canonical source set. Add selected-plus-excluded and previously-owned-retired negatives alongside the omitted-row test.

### R2-F — [MAJOR] Clearing selected mirror package bodies before bootstrap violates the complete-inventory prerequisite

**Location:** `isolated-stage.ts:928–943`; `generate-indices.ts:310–330,399–407`; `SyncService.ts:482–519`; `OwnershipWriter.ts:79,106–117`.

The helper removes every selected mirrored `SKILL.md` and resource before invoking the generator. Without a lockfile, generation first calls `applyIndices` against the first configured host mirror, before writing selected skills. With a partially selected category, undeclared legacy/unselected package bodies remain while selected bodies are absent.

**Why:** That bootstrap can write an index consisting only of remaining unknown packages. Later skill installation restores selected packages, but the ownership writer's previous manifest is empty and it can preserve the now-existing, differing bootstrap index as unknown rather than overwrite it. Once R2-A is fixed, the final missing-ID check correctly rejects this result, but valid configured generation still cannot complete for this supported inventory state. The fixture stub writes indexes directly and never exercises this actual ordering.

**Fix:** Retain a complete bootstrap-readable package inventory in the stage. If selected mirror bytes must be refreshed, seed/refresh them from canonical inputs before any index bootstrap, or correct the generator's staging-specific ordering so indexes are emitted after complete skill regeneration without an unknown-file collision. Do not delete package inventories as a substitute for refreshing only generated index surfaces. Add a no-lockfile, subset-selected category fixture containing a preserved unknown package and use the real relevant index/ownership path.

### R2-G — [MAJOR] Coordinator tests are more behavioral, but fixture failures and schema substitution still prevent the claimed proof

**Location:** `isolated-stage.test.ts:32–92,103–224,341–437,510–525`.

Parent observed seven failures. Source inspection explains material fixture issues:

1. Fixture source includes `skills/specialists/specialist-arch/SKILL.md`, but its stub index producer only handles common/typescript and omits canonical specialists indexes/index.json. It also never recreates the declared Copilot bridge rule after the coordinator clears it. These early parity errors prevent several success/drift cases from reaching their intended assertions.
2. The absent-to-present mutation stub writes the active capabilities destination before the capabilities phase has created any stage `docs` directory; in the absent-baseline fixture the active `docs` parent is absent. Parent observed ENOENT before drift adjudication. This does not prove absent-to-present protection.
3. Symlink preflight is inside the coordinator's result-producing catch. The test expects `assert.rejects`, while the actual contract returns `success: false` plus a failed receipt. Parent observed this mismatch.
4. `_INDEX.md` stub output has the incorrect bullet schema (R2-A), so even a green stub suite would not establish real producer compatibility.

**Why:** The changed business contracts are complete generation/parity and no-copy-back on stage failure/drift. A test that fails earlier on unrelated fixture errors supplies no evidence for the intended boundary. The original hash-only tests are gone, but the report still cannot claim these scenarios are qualified. The only coordinator test file under review does not contain a real-table producer control, edited-owned conflict, root-license fallback, owned/excluded extra-ID, or post-rename partial-effect control.

**Fix:** Repair fixture fidelity and expected result contracts, not production requirements merely to make stubs pass. Ensure each negative fails for its intended named cause, with preserved bytes and retained result. Have narrow controls use actual producer output contracts. Keep parent execution counts and original RED history unchanged; new results belong to a fresh correction attempt.

**Specialists adjudication:** Native specialist exports are separate from selected host skill mirrors, but it is not correct to drop specialists from all canonical index expectations to repair this fixture. The actual `generate-indices.ts:129–178` scans every nonhidden canonical directory, and `IndexGeneratorServiceImpl.ts:106–135` does not exclude specialists. Existing `skills/specialists/_INDEX.md` is a generated canonical table. Therefore the observed missing-specialists canonical error is an incomplete stub, not evidence that the production plan should omit that canonical output. Host specialist export declarations remain separate.

### R2-H — [MAJOR] A renamed destination can be missing from the failed receipt's actual-effects list

**Location:** `isolated-stage.ts:816–825,1053–1054,1080–1107`.

`publishStagedFile()` renames the temp file into the destination, then performs a digest read/verification that can throw. `appliedFiles.push(relPath)` happens only after the entire function returns successfully.

**Why:** If post-rename verification fails—for example a read error or unexpected changed bytes—the destination was already replaced but that path is absent from both the returned `copiedBackFiles` and failed receipt's `appliedFiles`. The advertised “files renamed into place by this invocation (partial on failure)” contract is therefore still false for the last publication. This is an audit/partial-effects bug, not a demand for a cross-file transaction or hostile-writer guarantee.

**Fix:** Record the rename effect immediately after successful rename independently of verification success, or return/propagate a structured publication result that preserves that effect on error. Distinguish renamed from verified states in the failure result. Add a deterministic post-rename verification failure control asserting the changed path remains listed; retain the actual destination and never blanket-restore it.

## Positive changes and boundary limits

- Actual CLI root derivation and direct generator physical-cwd preflight are corrected statically.
- Exclusive attempt directory reservation, `wx` evidence publication and owned `mkdtemp` stages address the original reuse/collision defect.
- All declared baselines are now checked in check/apply modes, staged bytes are rehashed, temp copies are digest-checked, and publication uses per-file rename followed by verification. These improvements do not resolve ownership authorization or R2-H.
- No automatic active-tree deletion is added; staged missing declared outputs are rejected rather than deleted from the destination.
- Calculator failure propagation and Node-20-compatible Promise construction are corrected in source. Node 20 runtime qualification remains absent, not waived.
- Per-file rename is not a cross-file transaction. The documented cooperating-writer limitation is appropriate; no hostile filesystem isolation or host enforcement is claimed.
- Check mode still executes generators in a stage and writes attempt evidence. It must not be treated as intrinsically read-only until source topology and producer write containment are established.

## Correction and verification gate

1. Correct actual table/bullet parsers and exact owned/configured ID sets.
2. Bound the full generator-traversed topology, including undeclared symlink categories, before child execution.
3. Preserve active edited-owned/unknown conflicts and overrides; retain complete bootstrap package inventory.
4. Complete inherited resource and configured workflow discovery.
5. Make post-rename partial effects truthful.
6. Repair fixture fidelity/expected failure contracts; qualify each negative at its intended boundary.
7. Parent runs focused fixture/lifecycle gates on a fresh frozen correction. Only after safety findings are resolved should the actual staged root check/apply be considered. No real root generator was run or authorized by this review.

## Loaded rules and accounting

Loaded earlier in this session and reused: AGENTS.md, code-review workflow, caveman-review, ags-generator-safety, sdd-evidence-preservation, repository review/trust policy, and MCP TypeScript/testing/best-practices/TDD/security review standards. MCP file standards refreshed for the corrective write set and compliance audit completed. Generic React routing warning identifies no React surface in this Node slice. Exact actor token/currency cost unavailable; MCP cost report remains partial and is not end-to-end task accounting.

**Final freeze:** this report is complete. Implementation remains frozen pending parent correction routing. No implementation files or prior review/report artifacts were changed by this reviewer.
