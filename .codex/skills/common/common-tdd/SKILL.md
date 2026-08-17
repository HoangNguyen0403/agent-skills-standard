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

- **New behavior:** strict RED -> GREEN -> REFACTOR. Do not write production code before the expected RED.
- **Legacy or bug fix:** characterize only when needed, then reproduce the intended change as a failing regression (RED). Preserve unrelated existing code; do not delete it merely because it predates the test.

## Before writing a test

Create one Test Intent Record per behavior/risk:

- `contract`: observable contract — an application-owned result or side effect
- `fault`: distinct fault — a distinct plausible regression this test would catch
- `layer`: smallest honest unit, component, contract, integration, or E2E layer
- `cases`: minimal distinct equivalence classes; use a parameterized test for equivalent inputs
- `command`: exact focused single-run command

Reject tests that duplicate an existing fault, assert implementation detail or mock choreography, depend on time/network/order, or force a broader behavior into a unit.

## Bounded loop

1. Run configured lint/type checks, inspect nearby tests, and derive the smallest command.
2. **RED:** add one intent group and run it in the foreground, sequentially, single-run mode.
3. Classify RED as `expected_red`, `invalid_red`, `unexpected_green`, or `verification_infra_failed`. If it is `unexpected_green`, inspect existing coverage and remove a redundant or weak case before implementing production code.
4. **GREEN:** implement only enough to satisfy `expected_red`; rerun the same command.
5. **REFACTOR:** improve structure without changing behavior; rerun the same command.
6. Escalate only when evidence requires it: related unit target, integration/contract target, then explicit release/full-suite gate.

## Execution safety

- Honor project timeouts; otherwise use a 120-second fallback to bound a focused command.
- On timeout, terminate only the agent-owned process group and verify child cleanup.
- Never watch, blanket-kill, or retry an unchanged failure. Record the new hypothesis or corrective change first.
- Coverage is repository-configured, project-owned evidence. Without a configured threshold, report risk gaps and never add padding tests for a percentage.

## Red flags and rationalizations

- Stop on: `add tests after`, `too small`, `passed first run`, `run the full suite again`, or `mock every collaborator`.
- Urgency, manual testing, test count, or a coverage target never bypasses the intent record, expected RED, bounded command, or fault proof.

## Test shape

- Use clear Arrange, Act, Assert phases; comments are optional.
- Assert observable outcomes. Assert an interaction only when that interaction is the contract.
- Mock external boundaries only when isolation requires it; prefer real pure/domain behavior and simple fakes.
- Keep test names behavior-focused, without ticket IDs or TODO/FIXME markers.

See `references/quality-contract.md` for the intent record, failure taxonomy, layer routing, and runner examples.
