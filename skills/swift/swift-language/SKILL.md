---
name: swift-language
description: 'Standards for Optionals, Protocols, Extensions, and Type Safety. Use when working with Swift Optionals, Protocols, Extensions, or type-safe APIs. (triggers: **/*.swift, protocol, extension, optional, guard, enum)'
---

# Swift Language Standards

## **Priority: P0**

## Implementation Guidelines

### Optionals & Safety

- **Never Force Unwrap**: Use **guard let**, **if let**, or **nil coalescing (??)** to safely unwrap.
- **Nil Comparison**: Use `value != nil` instead of `if let _ = value`.
- **Implicitly Unwrapped**: Avoid `Type!`. Use proper `Type?`.

### Protocols & Extensions

- **Protocols as Blueprints**: Protocols define a **blueprint**; classes inherit implementation.
- **Composition over Inheritance**: **Prefer protocol composition** with structs for better decoupling and performance.
- **Extensions**: Implement **conformance** in an extension: **`extension MyType: MyProtocol { ... }`**. Use extensions for clean code organization, not storage (do **not** use extensions for **stored properties**).
- **Protocol Witnesses**: Explicitly implement all required members to satisfy the witness table.

### Type Safety

- **Avoid `Any`**: Use generics or associated types instead for compile-time safety.
- **Enums**: Prefer enums with **associated values** over multiple Optionals. Extract values via a **switch** statement (e.g., `case .success(let value):`).
- **Value Types**: **Default to struct** for **value semantics** and thread safety. Use `class` only when **reference identity** is necessary or for inheritance. Structs are copied; classes are shared.

## Anti-Patterns

- **No ! operator**: Use safe unwrapping.
- **No -1 for failure**: Use Optional.
- **No force cast (as!)**: Use conditional cast (as?).

## References

- [Optionals & Protocols](references/implementation.md)
