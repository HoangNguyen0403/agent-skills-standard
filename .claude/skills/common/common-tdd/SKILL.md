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

Compare against the existing suite before adding or removing cases. Ensure the scenario is not already covered upstream or in nearby layers. Preserve justified cross-layer tests when layers catch distinct regression risks.

Create one Test Intent Record per behavior/risk (see `references/quality-contract.md` for schema):

- `id`: unique stable intent identifier
- `requirements`: traceable requirement IDs (at least one)
- `owner`: accountable owner
- `contract`: observable contract — application-owned result or outward side effect
- `fault`: distinct plausible fault this test catches (risk-sensitive, not blanket mutation quota)
- `layer`: smallest honest layer (`unit`, `integration`, `contract`, `e2e`)
- `cases`: minimal distinct equivalence classes; use a parameterized test for equivalent inputs
- `command`: exact focused single-run command
- `oracle`: independent oracle ref (path + sha256), basis (`approved_requirement`, `external_specification`, `independently_reviewed_example`), owner, and rationale; never copied solely from implementation
- `boundaries`: explicit `real` vs `mocked` boundaries with justification

Reject tests that duplicate existing coverage without distinct risk, assert internal mock choreography, copy expected output from implementation, or invent numeric four-pillar scores without empirical evidence. Evidence receipts bind local consistency under `local-untrusted` trust; they cannot replace human review of oracle independence.
## Bounded loop

1. Run configured lint/type checks, inspect nearby tests, and derive the smallest command.
2. **RED:** add one intent group and run it in the foreground, sequentially, single-run mode.
3. Classify RED as `expected_red`, `frozen_snapshot_red`, `not_run`, `invalid_red`, `unexpected_green`, or `verification_infra_failed`. Setup errors (syntax, import, missing modules, broken fixture) are `invalid_red`, NOT behavioral RED. If it is `unexpected_green`, inspect existing coverage and remove a redundant or weak case before implementing production code.
4. **GREEN:** implement only enough to satisfy `expected_red`; rerun the same command.
5. **REFACTOR:** improve structure without changing behavior; rerun the same command.
6. Escalate only when evidence requires it: related unit target, integration/contract target, then explicit release/full-suite gate.

## Layered Acceptance Protocol

Acceptance is tracked across distinct delivery layers whose required applicability is determined by the approved task, slice, or release scope:
1. **Source-Ready:** Complete owned source delivered at a known source/build identity (`git rev-parse HEAD` + dirty identity). Build, lint, and typecheck statuses are explicitly and independently recorded (`PASS`, `FAIL`, `NOT RUN`, or `NOT APPLICABLE` with scope reasons). Source-ready means source handoff is complete; it does NOT imply unexecuted checks have passed.
2. **Focused Checks:** Unit, component, or contract test targets covering owned slices. Test membership and count must be derived directly from raw runner output. Reject early zero-exit completions and no-listener runs (zero assertions executed). Micro-level TDD iterations satisfy focused checks; they do not require universal human sign-off per test.
3. **Consumer-Smoke:** Actual producer-to-consumer integration verifying outward side effects through real entrypoints (not mock echoes or synthetic stubs). Required where task scope touches service boundaries, consumer contracts, or cross-component flows.
4. **Independent Review:** Separate task review checking specification compliance, code quality, boundaries, and security. Required per task or slice gate in structured plans.
5. **Human Acceptance:** Explicit sign-off by human partner or authorized business operator. Required for product milestones, external releases, or gated deployments. Where human acceptance is required, it remains pending until an authorized human acts; agents cannot provide it.

Each applicable layer requires: source/build identity, actual entrypoint/assertion, and result artifact. Later edits invalidate affected proof only; rerun affected gates without weakening checks or invalidating unrelated previous gates. Inapplicable layers are recorded as `NOT APPLICABLE` with scope reasons, never marked `PASS` or silently dropped.
## Execution safety

- Honor project timeouts; otherwise use a 120-second fallback to bound a focused command.
- On timeout, terminate only the agent-owned process group and verify child cleanup.
- Never watch, blanket-kill, or retry an unchanged failure. Record the new hypothesis or corrective change first.
- Risk-sensitive fault evidence: focus on plausible regressions in critical paths; never add padding tests for coverage percentages or blanket mutation scores.

## Red flags and rationalizations

- Stop on: `add tests after`, `too small`, `passed first run`, `run the full suite again`, `mock every collaborator`, or `implementation is the oracle`.
- Urgency, manual testing, test count, or a coverage target never bypasses the intent record, expected RED, bounded command, or fault proof.

## Test shape

- Verify one logical contract per test; multiple assertions are allowed when verifying related aspects or side effects of that single contract.
- Assert observable outcomes and outward side effects, not mock choreography or call sequences.
- Mock external boundaries only when isolation requires it; prefer real pure/domain behavior and simple fakes.
- Keep test names behavior-focused, without ticket IDs or TODO/FIXME markers.

See `references/quality-contract.md` for the intent record, failure taxonomy, layer routing, and runner examples.
