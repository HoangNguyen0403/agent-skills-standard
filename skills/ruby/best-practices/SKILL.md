---
name: Ruby Best Practices
description: High-signal conventions for maintainable Ruby codebases.
metadata:
  labels: [ruby, best-practices, maintainability]
  triggers:
    files: ['**/*.rb', 'Gemfile', 'Rakefile']
    keywords: [service, interactor, presenter, serializer, concern]
---

# Ruby Best Practices

## **Priority: P1 (HIGH)**

Keep Ruby codebases consistent, testable, and easy to change.

## Guidelines

- **Small methods**: Prefer 5–15 lines; extract private helpers.
- **Explicit boundaries**: Separate domain logic from IO (DB, HTTP, filesystem).
- **Avoid callbacks for business logic**: Prefer explicit orchestration (service objects).
- **Avoid global state**: No hidden config mutations; pass dependencies in.
- **Logging**: Log structured context; never log secrets/tokens.

## Anti-Patterns

- **Callback soup**: Business flows hidden in `before_*` chains.
- **God objects**: Massive models/modules doing everything.
- **Rescue-all**: `rescue StandardError` without re-raise/handling policy.


