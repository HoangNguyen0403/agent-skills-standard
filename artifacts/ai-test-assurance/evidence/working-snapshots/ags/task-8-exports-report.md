# Task 8 Report: Isolated Export Helper (T8-exports) — Revision 2 (recovery)

- **Task**: T8-exports-recovery (fail-closed staging + allowlisted copyback after the first corrective review failure)
- **Status**: `done_with_concerns` — helper corrected and locally probed; end-to-end `--stage` (which runs the canonical generators) is deliberately NOT executed by this worker and still belongs to the parent's post-freeze verification + independent re-review.
- **Owner**: Personal - DeepSeek export safety recovery
- **Brief**: `.agent/sdd/ai-test-assurance/T8-exports-recovery-brief.md`
- **Spec**: `.agent/sdd/ai-test-assurance/T8-exports-recovery-spec.json`
- **Independent review addressed**: `.agent/sdd/ai-test-assurance/task-8-exports-review.md` (findings E1–E5)
- **Owned paths touched**: `.agent/sdd/ai-test-assurance/prepare-exports.mjs`, `.agent/sdd/ai-test-assurance/task-8-exports-report.md` (this file)
- **Helper digest (settled)**: `b93ac1032c8ce518e2aedeb5337c0bb0f8483f45f3e4df60343b5535ad0fa8fe` (1276 lines)
- **Supersedes**: revision 1 of this report, whose claims (“all requested safety guards incorporated”) were falsified by review BD37 and are retained only as history. Revision 1's guard set did not cover physical isolation, source *additions*, pre-stage absence of new destinations, apply-side allowlist enforcement, or staged canonical mutation.

---

## 1. What changed, mapped to the review findings

No product code, no redesign, no generator/check execution. The helper stays a single conservative Node CLI (`--stage` / `--apply` / `--all`); logging, digests and evidence requirements are preserved.

### E1 — physical isolation + symlinks (`validateStageDir` L209, `assertNoSymlinkComponents` L141, `realPathOfNearestExisting` L169, `copyDirectoryExcluding` L305, `collectSymlinks` L331, `walkFilesStrict` L258)

- `validateStageDir` now resolves the **physical** path of the nearest existing ancestor and refuses a stage that resolves to, or strictly inside, the real repository. A symlinked ancestor therefore cannot alias an innocent-looking stage path into the active checkout. Direct-symlink, same-root, lexically-inside and non-empty cases remain refused. Returns `{realRepo, realStage}`; every later stage operation uses `realStage`.
- `lstatOrNull` treats **only** `ENOENT` as absent. A dangling symlink is *present* and rejected; `ENOTDIR` fails closed. All `existsSync`/`statSync` guard decisions were replaced.
- `assertNoSymlinkComponents` rejects a symlink at any existing component (live or dangling), a non-directory intermediate component, and a base that is itself a symlink.
- `copyDirectoryExcluding` **refuses** any symlink or special entry in the copied tree instead of recreating it. A copied absolute or relative link back to the active checkout can no longer be traversed by staged generator writes or by the helper's recursive mirror cleanup.
- Exactly two dependency links are provisioned after the copy (`node_modules`, `cli/node_modules`), and `collectSymlinks(stage)` must equal that set exactly. Their targets are resolved with `realpath` and recorded in the manifest/receipt as **reused, writable-through-the-link active dependency directories**. The helper does **not** claim OS-level read-only access and does not claim a sandbox.
- Inventory walks used for evidence/sources/destinations/allowlist are strict (`walkFilesStrict`) and reject symlink/special entries rather than silently omitting them. The lenient `getAllFiles` (L286) survives only for the descriptive changed-collateral tally.

### E2 — canonical source additions (`runApply` step 4/9, `captureCanonicalSources` L414)

- Apply re-enumerates both canonical skill roots plus `.agents/workflows/test-loop.md` from the active tree and requires **set equality and hash equality** with the pre-stage snapshot (`compareStringSets`). An added reference/script/asset now invalidates the stage instead of being invisible.
- The same evidence **and** source set+hash checks are repeated **after** copyback (step 9), so source preservation is no longer claimed at pre-write time only.

### E3 — new destinations adopted mid-stage (`captureDestinationsInventory` L471, `preStageDestinationIdentity` L519, `runStage` step 9)

- The pre-stage snapshot records, per destination root, a present/absent state plus the complete file inventory and hashes; workflow wrappers are recorded with a `null` hash when absent.
- `preStageDestinationIdentity` distinguishes **known-absent** (in scope: under a recorded skill root, or an exact recorded wrapper) from **out of scope**. Unknown/out-of-scope copy targets are refused.
- Stage no longer samples `active_before_sha256` from post-generator active bytes. It is taken **only** from the pre-stage snapshot, and the helper additionally asserts at stage time that a pre-stage-absent destination is still absent (`Destination appeared during staging; refusing to adopt it`) and that a pre-existing destination still matches its recorded hash.

### E4 — apply trusted the manifest (`runApply` steps 0–3, 7; `deriveAllowlist` L350, `classifyAllowlistedPath` L392, `enumerateStagedAllowlist` L548)

- Apply **re-derives** the allowlist from the active `.skillsrc` (configured hosts × 2 skills => exact skill roots; configured hosts => exact wrapper paths; antigravity contributes a skill root but **no** wrapper because `.agents/workflows/<workflow>.md` is canonical input). `deriveAllowlist` fails closed on a missing/empty/duplicate/unknown agent list, guarantees no duplicate paths, and refuses any wrapper equal to or under `.agents/workflows/`.
- Bindings validated before any write: `repo_root` real path, `stage_dir` real path (and stage must not resolve into the repo), stage manifest `schema_version`, and `manifest.pre_snapshot_sha256 == sha256(snapshot file)`. The active `.skillsrc` hash must still equal the staged-time hash, so a config change between stage and apply invalidates the stage.
- Every manifest entry is structurally validated first (`normalizeManifestPath`: absolute / `..` / empty segments refused; `classifyAllowlistedPath`: packaged predicate under a derived root, or exact wrapper; `.agents/workflows/**` always refused), duplicates refused, `allowlisted_copies_count` cross-checked.
- Membership is then decided by **re-enumerating the stage** (`enumerateStagedAllowlist`) and requiring exact set equality with the manifest — additions and omissions both refused — and per-entry staged hashes must match the re-derived bytes.
- Each entry's `active_before_sha256` must equal the **snapshot** value (never manifest-supplied authority).
- All entries are preflighted (staged hash, staged symlink components, destination identity, resolved parent containment in the real repo) **before the first `fs.writeFileSync`**; the write loop then re-verifies staged and active hashes immediately per file.

### E5 — staged canonical mutation (`runStage` step 8, `runApply` step 6)

- The staged copies of the two canonical skill roots and `.agents/workflows/test-loop.md` must be byte-identical to the frozen active source snapshot; divergence aborts the stage (`Staged canonical input diverged from frozen source`) instead of being filed as acceptable collateral. Apply re-checks the same before writing.
- Ordinary generated collateral (indices, lockfile, configs) is still recorded descriptively and is explicitly **not** authorized for copyback.

### Extra fail-closed details

- `runStage` now validates required staged outputs with `lstat` (regular file / real directory), not `existsSync`/`statSync`.
- Generator runs capture the real exit status (including spawn errors / timeouts), write the full stdout+stderr+exit-code log under `artifacts/ai-test-assurance/evidence/logs/`, and abort on non-zero — a pipeline cannot mask failure.
- Manifest/receipt `schema_version: 2`; receipt records `skillsrc_sha256`, `pre_snapshot_sha256`, derived allowlist, dependency-link provenance, and `canonical_sources_preserved`.

---

## 2. Verification actually executed by this worker

Bounded, non-generator, `/tmp`-only probes of the real module (no project checks, builds, tests, linters, formatters, commits, or delegation). Probe scripts self-deleted; nothing was left in the repo or in `/tmp`.

| Evidence | Result |
| --- | --- |
| `node --check prepare-exports.mjs` (syntax) | OK |
| `node prepare-exports.mjs --help` (CLI dispatch) | exit 0, usage printed |
| Guard probe A: stage/isolation + allowlist classification + destination identity, 23 assertions | 23/23 pass |
| Guard probe B: full `runApply` against synthetic repo+stage fixtures, 12 scenarios | 12/12 pass |
| Guard probe C: copy/symlink guards, 6 assertions | 6/6 pass (one probe fixture bug fixed, not a code defect) |
| Repo symlink scan of the copyable tree (`find . -type l`, excluding `node_modules`, `.git`, `artifacts`) | empty — the strict copy guard will not spuriously abort on the current checkout |
| All 8 derived skill destination roots + 3 configured wrappers | present in the current active tree (derived from `.skillsrc` agents `copilot, antigravity, codex, claude`) |

Probe A results (all rejected): dangling symlink component; symlinked-ancestor stage alias resolving into the repo; direct symlink stage; stage == repo; lexically-inside stage; non-empty stage. Accepted: outside stage with physical resolution. `deriveAllowlist` rejected unknown agent `zed` and duplicate `claude`; 4 hosts => 8 skill dirs + 3 wrappers; canonical `.agents/workflows/test-loop.md` refused as a target. Classification rejected `../`, absolute, `dir//file`, `evals.json`, and `skills/common/common-tdd/SKILL.md` (out of scope), accepted packaged `SKILL.md`, nested `references/a/b.md`, and the codex wrapper. Identity: known-absent under a known root and absent wrapper => `{known: true, hash: null}`; `README.md` => `{known: false}`.

Probe B results (each `[GUARD FAILURE]`, with the active destinations byte-verified untouched where asserted): happy-path apply writes 3 staged files; `../evil.md`; out-of-scope manifest entry; duplicate entry; omitted entry (`count mismatch`); later-entry hash drift (`manifest staged hash disagrees with staged bytes`); new destination appearing after the snapshot; canonical source added after the snapshot (`active canonical source set: count mismatch`); staged canonical workflow mutated; active `.skillsrc` changed; wrong `repo_root`; swapped snapshot (`bound to a different pre-export snapshot`).

Probe C results: absolute symlink to an active target, relative symlink, and dangling symlink inside a copied tree are all refused; a clean tree copies with zero staged symlinks; the staged symlink inventory equals exactly `["cli/node_modules","node_modules"]`; strict inventory rejects a symlink entry inside a canonical skill dir.

### Explicit non-claims

- Generators were **not** run; staged regeneration, byte parity of generated output, and staged-vs-active diff inventory remain unproven here.
- No OS-level read-only enforcement of the provisioned dependency links exists or is claimed; they are active paths writable through the link by the staged generators.
- This helper is a local administrative guard against path mistakes, concurrent local edits, and stale/edited manifests — not a sandbox and not an attestation service.
- Probe B used synthetic fixtures to exercise the apply phase; it is not evidence that the real stage produces a correct export set.

---

## 3. Residual risks / concerns

1. **No end-to-end run.** `--stage` requires running both canonical generators; that is the parent's post-freeze action, so the guard wiring is proven but the full path is not.
2. **Strict copy refusal depends on a clean tree.** Any symlink or special file anywhere in the copied tree now aborts the stage. The current checkout is clean (verified), but a future symlink in this repo will fail the stage rather than be skipped — by design, and it needs a human decision at that point.
3. **`git` is invoked only for the receipt revision** (`rev-parse HEAD`); a missing `git` yields `git_revision: null` rather than failing the copyback.
4. **`.skills-lock.json` is excluded from staging and never copied**; the no-lockfile ownership trap is handled by deleting only the derived mirror targets in staging, so stale-ownership resolution happens in staging only.
5. **Pure guard helpers are `export`ed** (13 helpers plus the existing `runStage`/`runApply`) so they can be exercised and reviewed directly. The CLI entry point is unchanged; `main()` still only runs when the file is executed directly.
6. **Copyback cannot create new top-level parents safely if a parent is a symlink** — preflighted and refused rather than created through the link.

---

## 4. Proposed exact smoke verification scenarios for the parent (after all writers settle)

Run from the workspace root. Do not run these while any writer is still editing `.agent/sdd`, `skills/`, or `.agents/workflows`.

```bash
# 0. Syntax + CLI (no side effects)
node --check .agent/sdd/ai-test-assurance/prepare-exports.mjs
node .agent/sdd/ai-test-assurance/prepare-exports.mjs --help

# 1. Pre-flight snapshot of evidence BEFORE any generator (sdd-evidence-preservation)
shasum -a 256 .agent/sdd/ai-test-assurance/*.md > /tmp/t8-pre-hashes.txt
find .agent/sdd/ai-test-assurance -type f | wc -l

# 2. Stage only (runs both canonical generators in the disposable stage)
node .agent/sdd/ai-test-assurance/prepare-exports.mjs --stage --stage-dir "$(mktemp -d /tmp/ags-t8-stage-XXXXXX)"

# 3. Inspect the frozen outputs
#    - artifacts/ai-test-assurance/evidence/pre-export-snapshot.json (schema_version 2)
#    - <stage>/stage-manifest.json: allowlisted_copies (packaged files of both skills x 4 skill
#      roots — canonical source currently yields 9 files for common-tdd and 5 for
#      quality-engineering-test-healing — plus the 3 configured workflow wrappers),
#      dependency_links, changed_generated_collateral (descriptive only)
#    - artifacts/ai-test-assurance/evidence/logs/{generate-indices,generate-capabilities-doc}.log

# 4. Apply
node .agent/sdd/ai-test-assurance/prepare-exports.mjs --apply --stage-dir "<stage from step 2>"

# 5. Evidence preservation after the run
shasum -a 256 -c /tmp/t8-pre-hashes.txt
find .agent/sdd/ai-test-assurance -type f | wc -l   # may grow by the new receipt only
#    Expected safe generator line, absence of: "Migrated and cleaned up old .agent folder."

# 6. Post-apply parity: allowlisted paths only, no unrelated writes
#    - artifacts/ai-test-assurance/evidence/export-receipt.json: written_count, unchanged_count,
#      copied_files (only <host>/skills/{common/common-tdd,quality-engineering/quality-engineering-test-healing}/** packaged files
#      + .claude/commands/test-loop.md, .github/prompts/test-loop.prompt.md, .codex/skills/test-loop/SKILL.md)
#    - git status --porcelain must show changes only under those 11 destination surfaces
#    - .agents/workflows/test-loop.md unchanged; .skillsrc unchanged; .skills-lock.json unchanged/not copied
```

Negative scenarios to reproduce deliberately (each must abort with a `[GUARD FAILURE]`/`[APPLY FAILURE]` line and leave the active tree byte-identical):

1. **Dangling destination symlink** — `ln -s /nonexistent <active>/.claude/skills/common/common-tdd/references/x.md` before `--stage`; stage or apply must refuse (`disallowed symlink component`).
2. **Symlinked ancestor stage** — `ln -s "$PWD" /tmp/t8-alias && mkdir /tmp/t8-alias/stage-dir`; `--stage --stage-dir /tmp/t8-alias/stage-dir` must refuse (`resolves inside repoRoot`).
3. **Copied symlink back to active** — add any symlink inside the copied tree (e.g. `cli/tmp-link -> ../.claude`), then `--stage`; must refuse (`refusing to stage symlink`).
4. **Source addition post-stage** — add `skills/common/common-tdd/references/new.md` after staging, then `--apply`; must refuse (`active canonical source set`).
5. **New destination during stage** — after `--stage`, create a new file under one of the derived skill roots; `--apply` must refuse (`destination root state changed` / `destination file inventory`).
6. **Manifest `../` / canonical / out-of-scope / evals entry** — edit `<stage>/stage-manifest.json` to add `../x.md`, `.agents/workflows/test-loop.md`, `skills/common/common-tdd/SKILL.md`, or `.../evals.json`; each must refuse before any write.
7. **Later malformed entry / hash drift** — corrupt the *last* entry's `staged_sha256`; apply must refuse before the first write (verify the first destination still has its pre-stage bytes).
8. **Staged canonical mutation** — modify `<stage>/.agents/workflows/test-loop.md` (or a staged `skills/common/common-tdd/SKILL.md`); apply must refuse (`staged canonical input diverged from frozen source`).
9. **Snapshot / config swap** — change `.skillsrc` agents, or replace the snapshot file, between stage and apply; must refuse (`active .skillsrc changed since staging`, `bound to a different pre-export snapshot`).

Post-conditions after the happy path: all three `.claude`/`.github`/`.codex` workflow wrappers plus the packaged files of both skills match the staged bytes byte-for-byte; `.agents/workflows/test-loop.md`, `.skillsrc`, `.skills-lock.json`, indices and ownership locks are untouched; evidence files are byte-identical to the pre-run hashes; no collateral path appears in `copied_files`.
