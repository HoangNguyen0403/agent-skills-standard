---
name: Rails Linting
description: Linting/formatting standards for Rails codebases (RuboCop/StandardRB).
metadata:
  labels: [rails, linting, rubocop, standard]
  triggers:
    files: ['.rubocop.yml', 'Gemfile', '**/*.rb']
    keywords: [rubocop, StandardRB, cops]
---

# Rails Linting

## **Priority: P2 (MEDIUM)**

Keep style consistent and reduce reviewer load.

## Rules (Umbrella)

- **One linter**: Prefer RuboCop as the default; document deviations.
- **Run via Bundler**: `bundle exec rubocop`.
- **Minimal overrides**: Only disable cops with a short justification in config.
- **Autocorrect**: Prefer safe auto-correct; avoid churny style wars.

## References

- RuboCop: See `rails/rubocop`.


