---
name: swift-memory-management
description: "Standards for ARC, Weak/Unowned References, and Capture Lists. Use when managing Swift ARC, avoiding retain cycles, or configuring capture lists in closures. (triggers: **/*.swift, weak, unowned, capture, deinit, retain)"
---

# Swift Memory Management

## **Priority: P0**

## Implementation Guidelines

### ARC Fundamentals

- **Default**: Strong references. Swift automatically manages retain/release.
- **Weak**: Use `weak` for delegate patterns and parent-child relationships.
- **Unowned**: Use `unowned` only when reference guaranteed to outlive (rare).

### Capture Lists

- **Closures**: Always use `[weak self]` or `[unowned self]` in escaping closures.
- **Self in Structs**: No capture list needed (`self` is copied by value).
- **Multiple Captures**: `[weak self, weak delegate]`.

### Retain Cycles

- **Delegates**: Always `weak var delegate`.
- **Closures as Properties**: Use `weak` or `unowned` in capture list.
- **two-way References**: One side must be `weak`.

## Anti-Patterns

- **No strong var delegate**: Use weak.
- **No self in escaping closures**: Use [weak self].
- **No unowned unless certain**: Default to weak to prevent crashes.

## References

- [Capture Lists & Retain Cycles](references/implementation.md)
