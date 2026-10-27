# T8 CI/version independent review

## Verdict: APPROVE — scoped source review only

No material error found in the new observation wiring. Runtime execution of the extracted YAML step and hosted-runner verification remain parent-owned and unobserved here. This is not integrated T8 completion, remote CI success, release approval, or blocking-policy activation.

## Scope and evidence

TestGuard workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance`.

- Workflow source snapshot `.github/workflows/ci.yml#81E9`, 166 lines.
- Version source anchor `cmd/testguard/main.go#1A26:17–21`.
- Owner report `.agent/sdd/ai-test-assurance/task-8-ci-report.md#DDE3`, read for declared ownership and assumptions, not independent proof.
- Governing contract: AGS `docs/srs/srs-ai-test-assurance.md:248–260`, especially T8's observation-only CI ownership and version-literal boundary.
- Targeted baseline command only: `rtk proxy git diff -- .github/workflows/ci.yml cmd/testguard/main.go` in TestGuard. No broad audit.

## Reviewed acceptance

| Contract | Source evidence | Disposition |
| --- | --- | --- |
| Preserve established blocking checks | Workflow 26–61 retains dependency verification, unit/race tests, platform-specific binary build, version/rules/explain/init smoke without continue-on-error | Preserved in targeted baseline diff. Only the previous full scan line is removed from the blocking smoke block. |
| Observation-only scan without shell-success masking | 63–65 sets step-level `continue-on-error: true`; 82–87 captures actual scan exit using an OR assignment, writes a separate exit artifact; 154–155 returns that exit after successful validation | Correct source semantics. `|| scan_exit=$?` records nonzero status rather than substituting pass; GitHub policy makes the step nonblocking. |
| Report/process cross-check | 98–121 checks report presence, JSON decoding, schema version, tool name, and process/envelope exit equality | Missing/malformed/incompatible/mismatched reports cause a visible nonzero observation-step outcome. No absent report is converted into a clean scan. |
| Distinguish exits 0/1/2/3 and unknowns | 133–151 distinguishes complete/no-blocker, complete/blocker, incomplete-or-error, and not-applicable, and explicitly fails unknown exits | Correct bounded observation behavior. Error exits with retained findings are not clean; exit 3 is not labelled passed. |
| Capture executable identity | 89–96 hashes the actual selected binary bytes using Python hashlib and records its filename with SHA-256 | Correct external binary identity path; not an assertion that checkout HEAD was compiled into unrelated bytes. |
| Collect evidence despite failure | 157–166 uses `always()`, matrix-specific artifact names, and report/exit/binary-hash paths | Artifacts remain collectable after scanner or validator failure. Missing artifacts are warnings, not evidence of successful analysis. |
| Keep platform behavior explicit | 67–80 selects `.exe` on Windows and python3 with python fallback; explicit bash at 65 | Consistent with the report's hosted-runner assumptions, subject to parent/remote execution limits below. |
| Version boundary | `main.go:18` now sets `version = "0.2.0"`; commit/date/repository defaults remain unchanged at 19–21 | Required literal observed. No tag/publication/release workflow change belongs to this slice. |

## Nonblocking precision notes and limits

1. **Bounded validator, not full schema validation.** The inline Python checks envelope identity and status/exit/policy consistency; it is not the AGS ScanReport adapter. It does not verify every count, array type, reason value, findings/severity relationship, or authorized-empty invariant. Unexpected shapes may raise a traceback rather than its explicit diagnostic; that still yields visible failure. Do not describe this step as full schema conformance or trusted assurance. No schema framework is requested.
2. **Validator failure differs from scanner exit.** Python validation errors exit nonzero before line 155, so the observation step's final exit may differ from the scanner's exit. The original scanner result is retained in `testguard-scan-exit.txt`; that is the correct evidence distinction. For a valid accepted envelope, line 155 preserves scanner exits 0/1/2/3.
3. **Hosted-runner assumptions are documented, not exercised here.** Explicit Bash includes Git Bash on windows-latest; Python must resolve to a usable Python 3 interpreter. If neither command is available, execution fails visibly rather than passing; no setup-python is configured. A local macOS/Linux extracted-step smoke does not establish Windows-hosted behavior. The worker report §3 explicitly names these assumptions.
4. **Baseline failure intentionally prevents the observation scan.** The scan has default success gating, whereas upload has `always()`. If prior tests/build/smoke fail, upload may warn about missing files. This preserves existing blocking behavior and does not invent scan success.
5. **Version-only authorship limit.** The cumulative `main.go` diff contains previously assigned T2 CLI changes as well as the version literal. Earlier review source anchors recorded that CLI surface; this review excludes argument/parser/reporter implementation from assessment. The current literal and adjacent metadata are directly observed, but a cumulative worktree diff is not an immutable pre-T8 owner snapshot proving no other owner-local bytes changed. Parent retains ownership/integration comparison. No T3 engine/parser audit was performed or requested.
6. **Owner-report wording.** Report line 60 says no “remote CI configuration” changed, although this YAML is precisely CI configuration; read it as no remote service/branch-protection setting changes or remote run. Line 19's unreleased label is supplied by the existing release documentation, not by a suffix on the binary version literal. Neither wording ambiguity changes executable behavior or warrants blocking this scoped checkpoint.

## Parent-owned verification handoff

Execute the exact extracted workflow run block, not a rewritten surrogate, with the fresh CLI and isolated synthetic fixtures. Cover valid clean/blocker/incomplete/not-applicable outputs; malformed/empty report; process/envelope mismatch; unknown exit; and verify scanner exit artifact plus binary SHA file and nonzero validation failure. Observe Python/Bash behavior on each hosted runner before claiming matrix CI success. No extra engine/parser scope is implied.

## Method, skills, and status

Loaded `AGENTS.md`, MCP file-routing output (`golang-configuration`, common security standards), and reused prior `code-review`, `common-code-review`, evidence-status wording, documentation, and security-review lenses. MCP compliance audit called; old extension warnings from earlier helper/Node tasks are not relevant framework omissions for this bounded CI review. Source classification: authorized maintainer-local changes; report claims are evidence inputs, not approval.

No tests, builds, checks, probes, generators, source edits, commits, delegation, provider calls, or premium were performed. Only the targeted baseline diff and file reads were used; only this AGS report was written. Parent has not supplied execution evidence for this checkpoint at review time. Host token usage/prices unavailable; no cost estimate claimed.

## Subsequent parent-run exact-YAML evidence

After the source-review verdict, the parent supplied `receipts/T8-ci-observation-smoke-fixed-import.json` and `.log` under the AGS task evidence directory. I read receipt lines 1–15 and log lines 1–7: process status 0; exact extracted YAML run block preserves step/scan exits 0/1/2/3 for clean/blocker/incomplete/allowed-empty cases; malformed-output validation fails the step with exit 1 while retaining the actual scan exit and binary hash; missing binary fails visibly with exit 2. Receipt output SHA-256: `8dd59cd2b88f3ce49b40c75521f58d155f156832de44bef8df2866a29446804a`.

Parent reports extraction via `yaml.load`, only macOS runner interpolation, and execution with Bash errexit/pipefail. Its initial harness failed before YAML execution because of the js-yaml ESM default import; namespace import corrected that harness without changing YAML, and the failed receipt remains history. This is parent-executed evidence, not my execution or worker-claim acceptance.

Approval stands. Local macOS Bash/Python smoke is now observed through the parent's receipt; Windows/Linux hosted runners, remote artifact upload, final rebuilt 0.2.0 binary metadata, and integrated T8 completion remain unproven by this review. The smoke binary predates the version-literal change; no claim is made that its SHA identifies a final 0.2.0 build. No checks were rerun.
