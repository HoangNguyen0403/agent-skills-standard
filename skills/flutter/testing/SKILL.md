---
name: Flutter Testing Standards
description: Core standards for unit, widget, and integration testing in Flutter.
---

# Flutter Testing Standards

## **Priority: P0 (CRITICAL)**

Strict guidelines for maintaining a high-quality, reliable, and fast test suite.

## Core Rules

1.  **Test Pyramid**: Prioritize Unit Tests > Widget Tests > Integration Tests.
2.  **Naming Convention**: Use `should <expected behavior> when <condition>` or `feature_test.dart`.
3.  **Mocking**: Strict separation of concerns using shared mocks.
4.  **AAA Pattern**: Arrange, Act, Assert in all tests.

## Mocking Standards

**Do not define local mocks for shared components.**

- **Rule**: All shared components (Blocs, Repos/Services) must use shared mocks.
- **Location**: `test/shared/`
- **Safe Matchers**: Avoid `any()` and `registerFallbackValue`. Use specific matchers or `anyNamed()` for named parameters.
- **Reference**: [Mocking Standards (Detailed)](references/mocking_standards.md)

## Directory Structure

```text
test/
├── features/           # Feature-specific tests
├── shared/             # Shared mocks and fixtures
│   ├── mock_blocs.dart
│   └── mock_repositories.dart
└── core/               # Core utility tests
```

## Anti-Patterns

- **No Logic in Tests**: Test logic, don't reimplement it.
- **No Flaky Tests**: Avoid `Future.delayed` or reliance on external state.
- **No Local Mocks**: See [Mocking Standards](references/mocking_standards.md).
- **No Unsafe Matchers**: Avoid `any()` (use specific types/matchers) and `registerFallbackValue`.
