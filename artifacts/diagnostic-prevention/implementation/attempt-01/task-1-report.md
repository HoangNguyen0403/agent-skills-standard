# Task 1 Report: Evidence Preservation during Migration and Generation (H03, S06)

**Status:** FINAL  
**Execution Mode:** Inline (Approved Bounded Worker, personal agent-skills-standard)  
**Profile Materialized:** `Personal - Cheap`  
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`  
**Branch:** `feat/diagnostic-prevention-improvements`  

---

## 1. Summary of Changes & Owned Write Set

In strict accordance with Task 1 requirements and the user guidance, all changes were confined to the owned write set:

1. **`cli/src/services/SyncService.ts`**:
   - Replaced blanket `.agent` copy and removal logic in `cleanupOldFolders()` with conservative preservation.
   - Disabled automatic `.agent` deletion entirely to protect active evidence (such as `.agent/sdd`, transcripts, receipts). Preserving user data wins unconditionally over naming cleanup.
   - Under `DEBUG=true`, logs that `.agent` was preserved untouched.

2. **`cli/src/services/__tests__/SyncService.spec.ts`**:
   - Replaced obsolete mock expectations that asserted deletion of `.agent`.
   - Added positive and negative unit test assertions ensuring `fs.copy` and `fs.remove` are never called on `.agent` during `writeSkills`.

3. **`cli/src/services/__tests__/SyncInstallLifecycle.spec.ts`**:
   - Added a real filesystem preservation integration regression (`9. real filesystem preservation: retains .agent unknown/active state across install cycles`).
   - Verifies real temp files in `.agent/sdd/evidence-report.md` (sentinel bytes: `0xDEADBEEF`), `.agent/receipts/task-1-receipt.json`, and conflicting destination files in `.agents/custom-note.md` remain completely untouched across repeated install invocations.

4. **`scripts/generate-indices.ts`**:
   - Added preflight physical CWD validation: fails immediately before any mutations when physical `process.cwd()` differs from the script-derived repository root.
   - Replaced swallowed phase errors (`.catch(console.error)`) with rethrow and `process.exit(1)` on error so failures propagate as non-zero exit codes.

5. **`scripts/generation/isolated-stage.ts` & `scripts/generation/index.ts`**:
   - Implemented repository-owned isolated staged generation supporting `--check` (validation only) vs default apply.
   - Allocates a fresh stage directory outside the repo tree, copies source files while strictly excluding `.git`, `.agent`, `artifacts`, and `node_modules`, and retains the complete mirror inventory (`.agents/skills`, etc.).
   - Explicitly symlinks `node_modules` from the host repository into the stage (no npm/pnpm install in stage).
   - Baselines all declared destination target digests before running any generator.
   - Runs `calculate-tokens.ts`, `generate-indices.ts`, and `generate-capabilities-doc.ts` in the isolated stage.
   - Performs exact before/staged digest comparison.
   - Rejects symlink destinations or foreign paths.
   - Detects concurrent modification / baseline drift on destination files before copying back, aborting copy-back if drift is detected.
   - Validates configured host category IDs against canonical configured selections (`validateCategorySelections`).
   - Writes immutable per-attempt execution logs (`generation.log`) and structured status receipts (`receipt.json`) in `artifacts/generation-logs/<attemptId>/`. Refuses to overwrite prior attempt logs.

6. **`.husky/pre-commit`**:
   - Converted hook to check-only mode.
   - Replaced active `calculate-tokens`, `generate-indices`, and `git add` with:
     ```sh
     node --import tsx scripts/generation/index.ts --check
     ```
   - Retained `pnpm validate`. Preserved hook without disabling it.

7. **`scripts/generation/isolated-stage.test.ts`**:
   - Created test suite covering:
     - `copySourceToStage` exclusions (`.git`, `.agent`, `artifacts`, `node_modules`) and mirror retention.
     - `validateCategorySelections` missing category detection against configured selections.
     - Refusal of foreign working directory before mutations.
     - Rejection of overwriting existing attempt logs.
     - Baseline digest drift detection.

---

## 2. Invariants & Security Boundaries

- **Preservation over cleanup**: Ordinary `writeSkills` migration never removes unknown active data or conflicting content. Preserving user data wins over naming cleanup.
- **Foreign CWD refuse**: Generator refuses execution if run outside repository root.
- **No hostile-race sandbox claims**: Symlink and CAS concurrency checks guard cooperating writers via baseline digest comparisons; concurrent modifications abort before copy-back. We explicitly report this limitation: filesystem CAS in Node.js without kernel-level namespace isolation cannot guarantee safety against adversarial local actors modifying files during the microscopic copy-back window.
- **Mid-flight verification gate**: Per instructions, build/test/lint/formatters were skipped during implementation so parent owns settled verification.

---

## 3. Verification Commands for Parent (Planned Gates)

Original RED state: **RED NOT RUN** (per instructions, tests were authored without running them mid-flight to avoid race conditions with peer workers).

### Planned Focused Verification Commands:
1. **SyncService Unit & Lifecycle Tests:**
   ```bash
   rtk pnpm --filter ./cli exec vitest run src/services/__tests__/SyncService.spec.ts src/services/__tests__/SyncInstallLifecycle.spec.ts
   ```
2. **Generation Isolation Tests:**
   ```bash
   rtk proxy node --import tsx --test scripts/generation/*.test.ts
   ```
3. **Safe Staged Generation Consumer Check:**
   ```bash
   rtk proxy node --import tsx scripts/generation/index.ts --check
   ```

---

## 4. Changed Paths

- `cli/src/services/SyncService.ts`
- `cli/src/services/__tests__/SyncService.spec.ts`
- `cli/src/services/__tests__/SyncInstallLifecycle.spec.ts`
- `scripts/generate-indices.ts`
- `scripts/generation/isolated-stage.ts`
- `scripts/generation/index.ts`
- `scripts/generation/isolated-stage.test.ts`
- `.husky/pre-commit`
- `artifacts/diagnostic-prevention/implementation/attempt-01/task-1-report.md`

---

## 5. Round 1 Review Corrections (Task 1 Follow-up)

**Status:** FINAL (Corrected)  
**Profile Materialized:** `Personal - Cheap`  

All independent review findings from `artifacts/diagnostic-prevention/implementation/attempt-01/task-1-review-round-1.diff` have been addressed:

1. **CLI root path resolution**:
   - Fixed `scripts/generation/index.ts` path resolution: changed `path.resolve(__dirname, '..')` to `path.resolve(__dirname, '..', '..')`, correctly resolving the repository root instead of the `scripts/` parent directory.

2. **Deriving complete generated output surface**:
   - Replaced the hardcoded five-file list with `deriveGeneratedOutputSurface(repoRoot)` in `scripts/generation/isolated-stage.ts`.
   - Now dynamically derives and baselines:
     - Core files: `skills/metadata.json`, `skills/index.json`, `skills/README.md`, `AGENTS.md`, `docs/agent-capabilities.md`, and `server/AGENTS.md` (if present).
     - All per-category `skills/<category>/_INDEX.md` files.
     - All target agent rule wrapper files (e.g. `CLAUDE.md`, `.github/instructions/agent-skill-standard-rule.instructions.md`, `.agents/rules/agent-skill-standard-rule.md`, etc.).
     - All target agent mirror index files (e.g. `.claude/skills/<category>/_INDEX.md`, `.github/skills/<category>/_INDEX.md`, etc.).

3. **Row-ID set category validation**:
   - Updated `validateCategorySelections(repoRoot)` to verify both disk directory existence and actual emitted row-ID sets in `skills/index.json`. Detects omitted category entries and missing disk directories.

4. **Symlink escape protection**:
   - Integrated `assertNoSymlinksUnderRoot` from `cli/src/services/install/safePath` into baseline captures, staged file digest reads, and before copy-backs to eliminate symlink traversal risks.

5. **Exclusive attempt log claim**:
   - Changed attempt log initialization to use `fs.open(logPath, 'wx')` for atomic, exclusive file creation. If a previous run already created `generation.log` for that attempt ID, it fails closed with `EEXIST` rather than potentially overwriting.

6. **Post-copy verification and stage digest check**:
   - Staged files have their digests recorded; after copy-back, destination digests are immediately re-read and asserted to match the staged digest byte-for-byte.

7. **Concurrent baseline drift validation in `--check` mode**:
   - Moved concurrent baseline drift verification outside of the apply branch so that both `--check` and apply modes validate that destination files have not drifted during execution.

8. **Error propagation in `scripts/calculate-tokens.ts`**:
   - Updated `scripts/calculate-tokens.ts` to log errors and exit with code 1 (`process.exit(1)`) on unhandled rejections instead of silently terminating with exit code 0 via `console.error`.

9. **Node 20 compatibility**:
   - Replaced `Promise.withResolvers` in `runInStage()` with `new Promise((resolve) => ...)` to maintain compatibility with Node 20 runtimes.

10. **Hardened unit & regression tests**:
    - Updated `scripts/generation/isolated-stage.test.ts`:
      - Ensured copy source and destination directories are completely separate (non-nested) temporary directories.
      - Tested `validateCategorySelections` against missing disk directories and missing `skills/index.json` row entries.
      - Tested `deriveGeneratedOutputSurface` derivation of core files, category indices, wrappers, and mirror paths.
      - Tested exclusive `wx` attempt claim failure on pre-existing log files.
      - Tested baseline drift detection.

### Additional Changed Paths:
- `scripts/calculate-tokens.ts` (extended owned write set for error propagation per reviewer instruction)
- `scripts/generation/isolated-stage.ts`
- `scripts/generation/index.ts`
- `scripts/generation/isolated-stage.test.ts`
- `artifacts/diagnostic-prevention/implementation/attempt-01/task-1-report.md`
