## Task 2: Text provenance and evidence wording (F7, F8, N1, NV1)
**Own:** `scripts/evals/{execute,reporter,impact,compose}.ts`, `scripts/evals/evals-v2.test.ts` and narrowly related text-eval tests if needed. No task-runner files.
- Reject composite generation before constructing/invoking runners or writing answers/metadata; preserve valid fresh-v4 generation and immutable historical reading.
- Keep unresolved contributors in provenance classification and emit uncertainty warnings without claiming unknown proves heterogeneity. Support category/group reports consistently.
- Import existing EvidenceMode as a type.
- Replace the unverified tool-free guarantee with truthful text-only evidence labeling: no-tool prompting/read-only capability is not host enforcement. Do not introduce host tool controls or certify historical runs.
- Add behavior regressions for missing historical composite recovery and known-plus-unknown report contributors. Remove incidental wording-only tests instead of re-pinning them.
**Acceptance:** No mutation or runner call for composite recovery; no v4-only headline with unknown contributors; historical verification unchanged; evidence labels do not overclaim capabilities.
**Verification:** `rtk node --import tsx --test scripts/evals/evals-v2.test.ts`; `rtk pnpm evals:verify -- --all`; actual temporary compose/recovery/report smoke.
**Report:** `.agents/sdd/pr223-remediation/task-2-report.md`.

