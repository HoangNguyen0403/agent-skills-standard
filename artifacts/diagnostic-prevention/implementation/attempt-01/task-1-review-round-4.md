# Task 1 — Independent Spec, Quality and Safety Review, Round 4

**Status: FINAL — frozen review report.**

**Spec compliance: CHANGES REQUESTED.**  
**Quality/security: CHANGES REQUESTED.**  
**Execution disposition: no actual root adoption/generation/apply clearance.**

## Authority, scope and evidence

The user's new **Authorize scoped ownership** decision is recognized as genuine authority, not inferred from hashes: only declared generated outputs unchanged from recorded Git base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`, consistent with the prior generator, with immutable before-bytes, edited/untracked/`.agent` refusal, no blanket force and no host policy changes. This review assesses whether the implementation satisfies those conditions. It does not request the user to approve that same bounded decision again.

Reviewed `task-1-review-round-4.diff`, `task-1-route3-report.md`, R3-A/B/C, Task 1 requirements and direct existing producer/ownership/pruning consumers. Package routing, documentation and the explicitly authorized removal of the copy-only WorkflowTransformer parity test are included. Unrelated parent-integrated changes in cumulative documentation/package version are not attributed to this owner.

**No source edits, checks, tests, build, generation, adoption, delegation or premium consultation performed by this reviewer.** Only this report artifact written.

Parent supplied this observed result during review:

> Coordinator command: transform failure at `isolated-stage.ts:1523:2`, `Expected finally but found return`; **0 behavioral tests executed, 1 file FAIL, 155.924584 ms, Node 26**.

This is a syntax/setup failure, **not behavioral RED**. It was not rerun. Prior 16-test/1-PASS/15-FAIL fixture results belong to the previous revision. Earlier CLI build, full T09 consumer smoke and CLI suite results are parent-attributed scope-specific evidence, not proof that this changed coordinator parses or that adoption is safe. Current CLI cleanup rerun and root generation remain pending. No Node 20/model/host-enforcement proof is claimed.

## Disposition of R3 findings

| Prior finding | Round 4 disposition |
|---|---|
| R3-A: passthrough producers bypass active output ownership | **Substantially addressed statically:** every existing declared output is checked against its v2 digest before staging; every differing unknown publication must have an explicit base proof. This closes the specific stage-passthrough overwrite bypass if proof/ledger issues below are corrected. Actual execution is blocked by syntax. |
| R3-B: malformed fixture and missing phase-failure test | **Still open:** Beta is quoted but Alpha retains the same invalid unquoted description; fixture initial apply lacks authority for deliberately stale outputs; the child-phase-failure test is restored but no behavioral test executed. See R4-E. |
| R3-C: inherited root resource variants omitted | **Corrected statically:** root regular files are enumerated with the same case-insensitive optional `.md`/`.txt` regex and case-insensitive package override rule (`isolated-stage.ts:304–330`). Variant tests exist but are not exercised. |

Prior real table/bullet parsing, exact configured ID sets, source-category symlink preflight, no stage clearing, seed-missing-only, exclusive attempts/stages, baseline/staged digest checks and immediate generated-file rename effects remain present. These are static corrections, not overall approval.

## Batched remaining findings

### R4-A — [BLOCKER] Ownership publication contains an unterminated `try`; the public command and hook cannot load

**Location:** `scripts/generation/isolated-stage.ts:1512–1524`.

`persistVerifiedOwnership()` opens `try {`, closes its body after `rename`, and immediately executes `return true` without a `catch` or `finally`. Parent observed the resulting transform failure at `1523:2`.

**Why:** The module cannot be imported. The coordinator test file executes no scenarios, and the newly routed public generation command and pre-commit check also fail before doing useful work. This is a current observed parse failure, not speculation or a test assertion regression.

**Smallest fix:** Complete the owned temp-file lifetime with a `finally` that cleans up only this invocation's exclusively created temp file, preserving the primary error and avoiding blanket restoration. Record a successful ownership-manifest rename immediately as an applied effect, independently of subsequent digest/readback verification, just as generated-file publication already does. Verify the final regular-file bytes against the exact serialized manifest before claiming the ledger verified; do not repair parsing by simply deleting the `try` and abandoning cleanup. Then parent runs the covering import/test command once on the new frozen revision.

### R4-B — [BLOCKER] “Prior producer proof” can accept a preserved tracked output without independently producing it

**Location:** `isolated-stage.ts:1184–1247`.

The proof unpacks the complete base archive—including its generated mirrors and workflow wrappers—links dependencies, invokes the old generator, then reads the resulting path and compares it with the same base Git blob. It does not remove or independently replace the eligible generated output in the proof snapshot, directly derive expected transformer bytes, or establish that the old writer actually emitted that path.

**Why:** The actual generator's ownership lifecycle preserves differing unknown files when its prior lock is absent. A tracked mirror/workflow wrapper inconsistent with old canonical input can therefore survive the old run unchanged. The proof then compares that surviving blob to itself and labels it prior-producer-consistent. This is exactly the circular-proof path prohibited by the authorization: tracked/pristine is necessary but does not establish genuine generated provenance. An invalid historical wrapper could become adopted ownership authority under the newly authorized mode. Running phases or seeing exit zero does not distinguish production from preservation.

**Smallest fix:** Independently derive every eligible old output from **old-base canonical inputs and the old-base producer/transformer**. For package files/resources, compare to the old collector's exact selected source bytes and fallback rules; for wrappers/specialists, actually transform old sources using the old implementation; for indexes, regenerate from a complete old inventory. Where using the old full lifecycle, ensure target output bytes cannot survive merely through unknown/owned preservation—use a bounded clean-output proof stage with complete bootstrap inputs, not a blanket deletion of package inventory. Mixed hand-authored/generated files need section-aware proof or must be excluded. Add a negative where a bad wrapper/mirror is tracked in the base and preserved by its old writer: base/current equality must still fail prior-producer proof. Do not broaden force authority.

### R4-C — [MAJOR] Adoption wrongly requires new canonical sources to be identical to the old base

**Location:** `isolated-stage.ts:1250–1322`; `isolated-stage.test.ts:386–409`.

After the old snapshot run, the helper compares every current package/workflow/specialist source to its base blob, then requires the complete current `skills`/workflow inventory and all its bytes to equal the base. The test explicitly expects a canonical source edit to make adoption fail.

**Why:** Updating canonical skills/workflows while retaining pristine old generated exports is the approved reason for this scoped adoption. The current implementation refuses that legitimate case, including this task's already approved source edits. It cannot complete the reported mirror/workflow regeneration even if those active outputs are pristine old generator products. This is an unapproved scope reduction, not added safety: it confuses immutable old proof inputs with mutable new candidate inputs. The new user message explicitly says not to require current canonical bytes to equal the old base.

**Smallest fix:** Build and validate the **old proof source inventory solely from the pinned Git archive**, with no current/untracked files mixed into it; independently prove old outputs as R4-B requires. Separately build and validate the new candidate generation plan from current approved canonical sources. Check current adoption **destinations**, not all current canonical inputs, against the exact eligible old output blobs. Respect current configured overrides and the authorized path scope. Replace the wrong negative with a positive: valid changed canonical SKILL/workflow inputs + pristine old outputs adopt and update; modified active outputs, untracked adoption outputs and polluted old-proof inputs still fail. Do not eliminate old-snapshot source validation—put it on the correct snapshot.

### R4-D — [BLOCKER] New shared lock entries make canonical generator inputs/outputs eligible for CLI install pruning

**Location:** `isolated-stage.ts:1331–1375,1489–1502,1931–1939`; consumer `cli/src/services/SyncService.ts:193–209`; `cli/src/services/install/OwnershipWriter.ts:120–144`.

`outputOwnership()` uses owner `index` and source `index:<relative output path>` for every nonmirror/nonworkflow/nonspecialist/nonrule output. This includes `README.md`, `skills/metadata.json`, `skills/index.json`, canonical category `_INDEX.md`, `AGENTS.md`, capability docs and similar authoring surfaces. Host index sources become `index:.github/skills/common/_INDEX.md`, rather than the existing `index:common` convention. These records are written into the same `.skills-lock.json` consumed by ordinary CLI install ownership.

`SyncService.completeInstall()` derives the category by stripping `index:`/`skill:` and taking the first slash segment. For `index:README.md`, it gets `README.md`; for `index:skills/metadata.json`, it gets `skills`; for the host index example, `.github`. None is the configured canonical category. Untouched entries in those categories are eligible for pruning. `OwnershipWriter.finalize()` deletes their regular files when bytes still equal the recorded digest, with backup, before post-prune index refresh.

**Why:** After authorized generation/adoption succeeds, the very next normal `ags sync`/install lifecycle can delete unchanged canonical README/metadata/docs or misclassify host index ownership. The coordinator's own later staged generator can also prune copied canonical metadata after reading it, leading to missing-output failures. Reusing the v2 data shape is not enough; existing reader/pruner semantics are part of the contract. Backups do not make unintended deletion acceptable, and a live reproduction is unnecessary to establish this direct control path.

**Smallest fix:** Keep true CLI-managed host entries in the established owner/source/agent semantics; preserve existing metadata where applicable instead of rewriting it into incompatible path-based categories. Represent repository-generation-only authority in a distinctly recognized, **non-install-prunable** portion of the existing authority interface, with all actual consumers migrated and tested. Do not stuff canonical repository outputs into ordinary host install `index` entries or silently create a parallel manifest with no integration. Add a real lifecycle regression: after a valid generation/adoption authority record, a normal install/refresh must leave canonical README/metadata/index/docs and prior unrelated entries byte-intact while still safely refreshing configured host outputs. No root `ags sync` run is requested.

### R4-E — [MAJOR] The revised tests still cannot qualify lawful publication/adoption transitions

**Locations:** `isolated-stage.test.ts:27–30,108–242,244–257,314–409,470–485`.

Three source-visible issues remain behind the observed syntax failure:

1. **Alpha still has invalid YAML.** Only Beta was quoted. Alpha retains `description: Alpha skill (triggers: ` followed by backticks and `*.alpha`, an unquoted scalar containing colon-space. `MetadataReader.parseSkill()` catches `yaml.load` failure and skips the skill. Once parsing is fixed, the fixture's beta assertion may pass, but its actual canonical/host index omits Alpha while the plan still expects it. This is still invalid setup, not a reason to relax parity.
2. **Initial publication is not lawfully bootstrapped.** Most tests first call `runIsolatedGeneration({repoRoot: root})` on the fixture with no v2 lock/adoption. That fixture deliberately contains stale metadata/index/AGENTS/capability/rule outputs. The new all-output authority gate correctly refuses differing existing unknown destinations. The tests expect the first apply to succeed anyway, so many cannot reach the intended second transition without an explicit valid fixture authority baseline or an absent-output construction path.
3. **The old-canonical-edit negative pins the wrong contract.** `base adoption rejects changed canonical inputs` codifies R4-C rather than the authorized update behavior. The success adoption case uses unchanged canonical sources and therefore cannot catch that rejection of the actual use case. The restored child-phase-failure case is meaningful in intent but has not executed and still shares the broken setup.

Fixture cleanup also starts only after `createFixtureRepo()` returns; failure during construction bypasses `withFixture` cleanup, unchanged from the earlier report.

**Why:** Zero behavioral tests ran on the current revision, and removing only the syntax error would leave invalid producer input and unauthorized fixture setup. A green result achieved by weakening active ownership checks or removing Alpha from expected sets would conceal production defects rather than qualify them. The business contracts are valid adoption updates, edited-output refusal, safe absent creation and exact partial-failure receipts—not stubbed API choreography.

**Smallest fix:** Make **both** skill frontmatters valid using quoted descriptions and the actual `metadata.triggers` structure, retaining real producers and exact ID checks. Establish each fixture through a legitimate known previous manifest or declared absent-output path, with exact source/destination digests; do not turn on blanket force/adoptUnknown to make setup pass. Add the R4-B circular-proof negative and R4-C changed-source positive. Make fixture construction cleanup exception-safe. Parent should then record actual per-scenario membership/counts and intended error causes on the corrected frozen revision.

## Positive source changes and limits

- Active publication authority is now a separate check from stage producer behavior: edited-owned files fail before staging, differing unknown files require explicit base proof, absent outputs remain creatable, and unchanged unknown outputs do not automatically create ownership in the nonadoption path. This is the right separation for R3-A.
- `--adopt-base` is explicit, full-commit-validated and apply-only; check mode refuses adoption. For this task the operator must use the specifically authorized recorded base, not treat arbitrary full SHAs as separately approved.
- Adoption before-bytes use exclusive writes with read-only mode, and proof records precede active publication. Exact current-output/base-blob comparisons exist. Those useful mechanics do not cure circular old-producer proof or grant authority beyond the user's scope.
- Baseline capture includes the lockfile, prior entries are shallow-copied, lock identity omits `generatedAt`, and the manifest is written after output publication. No lock self-hash is introduced. The malformed try lifetime and incompatible prune metadata prevent accepting these as a safe complete ledger design.
- Resource case/extension fallback now matches the actual producer selection and tests for `license.md`/`NOTICE.txt` exist. No passing resource test is claimed.
- Public `pnpm generate-indices` now targets the coordinator, while internal producer execution remains direct to avoid recursion. This routing is appropriate in design but currently exposes the parse failure to that public entrypoint and the hook.
- The removed WorkflowTransformer case compared checked-in copies with current transforms; its file-only helpers are dead and were removed under explicit instruction. Behavioral transformer tests remain. This deletion is **not** a waiver of actual final root workflow alignment; that acceptance remains pending and blocked by this review.
- Cooperative digest/rename safeguards are not hostile filesystem containment or cross-file atomicity. No runtime/platform/model efficacy/host approval claim is made.

## Corrective order and acceptance gate

One bounded corrective batch should cover all remaining findings, not piecemeal source churn:

1. Complete ledger temp-file/rename/error lifetime so the module loads and partial effects remain truthful.
2. Replace circular old-output preservation with actual independent old-base derivation; decouple new canonical inputs from old proof inputs.
3. Preserve CLI ownership/prune semantics and distinguish authoring-generation authority from install-prunable host inventory.
4. Repair real-producer fixtures and lawful fixture authority setup; retain absent/edited/untracked/override/drift/partial-failure negatives and add the old-proof/new-source controls above.
5. Parent runs the settled coordinator fixture tests and affected lifecycle/CLI checks on a new frozen revision, preserving this syntax-failure attempt. No original RED rewrite.
6. Independent review closes the safety findings. Only then may parent exercise the already authorized **scoped** root adoption using the recorded base, with immutable before-bytes and complete final output/resource/ID/workflow alignment. This report does not supply that execution clearance.

## Compliance and freeze

AGENTS.md and earlier code-review, generator-safety and evidence-preservation rules remain in session context. MCP file standards refreshed for the fourth-round write set and compliance audited. Current MCP session metadata restarted; its observed loaded list includes TypeScript, testing/TDD, architecture, best-practices and security standards, but that restart is not evidence previous review bodies were not read. Generic React/product routing warnings identify no missing React/product implementation surface in this Node generator review. Exact actor token/currency accounting unavailable; MCP session cost remains partial.

**FINAL/frozen:** This report is complete. No implementation files, ownership manifests, previous reports or immutable review packages were changed. Source remains frozen until parent transfers correction ownership. No actual root command or adoption executed by this reviewer.
