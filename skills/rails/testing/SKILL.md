---
name: Ruby on Rails Testing
description: Rails testing standards (RSpec/Minitest, factories, request specs).
metadata:
  labels: [rails, testing, rspec, minitest]
  triggers:
    files: ['spec/**/*.rb', 'test/**/*.rb', 'Gemfile']
    keywords: [RSpec, describe, it, expect, FactoryBot, fixtures]
---

# Rails Testing

## **Priority: P1 (HIGH)**

Prefer fast, reliable tests with clear boundaries.

## Guidelines (Umbrella)

- **Pick one primary framework**:
  - **RSpec** (recommended): follow `rails/rspec` skill.
  - **Minitest**: keep close to Rails conventions; avoid excessive custom DSLs.
- **Test boundaries**:
  - HTTP boundary with request specs (or Rails integration tests).
  - Business workflows in services/POROs.
  - Models remain lean (validations/scopes only).
- **Data setup**: keep factories/fixtures minimal; avoid deep trees.
- **Determinism**: freeze time and stabilize randomness to avoid flaky tests.

## References

- RSpec: See `rails/rspec`.


