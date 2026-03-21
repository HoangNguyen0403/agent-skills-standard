---
name: swift-best-practices
description: 'Standards for Guard, Value Types, Immutability, and Naming. Use when writing idiomatic Swift using guard, value types, immutability, or naming conventions. (triggers: **/*.swift, guard, let, struct, final)'
---

# Swift Best Practices

## **Priority: P0**

## Implementation Guidelines

### Control Flow (Guard over If)

- **Guard for Early Exit**: Use **`guard let`** over **nested if** statements for better readability and to unwrap optionals early.
- **Nested Checks**: Use **`guard`** for **precondition** checks at the top of a function to reduce nested depth.
- **Switch Exhaustiveness**: Always handle all cases; use **`@unknown default`** for freezing enums (enums from frameworks).
- **if-case**: Use **`if case .success(let value) = result`** for simple enum pattern matching.

### Value Types & Immutability

- **Prefer Structs**: **Default to struct** for **value semantics** and thread safety. Use `class` only when reference identity or **inheritance** is required.
- **Immutability**: Always **default to let** for all properties and constants. Use `var` only when change is required.
- **Modifiers**: Use **`final`** for all classes that are not intended to be subclassed to improve performance (static dispatch).
- **Static Dispatch**: Favor methods in structs and `final` classes.

### Naming & Style

- **Clear Intent**: Prefix booleans with **`is, has, or can`**. Example: **`isValid`**, `hasErrors`, **`canEdit`**. Makes boolean state clear.
- **API Guidelines**: Follow the official **Swift API Design Guidelines**. Use **`camelCase`** for **clear names** and `PascalCase` for types.
- **Protocols**: Name protocols with **`-able`**, `-ible`, or `-ing` suffixes (e.g., `Codable`, `Identifiable`).
- **Opaque Types**: Use **`some View`** or `some Collection` for return types where the underlying type is internal.

### Collection Performance

- **Sequence API**: Use **`compactMap`**, **`filter`**, and **`reduce`** instead of explicit **for-where** loops for data transformations.
- **Lazy Collections**: Use **`.lazy`** for large sequences when the result is consumed partially.
- **Dictionaries**: Use **`default`** values in dictionary access to avoid double optional unwrapping.

## Anti-Patterns

- **No Pyramid of Doom**: Use **`guard`** for early exits.
- **No force unwrap**: Never use **`!`** on optionals. Use **`??`** (nil-coalescing) or **`if let`**.
- **No global var**: Avoid mutable global state. Use **Singletons** (accessed via `static let shared`) or DI.

## References

- [Guard Patterns & Immutability](references/implementation.md)
