---
name: kotlin-best-practices
description: Core patterns for robust Kotlin code including scope functions and backing properties. Use when writing idiomatic Kotlin, choosing between scope functions (let/apply/run/also/with), encapsulating mutable state with backing properties, or exposing read-only collection interfaces.
metadata:
  triggers:
    files:
    - '**/*.kt'
    keywords:
    - apply
    - let
    - run
    - also
    - with
    - runCatching
    - backing property
    - MutableList
    - internal
    - private set
---
# Kotlin Best Practices

## **Priority: P1 (HIGH)**


## Implementation Guidelines

- **Scope Functions**:
 - `apply`: Object configuration (returns object).
 - `also`: Side effects / validation / logging (returns object).
 - `let`: Null checks (`?.let`) or mapping (returns result).
 - `run`: Object configuration and mapping (returns result).
 - `with`: Grouping multiple method calls on object (returns result).
- **Backing Properties**: Use `_state` (private mutable, e.g., `private val _state = MutableStateFlow(initial)`) exposed as `val state = _state.asStateFlow()` (public read-only). Pattern: `_prop` private, `prop` public.
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