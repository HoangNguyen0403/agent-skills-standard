# R1 Personal Delivery harness closure — independent review round 1

## Decision

**Spec: REQUEST CHANGES. Quality: REQUEST CHANGES. Security: the two prior concrete isolation defects are addressed in inspected source; executable safety qualification is not established. No root execution clearance.**

The actual parent prerequisite invocation failed to parse before evaluation. The four minimum fixes are substantially present, but prerequisite qualification has not run, full representative qualification has not run, and the isolated external-directory check is weaker than the expressly requested owned-filesystem qualification. Complete batched findings follow; no additional attempt is authorized by this review.

## Scope and binding

Read full `root-recovery-r1-delivery-brief.md`, delivery report, qualification advisor, and every section of the actual 1718-line harness, read snapshot `root-scale-generation-smoke.mjs#74A9`. Parent's immediately postfailure harness SHA256: `0d6b15d91857ee3697be64137cef54653f376590344e4eebb07a52e081980a5a`. Reviewer did not compute it. Parent reports no intervening writer edits and worker finish notification now agrees SOURCE FROZEN.

Production helper `d3058d96b73feae3d72c8c7192b0a0e632aa4f7b13a461990fef913cbc7b2a71` and tests `222d904c2ac285b798bc589824a9d07dd70cee07019ed4f6247f19ccb0a0474b` remain parent-attributed unchanged, with 61 PASS, formatting PASS, zero owned semantic errors and three independently BASE-attributed imported diagnostics/overall semantic exit2. This harness review neither reopens those accepted source slices nor promotes that semantic result to overall PASS.

## Actual execution evidence

Parent reports the prerequisite invocation on Node26 exited1 with **SyntaxError: Unexpected end of input, harness line1718**, before module evaluation. No output directory, temporary fixture, Git/setup, baseline check, apply or final check resulted. This is a parse/setup failure, not behavioral RED, an effectful fixture failure, or root mutation. Reviewer did not rerun it.

All earlier scale run01/run02 receipts remain failed setup evidence. No root-scale performance/counts/PASS is available. R0 exact native restoration acceptance remains unchanged; root remains restored by parent evidence. No Node20 or historical RED claim.

## Complete findings

### D1 — Blocker: delivered executable does not parse

**Evidence/location:** parent-observed invocation on the SHA above; EOF diagnostic at `root-scale-generation-smoke.mjs:1718`.

Neither the prerequisite mode nor full smoke can run. `SOURCE FROZEN` and source-visible guard logic cannot substitute for an executable module.

**Precise localization limit:** read-only structural inspection found the newly introduced prerequisite branch `:1284–1303`, sentinel catch `:1606–1620`, outer function closer `:1673` and main closer `:1716` visibly present. I did not identify a defensible specific missing delimiter in the displayed source, and will not invent a brace insertion from an EOF diagnostic. The observed syntax failure remains authoritative. This is a blocker at the actual frozen module boundary, not a claim that the final line itself needs a brace.

**Smallest correction:** authorized source owner must locate and close the actual unclosed lexical/structural boundary in these exact bytes, preserve intended prerequisite catch/cleanup lifetime, and return one frozen complete batch. Parent's next authorized verification should establish syntax before invoking prerequisites, then qualify prerequisites before expensive full mode. No reviewer command, repair, new retry or wider implementation permission is supplied.

### D2 — Medium, explicit qualification gap: external-directory self-check is lexical, not the requested owned physical fixture check

**Location:** `runIsolationSelfChecks():177–218`, called `:1115`.

The self-check passes made-up `/owned/temp/fixture` and `/owned/temp/external/.git` strings directly to `assertOwnedGitDirectory`. It creates no owned directories, performs no realpath operation and obtains no Git-reported external directory. The returned `externalGitDirectory: "refused"` therefore attests only the pure path predicate. Actual initialization later realpaths the legitimate fixture and verifies its Git directory, so the positive path is much stronger; it still does not exercise physical external-directory refusal. No source escape is demonstrated here: the production predicate itself uses physical values at its real callsite.

The injected-config self-check likewise demonstrates removal from the constructed environment without executing a hook, which is useful and safe; it should not be described as native Git observing that injected override. The actual effective hooks query separately provides native positive evidence once prerequisites run.

**Smallest correction/qualification:** use exclusively owned temporary existing directory identities to pass realpath-resolved internal and external values through the same guard, retaining the refusal reason and physical identities; exercise an actual alias on the known host where applicable. No live config or external hook execution, new permanent wiring tests, alternate runner or broader framework. If relying only on the pure predicate self-check, explicitly report that narrower scope and obtain parent disposition of the unmet requested physical-negative qualification rather than label it complete.

### D3 — Medium evidence-completeness gap: logs survive group refusal, but full command result does not

**Location:** returned result fields `runChild():415–428`; public stages `:1242–1255`, `:1329–1337`, `:1352–1360`; unresolved ownership summary `:1622–1626`.

The previous stdout/stderr loss is repaired: each public command writes both before checking `groupReaped`. However, the brief also asks for the result/process-group state to be retained before refusal. Current stage records retain only selected exit/signal/timeout information; `OWNERSHIP.unresolved` retains PID/group and abbreviated command, not captured `spawnError`, `terminationError`, `truncated`, complete argv or complete result duration/groupReaped. If a termination error or spawn failure occurs, its diagnostic can disappear into a generic stage failure. The failure remains nonqualified and the unresolved group retains the fixture; this is not suppressed success or permission to continue writes.

**Smallest correction:** retain a bounded exclusive command-result receipt (without duplicating huge log payloads or secrets) before public-command group refusal, referencing the already written stdout/stderr and recording the result/lifetime fields. Keep current fail/retain behavior and deadlines. This is a small evidence leaf, not a process-runner rewrite.

## Four minimum fix dispositions

1. **Physical Git identity — addressed in source.** `:566–579` realpaths fixture/top-level/Git-dir/owned `.git`; `isPathWithin():154–162` is component-bounded and excludes equality; `assertOwnedGitDirectory():164–175` additionally requires actual `.git` equality. The `/var` versus `/private/var` false negative is no longer baked into the comparison. Actual execution remains blocked by D1; D2 limits negative-control qualification.
2. **Command configuration and effective hooks — addressed in source for the prior concrete counterexample.** `buildSanitizedEnv():297–315` strips the entire `GIT_CONFIG_` family, including PARAMETERS/COUNT/numbered channels, reconstructs only harness-owned safe values and documented extras. `initializeFixtureGit():561–585` reads effective hooks without `--local`, physically compares the owned empty directory and rejects nonempty hooks. Commit, producers and public entrypoint all receive the sanitized Git-config environment. No live/global config write or external hook execution is introduced. No behavioral proof from the parse failure.
3. **Logs before unresolved refusal — corrected for stdout/stderr and fail/retain propagation.** `runEntrypoint():751–763` returns instead of throwing; callers write logs before group checks. D3 records remaining result-field evidence precision. Detached groups/reaping/cleanup failure logic remains intact.
4. **Schema-valid unrelated authority and bytes — addressed in source.** `:1203–1220` selects one existing ordinary entry with allowed owner skill/workflow/specialist/bridge/index, string source/agent and digest, copies that identity and substitutes the digest of the real unrelated fixture file. No owner `fixture` remains. Actual baseline public check must accept the manifest before advancing. Final `:1452–1470` checks all four injected row fields and unrelated file digest. This validates one concrete row/file, not arbitrary prior-ledger extensions or all possible schemas without running the real baseline check.

## Prerequisite-only and retained full-mode scope

- `--prerequisites-only` is parsed once and rejects duplicates. Its branch follows real fixture preparation, three baseline producers, fixture commit, injected manifest, real public baseline `--check`, PASS receipt and baseline digest capture. It precedes canonical overlay and every `--adopt-base` call (`:1284–1305`). The sentinel only changes state to **PREREQUISITES_VERIFIED**, not QUALIFIED, and still flows through cleanup/ownership failure handling. Main accepts that distinct success status explicitly. The mode creates fixture-local generated baseline outputs; it does not claim no generation inside the owned fixture.
- Full mode retains the copied real public entrypoint with fixture BASE, actual four-host/six-category source topology from the existing plan/producers, unchanged count bands, baseline ordinary ownership classes, exact changed/verified sets, declared containment, real subsequent check-mode re-derivation, unchanged unknown bytes/no ownership, scoped metadata token digest/nonmetrics, unrelated row/file, and Git/config preservation.
- Trace2 parsing still uses real start argv, requires usable apply index/tree listings and records proof/batched counts plus the existing ceiling. It is aggregate measurement, not precise per-guard timing attribution of the original interruption. Exact counts/sets and topology deviations require actual evidence, not merely meeting bands.
- Detached per-command process groups, deadline/group termination, bounded post-exit grace/reap, unresolved fixture retention and cleanup failure forcing FAILED remain. They own descendants remaining in that process group, not arbitrary independently detached hostile processes. No failure-path or cleanup negative control has been executed by reviewer.
- Evidence output remains exclusive under the approved known artifact ancestry; no host enforcement or hostile concurrent ancestor-swap guarantee is established. Source identity is recorded by the full run from the frozen workspace, not independently sealed by this review.

## Stop/go and audit

**HOLD.** Complete D1 and settle D2/D3 through the authorized parent-owned correction/qualification gate. Then obtain actual prerequisite status and a fresh full representative apply/check with retained evidence, followed by affected review. This report grants no single corrective, new route, retry, root check, adoption, apply or root re-execution. Parent owns action selection under the user-approved scope.

Only this report written. No commands, probes, tests, builds, generators, source edits, root writes, delegation, model/config/permission changes or premium calls. JavaScript/common standards refreshed; existing security guidance used; MCP compliance audited and partial telemetry captured. Generic audit routing notices do not establish missing React/product implementation review for this script-only task. Host usage/cost unavailable; no fabricated totals. Previous reports/runs/native evidence/quarantine preserved.
