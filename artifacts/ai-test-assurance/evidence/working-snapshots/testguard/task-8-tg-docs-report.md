# Task 8 Documentation Checkpoint Report: T8-TG-docs

- Task: T8-TG-docs (Documentation-only checkpoint for AI Test Assurance)
- Date: 2026-10-26 (Updated: 2026-10-27)
- Status: `done_with_concerns`
- Owner: Personal - Cheap TestGuard migration-docs implementer
- Workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance`
- Task Completion State: **T8 NOT complete** (code/CI/export integration and independent review remain open)

---

## 1. Settled Changed Paths

Only the 4 assigned documentation paths were modified:

1. `README.md`:
   - Updated Usage and CLI Flags sections to document full mode scanning (`effective_mode: "full"`), `--allow-empty` boundary, and explicit rejection of `--diff` / `-d` (exit code 2, `invalid_usage`).
   - Added flag compatibility rules: combining `--json` with `-f azure` is rejected (exit 2, `invalid_usage`), and explicit `--output` (including empty values) with `--json` or `-f azure` is rejected (exit 2, `invalid_usage`).
   - Documented that checked-in configuration (`testguard.yaml`) is not applied (`config_applied: false`).
   - Replaced old CLI descriptions with deterministic exit code table (0, 1, 2, 3).
   - Added machine-readable `ScanReport` JSON specification (`schema_version: 1`) and consumer guidelines (must cross-check exit codes and verify `analysis.status == "complete"` before reading `.findings`).
   - Clarified that retained findings survive incomplete scans as diagnostics, but only verified complete analysis with exit 0 establishes clean test assurance.
   - Documented static heuristic limits (no dynamic mutation execution or production assurance) and observation-first adoption / rollback policy.
   - Identified v0.2.0 as an unreleased breaking specification boundary.

2. `QUICKSTART.md`:
   - Replaced Step 4 (`--diff` mode) with module targeting and `--allow-empty` scope handling, noting `--diff` rejection with exit code 2 and flag compatibility rules (`--json -f azure` and `--output` restrictions).
   - Updated Step 6 (CI integration) to remove all `|| true` masking (resolving review finding D1). Scan step records actual process exit; nonblocking observation is handled purely by CI configuration (`continueOnError: true` / `continue-on-error: true`). Added visible diagnostic checks for missing/invalid JSON and unconditional report artifact upload (`if: always()`).
   - Updated Step 7 (resolving review finding D2) with an `errexit`-safe (`set -e`) script that captures scan exit via `if`, checks output presence, validates JSON envelope and `schema_version == 1`, cross-checks process exit against report `exit_code`, handles diagnostics and retained findings, and returns the validated original exit code (`exit "$scan_exit"`).
   - Updated Essential Commands Reference and Exit Codes table to reflect exits 0, 1, 2, and 3.
   - Noted static AST heuristic boundaries (no runtime mutation testing execution or production assurance).

3. `ARCHITECTURE.md`:
   - Updated Architectural Principles to specify versioned `ScanReport` JSON output (`schema_version: 1`) on `os.Stdout`.
   - Updated `pkg/models` responsibility to include `ScanReport`.
   - Added Section 7 with full TypeScript definition of `ScanReport`, structural invariants, stable diagnostic codes, flag compatibility constraints (`--json -f azure` and `--output`), and exit precedence hierarchy.
   - Documented that retained findings survive incomplete scans for diagnostic utility, while clean assurance requires complete analysis with exit 0.
   - Added Section 8 detailing operational boundaries: static AST heuristics (no dynamic mutation execution), observation-first CI rollout, explicit rollback ownership, and unreleased 0.2.0 contract boundary.

4. `CHANGELOG.md`:
   - Added `## [0.2.0] - Unreleased` section adhering to Keep a Changelog.
   - Listed breaking changes: transition from bare violation array to versioned `ScanReport` envelope (`schema_version: 1`), exit code precedence overhaul (0, 1, 2, 3), rejection of `--diff` / `-d` flag with exit 2, and rejection of incompatible flag combinations (`--json -f azure` and `--output` with JSON/Azure).
   - Listed additions: `--allow-empty` flag, structured `ScanReport.diagnostics`, and `scope.config_applied: false` transparency.
   - Documented observation-first adoption, rollback ownership, static heuristic limits, and checkpoint evidence status.

---

## 2. Migrated Examples

### A. Dashboard / CLI Automation JSON Consumption (Errexit-Safe & Preserving Process Exit)
```bash
#!/usr/bin/env bash
set -euo pipefail

# Capture process exit safely under errexit
if testguard --json > audit.json; then
  scan_exit=0
else
  scan_exit=$?
fi

# 1. Verify output file exists and is nonempty
if [ ! -s audit.json ]; then
  echo "Error: TestGuard produced empty or missing JSON output" >&2
  exit 2
fi

# 2. Validate JSON envelope and schema_version
if ! report_json=$(jq -e '.' audit.json 2>/dev/null); then
  echo "Error: TestGuard emitted malformed JSON" >&2
  exit 2
fi

schema_version=$(echo "$report_json" | jq -r '.schema_version // empty')
if [ "$schema_version" != "1" ]; then
  echo "Error: Unexpected schema_version (expected 1, got '$schema_version')" >&2
  exit 2
fi

# 3. Verify consistency between process exit code and report exit_code field
report_exit=$(echo "$report_json" | jq -r '.exit_code // empty')
if [ "$report_exit" != "$scan_exit" ]; then
  echo "Error: Exit code mismatch: process returned $scan_exit, report recorded $report_exit" >&2
  exit 2
fi

analysis_status=$(echo "$report_json" | jq -r '.analysis.status // "unknown"')
analysis_reason=$(echo "$report_json" | jq -r '.analysis.reason // "unknown"')

case "$scan_exit" in
  0)
    if [ "$analysis_status" != "complete" ]; then
      echo "Error: Inconsistent report: exit 0 but analysis.status is '$analysis_status'" >&2
      exit 2
    fi
    echo "Audit Complete: No blocker findings."
    ;;
  1)
    if [ "$analysis_status" != "complete" ]; then
      echo "Error: Inconsistent report: exit 1 but analysis.status is '$analysis_status'" >&2
      exit 2
    fi
    echo "Audit Complete: Blocker violations detected."
    echo "$report_json" | jq '.findings[] | select(.severity == "Blocker")'
    ;;
  2)
    echo "Audit Incomplete or Tool Error (status: $analysis_status, reason: $analysis_reason)." >&2
    echo "Diagnostics:" >&2
    echo "$report_json" | jq -r '.diagnostics[]? | "  [\(.code)] \(.path // ""): \(.message)"' >&2
    # Retained findings survive in incomplete scans and provide useful diagnostics
    retained_count=$(echo "$report_json" | jq '.findings | length')
    if [ "$retained_count" -gt 0 ]; then
      echo "Retained diagnostic findings ($retained_count):" >&2
      echo "$report_json" | jq '.findings[]' >&2
    fi
    ;;
  3)
    echo "Audit Not Applicable (status: $analysis_status, reason: $analysis_reason): Authorized empty scope (--allow-empty)."
    ;;
  *)
    echo "Unexpected scan exit code: $scan_exit" >&2
    exit 2
    ;;
esac

# Return the validated original process exit code
exit "$scan_exit"
```

### B. CI Integration (Observation-First without Masking Exits)
- **Azure DevOps (`azure-pipelines.yml`)**:
  ```yaml
  - script: |
      curl -fsSL https://raw.githubusercontent.com/HoangNguyen0403/testguard/main/install.sh | bash
      # Observation-only mode: run scan, report actual exit, let pipeline continue
      testguard -f azure
    displayName: '🛡️ TestGuard Test Quality Audit (Observation)'
    continueOnError: true
  ```
- **GitHub Actions (`.github/workflows/testguard.yml`)**:
  ```yaml
  name: Test Quality Audit (Observation)
  on: [pull_request]
  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: curl -fsSL https://raw.githubusercontent.com/HoangNguyen0403/testguard/main/install.sh | bash
        # Observation-only step: captures actual scan exit code without || true masking
        - id: scan
          run: testguard --json > testguard-report.json
          continue-on-error: true
        # Explicitly validate and diagnose captured report on every run
        - name: Diagnose report capture
          if: always()
          run: |
            if [ ! -s testguard-report.json ]; then
              echo "::warning::TestGuard report is missing or empty (scan step exit: ${{ steps.scan.outcome }})"
            elif ! jq -e '.schema_version == 1' testguard-report.json > /dev/null 2>&1; then
              echo "::warning::TestGuard report contains invalid or unsupported JSON"
            else
              echo "TestGuard report captured successfully"
            fi
        # Unconditionally upload report artifact for review
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: testguard-report
            path: testguard-report.json
  ```

---

## 3. Unresolved Docs Concerns & Blockers to T8 Completion

1. **T8 Overall Incomplete**:
   - T8 encompasses code integration (`cmd/testguard/main.go` version bump once T2/T3 settle), observation smoke wiring in `.github/workflows/ci.yml`, AGS `package.json` test-assurance scripts, doc/mirror generation (`generate-indices`, `docs:capabilities`), and whole-change independent review.
   - These remaining components are explicitly gated on concurrent implementation slices (T2–T6) settling.
2. **Pre-Push Checkpoint Evidence Status**:
   - At this local documentation checkpoint, no remote CI, package release, or pilot evaluation has run or passed.
   - All claims of verification or release readiness are deferred until actual evidence is supplied by the parent orchestrator.
3. **External Consumer Compatibility**:
   - While internal docs and known examples have been migrated from bare array to `schema_version: 1`, external pipeline consumers parsing unversioned JSON arrays remain unobserved and will experience breaking changes upon 0.2.0 release.

---

## 4. Actual Commands Executed

Per the brief's forbidden actions and constraints:
- **No builds, tests, linting, formatting, commits, network access, or delegations were run mid-flight.**
- Operations executed:
  - `read` operations to inspect assigned documents (`README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `CHANGELOG.md`), review report `task-8-docs-review.md`, T8 brief, assignment JSON, and SRS §3 contract.
  - `edit` operations on `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, and `CHANGELOG.md`.
  - `write` operations to update this report and its destination receipt.

---

## 5. Review Addendum: Corrections from Independent Review (D1, D2, TG Notes)

- **Finding D1 Corrected**: Removed all `|| true` wrappers from CI scan invocations. The actual scan process exit is recorded faithfully, with nonblocking behavior handled entirely by pipeline configuration (`continueOnError: true` / `continue-on-error: true`). Added unconditional artifact upload (`if: always()`) and report diagnostics.
- **Finding D2 Corrected**: Rewrote dashboard script to capture process exit using `if` (safe under `errexit`), validate envelope presence, check `schema_version == 1`, cross-check report `exit_code` with the captured exit code, and return `exit "$scan_exit"` instead of an echo-success code 0.
- **TG Incomplete Findings Note**: Clarified that findings retained during incomplete analysis remain valuable diagnostics; only absence of findings under verified `complete` analysis (exit 0) establishes clean test assurance.
- **TG Flag Compatibility Notes**: Explicitly documented rejection of `--json -f azure` (exit 2) and explicit `--output` in JSON/Azure modes (exit 2).
