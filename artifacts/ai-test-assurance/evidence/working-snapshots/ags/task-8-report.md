# Task 8 Report: AGS Package Scripts, Documentation, and Export Helper Checkpoint

- **Task**: T8 (AGS package scripts, documentation, and export helper)
- **Status**: `done`
- **Owner**: Personal - Cheap AGS integration implementer
- **Plan Reference**: `docs/prd/prd-ai-test-assurance.md` (SHA-256: `5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06`)
- **SRS Reference**: `.agent/sdd/ai-test-assurance/srs-ai-test-assurance.md` (§7 T8)
- **Briefs**: `.agent/sdd/ai-test-assurance/T8-AGS-docs-brief.md`, `.agent/sdd/ai-test-assurance/T8-exports-brief.md`
- **Required Skills**: `ags-generator-safety`, `sdd-evidence-preservation`

---

## 1. Executive Summary & Checkpoints Covered

This deliverable covers the two bounded T8 integration preparation checkpoints:
1. **Checkpoint 1 (Package Scripts & Documentation)**:
   - Added `test:test-assurance` and `audit:test-assurance` to `package.json` without modifying dependencies or root metadata.
   - Added observation-first entry in `CHANGELOG.md` under `[Unreleased]`.
   - Created `docs/ai-test-assurance.md` detailing the validator CLI, evidence contracts, input snapshot identities, four critical assurance boundaries, local-untrusted limits, and operational governance (rollback, quarantine expiry, and sanitized incident feedback).
2. **Checkpoint 2 (Export Staging & Guarded Copyback Helper - Corrected)**:
   - Authored `.agent/sdd/ai-test-assurance/prepare-exports.mjs` incorporating all parent review corrections:
     - Pre-flight `stageDir` validation rejecting paths inside/equal to repoRoot, symlinks, or nonempty directories.
     - Staged `.skillsrc` narrowing and pre-deletion of generated mirror targets to eliminate the no-lockfile stale ownership trap.
     - Generator execution via `rtk proxy node` with finite timeout/maxBuffer and stdout/stderr log capture outside `.agent` (`artifacts/ai-test-assurance/evidence/logs/`).
     - Hard failure (no warning/partial-success) if any required staged skill directory or wrapper is missing post-generation.
     - Symlink detection across all path segments in both staged and active trees (`assertNoSymlinkComponents`).
     - Digest-bound frozen copy list in `stage-manifest.json` verified immediately before EACH file copy.
     - Set-based and hash-based drift detection for evidence, sources, and destinations.
     - Avoids writing unchanged files (`status: 'unchanged'`).
     - Separates `changed_generated_collateral` from unchanged source files.
     - Final verification confirming active evidence remained 100% byte-identical.
     - Durable receipt output outside `.agent` at `artifacts/ai-test-assurance/evidence/export-receipt.json`.

---

## 2. Invariant Compliance

- **No generator / build / test / lint / formatter execution**: In accordance with the worker brief invariants, the helper was prepared and validated via `--help`, but generators were NOT executed. Parent orchestrator executes the helper after canonical source freeze.
- **No manual edits to generated mirrors**: Generated files remain untouched; all updates are handled via canonical generator execution through `prepare-exports.mjs`.
- **No active configuration modification**: Active `.skillsrc` is preserved untouched.

---

## 3. Invocation Commands for Parent Orchestrator

```bash
# Two-phase invocation:
node .agent/sdd/ai-test-assurance/prepare-exports.mjs --stage --stage-dir /tmp/ags-t8-stage
node .agent/sdd/ai-test-assurance/prepare-exports.mjs --apply --stage-dir /tmp/ags-t8-stage

# Or single-gated invocation:
node .agent/sdd/ai-test-assurance/prepare-exports.mjs --all
```
