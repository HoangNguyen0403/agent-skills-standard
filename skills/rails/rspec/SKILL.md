---
name: Rails RSpec
description: RSpec conventions for Rails apps (structure, factories, and reliability).
metadata:
  labels: [rails, rspec, testing]
  triggers:
    files: ['spec/**/*.rb', 'Gemfile']
    keywords: [RSpec, describe, context, it, expect, FactoryBot, rails_helper]
---

# Rails RSpec

## **Priority: P1 (HIGH)**

Write fast, reliable tests with clear boundaries.

## Structure

- **Request specs**: Use for API/HTTP behavior and authorization at the boundary.
- **Service specs**: Test business workflows in POROs/service objects.
- **Model specs**: Keep lightweight (validations/scopes); avoid testing framework internals.

## Conventions

- **Factories**: Prefer small factories; avoid deep nested factories.
- **Determinism**: Freeze time when needed; avoid random ordering unless fixed with seed.
- **DB cleanup**: Use transactional tests by default; avoid brittle global state.

## Anti-Patterns

- **Over-mocking**: Mocking ActiveRecord heavily instead of testing behavior.
- **Slow suites**: Too many feature/system tests for simple logic; push logic down to unit tests.


