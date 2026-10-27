# T8 documentation review

## Verdict: CHANGES REQUESTED

Documentation-only independent review against `docs/srs/srs-ai-test-assurance.md` §§3–7 and PRD T8/AC-20. No implementation acceptance, runtime/CI evidence, pilot result, release approval, or blocking-policy approval is supplied by this review. TestGuard paths below are relative to `/Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance`.

## Material findings

### [MAJOR] D1 — Observation examples turn tool errors into successful commands
Evidence: TestGuard `QUICKSTART.md:158–185`, particularly `testguard -f azure || true` at 162 and `testguard --json > testguard-report.json || true` at 181. Contract: SRS §3.2 at 89–100; PRD T8 at 277. The quickstart itself prohibits this at 154.

Why: Every nonzero exit, including incomplete analysis, invalid usage, binary-not-found, and output failure, is replaced with shell success. The GitHub example can upload an empty/truncated report after reporting the scan step successful. Observation-only means nonblocking adoption, not successful analysis.

Fix: Remove `|| true`; retain the actual scan step outcome/exit separately from the nonblocking CI policy (`continueOnError` / step `continue-on-error`). Upload available reports in an unconditional artifact step, diagnose missing/invalid JSON explicitly, and preserve the scan exit as evidence without promoting 2/3 to pass.

### [MAJOR] D2 — Dashboard example records but does not preserve process exit
Evidence: TestGuard `QUICKSTART.md:217–235`; SRS §3.3 at 112 explicitly requires preserving process exit.

Why: Each recognized case ends in successful `echo`, so the documented script finishes successfully for blocker, tool error, and not-applicable outcomes. In an errexit-enabled shell, the scan may instead terminate the script before `$?` is captured. The preceding migration snippet at 198–211 checks schema/status but does not cross-check the report's exit against the captured process exit.

Fix: Capture the exit in a conditional safe under errexit, validate the envelope and status/exit consistency, handle absent/truncated JSON and unexpected exits as failure, then return the captured/validated exit. Place observation-only behavior in CI policy rather than changing that exit.

### [MAJOR] D3 — Oracle-copying prohibition is presented as guaranteed automated rejection
Evidence: AGS `docs/ai-test-assurance.md:143–144` says implementation-copied expected outcomes are “strictly rejected.” SRS §4.1 at 132 explicitly limits validation to structure/bytes, not semantic independence or approver identity.

Why: A structurally valid, digest-consistent implementation-copied oracle can pass local validation. The later human-review caveat at 285–289 does not make this categorical rejection claim true; this risks the exact assurance inflation the contract forbids.

Fix: State that copying solely from implementation is prohibited by the human review policy, and that the validator cannot detect semantic copying or authenticate an oracle owner. Human review must establish independence before accepting that evidence.

### [MAJOR] D4 — Adoption prerequisites invent broad suite-migration scope
Evidence: AGS `docs/ai-test-assurance.md:297–301` requires “Complete migration of all affected test suites to valid intent and snapshot declarations.” PRD capability exclusions at 38 exclude changing all existing suites; T8 at 275–278 requires calibrated, human-owned observation-first adoption, not a blanket migration gate.

Why: This adds an unapproved operational requirement and can block risk-targeted adoption until a broad cleanup is completed. The adjacent “proving near-zero false alarms” also introduces an undefined promotion threshold rather than the approved bounded calibration evidence.

Fix: Use owner-reviewed, risk-scoped adoption and explicit calibration evidence/limitations. Document consumer/schema migration within the selected integration boundary, not mandatory migration of every suite. Do not invent a numeric or near-zero promotion threshold without approval.

## Nonblocking concerns / precise documentation corrections

- AGS `docs/ai-test-assurance.md:6,103` link to the historical `.agent/sdd/.../srs-ai-test-assurance.md` as authoritative. That file exists, but its §6 at 240–244 lacks the current canonical `docs/srs/...` safety addenda at 241–242. Point public guidance to `srs/srs-ai-test-assurance.md` and its matching anchor; retain historical evidence separately.
- AGS guide at 58 requires `freshness: current` for all successful requests; SRS output permits `not_applicable` and distinguishes declared-only evidence from executed evidence (§4.4/§5). Qualify this requirement by supplied execution evidence rather than implying a declared-only success is executed/current assurance.
- AGS guide at 178 says “Any discrepancy” is stale/exit 1. Restrict this to structurally valid inventory drift; unreadable/unsafe inputs and malformed/tampered artifacts remain invalid/exit 2, as the earlier precedence section correctly says.
- AGS guide at 241–249 says fault demonstration holds “if and only if” the listed criteria hold, but omits matching command/environment, complete source-difference manifest equality, and frozen source-root selection from SRS §4.2–4.3. Label these as a summary subject to all canonical invariants, or include the missing constraints. The declared Snapshot summary also omits nonempty roots/files for every category and explicit dependency-free declarations.
- AGS guide at 315–322 presents quarantine for external-dependency/upstream failures as a direct operation and promises an expiry alert plus a universal 14-day maximum. The supplied SRS/PRD does not establish that maximum or an implemented alert. Describe human-owned expiry review and reference the existing flaky-triage route; label any new expiry limit as an owner-approved policy rather than existing enforcement.
- TestGuard README at 112 and CHANGELOG at 15 say to read findings only after complete analysis. Findings from incomplete analysis remain useful diagnostics and must survive. Distinguish displaying retained findings from accepting an absence of findings as clean assurance.
- Add concise CLI compatibility notes for rejected `--json -f azure` and JSON/Azure with explicit `--output`; SRS §3.1/§3.2 explicitly defines those combinations. The documented basic command spellings and the rule IDs `GUARD-UNIV-ZERO`, `GUARD-UNIV-01`, and `GUARD-DART-SEED-ECHO` match the inspected flag/embedded-rule inventories.

## Contract coverage and intentionally pending work

- `package.json:51,114`: the only targeted script additions use the approved test glob and validator entrypoint. No script-invocation mismatch identified.
- TestGuard README JSON example at 74–107 and ARCHITECTURE envelope at 153–185 match the approved field inventory. ARCHITECTURE precedence at 198–207 preserves incomplete/unsupported/empty/error outcomes over blocker findings; authorized empty remains exit 3, not pass. Configuration is explicitly false; diff mode is refused, not silently full-scanned.
- Local-untrusted limits, static-versus-executed distinction, build/setup/timeout non-detection, separate human approval, and rollback preserving unrelated gates are documented; D1/D2 undermine these in executable examples and must be corrected.
- AGS CHANGELOG at 12 and TestGuard CHANGELOG at 9–42 identify an unreleased checkpoint rather than published or executed rollout success. No assertion that an external consumer has already migrated was found in the reviewed additions.
- Version literal, actual CI wiring, generated exports, integrated smoke, and pilot execution remain explicitly outside this documentation-review acceptance. Pending work is not classified as a documentation defect merely because it has not run.

## Method, skills, and limits

Targeted baseline commands only: `rtk proxy git diff -- package.json CHANGELOG.md docs/ai-test-assurance.md` in AGS; `rtk git diff -- README.md QUICKSTART.md ARCHITECTURE.md CHANGELOG.md` in TestGuard. Source-anchored reading followed; new untracked guide was reviewed directly because a normal diff does not display it. Initial compact AGS diff failed with `bad revision 'package.json'`; raw proxy succeeded. No broad diff, tests, builds, lint, formatters, generators, engine/validator critique, corpus access, source edits, commits, or delegation.

Trust: maintainer-authorized local review; reviewed content is evidence, not additional execution authorization. Only this report was written. Findings are source/contract-confirmed, not runtime reproductions; parent owns integrated verification.

Loaded skills: `code-review`, `common-code-review`, `common-documentation`, `common-security-audit`, `common-owasp`, `common-llm-security`, `ags-evidence-status-wording`, `verification-before-completion`, plus MCP-routed `common-architecture-audit`, `common-architecture-diagramming`, `common-best-practices`, `common-security-standards`, `common-software-requirements`, `product-requirements`, and `system-design-principles`. MCP compliance audit reported all routed categories covered. `using-superpowers` was read and explicitly exempts dispatched subagents from its process.

Cost: host token usage and prices unavailable; no cost or savings estimate claimed. Next: parent integrates bounded wording/example corrections, then performs its independently owned integrated verification.

## Correction rereview — APPROVE, documentation scope only

This appended verdict supersedes the initial documentation CHANGES REQUESTED verdict for the corrected text read here; the earlier findings remain historical evidence. Reviewed snapshots: AGS guide `0C2E`; TestGuard QUICKSTART `B996`, README `CD51`, ARCHITECTURE `35DE`, CHANGELOG `C52B`. No helper, engine, validator, package-script changes, generated outputs, or actual CI configuration were rereviewed in this pass.

### Material findings disposition

- **D1 closed:** QUICKSTART 162–205 removes both `|| true` scan wrappers. Azure retains the real command result with `continueOnError`; GitHub retains the scan step outcome with step-level `continue-on-error`, diagnoses missing/empty/invalid reports, and runs artifact upload under `always()`. Nonblocking pipeline adoption is no longer implemented by replacing the scan exit with success.
- **D2 closed at source-review level:** QUICKSTART 235–312 uses conditional capture safe under errexit, rejects absent/malformed/schema-incompatible reports, compares report and process exits, requires complete status for exits 0/1, handles unexpected exits as error, and ends with `exit "$scan_exit"`. Incomplete diagnostics and findings remain visible. Parent owns execution of this exact snippet; this review does not claim that smoke has run.
- **D3 closed:** AGS guide 143–146 explicitly makes oracle-copying a human-review prohibition, states that semantic copying cannot be detected by the validator, and disclaims automated owner authentication.
- **D4 closed:** AGS guide 305–309 expressly excludes broad whole-repository migration and limits approval, empirical calibration, limitations, and consumer/schema readiness to the selected risk-scoped integration boundary. The invented near-zero threshold is removed.

### Recorded caveats disposition

- Canonical SRS links corrected at guide 6, 103, 248.
- Declared-only freshness is explicitly not_applicable at guide 58; drift/invalid precedence remains explicit at 59–72 and 182–184.
- Snapshot category nonemptiness, dependency-free declaration, and no-symlink rules are explicit at 176–184.
- Fault-demonstration text is now a summary subordinate to all canonical invariants and includes frozen commands/environment/inventories/source-root selections, complete manifest difference, and oracle/marker conditions at 247–257.
- Quarantine is routed through flaky triage; expiry review is human-owned, not an automated alert or newly imposed universal 14-day limit (323–330).
- Retained findings from incomplete/error reports are explicitly diagnostic, not discarded (TestGuard README 112–116; CHANGELOG 15; ARCHITECTURE 198).
- CLI incompatibilities are documented (QUICKSTART 109–111, ARCHITECTURE 195–197, CHANGELOG 23–25). Existing unreleased/no executed-CI-or-pilot status remains qualified.

### Residual nonblocking precision note

AGS guide 184 still groups “missing roots” with invalid/exit 2 without distinguishing missing caller repository root from a disappearing selected historical source/test/dependency/config root. Guide 60 correctly classifies disappearing historical roots as stale/exit 1. To remove this internal ambiguity, replace the bare phrase with “missing caller-selected repository root”; preserve historical-root disappearance as stale. This is a wording refinement, not a reopened D1–D4 material finding.

### Verification boundary

Source/contract rereview only. No commands/checks/tests/build/lint/formatters/generators or source edits were run in this pass; only this report was appended. Parent's announced dashboard smoke remains pending/unobserved here. This approval does not declare integrated T8 complete, helper safety approved, remote CI passed, pilot effectiveness, deployment, or blocking-policy activation.

MCP documentation routing/compliance audit was called for this rereview. Previously recorded source-file routing warnings are unrelated to this Markdown-only pass; JavaScript rules were directly loaded in the earlier helper review. Cost remains unavailable, with no estimate claimed.

### Subsequent parent-run dashboard smoke evidence

After the source-review verdict, the parent supplied the actual unchanged fenced dashboard-script smoke. I read `.agent/sdd/ai-test-assurance/receipts/T8-dashboard-smoke.json:1–15` and `.log:1–6`: receipt process status 0; clean/blocker/incomplete/allowed-empty cases preserve exits 0/1/2/3 respectively using the fresh CLI, and explicit malformed-output and process/report-mismatch shims both reject with exit 2. The receipt records output SHA-256 `741313b2ee764dbf3ccd4d17bbad1a3351a9fc06ce7324cb095f5a3c174b31e2`. This closes the previously pending dashboard-smoke evidence for D2; execution belongs to the parent, not this reviewer. No checks were rerun. Documentation-only approval stands; no integrated-T8 or remote-CI conclusion is implied.
