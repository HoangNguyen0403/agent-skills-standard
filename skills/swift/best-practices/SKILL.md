---
name: Swift Best Practices
description: Standards for Guard, Value Types, Immutability, and Naming
metadata:
  labels: [swift, best-practices, guard, immutability]
  triggers:
    files: ['**/*.swift']
    keywords: ['guard', 'let', 'struct', 'final']
---

# Swift Best Practices

## **Priority: P0**

## Implementation Guidelines

### Control Flow

- **Guard for Early Exit**: Use `guard` over nested `if` for better readability.
- **for-where**: Use `for item in items where condition` instead of nested `if`.
- **Switch Exhaustiveness**: Always handle all cases; use `@unknown default` for enums.

### Value Types & Immutability

- **Prefer Structs**: Use `struct` by default; classes only for reference semantics or inheritance.
- **Immutability**: Use `let` over `var` whenever possible.
- **Copy-on-Write**: Leverage Swift's built-in COW for collections.

### Naming & Style

- **Clear Intent**: `isEnabled`, `hasData`, `canSubmit` for Booleans.
- **Avoid Abbreviations**: `userRepository` not `userRepo`.
- **Type Inference**: Let compiler infer types unless clarity requires annotation.

## Anti-Patterns

- **Nested If**: `**No Pyramid of Doom**: Use guard.`
- **Mutable Globals**: `**No var at Global Scope**: Use constants or dependency injection.`
- **Force Try**: `**No try!**: Handle errors properly.`

## References

- [Guard Patterns & Immutability](references/implementation.md)
