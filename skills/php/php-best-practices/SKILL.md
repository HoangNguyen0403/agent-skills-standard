---
name: php-best-practices
description: Write PHP following best practices, PSR standards, and code quality guidelines. Use when writing PHP following PSR standards, SOLID principles, or improving code quality.
metadata:
  triggers:
    files:
    - '**/*.php'
    keywords:
    - psr-12
    - camelCase
    - PascalCase
    - dry
    - solid
---
# PHP Best Practices

## **Priority: P1 (HIGH)**

## Structure

```text
src/
├── {Domain}/             # e.g., Services, Repositories
└── Helpers/              # Pure functions/Traits
```

## Implementation Guidelines

### Coding Style (PSR Standards)

- **PSR-12**: Enforce **4-space indentation** and **opening braces on same line** for functions/methods.
- **Organization**: One class per file; use statements follow namespace. Run **PHP CS Fixer** with **PSR-12** preset.
- **Naming Conventions**: Use **`PascalCase`** (UserService) for classes, **`camelCase`** (getUserById) for methods/variables, and **`SNAKE_CASE`** (MAX_RETRIES) for class constants.

### SOLID Principles in PHP

- **SRP**: Single Responsibility Principle — extract each into its own focused class; keep classes under ~200 lines.
- **Dependency Inversion**: inject via constructor with interface type-hints. Inject dependencies via constructor for testability. Favor composition over deep inheritance chains.
- **Separation of Concerns**: Use **Interfaces** for decoupling integrations and logic.

### Logic & Performance

- **Guard Clauses**: Return early for error conditions (e.g., if (!$user) return null); no else after return to reduce nesting depth.
- **Traits**: Define trait HasTimestamps (e.g., `use HasTimestamps`) for cross-cutting behavior. Keep traits focused and lightweight.
- **Helper Functions**: Avoid global-namespace logic; organize in classes.

## Anti-Patterns

- **No monolithic classes**: Each class one responsibility (SRP).
- **No hardcoded magic numbers**: Define as named class constants.
- **No deep nesting**: Use guard clauses to return early.
- **No `echo` in services**: Return data; let controller output.

## References

- [Clean Code Patterns](references/implementation.md)