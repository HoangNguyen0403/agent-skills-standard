# Task 1 — Route 2 Repair Report (H03, S06 tooling)

**Status:** FINAL (implementation frozen; verification NOT RUN by this worker)
**Route:** `Personal - DeepSeek` (Route 2), sole Task 1 writer after Route 1 owner stopped
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`
**Branch:** `feat/diagnostic-prevention-improvements`, base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`
**Preserved history:** `task-1-report.md` and `task-1-review-round-1.md` were not modified or overwritten.

Original pre-implementation RED remains **NOT RUN** (code was authored before tests in the
original attempt; no historical RED is manufactured here). No build, lint, formatter,
generator, install or commit was executed in this repair round. Every claim below is a
static source statement; runtime results are parent-owned.

---

## 1. Review findings and their corrections

### Finding 1 — consumer entrypoint derived the wrong root
- `scripts/generation/index.ts:8` resolves the authoring root two levels above
  `__dirname`, and `runIsolatedGeneration` now compares **physical** roots
  (`fs.realpath` on both `process.cwd()` and `repoRoot`), so a symlinked worktree
  spelling cannot mask a foreign cwd and a lexical path cannot fake containment.
- `scripts/generate-indices.ts:114-115` uses the same physical comparison before any
  mutation.

### Finding 2 — declaration covered only five hardcoded paths
- New `buildGenerationPlan(repoRoot)` derives a bounded, configuration-derived
  inventory from `.skillsrc` (or `.skillsrc.yaml`), `skills/`, `.agents/workflows/`
  and `skills/specialists/`:
  - canonical: `skills/metadata.json`, `skills/index.json`, `skills/README.md`,
    root `README.md`/`cli/README.md` when present, every `skills/<category>/_INDEX.md`
    that owns registry skills, `AGENTS.md`, `server/AGENTS.md` when `server/` exists,
    `docs/agent-capabilities.md`;
  - per configured host: rule wrapper, every configured category `_INDEX.md`,
    every mirrored package file (`SKILL.md`, `references/**`, `scripts/**`,
    `assets/**`, `LICENSE`/`NOTICE`) selected through category `include`/`exclude`;
  - workflow wrappers produced by `WorkflowTransformer.transformParsed` for the
    host's actual `workflowFormat`/`workflowPath`;
  - specialist exports produced by `SpecialistTransformer.transform` for the
    host's actual `agentPath`/`specialistFormat`.
- The prior hardcoded/unused `deriveGeneratedOutputSurface` duplicate was removed;
  the plan is the single source of truth for baselines, parity and copy-back.
- Excluded on purpose: `.skills-lock.json` (mutable ownership manifest written by the
  install writer, not a declared generator output) and `native`-format workflow
  outputs whose target path equals the canonical `.agents/workflows/*.md` input.

### Finding 3 — category-dir check was not host ID-set verification
- `validateCategorySelections` now fails when a configured category is absent, when a
  category yields zero selected registry skills, or when an `include` target is not on
  disk.
- New `validateGeneratedSurface(rootDir, plan)` runs **after regeneration in the
  stage** and parses `- **[category/skill]**: …` rows from:
  - every canonical `skills/<category>/_INDEX.md`,
  - every `skills/index.json` category block,
  - every configured host `<agent.path>/<category>/_INDEX.md`,
  requiring every configured canonical selection to be present. This is the
  omitted-row negative control the review asked for; it is exercised by the new
  coordinator test.
- Parity also requires each declared mirrored package file to exist and (except
  Kiro's rewritten `SKILL.md`) to match canonical bytes, plus presence of rule
  wrappers, workflow wrappers and specialist exports.
- Because the ownership writer preserves differing *unknown* files when a stage has
  no lockfile, every declared host output that is rewritten by the generators
  (mirror package files, host category indices, non-merge rule wrappers, workflow
  wrappers, specialist exports) is deleted **from the throwaway stage only** before
  the phases run. Canonical inputs, undeclared mirror inventory and Claude's
  append-only `CLAUDE.md` are never cleared, and no `force` flag is used.
- Volatile Python bytecode caches (`__pycache__/`, `*.pyc`) are excluded from the
  declared mirror-resource set: they are local build artefacts, not authored
  package resources.
- Rule wrappers are declared only for agents whose `detectionFiles` exist, matching
  `AgentBridgeService`; Claude's `CLAUDE.md` is merge-only and is never cleared or
  reset.

### Finding 4 — symlink handling did not bound stage or copy-back
- Preflight `assertNoSymlinksUnderRoot` runs over **every declared output and all its
  ancestors** on the authoring root *before* the stage is allocated, then again on the
  copied stage *before* any generator executes. A source `docs` symlink is therefore
  rejected before `generate-capabilities-doc` could write through it.
- The same assertion runs again on the final stage source and destination immediately
  before publication, and destination lstat rejects non-regular terminal files
  (symlink/directory).

### Finding 5 — stage/attempt allocation was not exclusive
- Stage: `fs.mkdtemp(os.tmpdir()/ags-stage-)`; the `finally` clause removes only the
  directory this invocation created.
- Attempt evidence: parent ensured, then `fs.mkdir(logDir)` is the exclusive claim
  (an existing directory — including receipt-only prior attempts — is refused), the
  log is created with `flag: 'wx'`, receipts are written with `flag: 'wx'`, and the
  attempt id must match `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`.

### Finding 6 — digest/atomicity/drift/partial-report gaps
- Staged digests are captured once, then each publication re-hashes the stage source
  and refuses if bytes changed after hashing.
- Publication is a sibling temp file (`COPYFILE_EXCL`) → digest verify → `rename` →
  destination digest verify. No direct `fs.copy` overwrite remains.
- Destination drift is revalidated for **all** declared targets in both check and
  apply modes, and again per file immediately before its rename.
- A declared destination that exists but has no staged counterpart aborts
  ("refusing automatic deletion").
- Failures return the actual `appliedFiles` list (and staged out-of-date set) in the
  FAILED receipt instead of `copiedBackFiles: []`.

### Finding 7 — swallowed token-generation failure
- Verified `scripts/calculate-tokens.ts` already ends with
  `main().catch(… process.exit(1))`; no change required in this round.
- The coordinator additionally treats any nonzero phase exit as fatal and stops
  before parity/copy-back.

### Finding 8 — Node 20 compatibility
- No `Promise.withResolvers` anywhere in the helper; `runInStage` keeps the
  `new Promise((resolve) => …)` constructor form required by the repo's Node `>=20`
  floor.

### Finding 9 — missing/misleading regressions
- `scripts/generation/isolated-stage.test.ts` was rewritten around the real
  coordinator against real temp filesystem fixtures with stub phase scripts; the
  hash-only tautology, nested source/stage fixture and category-name-only test are
  gone. Covered behaviors: full apply (files, wrappers, specialist export, receipt,
  log), check-after-apply pass, stale check failure without destination mutation,
  generator phase failure with retained FAILED receipt and no copy-back, regenerated
  host index omitting a selected ID aborts, destination drift aborts, absent→present
  destination aborts, repeated attempt id never overwrites prior evidence,
  pre-existing attempt directory without a log refused, actual entrypoint foreign-cwd
  refusal with no writes, symlinked source ancestor rejected before generators, and
  stage copy exclusions/mirror retention.

### Spec-assessment gap — real source/destination conflict fixture
- `SyncInstallLifecycle.spec.ts` now creates `.agent/custom-note.md` and
  `.agents/custom-note.md` at the same relative path with different bytes and asserts
  both survive two install cycles; the previous unrelated-file case is retained.

---

## 2. Changed paths (this repair round)

- `scripts/generation/isolated-stage.ts` (rewritten)
- `scripts/generation/index.ts` (root derivation retained, comment clarified)
- `scripts/generation/isolated-stage.test.ts` (rewritten)
- `scripts/generate-indices.ts` (physical-root preflight)
- `cli/src/services/__tests__/SyncInstallLifecycle.spec.ts` (same-path conflict fixture)
- `artifacts/diagnostic-prevention/implementation/attempt-01/task-1-route2-report.md` (this report)

Unchanged from the prior attempt and retained as sound: the conservative `.agent`
preservation in `cli/src/services/SyncService.ts`, its unit expectations, the
check-only `.husky/pre-commit` (no active generation, no `git add`), and the
`scripts/calculate-tokens.ts` nonzero exit.

---

## 3. Read-only derivations performed (not tests, no writes)

Two inspection-only invocations of the pure plan builder were run from the
repository root; they allocate no stage, spawn no generator and write nothing:

- plan shape: 4 configured hosts (`copilot,antigravity,codex,claude`), 6 configured
  categories, 88 selected skill ids, 1644 declared outputs (1420 mirror resources,
  24 host category indices, 26 canonical category indices, 99 workflow wrappers,
  63 specialist exports, 4 rule wrappers), 0 absent declared baselines, 0
  non-regular declared paths;
- mirror byte comparison against current canonical bodies showed 88 pre-existing
  mismatches inside declared mirror files. Those are the in-flight canonical edits
  owned by Tasks 2–5 whose mirrors the parent regenerates after freeze; a staged
  apply legitimately republishes them from canonical input, and staged parity is
  evaluated after that regeneration, not against the current checkout.

No generator, test, build, lint or formatter was executed; these observations are
not acceptance evidence.

## 4. Commands NOT RUN here (parent verification)

No test, build, lint, formatter, generator or hook execution was performed in this
round. Planned covering commands:

```bash
rtk pnpm --filter ./cli exec vitest run src/services/__tests__/SyncService.spec.ts src/services/__tests__/SyncInstallLifecycle.spec.ts
rtk proxy node --import tsx --test scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx scripts/generation/index.ts --check
rtk proxy node --import tsx scripts/generation/index.ts
```

Expected behavior, not observed evidence:
- the isolated test file must pass on Node 20+ (the declared floor) and Node 24;
- the first `--check` on a dirty mirror must exit nonzero naming stale declared
  outputs; a clean tree must exit zero with `status: PASS`;
- apply mode must publish only stale declared outputs and leave every undeclared
  path (including `.agent/**`, `artifacts/**`, `.git/**`, dependency trees)
  untouched;
- the pre-commit hook must remain check-only (no `git add`, no in-place generation).

---

## 5. Decisions, limits and risks

- **Configured host units.** Output surfaces follow `AGENT_CAPABILITIES` (paths, rule
  file names, workflow format/path, specialist format/path) and `.skillsrc`
  selections; no new agent registry or abstraction layer was introduced.
- **Parity is subset-based for row sets.** Expected canonical selections must appear
  in each canonical/host index; preserved unknown/legacy rows are allowed because the
  ownership writer intentionally preserves unknown active-checkout files. Missing
  expected rows are fatal.
- **Stage-only reset.** Declared rewritten host outputs are removed in the
  throwaway stage to defeat unknown-file preservation; nothing in the active
  checkout or canonical sources is deleted.
- **Parity is presence-only for rule wrappers, workflow wrappers and specialists**;
  their bodies are produced by transformers that also normalize host frontmatter, so
  byte equality is not asserted there. Mirror package files are byte-checked against
  canonical except Kiro's rewritten `SKILL.md`.
- **Cooperating-writer model only.** Digest revalidation narrows, but cannot
  eliminate, the window in which a non-cooperating local writer mutates a destination
  between the last check and `rename`. This is not a hostile-sandbox or cross-file
  transaction claim, and it is not host enforcement.
- **Scope of staging.** The stage is a filesystem copy outside the repository,
  excluding `.git`, `.agent`, `artifacts` and dependency trees, with dependency
  symlinks only. It is not a kernel-level read-only mount; child processes inherit
  the environment.
- **Preservation over cleanup** is retained: ordinary migration never deletes or
  overwrites `.agent` state, including same-relative-path conflicts.
- **H01/H02/H04 hosting** remains external; nothing here claims host approval
  enforcement, activation, or pilot readiness.
- If the parent observes a failure, corrections must stay inside this owned write set;
  no metadata, mirror, dependency or generated-index files were touched here.

---

# Round 2 Corrective Follow-up (post `task-1-review-round-2.md`)

**Status:** FINAL (source correction frozen; verification NOT RUN by this worker)
**Authorized scope:** single Route 2 corrective follow-up after the independent
round-2 review. Parent-observed round-2 result (5 PASS / 7 FAIL) and the frozen
round-2 review are retained above; they are not rewritten or reinterpreted.
**Original pre-implementation RED:** still NOT RUN. No test, build, lint, formatter,
generator or root check/apply executed in this correction; Node 20 runtime
qualification remains absent.

## R2-A — actual `_INDEX.md` table contract
- `parseCategoryIndexRows()` now parses the producer's real table
  (`| skillId | files | keywords |`, `| skillId | keywords |`, optional `**`
  priority markers, separator/header rows skipped) with category-local IDs.
- `parseQualifiedRows()` keeps the qualified `- **[category/skill]**:` contract for
  `skills/index.json` values and validates the category qualifier.
- Both report malformed and duplicate IDs; all row sets are compared **exactly**.
- Verified read-only against the real workspace: common canonical index 44 IDs,
  specialists 21, host common 44, `index.json[common]` 44, zero malformed/duplicates;
  current canonical and host ID sets match the plan exactly (no fixture-schema
  substitution remains in validation).

## R2-B — generator-traversed topology
- Category/skill enumeration now uses `fs.stat` (follows links), matching
  `generate-indices`/`IndexGeneratorService`, so a symlinked category is discovered,
  its canonical `_INDEX.md` is declared, and containment preflight catches it.
- New `assertNoSourceSymlinks()` rejects symlinks at `skills/`, every category,
  `.agents/workflows` (the native workflow write path) and `skills/specialists`
  before any stage or child process.
- Regression: unconfigured `skills/extra-category` symlink to an external skill —
  run fails, external bytes/directory unchanged, log shows no phase executed.

## R2-C — ownership authorization instead of forced replacement
- The stage is **no longer cleared**; every existing host output reaches the real
  `OwnershipWriter`, which keeps edited-owned and unknown differing files.
- Post-generation validation compares each ownership-managed output with its
  authoritative producer content (canonical package bytes, transformer bytes for
  workflow wrappers, specialist transformer bytes) and, when the divergence is
  exactly the preserved baseline, aborts with an explicit `[conflict]` naming the
  edited-owned/unknown destination. Nothing is published in that case.
- `custom_overrides` are loaded from `.skillsrc` and overridden paths are excluded
  from declaration/validation/publication.
- Regressions: an edited mirror and a preserved baseline are both left byte-identical
  with no publication at all.

## R2-D — inherited resources and configured workflow sources
- Mirror collection now reuses the producer's rule: package resources plus the
  repository-root `LICENSE`/`NOTICE` fallback when the package lacks a
  case-insensitive same-name file; the mirror's authoritative source path is the
  root file. All 352 inherited license mirrors in this workspace are declared and
  byte-checked (0 absent, 0 differing today).
- Configured workflows are validated against canonical `.agents/workflows` sources;
  a selected-but-absent workflow source fails before staging instead of silently
  disappearing from the plan.

## R2-E — exact owned/configured ID sets
- Canonical `_INDEX.md`, `skills/index.json` (per category and category key set) and
  every configured host index are compared by exact set: missing IDs, unexpected
  IDs (including configured exclusions and retired owned rows), duplicates and
  malformed IDs all fail.
- Regression: `common` configured with `exclude: common-beta` while the preserved
  beta mirror still exists yields “advertises unexpected ids: common-beta”.

## R2-F — bootstrap inventory without inventory deletion
- Nothing is removed from the stage before generation. Absent declared mirror files
  are instead seeded from canonical input into the throwaway stage so the
  pre-`beginInstall` index bootstrap sees the complete selected package inventory;
  existing stage content is never overwritten.
- Regression: a wholly absent selected mirror skill is seeded, indexed and
  published with canonical bytes and inherited license.

## R2-G — fixture fidelity and intended-boundary failures
- Tests now run the **real** `scripts/calculate-tokens.ts`,
  `scripts/generate-indices.ts` and `scripts/generate-capabilities-doc.ts` inside the
  fixture stage, with a copied real `cli/src`. Fixture baseline indexes are produced
  by the real `IndexGeneratorServiceImpl`; the stubbed producer and invented bullet
  schema are gone, and canonical specialists coverage is retained.
- Negative cases assert the intended cause: stale check (no mutation), edited mirror
  conflict (bytes preserved), configured-exclusion extra row, absent workflow source
  (no phase executed), canonical omitted row after generation, drift, absent→present
  drift, post-rename partial effect, repeated/pre-existing attempt refusal, real
  entrypoint foreign cwd, unconfigured symlinked category, absent-inventory seeding.
- Preflight failures are asserted through the real result contract
  (`success: false` + FAILED receipt), not `assert.rejects`.

## R2-H — truthful post-rename partial effects
- Publication reports the rename effect immediately after `rename` succeeds, before
  digest verification. `IsolatedStageResult` now carries `copiedBackFiles`
  (renamed) and `verifiedFiles`; FAILED receipts record `appliedFiles` and
  `verifiedFiles` separately.
- Regression: with `fs.rename` wrapped to corrupt the destination after rename, the
  run fails at verification yet the renamed path is listed in
  `copiedBackFiles`/`receipt.appliedFiles`, `verifiedFiles` is empty, and the
  destination is not blanket-restored.

## Changed paths in this follow-up
- `scripts/generation/isolated-stage.ts` (producer-contract rewrite)
- `scripts/generation/isolated-stage.test.ts` (real-producer fixtures/regressions)

Unchanged in this follow-up: `scripts/generation/index.ts`,
`scripts/generate-indices.ts` (physical-root preflight from the previous round),
`cli/src/services/**`, `.husky/pre-commit`, `scripts/calculate-tokens.ts`. No metadata,
mirror, dependency or canonical skill files were touched.

## Read-only derivations (not tests, no writes)
- Plan on this workspace: 1996 declared outputs, 1772 mirror resources (352 inherited
  licenses), 99 workflow wrappers, 63 specialist exports, 4 rule wrappers; all
  declared baselines present and regular; no source symlinks.
- Current index ID sets: canonical and host indexes match the plan exactly; parser
  yields 0 malformed/duplicates.
- **Known fail-closed state on this workspace:** 88 declared mirror files and 6
  workflow wrappers differ from authoritative canonical/transformer bytes because
  Tasks 2–5 edited their canonical sources and the checkout has no `.skills-lock.json`
  (gitignored), so `OwnershipWriter` treats the existing outputs as unknown and
  preserves them. The helper now reports these as `[conflict]` and publishes nothing;
  it does not overwrite them. Establishing ownership/authority for those outputs
  (e.g. an authorized regeneration with a lockfile or explicit force decision) is
  parent-owned; no overwrite authority was assumed here.

## Commands NOT RUN here (parent verification, after independent safety approval)
```bash
rtk pnpm --filter ./cli exec vitest run src/services/__tests__/SyncService.spec.ts src/services/__tests__/SyncInstallLifecycle.spec.ts
rtk proxy node --import tsx --test scripts/generation/isolated-stage.test.ts
```
Root `--check`/apply remain gated on the independent safety approval and on the
ownership conflict above being resolved; no root generator was executed.
