---
name: Rails RuboCop
description: RuboCop rules for Rails projects (consistency, safety, and maintainability).
metadata:
  labels: [rails, rubocop, linting, style]
  triggers:
    files: ['.rubocop.yml', 'Gemfile', '**/*.rb']
    keywords: [rubocop, RuboCop, Rails, cops, Exclude]
---

# Rails RuboCop

## **Priority: P1 (HIGH)**

Use RuboCop to keep style consistent and prevent risky patterns.

## Baseline Rules

- **Always run via Bundler**: `bundle exec rubocop`.
- **Prefer Rails cops**: Enable Rails-specific cops if available.
- **Keep config small**: Only override cops with a short justification.
- **No blanket excludes**: Avoid excluding `app/**` or broad directories unless required.

## Recommended Setup

- **.rubocop.yml**
  - Inherit shared config if your org provides it (`inherit_from`).
  - Use `TargetRubyVersion` and keep it aligned with `.ruby-version`.
  - Enable new cops intentionally (don’t auto-enable without review).

## Anti-Patterns

- **Style wars**: Large reformat-only PRs without functional change.
- **Disabling cops**: Disabling a cop instead of refactoring the underlying smell.


