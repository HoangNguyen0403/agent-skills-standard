---
name: Ruby Tooling
description: Tooling standards for Ruby projects (linting, formatting, CI checks).
metadata:
  labels: [ruby, tooling, rubocop, bundler]
  triggers:
    files:
      [
        '.rubocop.yml',
        'Gemfile',
        'Gemfile.lock',
        '.ruby-version',
        '**/*.rb',
      ]
    keywords: [rubocop, bundler, rake, rspec]
---

# Ruby Tooling

## **Priority: P1 (HIGH)**

Standardize formatting, linting, and dependency management.

## Rules

- **Bundler**: Always use `bundle exec` for project tools (rake/rspec/rubocop).
- **RuboCop**: Prefer auto-correct safe cops; keep `.rubocop.yml` minimal and justified.
- **CI**: Run `bundle exec rubocop` + `bundle exec rspec` on PR.
- **Dependency updates**: Prefer small, frequent updates; lock via `Gemfile.lock`.


