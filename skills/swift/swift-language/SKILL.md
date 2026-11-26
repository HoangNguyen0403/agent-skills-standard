---
name: swift-language
description: Apply Optionals, Protocols, Extensions, and Type Safety patterns in Swift. Use when working with Swift Optionals, Protocols, Extensions, or type-safe APIs.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - protocol
    - extension
    - optional
    - guard
    - enum
---
# Swift Language Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Optionals & Safety

- **Never Force Unwrap**: Use **guard let**, **if let**, or **nil coalescing (??)** to safely unwrap.
- **Nil Comparison**: Use `value != nil` instead of `if let _ = value`.
- **Implicitly Unwrapped**: Avoid `Type!`. Use proper `Type?`.

### Protocols & Extensions

- **Protocols as Blueprints**: Protocols define **blueprint**; classes inherit implementation.
- **Composition over Inheritance**: **Prefer protocol composition** with structs for better decoupling and performance.
- **Extensions**: Implement **conformance** in extension: **`extension MyType: MyProtocol { ... }`**. Use extensions for clean code organization, not storage ( **not** use extensions for **stored properties**).
- **Protocol Witnesses**: Explicitly implement all required members to satisfy witness table.

### Type Safety

- **Avoid `Any`**: Use generics or associated types instead for compile-time safety.
- **Enums**: Prefer enums with **associated values** over multiple Optionals. Extract values via **switch** statement (e.g., `case .success(let value):`).
- **Value Types**: **Default to struct** for **value semantics** — copies are independent, so no accidental shared mutation. That is not intrinsic thread safety: a struct is `Sendable` when every stored property is `Sendable`, and mutable value-typed properties (`var value: Int`) are fine because each copy owns them. A stored `class`, closure, or other shared reference is not automatically `Sendable` — sharing the struct shares that reference. Use `class` only when **reference identity** is necessary or for inheritance.

## Anti-Patterns

- **No ! operator**: Use safe unwrapping.
- **No -1 for failure**: Use Optional.
- **No force cast (as!)**: Use conditional cast (as?).
- **No "structs are thread-safe"**: value semantics prevent shared mutation, not data races through reference-typed properties.

## Version Gates

`some P?`/`any P?` optional protocol shorthand and borrow/mutate accessors are Swift 6.4 additions; non-copyable types predate 6.4 (6.4 extends their ownership support). Emit the shorthand only when the project's compiler, tools version and language mode admit 6.4 — it is syntax-only, so no deployment-target bump is needed; borrow/mutate accessors and newer library APIs do carry their own availability. Otherwise keep the parenthesized `(some P)?` form. See [Swift 6.4 features](references/swift-6.4-features.md).

## References

- [Optionals & Protocols](references/implementation.md)
- [Swift 6.4 Gated Features](references/swift-6.4-features.md) — load only for 6.4+ toolchains