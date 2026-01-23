---
name: Swift Language
description: Standards for Optionals, Protocols, Extensions, and Type Safety
metadata:
  labels: [swift, language, optionals, protocols]
  triggers:
    files: ['**/*.swift']
    keywords: ['protocol', 'extension', 'optional', 'guard', 'enum']
---

# Swift Language Standards

## **Priority: P0**

## Implementation Guidelines

### Optionals & Safety

- **Never Force Unwrap**: Use `guard let`, `if let`, or nil coalescing (`??`).
- **Nil Comparison**: Use `value != nil` instead of `if let _ = value`.
- **Implicitly Unwrapped**: Avoid `Type!`. Use proper `Type?`.

### Protocols & Extensions

- **Protocol Composition**: Prefer `struct` + protocols over class inheritance.
- **Extensions**: Use for conformance (`extension MyType: Codable`), not storage.
- **Protocol Witnesses**: Explicitly implement all required members.

### Type Safety

- **Avoid `Any`**: Use generics or associated types instead.
- **Enums**: Prefer enums with associated values over multiple Optionals.
- **Value Types**: Default to `struct` unless reference semantics needed.

## Anti-Patterns

- **Force Unwrapping**: `**No ! operator**: Use safe unwrapping.`
- **Sentinel Values**: `**No -1 for failure**: Use Optional.`
- **as! Casting**: `**No Force Cast**: Use conditional cast (as?).`

## References

- [Optionals & Protocols](references/implementation.md)
