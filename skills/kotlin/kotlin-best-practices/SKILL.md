---
name: kotlin-best-practices
description: Core Kotlin patterns for scope functions, backing properties, and read-only collection interfaces. Use for let/apply/run/also/with choices or encapsulating mutable state; defer general language constructs, extension functions, coroutines/runCatching, Android/Room recipes, and testing/tooling setup.
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
