---
name: Testing Anti-Patterns
description: Specialized rules to prevent brittle, polluted, or misleading test suites.
---

# Testing Anti-Patterns

Rules to prevent technical debt in test suites.

## **Priority: P1 (OPERATIONAL)**

## The Iron Laws

1. **NEVER** test mock behavior (Mocks isolate; they are not the subject).
2. **NEVER** add test-only methods/fields to production classes.
3. **NEVER** mock without understanding deeper side effects.

## Core Pitfalls & Fixes

### 1. Asserting on Mocks

- **Violation**: `expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument()`
- **Fix**: Test real component output or unmock the dependency. If isolation is required, assert on the _host's_ behavior, not the mock's existence.

### 2. Production Pollution

- **Violation**: Adding `session.destroy()` just for `afterEach` cleanup.
- **Fix**: Move cleanup logic to `test-utils`. Production code should only contain business logic.

### 3. Incomplete Mocks

- **Violation**: Partial data structures (e.g., missing metadata required by downstream logic).
- **Fix**: Mirror the real API/Object structure completely to prevent silent failures in realistic scenarios.

### 4. Over-Mocking

- **Violation**: Mock setup is >50% of the test file.
- **Fix**: Use true Integration Tests with real (but fast) dependencies. Complex mocks indicate over-coupling or poor test strategy.

## Verification Checklist

- [ ] Is this method/field used ONLY by tests? (Move to utils/extensions).
- [ ] Are we testing what the code DOES or what the MOCK does?
- [ ] Does the mock mirror the FULL data structure of the real dependency?
- [ ] Is mock setup simpler than the actual business logic?
