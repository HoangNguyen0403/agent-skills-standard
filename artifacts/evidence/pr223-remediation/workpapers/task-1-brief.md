## Task 1: Task harness and authorization oracle (F2–F6, NV2)
**Own:** `scripts/evals/task-{runner,types,index,runner.test}.ts`, `benchmarks/tasks/manifest.json`, `benchmarks/tasks/verifiers/`, `benchmarks/tasks/guidance/authorization.*.md`. Do not edit docs/shared metadata or text-evaluation tests.
- Add regressions for candidate process.exit(0), normal leader/non-detached ignored-stdio helper, valid `__proto__` task aggregation/JSON, foreign-ID creation collision, and viewer listing.
- Require an explicit structured completed-verification result, checked by the outer task runner independently of exit zero. Reject missing/malformed/duplicate/incomplete evidence. Preserve counts and useful evidence for real assertion failures. Update every owned test verifier and manifest hash; no legacy exit-only shim. Do not advertise this receipt as a hostile-code sandbox.
- Reuse bounded POSIX group termination/quiescence on normal exit; fail closed if owned group cleanup cannot be established. Preserve timeout/output bounds and Windows limitation disclosures.
- Use null-prototype per-task records, preserving all valid IDs without a name blacklist.
- Align spoof handling to forced tenant override in every arm. Exercise create collision and listing via the actual public service API; update passing test implementation, not the deliberately buggy starting fixture.
**Acceptance:** Early exit never succeeds; ordinary good implementations pass; owned helpers cannot continue past runner resolution; all accepted task IDs persist; collision corruption/viewer leakage fail oracle; treatment behavior is identical.
**Verification:** `rtk node --import tsx --test scripts/evals/task-runner.test.ts`; actual built-in task CLI smoke with deterministic worker; bounded helper cleanup observation.
**Report:** `.agents/sdd/pr223-remediation/task-1-report.md`.

