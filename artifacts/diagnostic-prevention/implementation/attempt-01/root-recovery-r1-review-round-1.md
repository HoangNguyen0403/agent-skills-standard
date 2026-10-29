# R1 batched Git identity — independent review round 1

## Decision and revision

**Spec: REQUEST CHANGES for the complete R1 delivery. Quality/security: REQUEST CHANGES. No actual-root execution clearance.** The production batching itself is a narrowly scoped improvement with no consequential authority regression found in the inspected ordinary-file publication path. The representative qualification harness is not complete or safely deadline-bounded, and its actual run stopped before apply/check.

Parent-attributed frozen identities: helper `80818da0e92273d38949a6a15f8cd6fc05d86e7bfbd4a037116dd30250e1e8ad`; test `4afb28f806106d89a12e65f468d48c7f2855f8bbc30afef10f6935768f734fa6`; smoke `044b146d59e4bf034e09b7175585664d63637b8ae7bd0e298ce31f13a4f6c974`. Current read snapshots: helper `51DB`, tests `D69D`, smoke `F22A`. Compared the invocation identity implementation with archived pre-R1 helper in `root-interrupted-source-01.tar` (qualified pre-R1 helper `7f2d8e75...568a612`). Read the R1 brief, review brief, root-scale qualification contract, interrupted-publication advisor and R1 report appendix.

This report authorizes no corrective attempt, source change, restoration, root generation, adoption or retry. Parent retains those decisions. Prior exact native restoration acceptance is not reopened.

## Observed qualification, with attribution

- Parent reports full **61 PASS, 0 FAIL, 0 skipped**, 138296.380166 ms: prior 55 plus six new identity controls. Reviewer ran nothing.
- Parent root-scale run01 **FAILED during setup**, not during coordinator behavior. Read `root-scale-smoke-run-01/summary.json:45–87`: all three baseline producers exited zero, then `git add --all -- . :(exclude)node_modules :(exclude,glob)**/node_modules :(exclude,glob)**/node_modules/**` exited one with an ignored-node_modules error. Counts and verification are null; no apply/check or root-scale performance was observed. Fixture retained. This is not behavioral RED.
- Parent formatting check failed only for `isolated-stage.test.ts`; helper clean. No overall formatting PASS.
- Parent's current strict semantic check (`tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --allowImportingTsExtensions --types node` on index/helper/test) exited **2**, with **zero owned diagnostics** and exactly the same three independently BASE-attributed imports: ConfigService417 TS2352, SyncService36 TS2550, SyncService506 TS2559. This is **not overall typecheck PASS**. The initial missing-`--ignoreConfig` TS5112 was a corrected command prerequisite error, not behavioral RED. Node20 and historical RED remain unproved.
- An earlier read snapshot `4481` appeared to assert Beta publication in the unrelated-row case. Fresh current snapshot `D69D:2786,2971` correctly uses Alpha `CHANGED_OUTPUT_REL`. That proposed finding is **withdrawn**, not an observed test failure and not a production correction request. The settled 61 PASS is authoritative.

## Consequential findings — complete batch

### R1-A — Major: actual representative run cannot reach qualification

**Location:** `root-scale-generation-smoke.mjs:328–355` (`commitFixtureBase`), observed run01 summary `:76–78`.

The exact add invocation rejects its dependency exclusion arguments as ignored paths in the actual fixture. Baseline producers passing does not exercise batched publication at approximately 1996 targets/95 changes. No actual scale conclusion can presently support another root invocation.

**Smallest correction:** use a fixture-local staging operation that adds the intended nondependency content without presenting ignored dependency roots as positive candidates. Verify the synthetic commit's actual tracked inventory excludes both linked dependency trees and evidence, and includes the prerequisite baseline outputs. Do not use blanket force-add, copy a live lock as authority, change live ignores, pad topology, or treat a setup fix as a measured apply/check result. Then parent must obtain a new exclusive real apply/check receipt with exact counts and elapsed stages.

### R1-B — Major: the advertised finite deadline does not own the subprocess tree; teardown failure can still qualify

**Location:** smoke `:161–207` (`runChild`), `:614–649`, `:799–830`, `:861`.

The timeout sends SIGKILL only to the directly spawned process; spawn does not establish an owned process group. The actual public entrypoint spawns producer processes. A deadline killing only its parent can leave producers alive and retaining inherited stdout/stderr descriptors; the `close`-based promise can then outlive the deadline indefinitely. If descendants close descriptors but continue, recursive fixture deletion can race their writes. These are source-established failure branches, not an assertion that run01 leaked anything.

Separately, cleanup failure merely adds `fixtureCleanupError` after `state.status` was set to `QUALIFIED`; main still exits zero. Thus teardown failure is explicitly compatible with a qualification success receipt, contrary to the bounded lifetime/teardown contract.

**Smallest correction:** establish and record an exclusively owned child group/session for fixture commands; bounded termination and reaping must cover its descendants, including normal parent-exit cases. Do not delete the fixture while process ownership is unresolved. Preserve outputs and retained fixture identity when termination/cleanup fails, and make the final result nonqualified/nonzero. Keep the existing deadline rather than extending it to disguise unresolved lifecycle behavior. No broad PID matching or live-root process control.

### R1-C — Major qualification gap: Trace2 query measurement silently reports empty counts

**Location:** smoke `:393–413`, `:739–743`, `:758–768`.

The parser accepts only `event === "cmd_start"` and reads `cmd_name`. Native Git Trace2 EVENT uses `start` with `argv`, and `cmd_name` with command identity; `cmd_start` is not that event format. Consequently valid native traces are skipped, an empty count object is returned, and it does not prevent `QUALIFIED`. Missing files and malformed lines also do not fail the qualification. These counters cannot establish the required actual query reduction/per-guard behavior.

Git's authoritative format documentation: <https://git-scm.com/docs/api-trace2> (start/argv and cmd_name events). This is a static format mismatch; no trace-producing command was run by reviewer.

**Smallest correction:** count the documented command events without double-counting, retain enough SID/argv/order information to distinguish invocation capture, repeated guards and separate proof subprocesses, and require usable trace evidence for the measurement claimed. Report actual counts and interpretation; do not silently convert missing/empty/invalid instrumentation into zero Git work. Keep production free of measurement-only hooks.

### R1-D — Major acceptance gap: scale success does not establish all required byte/authority preservation

**Location:** smoke `:458–501`, `:675–707`, `:721–728`, `:758–768`.

`verifyChangedBytes` compares each published file with the digest in the same newly produced active lock. This establishes lock/byte agreement, not independent expected transformed bytes or correct ordinary owner/source/agent identity. The only independently inspected scoped identity is metadata's category-token-metrics scope. `verified` is counted but its exact path set is not checked against changed/publication paths. No baseline of unchanged unknown outputs or unrelated previous authority is captured and compared, and no deliberately unrelated retained authority is qualified. A mistakenly granted unchanged entry or an incorrectly identified ordinary entry can pass this harness as written.

The full small-fixture suite remains valuable; this is a missing explicitly required root-scale acceptance check, not a claim that production currently grants those entries.

**Smallest correction:** capture the fixture's baseline declared bytes and ordinary/scoped authority before apply; validate changed expected bytes/ordinary metadata through the existing plan/producer contracts, exact changed-versus-verified sets and scope digests. Compare unchanged unknown paths for no ownership acquisition and unchanged bytes; preserve an existing unrelated authority entry and verify it is untouched. Do not copy the staged lock into active ownership, invent authority for absent paths, or weaken production to satisfy fixture assertions.

### R1-E — Major isolation gap: fixture Git mutations inherit live Git routing and hooks

**Location:** smoke `:161–168`, `:220–227`, `:328–355`, `:543–559`, producer/entrypoint environment construction.

The harness passes inherited `process.env` to Git and the public entrypoint and does not pin a hook-free fixture Git configuration. `git -C fixture` does not neutralize inherited `GIT_DIR`, `GIT_WORK_TREE`, or `GIT_INDEX_FILE`. For example, an ambient absolute live-root `GIT_INDEX_FILE` can route fixture `git add` into that index despite the temporary cwd. An inherited hooks configuration can also execute external hooks at synthetic commit. The current-workspace realpath check at `:845` does not prevent either effect. No such ambient routing or hook execution is asserted to have occurred in run01; the issue is the harness's unconditional no-live-root-effects guarantee and explicit hook-free fixture contract.

**Smallest correction:** before any mutating fixture Git command, refuse or isolate ambient Git routing/config variables; establish and verify fixture-local Git directory/index/worktree ownership and disable hooks for fixture mutations. Propagate the safe environment into spawned producers and public invocation. Continue to read the pinned source BASE without changing its configuration. No host policy or live-root config modification.

## Production batching assessment and bounded edge note

- `isolated-stage.ts:1728–1802` splits each record at its first tab, retains NUL record framing, obtains a fresh recursive immutable-HEAD tree and a fresh full index for each invocation/guard call, and builds exact path maps. No live-index cache crosses guards.
- `:1805–1848` retains regular 100644/100755 mode/object comparisons, absent/unsupported results and multiple exact index-record rejection. Existing nonzero command failure handling remains explicit.
- Capture at `:3487`, stable-state invocation at `:3530`, guard boundaries `:3536,3684,3701,3724`, and callbacks immediately before output/ledger renames (`:3132–3134`, `:2840–2841`) remain present. Active authorization, BASE proof, scoped metadata, private temp identity and ledger-last design were not replaced by batching. Existing per-path BASE-proof helpers intentionally remain outside this performance slice.
- Six new controls really mutate the fixture index/HEAD through the producer wrapper and inspect refusal/preserved user state; the positive unusual unrelated row does not broaden the checked authority universe. A tab-containing unrelated row is not itself a requested-tab-path identity test, so do not claim the latter coverage.
- **Minor compatibility precision:** `indexPrefixCounts:1792–1800` counts distinct map keys rather than stage records. For an exact requested path absent from the index but with one descendant carrying three unmerged stages, the previous pathspec listing produced multiple records and threw, while `:1833–1840` now sees prefix count one and returns null. This is not an observed safety escape for the regular-file output topology, and is not the major root blocker. If preserving the explicitly stated old ambiguity behavior for directory-prefix fallbacks, count the descendant record multiplicity, or explicitly bound/document that unsupported case rather than claiming complete identity equivalence.

## Disposition and next gate

The batching reduces the dominant per-path Git subprocess fan-out without removing publication guards; this is not yet a measured root-scale completion claim. Required remaining work is the bounded harness/setup/lifetime/measurement/acceptance batch above, test formatting, and actual representative apply/check evidence reviewed against the frozen revision. The current production implementation need not gain new ownership APIs or reduced checks to repair the harness.

No actual root adoption/apply, automatic R1 release, additional worker retry or human approval is supplied by this review. Existing user scope and pinned BASE remain necessary but are not substitutes for the missing qualification.

## Review conduct

Read-only source/artifact review; only this report written. No commands, tests, generators, probes, root writes, source edits, delegation, permission/model changes or premium calls. MCP file standards refreshed and session compliance audited; TypeScript/JavaScript/common/testing/security guidance loaded. Audit reports generic React/product-management routing gaps; no React/product implementation was reviewed. Telemetry is partial: host token/cost fields unavailable, no invented totals. Worker-disclosed shell read-inspection deviation remains disclosed in its report and is not treated as behavioral verification.
