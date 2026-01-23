---
name: Swift Memory Management
description: Standards for ARC, Weak/Unowned References, and Capture Lists
metadata:
  labels: [swift, memory, arc, weak, unowned]
  triggers:
    files: ['**/*.swift']
    keywords: ['weak', 'unowned', 'capture', 'deinit', 'retain']
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

- **Strong Delegates**: `**No strong var delegate**: Use weak.`
- **Missing Capture List**: `**No self in escaping closures**: Use [weak self].`
- **Unowned Misuse**: `**Avoid unowned**: Use weak unless certain.`

## References

- [Capture Lists & Retain Cycles](references/implementation.md)
