---
name: java-best-practices
description: Apply core Effective Java patterns for robust, maintainable code. Use when applying SOLID principles, choosing between inheritance and composition, refactoring Java code smells, or reviewing class design.
metadata:
  triggers:
    files:
    - '**/*.java'
    keywords:
    - refactor
    - SOLID
    - builder
    - factory
    - composition
    - immutable
    - Optional
    - checked exception
    - clean code
---
# Java Best Practices

## **Priority: P1 (HIGH)**


## Implementation Guidelines

- **Immutability**: Prefer immutable objects (`final` fields, unmodifiable collections).
- **Access Modifiers**: Minimize visibility. Default to **package-private** (no modifier). Use `private` for all fields. Only `public` for API contracts.
- **Composition > Inheritance**: Favor `Has-A` over `Is-A`. Avoid deep hierarchies.
- **Constructors**: Use Static Factory Methods (`User.of()`) over complex constructors.
- **Builder Pattern**: Use for objects with 4+ parameters.
- **Exceptions**: Recoverable → Checked; Programming error → Unchecked.
- **Fail Fast**: Validate parameters (`Objects.requireNonNull`) at method start.
- **Interfaces**: Code to interfaces (`List`, `Map`), not implementations (`ArrayList`).
- **Dependency Injection**: Inject dependencies via constructor; don't create them internally.
- **Method References**: Use `String::toUpperCase` over `s -> s.toUpperCase()` where readable.

## Anti-Patterns

- **No Null Returns**: Return Optional<T> or empty collection instead.
- **No Empty Catch**: Log or rethrow; never swallow exceptions silently.
- **No God Class**: Split into focused classes following Single Responsibility Principle.
- **No Magic Numbers**: Extract named constants with clear meaning.
- **No Mutable Statics**: Avoid public static mutable fields (global state).

## References

- [Static Factory & Composition Examples](references/example.md)