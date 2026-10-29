# R1 corrective — independent review round 2

## Decision

**Spec: REQUEST CHANGES. Quality/security: REQUEST CHANGES. Root-scale execution qualification is still absent; no actual-root check/adoption/apply clearance.**

The ordinary-file production batching remains narrowly scoped, with no consequential new authorization regression found. The prefix ambiguity correction is sound for its stated compatibility case. Most round-1 harness defects are corrected in source. Two consequential residual defects remain: a physically equivalent temporary Git directory is rejected by lexical comparison, and ambient `GIT_CONFIG_PARAMETERS` can bypass the purported hook isolation.

Reviewed frozen report appendix `root-recovery-deepseek-report.md:477–612` and actual current sources: helper `isolated-stage.ts#165C`, tests `isolated-stage.test.ts#E4FF`, scale smoke `root-scale-generation-smoke.mjs#9C9C`. No reviewer hash command run; these are read-tool identities, not independently computed SHA claims. Scope remains pinned BASE `52ac482a5b948d9d26df4c3a2617afec74d1cf54`, authorized temporary-fixture qualification, no production authority expansion. Previous round-1 report preserved.

Parent-attributed current SHA256 identities: helper `d3058d96b73feae3d72c8c7192b0a0e632aa4f7b13a461990fef913cbc7b2a71`; test `222d904c2ac285b798bc589824a9d07dd70cee07019ed4f6247f19ccb0a0474b`; smoke `044c64c72ba5dad9fd2c63c44a2e66caee3f73511ea10c4aefcb038e49c93ee4`.

## Actual evidence and limits

Read parent-created `root-scale-smoke-run-02/summary.json#BA47`. It records FAILED with `FIXTURE_GIT_DIR_MISMATCH`, `/private/var/folders/.../ags-root-scale-88vnUP/fixture/.git`, after archive/runtime/dependency preparation. The retained fixture is recorded as `/var/folders/.../ags-root-scale-88vnUP`. Counts and verification are null; no baseline producers, baseline check, adoption apply or final check completed in this run. No process groups are recorded unresolved. This is a setup refusal, **not evidence of a Git routing escape**, a behavioral RED, or a passing process-termination negative control.

Parent reports corrected helper/test formatting **PASS**. Current strict semantic check exited **2**, zero owned diagnostics and the same three independently BASE-attributed imports (ConfigService417 TS2352; SyncService36 TS2550 and506 TS2559): **not overall typecheck PASS**. Corrected 61-case regression suite remains pending at report freeze; prior revision's 61 PASS is not silently transferred. No Node20, historical RED, full root-scale completion or live-root performance result claimed. Reviewer ran no commands/tests/probes.

## Complete consequential residual findings

### R1-R2-A — Major: lexical Git-directory containment rejects the actual physical fixture

**Location:** smoke `:493–500`; observed run02 summary `:49–67`.

The top-level comparison uses realpath, but the following Git-directory check compares `path.resolve(gitDir)` against `path.resolve(fixtureRoot)`. On this macOS host, Git reports `/private/var/.../fixture/.git`, while the mkdtemp root is represented as `/var/.../fixture`. These are physically equivalent aliases but fail the lexical prefix check. The actual run stops here before testing the corrective staging operation or any representative publication.

**Smallest correction:** use physical identities consistently for both sides of Git-dir containment, and compare the resolved owned `.git` directory against the resolved owned fixture root with a path-component boundary. Preserve rejection of a genuinely external Git directory. Do not remove the guard, accept either arbitrary prefix, or special-case this one literal `/private` spelling. Record the physical identities. A new successful representative apply/check with real counts remains necessary; fixing the comparison alone is not qualification.

### R1-R2-B — Major security/isolation: inherited `GIT_CONFIG_PARAMETERS` bypasses the hook-free fixture guarantee

**Location:** smoke `:84–105`, `:222–240`, `:477–502`, fixture commit `:600–602`.

The sanitizer removes selected `GIT_CONFIG*` names and numbered KEY/VALUE variables, but leaves `GIT_CONFIG_PARAMETERS` in the spread of `process.env`. Git consumes that command-scope config channel independently of system/global files. Setting `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null` does not neutralize it.

Concrete counterexample: ambient `GIT_CONFIG_PARAMETERS` containing a correctly quoted `core.hooksPath=/some/external/hooks` override is propagated to every fixture Git process and descendant producer. The initializer writes its local empty hooks path, then verifies it using `git config --local --get core.hooksPath`; that query deliberately inspects local configuration, not the effective overriding command-scope value. The verification can therefore pass while the later synthetic commit uses the external hook path. An executable external pre-commit hook can have effects outside the fixture. This is a static reachable counterexample, **not an assertion that run02 had this variable or executed a hook**; run02 records no stripped variables and stops before commit.

**Smallest correction:** remove/refuse all inherited Git command-config channels, including `GIT_CONFIG_PARAMETERS`, before any Git command or producer invocation; deliberately restore only the harness-owned safe values. Verify the effective hooks configuration in the exact sanitized environment used for the commit, not only its local stored value. Keep the owned empty hooks directory and physical fixture routing checks. Do not edit host/global/live-root configuration. No generalized new configuration framework is needed.

## Round-1 finding dispositions

| Input | Source disposition | Qualification status |
|---|---|---|
| A: ignored dependency pathspec staging failure | Original explicit excluded-pathspec command removed. `:550–640` filters top-level candidates with NUL `check-ignore`, stages positive names, removes dependency entries from fixture index, verifies tracked prerequisites/dependency/evidence exclusions. No force-add. | **Not executed past new isolation guard in run02.** R1-R2-A blocks actual setup completion. |
| B: direct-PID timeout / cleanup success | **Addressed in source for the intended child process group.** Detached group per child `:283–288`; deadline/group termination, post-exit pipe grace, post-close group liveness/reap `:310–354`; unresolved groups retain fixture and fail `:1478–1521`; cleanup errors force FAILED. No broad process-name kill. | No forced timeout, failed kill or cleanup negative-control result claimed. Process groups cover members that retain the owned group, not arbitrary detached escapees. |
| C: wrong Trace2 event and silent empty counts | **Addressed in source.** Actual `start` events parsed, argv classified `:686–790`, required apply index/tree listings and measured command ceiling `:1363–1405`. Missing required traces/malformed records fail. Baseline producers may legitimately emit no Git trace. | No usable apply trace yet. Aggregate counts plus static retained guards are not exact timed attribution of the original 1200-second interruption. |
| D: self-ledger-only qualification / missing preservation checks | **Substantially addressed in source for this bounded fixture.** Baseline producer lock captured before apply; injected unrelated entry; baseline public check and baseline declared digests; post-apply public producer check; exact changed/verified sets and declared containment `:1258–1289`; baseline CLI identity comparison; unchanged unknown bytes/no ownership `:958–981`; scoped metadata/nonmetrics; unrelated owner/source/agent/digest preserved. | None of these post-apply assertions has executed in run02. No acceptance inferred from existence of the code. |
| E: ambient Git routing/hooks | Direct directory/index/object/config-count channels removed; isolated global/system config and local hooks setup added. **Incomplete:** R1-R2-B retains command-config injection, and R1-R2-A rejects a legitimate physical alias. | No hook-isolation qualification from the failed initialization. |
| Minor prefix-stage multiplicity | **Addressed.** Helper `:1790–1807` adds descendant `records.length`, not unique path count, preserving multiple-stage ambiguity in the directory-prefix fallback. | Source-level compatibility correction; no new behavioral test claimed for unsupported directory-shaped declared outputs. |
| Test formatting | Layout changed without apparent weakening: explicit helper return type removed, `stagedIndexLines` retains the same `ls-files -s -- path` command; six mutation controls remain and the positive case asserts actual Alpha publication. | Parent helper/test formatting PASS; corrected regression suite pending. |

## Bounded evidence precision — not additional production blockers

- `runEntrypoint:671–673` throws on unresolved group before its caller writes stdout/stderr. Thus that rare failure loses its captured public-command stdout/stderr even though process identity/retained fixture are recorded. Preserve the returned command result or write its logs before throwing if claiming complete subprocess-failure evidence. This does not reintroduce a green qualification: unresolved group still fails and retains the fixture.
- `verifyChangedOutputs:911–944` now compares baseline ordinary owner/source/agent when present, and requires nonempty generation source. Its byte expectation is the actual subsequent public producer check plus baseline comparison, not an independent second transformation implementation. Describe that limit accurately. The source no longer substitutes a freshly emitted lock digest for all byte expectation.
- The unrelated authority assertion checks the injected entry's four specified fields; it is not a general proof of arbitrary prior-ledger extension-field or unrelated-file byte preservation. Existing accepted coordinator regressions continue to carry their original scope; do not describe this one injected row as exhaustive ledger migration qualification.
- Evidence-directory creation still assumes the known approved artifact ancestry; the immediate parent is checked and each output directory is exclusive. No hostile concurrent ancestor-swap or general host enforcement claim is established by this smoke.

## Production review and acceptance boundary

Helper batching still gets fresh full NUL listings at the retained guard boundaries. Exact-path maps, first-tab parsing, regular mode/object comparisons, ambiguous stages, HEAD check, source/config/destination checks, immediate publication callback and ledger-last design remain intact in the inspected paths. The corrective does not need weakened production checks or new ownership authority to repair fixture initialization/isolation.

**Stop:** current source does not satisfy the complete R1 scale qualification contract. The one corrective allowance has been used; this report does not grant another. Parent must resolve authorized next action before source work or another qualification attempt. Underlying root remains restored by parent evidence; no actual-root generation/check/adoption/reapply is approved here.

## Review conduct and audit

Only this new report written. No source edits, commands, tests, builds, generators, probes, root writes, delegation, model/config/permission changes or premium calls. Refreshed MCP TypeScript/JavaScript/common/testing standards; compliance audit completed. Audit's generic React/product-management routing notices do not establish missing React/product implementation review for this script-only scope. Session telemetry is partial; host token/cost fields unavailable and no totals fabricated. Prior reports/evidence retained.

## Final parent-attributed verification addendum

After the original report freeze, parent delivered settled current-revision b83: **61 PASS, 0 FAIL, 0 skipped, 143851.922208 ms**. This supersedes every pending-current-suite statement above; reviewer did not rerun anything. Current helper/test formatting PASS. Current strict semantic check remains exit2, zero owned errors, same three independently BASE-attributed imports; **not overall typecheck PASS**. The source identities recorded above remain the qualification binding supplied by parent.

Scale02 still failed at physical-alias setup; no apply/check, counts or scale-performance result. Both consequential findings, REQUEST CHANGES verdicts and no-root/no-next-attempt authorization limits remain unchanged. Parent's standard analysis-only advisor consultation does not constitute a new source-attempt grant.
