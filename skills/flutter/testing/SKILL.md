---
name: Flutter Testing Standards
description: Unit, widget, and integration testing using mocktail and bloc_test.
metadata:
  labels: [testing, junit, mocktail, bloc_test, golden-tests]
  triggers:
    files: ['**/test/**.dart']
    keywords: [test, group, expect, mocktail, blocTest, when, any]
---

# Testing Standards

## **Priority: P1 (HIGH)**

Ensuring code reliability through multi-layered testing strategies.

## Structure

```text
test/
├── unit/ # Business logic & mapping (Blocs, Repositories, UseCases)
├── widget/ # UI component behavior (Screens, Widgets)
└── integration/ # End-to-end flows
```

## Implementation Guidelines

- **Testing Pyramid**: Maintain ~70% Unit Tests, ~20% Widget Tests, ~10% Integration Tests.
- **Mocks**: Use `mocktail` for type-safe, boilerplate-free mocking.
- **Unit Tests**: Test logic in isolation. Verify all edge cases (Success, Failure, Exception).
- **Widget Tests**: Test high-value interactions (Button clicks, Error states, Loading indicators).
- **BLoC Tests**: Use `blocTest` to verify state emission sequences.
- **Code Coverage**: Aim for 80%+ coverage on Domain and Presentation (Logic) layers.

## Deep Dive References

- [Unit Testing Strategies](./references/unit-testing.md) (Test Data Builders, Mocktail)
- [Widget Testing Strategies](./references/widget-testing.md) (Robot Pattern)
- [Integration Testing](./references/integration-testing.md) (Shared Robots, Real Device)
- [Robot Pattern Implementation](./references/robot-pattern.md)

## Related Topics

layer-based-clean-architecture | dependency-injection | cicd
