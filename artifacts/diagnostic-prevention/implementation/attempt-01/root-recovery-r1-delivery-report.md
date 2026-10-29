# R1 harness-only closure — source-frozen handoff

## Scope and ownership

Implemented only in the approved Personal · Delivery handoff, authorized worktree, and two allowed paths:

- `artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs`
- `artifacts/diagnostic-prevention/implementation/attempt-01/root-recovery-r1-delivery-report.md`

Production helper/tests, CLI, schemas, producers, config, dependencies, generated outputs, prior reports/runs, native evidence, and quarantine were left untouched. No delegation, shell/CLI command, test, formatter, build, Git operation, probe, fixture run, live-root write, root repair, adoption, or reapply was performed by this worker. Source SHA and executable evidence are **NOT RUN**; bind them from parent verification rather than infer them here.

## Consolidated harness corrections

1. **Physical Git identity:** Git directory, fixture root, top-level, and fixture-owned `.git` are realpathed; the Git directory must be a component-bounded child of the physical fixture root and equal the physical owned `.git`. The prior lexical `/var` vs `/private/var` mismatch is removed without a spelling special case. Physical paths are recorded in fixture evidence. An isolated self-check accepts an owned child and refuses an external directory; the real fixture check exercises physical alias normalization.
2. **Git configuration isolation:** inherited `GIT_CONFIG_*` variables are stripped as a family, including `GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_COUNT`, and numbered KEY/VALUE channels. Only harness-owned `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null` are restored, followed by explicit harness extras. Fixture hook verification queries effective `core.hooksPath` under the sanitized environment used for commits/producers, resolves it physically, and requires the owned hooks directory to be empty. The isolated override check does not execute an external hook or modify host/global config.
3. **Failure evidence before propagation:** entrypoint results now return captured stdout/stderr and process-group state to the caller. Baseline-check, apply, and check stdout/stderr are written before an unresolved-group failure propagates. Unresolved groups still fail qualification and retain the fixture; deadlines and cleanup acceptance were not relaxed.
4. **Valid unrelated ordinary authority:** the injected unrelated file uses owner/source/agent fields copied from an existing schema-valid ordinary CLI lock entry and its actual SHA-256. The baseline public check validates the injected manifest before any representative apply. Full-mode post-check now verifies both the unchanged authority row and the unrelated fixture file bytes.

The existing real public-entrypoint/full-source route, three real baseline producers, finite child process groups/deadlines, Trace2 measurement, staging exclusions, representative apply/check, existing count bands, and full preservation gates remain in place.

## Prerequisite-only qualification mode

Added `--prerequisites-only` to the existing smoke; no separate runner/API. It reuses fixture creation, physical Git/config checks, real baseline producers, schema-valid unrelated authority injection, fixture commit, and the copied public `--check`. It stops before canonical overlay and before `--adopt-base` or the post-apply check. On a clean teardown it reports `PREREQUISITES_VERIFIED` and exits 0; this status is never `QUALIFIED`. Process-group or cleanup failure remains `FAILED`.

## Parent-owned verification commands

Run from the authorized workspace root, each with a fresh, exclusive evidence directory under `artifacts/diagnostic-prevention/implementation/attempt-01/`:

```sh
rtk node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-r1-prerequisites-01 \
  --prerequisites-only --keep-fixture
```

Only if that produces `PREREQUISITES_VERIFIED` with successful cleanup/teardown, execute one fresh full representative attempt:

```sh
rtk node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-r1-full-01 \
  --keep-fixture
```

The full attempt must exercise the existing copied public `--adopt-base <fixture BASE>` and subsequent public `--check`; it retains real topology and acceptance bands and does not authorize a live-root operation. Stop on any prerequisite failure, process-group uncertainty, cleanup error, or full-run failure. Preserve outputs and obtain independent review before any separate root gate.

## Verification and limits

- JavaScript harness syntax/format, focused prerequisites, parent-owned full smoke, 61-case suite, typecheck, source digest, and independent review: **NOT RUN by this worker**, as required by the brief.
- No passing-after qualification, new scale counts, actual apply/check receipt, duration, Node 20 proof, historical RED, host enforcement, release/canary, or cost result is claimed.
- Prior failed runs, accepted R0 evidence, and all root-state claims remain parent-owned and unchanged. No root execution or retry is authorized by this report.

## Corrective review round 1 — D1–D3

### D1 — EOF syntax report

Parent-reported input: `Unexpected end of input` at line 1718 for source SHA-256 `0d6b15d91857ee3697be64137cef54653f376590344e4eebb07a52e081980a5a`. I did not run a syntax command. The earlier missing `sha256File` function close was already present in the current source. I replaced the whole `runIsolationSelfChecks` lexical block with a bounded function body rather than append a guessed closer. A static JavaScript AST structural query subsequently returned the function body and `main` through their closing braces without a parse-query error. This establishes that the current AST query parsed those constructs; it does not claim the parent’s syntax command passed. The exact failing token in the parent-reported prior snapshot cannot be independently attributed from that hash under the no-command constraint.

### D2 — Physical path qualification

The routing self-check now creates owned internal and external repository-directory trees beneath the smoke’s freshly created temporary root, resolves both Git-directory paths with `fs.realpath`, and runs the same `assertOwnedGitDirectory` guard on them. The internal directory and an alias symlink resolving to that internal directory are accepted; the physically external directory is required to fail with `FIXTURE_GIT_DIR_MISMATCH`. The real fixture’s existing top-level, `.git`, effective hooks path, and Git-directory realpath checks remain unchanged. No Git process or hook is run by this self-check. The recorded fixture identities are physical paths, not fabricated path strings.

### D3 — Exclusive result receipts before group refusal

The public baseline `--check`, `--adopt-base`, and post-apply `--check` callers now use `writeEntrypointResultEvidence` immediately after each child returns and before the unresolved-process-group refusal. It exclusively writes each already-captured stdout/stderr log once, then an exclusive bounded `<stage>.command-result.json` receipt with the complete executable argv, cwd, exit code, signal, spawn error, timeout, termination error, truncation flag, duration, process-group id/reaped state, and stdout/stderr log references. The receipt does not duplicate captured output or include the child environment. Existing failure propagation and fixture-retention behavior remain in force.

### Parent-owned next verification

Use the exact current source, starting with syntax only:

```sh
rtk node --check artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs
```

If syntax succeeds, run the prerequisite-only qualification into a new exclusive directory:

```sh
rtk node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-r1-prerequisites-02 \
  --prerequisites-only --keep-fixture
```

Only after `PREREQUISITES_VERIFIED` and clean teardown, run one full representative qualification into a different new exclusive directory:

```sh
rtk node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-r1-full-02 \
  --keep-fixture
```

Syntax execution, prerequisite qualification, full apply/check, source digest, and independent review remain **NOT RUN by this worker**. Stop on syntax/prerequisite/process-group/teardown failure. Preserve every prior failed run and report; do not retry automatically or perform live-root writes, repair, adoption, or reapply.

## DR2-A authorized staging correction

The authorized harness-only correction changes only `commitFixtureBase`'s positive top-level candidate filter: exact top-level `artifacts` is now excluded alongside `.git` and `node_modules`, before ignore classification, `git add`, and synthetic fixture commit. This preserves BASE-archived artifact bytes in the isolated fixture on disk; it does not delete, move, hide, or force-stage them. The existing final `FIXTURE_TRACKED_EVIDENCE` assertion remains unchanged. Required canonical/config/producer/output candidate checks and dependency-link exclusion/removal are unchanged.

Parent-reported prerequisite02 remains **FAILED** at `FIXTURE_TRACKED_EVIDENCE`, after physical Git/hooks isolation and three successful baseline producers, and before public baseline-check/schema acceptance. No counts or apply/check qualification are claimed. This worker performed no command, test, probe, hash, shell read, formatter, Git operation, fixture run, root write, or reapply.

Parent verification, using a fresh exclusive evidence directory:

```sh
rtk node --check artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs
rtk node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-r1-prerequisites-03 \
  --prerequisites-only --keep-fixture
```

Only after the prerequisite run reaches `PREREQUISITES_VERIFIED` and teardown succeeds, run one isolated full qualification in a separate fresh directory:

```sh
rtk node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
  --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-r1-full-03 \
  --keep-fixture
```

Stop on syntax, prerequisite, process-group, or teardown failure. Preserve the failed prerequisite02 evidence and fixture. This correction does not authorize live-root writes, repair, adoption, or reapply.
