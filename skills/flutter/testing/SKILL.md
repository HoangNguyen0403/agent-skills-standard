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
├── unit/ # Business logic & mapping
├── widget/ # UI component behavior
└── integration/ # End-to-end flows
```

## Implementation Guidelines

- **Mocks**: Use `mocktail` for type-safe, boilerplate-free mocking.
- **Unit Tests**: Focus on Repositories and Use Cases. Verify all success/failure paths.
- **BLoC Tests**: Use `blocTest` to verify state emission sequences.
- **Widget Tests**: Test high-value components (Buttons clicking, Loading indicators showing).
- **Robot Pattern**: Encapsulate widget interaction logic in "Robot" classes for readable tests.
- **Code Coverage**: Aim for 80%+ coverage on Domain and Presentation (Logic) layers.
- **Golden Tests**: Use for complex UI layouts to prevent visual regressions (Alchemist).

## Reference & Examples

For BLoC testing templates and Robot pattern examples:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

layer-based-clean-architecture | dependency-injection
