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

- **Violation**: The test spends more effort simulating collaborators than proving an owned behavior.
- **Fix**: Keep real pure/domain behavior and simple fakes; route cross-boundary behavior to an integration or contract test.

### 5. Scenario Padding

- **Violation**: Equivalent inputs are added only to raise test count or coverage.
- **Fix**: Record the distinct fault for each case and parameterize equivalent inputs.

### 6. Unbounded Execution

- **Violation**: A broad suite is launched during each RED/GREEN loop, with watch mode, blind retries, or orphaned child processes.
- **Fix**: Run the smallest foreground target sequentially, apply a timeout, clean only the owned process group, and escalate by evidence.

## Verification Checklist

- [ ] Is this method/field used ONLY by tests? (Move to utils/extensions).
- [ ] Are we testing what the code DOES or what the MOCK does?
- [ ] Does the mock mirror the FULL data structure of the real dependency?
- [ ] Does mock setup stay smaller than the behavior being proved?
- [ ] Does every case detect a distinct fault or contract rule?
- [ ] Is the command focused, bounded, and cleanly terminated?
