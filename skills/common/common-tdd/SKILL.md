---
name: common-tdd
description: "Guides quality-first TDD for new behavior, bug fixes, and test changes. Selects the smallest test layer, proves a distinct regression risk, and runs bounded RED-GREEN-REFACTOR verification."
metadata:
  triggers:
    files:
      - "**/*.test.ts"
      - "**/*.spec.ts"
      - "**/*_test.go"
      - "**/*Test.java"
      - "**/*_test.dart"
      - "**/*_spec.rb"
    keywords:
      - tdd
      - unit test
      - write test
      - red green refactor
      - failing test
      - test coverage
---

# Quality-First TDD

## **Priority: P0 (CRITICAL)**

A passing test is insufficient; the test must prove an owned behavior and a distinct plausible fault.

## Choose the mode

- **New behavior:** strict RED -> GREEN -> REFACTOR. Do not write production code before the expected RED. If implementation preceded tests, report original RED as `NOT RUN`; never manufacture fake RED by deleting guards or falsifying logs.
- **Legacy or bug fix:** characterize only when needed, then reproduce the intended change as a failing regression (RED). Frozen old-revision proof against a pre-repair snapshot is valid regression evidence when explicitly labeled as `frozen_snapshot_red`. Preserve unrelated existing code; do not delete it merely because it predates the test.
## Before writing a test

Apply A1 (companion-file reuse, twin-extension migration) from `references/anti-slop-rules.md`: add cases to an existing
test file; never create a sidecar with duplicated mocks. Compare against the existing suite; ensure the scenario is not
already covered upstream or in nearby layers. Preserve justified cross-layer tests when layers catch distinct regression
risks.

Create one Test Intent Record per behavior/risk (see `references/quality-contract.md` for schema):
- Fields: `id`, `requirements`, `owner`, `contract` (observable contract — outward side effect), `fault` (distinct plausible fault, risk-sensitive), `layer` (smallest honest layer: `unit`, `integration`, `contract`, `e2e`), `cases` (minimal equivalence classes; use a parameterized test for equivalent inputs), `command` (exact focused single-run command), `oracle` (independent oracle ref, basis, owner, rationale; never copied solely from implementation), `boundaries` (real vs mocked).
- Reject tests that duplicate existing coverage without distinct risk, assert internal mock choreography, or copy expected output from implementation (A7, A12). Evidence receipts bind local consistency under `local-untrusted` trust; they cannot replace human review of oracle independence.

## Bounded loop

1. Run configured lint/type checks, inspect nearby tests, and derive smallest focused command.
2. **RED:** add one intent group and run foreground, sequential, single-run mode.
3. Classify RED as `expected_red`, `frozen_snapshot_red`, `not_run`, `invalid_red`, `unexpected_green`, or `verification_infra_failed`. Setup errors (syntax, import, missing modules, broken fixture) are `invalid_red`, NOT behavioral RED. On `unexpected_green`, inspect existing coverage and remove redundant or weak case before writing production code.
4. **GREEN:** implement only enough to satisfy `expected_red`; rerun same command.
5. **REFACTOR:** improve structure without changing behavior; rerun same command.
6. Escalate only when evidence requires it: related unit target, integration/contract target, then explicit release/full-suite gate.

## Layered Acceptance Protocol

1. **Source-Ready:** Complete owned source delivered at known source/build identity (`git rev-parse HEAD` + dirty identity). Build, lint, and typecheck recorded (`PASS`, `FAIL`, `NOT RUN`, `NOT APPLICABLE` with scope reasons).
2. **Focused Checks:** Unit, component, or contract targets covering owned slices. Derive test count and membership from raw runner output. Reject early zero-exit completions and no-listener runs (zero assertions executed).
3. **Consumer-Smoke:** Actual producer-to-consumer integration verifying outward side effects through real entrypoints (not mock echoes). Required where scope touches service boundaries or consumer contracts.
4. **Independent Review:** Separate task review checking specification compliance, code quality, boundaries, and security.
5. **Human Acceptance:** Explicit sign-off by human partner or authorized operator. Required for milestones/releases; agents cannot provide it.
Later edits invalidate affected proof only; rerun affected gates without weakening checks. Inapplicable layers recorded `NOT APPLICABLE`.

## Execution Safety, Red Flags & Rationalizations

- Honor project timeouts; fallback 120s to bound a focused command. On timeout, terminate only agent-owned process group and verify child cleanup.
- Never watch, blanket-kill, or retry unchanged failure. Record new hypothesis first.
- Risk-sensitive fault evidence: focus on plausible regressions in critical paths; keep only cases detecting a distinct fault or contract rule; use repository-configured coverage thresholds when they exist, or report risk gaps; never add padding tests for coverage percentages or blanket mutation scores.
- Red flags and rationalizations to reject: `add tests after`, `too small`, `passed first run`, `run the full suite again`, `mock every collaborator`, or `implementation is the oracle`. Urgency, manual testing, test count, or coverage target never bypasses intent record, expected RED, bounded command, or fault proof.
## Core Rules & Banned Smells

Apply the universal anti-slop rules A1–A14 in `references/anti-slop-rules.md` (companion reuse, identity fixtures, clause
flipping, tautologies, skip/focus, TS traps, mock echoing, bug-first lock, sleeps, shallow assertions, naming, coverage).
Assert observable outcomes and outward side effects, never mock choreography.

See `references/quality-contract.md` for the intent record schema, RED taxonomy, and escalation ladder.
