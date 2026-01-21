---
name: Ruby Language
description: Idiomatic Ruby patterns and language fundamentals.
metadata:
  labels: [ruby, language, idioms]
  triggers:
    files: ['**/*.rb', 'Gemfile', 'Rakefile']
    keywords: [module, class, def, require, include, extend, Enumerable]
---

# Ruby Language

## **Priority: P0 (CRITICAL)**

Write idiomatic, readable Ruby that favors clarity over cleverness.

## Core Rules

- **Prefer clarity**: Explicit names and small methods; avoid deep nesting.
- **Use guard clauses**: Early return for invalid states; minimize `if/else` pyramids.
- **Avoid monkey patching**: Prefer refinements or wrapper objects in app code.
- **Immutability by default**: Favor frozen constants; avoid mutating shared objects.
- **Nil safety**: Use safe navigation (`&.`) when appropriate; avoid `rescue nil`.
- **Exceptions**: Raise meaningful error types; do not swallow exceptions without context.

## Style

- **Naming**: `snake_case` methods/variables, `CamelCase` classes/modules, `SCREAMING_SNAKE_CASE` constants.
- **Collections**: Prefer `each`, `map`, `select`, `find`; avoid manual index loops.
- **Performance**: Avoid N+1 allocations in hot paths; prefer `each_with_object` over repeated `+`.

## References

For larger examples, place them under `references/`.


