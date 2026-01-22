---
name: tdd
description: Enforces Test-Driven Development (Red-Green-Refactor) for rigorous code quality.
---

# Test-Driven Development (TDD)

## **Priority: P1 (OPERATIONAL)**

## The Cycle (Red-Green-Refactor)

1.  **RED (Write Failing Test)**: Write a minimal test and confirm it fails.
2.  **GREEN (Make It Pass)**: Write the simplest code to make the test pass.
3.  **REFACTOR (Clean Up)**: Improve code without changing behavior.

## Core Patterns

- **AAA (Arrange-Act-Assert)**: Structure every test case in three distinct phases.
- **F.I.R.S.T.**: Tests must be Fast, Independent, Repeatable, Self-Validating, and Thorough.

## The Iron Laws

1.  **Never** write production code unless you have a failing test (The Iron Law).
2.  **Never** skip the "Red" phase (verifying logic by watching it fail).
3.  **Never** leave the code in a broken state at the end of a session.

## Verification Checklist

- [ ] New function/feature has a corresponding test case?
- [ ] Did you see the test fail first?
- [ ] Does the code handle edge cases defined in tests?
- [ ] Are mocks used only when strictly necessary? (See [Anti-Patterns](references/anti-patterns.md))
