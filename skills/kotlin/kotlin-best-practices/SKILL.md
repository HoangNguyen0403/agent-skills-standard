---
name: kotlin-best-practices
description: "Core patterns for robust Kotlin code including scope functions and backing properties. Use when writing idiomatic Kotlin, choosing between scope functions (let/apply/run/also/with), encapsulating mutable state with backing properties, or exposing read-only collection interfaces. (triggers: **/*.kt, apply, let, run, also, with, runCatching, backing property, MutableList, internal, private set)"
---

# Kotlin Best Practices

## **Priority: P1 (HIGH)**

Engineering standards for clean, maintainable Kotlin systems.

## Implementation Guidelines

- **Scope Functions**:
  - `apply`: Object configuration (returns object).
  - `also`: Side effects / validation / logging (returns object).
  - `let`: Null checks (`?.let`) or mapping (returns result).
  - `run`: Object configuration and mapping (returns result).
  - `with`: Grouping multiple method calls on an object (returns result).
- **Backing Properties**: Use `_prop` (private mutable) and `prop` (public immutable) for encapsulation.
- **Collections**: Expose `List`/`Map` (read-only) publicly; keep `MutableList` internal.
- **Error Handling**: Use `runCatching` for simple error handling over try/catch blocks.
- **Visibility**: Default to `private` or `internal`. Minimize `public` surface area.
- **Top-Level**: Prefer top-level functions/constants over implementation-less `object` singletons.

## Anti-Patterns

- **No Deep Scope Nesting**: Limit let/apply nesting to 2 levels; deeper destroys readability.
- **No Public var**: Use private set or backing properties for encapsulation.
- **No Global Mutable State**: Avoid mutable top-level variables.

## References

- [Backing Property & Scope Function Examples](references/example.md)
