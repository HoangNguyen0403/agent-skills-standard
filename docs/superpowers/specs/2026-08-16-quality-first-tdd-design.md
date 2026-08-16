# Quality-First TDD Standard

## Summary

Evolve `common-tdd` rather than introduce another skill or analyzer. Test quality is based on observable behavior and fault-detection evidence, then distributed from `agent-skills-standard` to Solo-Corp through versioned sync.

## Quality Contract

- New behavior uses strict RED -> GREEN -> REFACTOR.
- Existing or buggy behavior uses characterization only when needed, then reproduces the intended change as RED while preserving unrelated implementation.
- Each behavior/risk gets one Test Intent Record containing the application-owned observable contract, distinct plausible fault, smallest valid test layer, minimal cases/equivalence classes, and exact focused command.
- Reject redundant cases, implementation-detail assertions, mock choreography, nondeterminism, and unit tests for behavior only observable at a broader layer.
- Use repository-configured coverage gates when present. Otherwise report risk gaps without padding tests for a universal percentage.

## Execution Contract

1. Run configured lint/type checks, inspect nearby tests, and derive the smallest exact command.
2. Run one foreground focused target at a time, in single-run mode and sequentially unless the repository explicitly declares safe parallelism.
3. Classify RED as `expected_red`, `invalid_red`, `unexpected_green`, or `verification_infra_failed`.
4. Implement only enough for GREEN, refactor without changing behavior, and rerun the focused target after each phase.
5. Escalate only when evidence requires it: related unit target, integration/contract target, then an explicit release/full-suite gate.
6. Honor project timeouts or use a 120-second focused-command fallback. On timeout, terminate only the agent-owned process group, verify child cleanup, and never retry an unchanged failure.

## Agent Output

The TDD specialist reports `INTENT`, `RED`, `GREEN`, `REFACTOR`, `QUALITY`, and `EXECUTION` evidence. Test count is informational and cannot establish success by itself.

## Evaluation and Distribution

Evals cover scenario explosion, duplicate equivalence classes, wrong-layer tests, mock assertions, unexpected-green and invalid-red handling, legacy fixes, coverage padding, broad suites, blind retries, timeouts, and orphan-process cleanup. Deterministic audits and fresh targeted baseline/with-skill evaluations must pass before release.

Canonical changes are made first, generated agent surfaces are regenerated, and Solo-Corp updates its pinned common bundle only after the versioned upstream release. V1 does not add a Solo-Corp runtime gate, mutation-testing platform, new TDD skill, global AGENTS rule, or specialist-ref pinning.
