---
name: common-best-practices
description: Enforce SOLID principles, guard-clause style, function size limits, and intention-revealing naming across all languages. Use when refactoring for readability, applying clean-code patterns, reviewing naming conventions, or reducing function complexity.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    - '**/*.go'
    - '**/*.dart'
    - '**/*.java'
    - '**/*.kt'
    - '**/*.swift'
    - '**/*.py'
    keywords:
    - solid
    - kiss
    - dry
    - yagni
    - naming
    - conventions
    - refactor
    - clean code
---
# Global Best Practices

## **Priority: P0 (FOUNDATIONAL)**

## Core Principles

- **SOLID**: Follow SRP (One reason to change), OCP (Open to extension), LSP, ISP, DIP.
- **KISS/DRY/YAGNI**: Favor readability. Abstract repeated logic. No " in case" code.
- **Naming**: Use intention-revealing names (`isUserAuthenticated` > `checkUser`). Match language casing.

## Code Hygiene

- **Size Limits**: Functions < 30 lines. Services < 600 lines. Utils < 400 lines.
- **Early Returns**: Use guard clauses. Avoid deep nesting.
- **Comments**: Explain **why**, not **what**. Refactor bad code; don't comment it.
- **Input**: Validate/sanitize all external inputs.

## Anti-Patterns

- **No Hardcoded Constants**: Use named config/env vars.
- **No Deep Nesting**: Use guard clauses.
- **No Global State**: Prefer dependency injection.
- **No Empty Catches**: Always handle, log, or rethrow.

## References

- [Code Structure Patterns](references/CODE_STRUCTURE.md) — file/function organization
- [Effectiveness Guide](references/EFFECTIVENESS.md) — practical application examples