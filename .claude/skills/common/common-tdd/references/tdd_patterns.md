---
name: TDD Patterns
description: Implementation patterns and discovery protocols for Test-Driven Development.
---

# TDD Patterns & Protocol

## Pattern: AAA (Arrange-Act-Assert)

1. **Arrange**: Set up the world (Mocks, Data, Context).
2. **Act**: Execute the single action being tested.
3. **Assert**: Verify the observable result and required side effects.

## Standard: F.I.R.S.T.

- **Fast**: Runs in seconds, not minutes.
- **Independent**: No order dependency; clean state per test.
- **Repeatable**: Deterministic results (no flake).
- **Self-Validating**: Binary Pass/Fail; no manual output check.
- **Thorough**: Covers required contract boundaries and distinct plausible faults without low-signal combinations.

## Protocol: Bug Fix Discovery

When a bug is reported:

1. **REPRODUCE**: Write a minimal failing test that triggers the bug.
2. **VERIFY RED**: Watch the test fail with the expected error.
3. **FIX**: Write minimal code to pass.
4. **VERIFY GREEN**: Test passes + prevents regressions forever.

For legacy code, characterization can document current behavior first. The intended change still needs its own RED evidence; unrelated existing implementation is not deleted.

## Protocol: Scaffolding (When Stuck)

- **API First**: Write the test you _wish_ you could run. Use the ideal interface.
- **Assertion First**: Work backwards from `expect(...)`.
- **Simplification**: If the test is too hard to write, the design is too coupled. Refactor design _before_ finishing the test.

## Protocol: Bounded Verification

1. Run lint/type checks when configured.
2. Run one focused target in foreground, single-run, sequential mode.
3. Classify `expected_red`, `invalid_red`, `unexpected_green`, or `verification_infra_failed`.
4. Escalate to related or full suites only when the changed boundary requires it.
5. Use the project timeout or 120 seconds for a focused command; clean only its process group and never retry unchanged failures.
