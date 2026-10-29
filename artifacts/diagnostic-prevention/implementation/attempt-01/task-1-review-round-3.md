# Task 1 — Independent Spec, Quality and Safety Review, Round 3

**Status: FINAL — frozen review report.**

**Spec compliance: CHANGES REQUESTED.**  
**Quality/security: CHANGES REQUESTED.**  
**Execution gate: no actual root generation, apply, adoption or force authorized by this review.**

## Review basis and observed evidence

Reviewed frozen cumulative `task-1-review-round-3.diff`, the appended Round 2 Corrective Follow-up in `task-1-route2-report.md`, R2-A through R2-H, current corrective helper/tests, and the direct index, bridge, specialist, resource-collector, lockfile and ownership interfaces. Requirements remain the approved Task 1 brief and plan Global Constraints, H03/S06. No source edits, tests, checks, build, generation, delegation or premium consultation performed by this reviewer. This report is the sole authorized write.

Parent supplied the following actual result; it is **parent-attributed**, not a reviewer execution or independently inspected raw log:

- New suite: **16 total, 1 PASS / 15 FAIL, 395 ms**.
- All 15 failures occur in shared `createFixtureRepo` at line 173: `real producer must index beta`, actual empty string, expected `/common-beta/`.
- Consequently **none of those 15 intended coordinator transitions executed**. These are setup failures, not behavioral RED and not evidence that the intended production guards failed.
- Previously reported lifecycle run: 2 files / 80 PASS. Not rerun here and not fresh proof for later unrelated edits.
- Node 20 runtime evidence remains unavailable; actual parent runtime is Node 26. Original preimplementation RED remains NOT RUN.

The implementation author's read-only claim that 88 mirrors and 6 workflows currently conflict is retained as an attributed source report, not an actual root generator outcome. That fail-closed state is not permission to force ownership.

## Disposition of R2-A through R2-H

| Finding | Round 3 static disposition | Remaining qualification |
|---|---|---|
| R2-A: table/bullet parser mismatch | **Corrected statically** | Separate table parser and qualified bullet parser now match actual surface shapes. Real-producer fixture integration exists but fails before use; no passing runtime qualification. |
| R2-B: undeclared symlinked category writes | **Corrected for the identified path, statically** | `assertNoSourceSymlinks` runs before discovery/children; checks skills root, category entries and workflow/specialist entries. The old unconfigured-category escape is refused before generators. Regression has not reached its scenario. |
| R2-C: edited-owned/unknown overwrite | **Still open — R3-A** | Mirror/workflow preservation now detects many conflicts, but bridge/index/specialist producer paths bypass OwnershipWriter. Active publication has no independent authority check. |
| R2-D: inherited resources and selected workflow disappearance | **Partially corrected — R3-C** | Selected missing workflow sources are now explicit preflight failures. Literal root LICENSE/NOTICE fallback is present, but producer-supported case/extension variants remain omitted. |
| R2-E: unrestricted subset ID matching | **Corrected statically** | Exact missing/unexpected sets, duplicates, category-key sets and captured malformed IDs checked. Canonical specialists remain included appropriately. Scenario tests not exercised. |
| R2-F: delete-before-bootstrap inventory loss | **Corrected for the identified deletion path, statically** | No stage clearing; absent selected mirror resources seeded without replacing existing bytes. Existing legitimate unknown/edited conflicts remain fail-closed. Positive integration not yet qualified. |
| R2-G: fixture/schema/transition proof | **Still open — R3-B** | Invented stub output replaced by real producers, but malformed shared fixture frontmatter prevents 15 scenarios from running; the explicit child-phase-failure regression has also been dropped. |
| R2-H: post-rename mutation omitted from receipt | **Corrected statically** | Successful rename is recorded before digest verification; renamed/verified lists separate in result and failed receipt. Regression does not reach rename yet. |

Earlier fixes remain present: correct CLI authoring root, realpath preflight, explicit dependency links, exclusive attempt directories, fresh owned `mkdtemp` stage, nonzero calculator/index failure, Node-20-compatible Promise constructor, all-declared baseline drift checks, staged/temp/output digest checks and per-file rename. No new contrary evidence found for those specific source fixes. These are static dispositions, not overall acceptance.

## Remaining batched findings

### R3-A — [BLOCKER] Active publication can still overwrite edited/unknown bridge, index and specialist outputs

**Locations:** `scripts/generation/isolated-stage.ts:827–996,1382–1395`; actual producer `scripts/generate-indices.ts:199–202,310–330,419–424`; `SpecialistSyncService.ts:124–151`; `OwnershipWriter.ts:22–28`.

Retaining stage outputs does not make every producer ownership-aware:

- Initial `AgentBridgeService.bridge(repoRoot, agents)` uses its default PassthroughWriter before `beginInstall`.
- No-lockfile index bootstrap calls `applyIndices` before the ownership writer is installed.
- Final `syncSpecialists(repoRoot, agents)` defaults to PassthroughWriter.
- PassthroughWriter performs safe-path validation followed by `fs.outputFile`; it does not preserve unknown or edited-owned content.

The new helper detects conflicts only when the **post-generation** stage bytes differ from expected authoritative content and equal the original baseline. If a passthrough phase already replaced a stage-local edit with expected bytes, this comparison succeeds. Copy-back then asks only whether the active destination still matches the pre-run digest.

**Why:** In an otherwise synchronized checkout, a user-edited `.github/copilot-agents/<specialist>.instructions.md` is copied into the stage, overwritten there by the final specialist phase, passes exact expected-content validation, and is renamed over the unchanged active edit. The same issue applies to applicable passthrough bridge/index outputs. This is a source-confirmed consumer path, not a requirement to run a destructive reproduction. Existing mirror/workflow conflicts elsewhere may currently prevent root apply, but they do not fix this independent overwrite path. New correct bytes and a stable baseline prove content and concurrency—not authority to discard an edit.

**Minimal fix:** Introduce an independent pre-publication ownership/adoption classification for **every** declared replacement, regardless of which writer produced its staged bytes. Require an authoritative previous generated digest or an explicitly approved, proof-qualified adoption record; preserve configured overrides; reject differing unknown/edited-owned active bytes. Do not infer authorization from stage success or from the generator's own regenerated manifest. Add negative fixtures for an edited specialist, edited bridge rule and no-lockfile edited index, asserting exact active-byte retention and no publication. Keep the existing mirror/workflow conflict checks.

### R3-B — [MAJOR] Shared fixture frontmatter is invalid; required failure-transition coverage is still absent

**Locations:** `scripts/generation/isolated-stage.test.ts:25–28,104–174,237–249,266–655`; `MetadataReader.ts:144–153,235–242`.

`SKILL_ALPHA` and `SKILL_BETA` use an unquoted YAML description containing `triggers: ` inside the scalar, e.g. `description: Beta skill (triggers: ` followed by backticks and `*.beta`. A colon followed by a space is a YAML mapping delimiter, not valid unquoted scalar content in this position. `MetadataReader.parseSkill()` calls `yaml.load` and catches parse errors as `null`; the real category generator skips such metadata, consistent with the parent's observed empty index. The top-level fixture `triggers` field is also not the structured `metadata.triggers` contract consumed by this parser.

**Why:** All coordinator scenarios depend on the shared assertion that fails first; their source existence does not supply protection evidence. This is invalid setup, not a production table-parser defect. Removing the beta assertion or inventing index output would conceal the malformed input and regress the previous review. Also, the current 16 tests no longer contain the prior explicit nonzero child-generation-phase failure case, so stage-failure/no-active-mutation/failed-receipt acceptance is not regression-covered even after setup is repaired. The fixtures throw during construction before `withFixture` enters its `try/finally`, leaving those failed temp trees without their intended cleanup.

**Minimal fix:** Quote/serialize the YAML description correctly and use valid `metadata.triggers`, retaining actual producer generation and the beta assertion. Ensure fixture allocation is cleaned up even if construction fails. Restore a real bounded child-phase-failure fixture and assert the intended named phase error, unchanged destination bytes, no published files, and a retained FAILED receipt. After the fix, parent must verify that every negative reaches its intended guard; do not treat another earlier conflict as success. Preserve the 1/15 result as historical setup evidence and run the corrected revision as a fresh attempt.

### R3-C — [MAJOR] Root inherited license discovery still does not match the actual collector

**Locations:** `scripts/generation/isolated-stage.ts:94,297–323`; actual `scripts/generate-indices.ts:56–74`.

The helper inherits only the two literal filenames `LICENSE` and `NOTICE`. The real collector enumerates repository-root regular files and matches `/^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i`, preserving each actual filename and package-local case-insensitive override.

**Why:** `NOTICE.txt`, `LICENSE.md`, or differently cased producer-supported root resources are generated into mirrors but are not declared, baselined, verified or copied back by this helper. Current literal LICENSE coverage is a meaningful correction, but it does not close the complete-output contract. A check can miss stale/missing resource variants; apply can silently discard their staged changes. This matters to legal/resource parity, not just filename style.

**Minimal fix:** Reuse the exact collector rule or share its root-resource enumeration. Enumerate regular root files with the existing regex, retain actual filenames, and apply the same package override rule. Cover at least one extension/case variant with package-local override and absent/stale mirror behavior. Do not pad tests for every spelling or remove the current literal LICENSE control.

## Safe completion and the reported 94 ownership conflicts

The helper now correctly fails many differing mirrors/workflows closed rather than overwriting them. That is a necessary safety result, **not a complete generation deliverable**. The parent still needs a safe path from proven existing generated outputs to current canonical outputs; accepting a command that cannot perform the approved configured regeneration would leave Task 1 incomplete.

### Can pristine Git plus old-canonical transformation establish bounded adoption?

**Technical answer: it can establish eligibility for explicit, bounded repository-generated adoption; it does not by itself grant overwrite authority.** It is not a generic `--force` substitute, nor proof of a historical install receipt.

A qualifying record must bind, per path:

1. A pinned, authorized Git revision and exact tracked output blob/path. Reject untracked paths, missing historical sources, foreign roots, symlink components and configured overrides.
2. Exact current destination bytes equal the tracked pristine output blob. A file merely being tracked, having a clean status in an unrelated checkout, or matching a newly manufactured baseline is insufficient.
3. The output blob is actually the expected generated derivative of canonical inputs and the applicable producer/transformer at that **same old revision** (including package-resource fallback rules and host transform options). A current transformer applied to old sources is not equivalent unless its identity/behavior is separately qualified.
4. The proposed destination belongs to the already approved configured generated-surface scope. Hand-authored mixed-content rule files require explicit section-aware treatment or a recorded owner decision; whole-file replacement cannot be inferred from a generated section.
5. A bounded adoption decision that authorizes those exact proven previous digests/paths, distinguishes newly established ownership from recovered historical ownership, and records excluded/conflicting paths. Revalidate active bytes against the proven previous digests immediately before use/publication.

Within an already recorded owner authorization to adopt those repository-generated baselines, this proof can support a normal ownership-aware update **without a new blanket force authorization**. If existing approval covers generation but not establishing ownership/adoption, or if the proposed paths include unproven/unknown/user-edited content, obtain an explicit bounded owner authorization before mutating ownership or active files. The current review request grants no adoption authority. Do not silently interpret absence of `.skills-lock.json` as consent, and do not invent successful proofs for all 94 reported conflicts.

### Existing interface assessment

The inspected interfaces are sufficient to represent an explicitly approved previous-digest manifest:

- `ManifestEntry` includes owner/source/agent/sha256 (`LockfileService.ts:9–14`).
- `LockfileService.write(rootDir, lock)` accepts a v2 manifest; `load` returns absent manifests as absent (`:87–126`).
- `OwnershipWriter` updates when current bytes equal the previous entry digest, otherwise keeps edited/unknown files unless force/adoption is enabled (`OwnershipWriter.ts:79–117`).

These APIs are **mechanisms, not authorization validators**. `adoptUnknown: true` unconditionally overwrites differing unknown content; fabricating a v1 lock to activate migration adoption is not safe proof-qualified adoption. `ags sync --force` also has a different remote-sync/lifecycle scope and is not an appropriate way to smuggle a local generator authorization.

A parent-approved proof record could materialize only its proven entries through an existing sanctioned manifest/receipt interface and provide those entries to stage ownership handling. Label the record as new explicit adoption, not an original historical receipt. Do not blanket-copy a stage-generated lockfile back into the active checkout, and do not let the stage claim ownership of arbitrary outputs merely because it regenerated them. The separate scout owns mapping any receipt-specific API beyond these inspected interfaces; none is invented or asserted here.

**Minimum completion contract:** qualified pristine-generated adoption permits the approved paths to update; unknown/user-edited/overridden paths remain untouched and produce explicit conflicts; subsequent runs retain a genuine authority chain rather than recomputing “ownership” from whatever bytes happen to exist. Root check/apply remains gated until this path, R3-A and the fixture evidence are resolved.

## Bounded corrective batch for next implementation owner

1. Repair valid real-producer fixture setup and setup-failure cleanup; restore the stage nonzero-failure negative. No root generation needed for those tests.
2. Add publication-time ownership authority independent of stage producer behavior, including passthrough bridge/index/specialist paths. Bind it to the existing approved manifest/receipt route established by the parent/scout; do not create a parallel force system.
3. Complete inherited root-resource enumeration using actual producer semantics.
4. Qualify the pristine-Git/old-transform adoption proposal read-only, then resolve explicit authority before any adoption. Preserve every failed proof as an unresolved conflict.
5. Parent runs the settled fixture suite on the corrected frozen source and records actual intended-boundary results. No historical RED reconstruction and no unrelated full-suite work.
6. Only after independent safety clearance and recorded adoption authority may parent exercise the actual isolated consumer check/apply with fresh attempt evidence, full configured output/ID parity and preserved active evidence.

## Rules, limits and freeze

AGENTS.md, repository review/trust policy, code-review workflow, generator safety/evidence preservation and MCP TypeScript/testing/TDD/security rules remain loaded. Corrective file standards refreshed; session compliance audited. No React surface is present despite the router's generic React warning. Exact actor tokens/currency unavailable; MCP cost report remains partial and is not whole-task accounting.

All source, previous reports and review snapshots remained untouched. No actual generation, adoption, lockfile write, ownership mutation, source check execution, tests, build or delegation occurred. Only this report artifact was written. This report is FINAL; next source ownership transfer remains parent-controlled.
