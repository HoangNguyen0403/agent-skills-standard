# Task 8 CI Integration Report: T8-ci

- **Task**: T8-ci (CI Observation Wiring & Version 0.2.0 Integration)
- **Date**: 2026-10-27
- **Status**: `settled` (CI observation wiring and version literal settled; awaiting parent whole-tree integration and independent review)
- **Owner**: Personal - Cheap TestGuard CI integration
- **Workspace**: `/Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance`
- **Source Revision**: `8fc53b4c683d312359166e49e397fa887dd0ac92`

---

## 1. Actual Changed Paths

Only the 2 authorized paths were modified:

1. `cmd/testguard/main.go`:
   - Updated version literal from `"0.1.3"` to `"0.2.0"` on line 18 (`version = "0.2.0"`).
   - Retained all existing CLI argument parsing, flags, Cobra command definitions, error boundaries, and reporter mechanics unchanged.
   - Marked v0.2.0 as unreleased without claiming published status, tags, or release artifact generation.

2. `.github/workflows/ci.yml`:
   - Preserved baseline blocking smoke checks (`"$BIN" --version`, `"$BIN" rules`, `"$BIN" explain GUARD-DART-SEED-ECHO`, `"$BIN" explain GUARD-DART-UNCOVERED-MUTATION`, `"$BIN" init`) under `Smoke test compiled CLI`.
   - Decoupled the full workspace scan (`"$BIN" --all`) from the blocking smoke step into a dedicated observation step: `Observe full repository test quality scan (non-blocking)`.
   - Configured non-blocking behavior purely via GitHub Actions policy: `continue-on-error: true`. Removed any possibility of `|| true` exit code masking.
   - Captured the true process exit code under `errexit` safely using `scan_exit=0; "$BIN" --all --json > testguard-report.json || scan_exit=$?`.
   - Emitted separate exit code record `testguard-scan-exit.txt` containing `$scan_exit`.
   - Recorded binary SHA-256 into `testguard-binary-sha256.txt` using Python standard library `hashlib.sha256`.
   - Implemented inline Python validation of the versioned `ScanReport` envelope:
     - Verifies `testguard-report.json` existence and non-emptiness.
     - Parses JSON and verifies `schema_version == 1`.
     - Verifies `tool.name == "testguard"`.
     - Validates consistency between recorded envelope `exit_code` and actual process `scan_exit`.
     - Explicitly distinguishes analysis status and reason across exit codes:
       - Exit 0: `complete` analysis, `no_blocker` policy status.
       - Exit 1: `complete` analysis, `blocker_found` policy status.
       - Exit 2: `incomplete` or `error` analysis status with retained diagnostics and findings.
       - Exit 3: `not_applicable` analysis status for authorized empty scope (`--allow-empty`).
     - Raises descriptive visible errors if the binary is missing, JSON is malformed, schema is incompatible, or envelope exit does not match process exit.
   - Concluded observation step with `exit "$scan_exit"`, ensuring step outcome visibly reflects scan findings while job continues non-blocking.
   - Added unconditional artifact upload step (`Upload TestGuard scan artifacts`, `if: always()`) using `actions/upload-artifact@v4` with matrix-scoped artifact names (`testguard-scan-artifacts-${{ matrix.os }}`) capturing `testguard-report.json`, `testguard-scan-exit.txt`, and `testguard-binary-sha256.txt` (`if-no-files-found: warn`).

---

## 2. Acceptance Criteria Fulfillment

- **T8-1 (Version Literal)**:
  - Updated `main.go` version literal to `"0.2.0"`.
  - CLI, parser, detector, and reporter code preserved intact.
  - No release workflows, tags, or deployment mechanisms triggered.
- **T8-2 (Baseline Smoke vs Observation Separation)**:
  - Existing smoke step retains blocking behavior on failure for version/rules/explain/init.
  - Workspace scan moved to separate observation step with `continue-on-error: true`.
  - True binary exit code retained and reported.
- **T8-3 (Artifacts & Envelope Validation)**:
  - Captured compact v1 JSON report (`testguard-report.json`), binary SHA-256 (`testguard-binary-sha256.txt`), and scan exit code (`testguard-scan-exit.txt`).
  - Validated envelope/exit consistency across exits 0, 1, 2, and 3 without `|| true` masking.
  - Missing binary, malformed JSON, or exit mismatches cause visible step errors.
  - Artifacts uploaded unconditionally on all runner OSes (`if: always()`).
- **T8-4 (Observation Scope & Independent Review Boundary)**:
  - No changes made to `.github/workflows/release.yml`, branch protection rules, package publication, or remote CI configuration.
  - No remote CI run claimed; parent will exercise binary and extracted YAML steps locally.

---

## 3. Assumed Runner Availability & Conventions

The observation step relies strictly on standard GitHub Actions hosted runner environments (`ubuntu-latest`, `macos-latest`, `windows-latest`):

1. **Shell**:
   - `shell: bash` is configured explicitly on all runner platforms (uses `/bin/bash` on Linux/macOS and Git Bash on Windows).
2. **Python Environment**:
   - Uses system Python standard library modules only: `hashlib`, `json`, `os`, `pathlib`, `sys`, `textwrap`.
   - Resolves executable via `python3` with automatic fallback to `python` (`PYTHON="python3"; if ! command -v python3 >/dev/null 2>&1 && command -v python >/dev/null 2>&1; then PYTHON="python"; fi`).
   - Requires zero external pip packages, third-party libraries, or virtual environment setup.
3. **Go Runtime**:
   - Go 1.22 toolchain provided by existing upstream workflow step (`actions/setup-go@v5`).
4. **Artifact Upload**:
   - Uses official `actions/upload-artifact@v4` with unique per-matrix artifact names to prevent matrix upload collisions.

---

## 4. Operational Invariants & Forbidden Actions Compliance

Per the brief constraints:
- **No builds, tests, linting, formatting, or commits were run mid-flight.**
- No remote CI runs, branches, or tags were pushed or created.
- No employer repositories or credentials were accessed.
- No recursive subagents or premium advisor profiles were spawned.
- All concurrent user changes across other files in the workspace were preserved.
