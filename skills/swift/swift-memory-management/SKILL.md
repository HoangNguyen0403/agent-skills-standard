---
name: swift-memory-management
description: "Manage ARC, Weak/Unowned References, and Capture Lists in Swift. Use when managing Swift ARC, avoiding retain cycles, or configuring capture lists in closures. (triggers: **/*.swift, weak, unowned, capture, deinit, retain)"
---

# Swift Memory Management

## **Priority: P0**

## Implementation Guidelines

### ARC Fundamentals

- **Default**: Strong references. Swift automatically manages retain/release.
- **Weak**: Use weak if the reference can become nil during its lifetime (delegates, optional parent refs).
- **Unowned**: Use unowned if the reference is guaranteed to outlive the referring object (rare; prefer weak).

### Capture Lists

- **Closures**: Place `[weak self]` at the beginning of the closure's capture list. Pattern: `{ [weak self] in guard let self = self else { return } }`.
- **Self in Structs**: No capture list needed (`self` is copied by value).
- **Multiple Captures**: `[weak self, weak delegate]`.

### Retain Cycles

- **Delegates**: Always `weak var delegate`. The delegate protocol should inherit from AnyObject (e.g., `protocol MyDelegate: AnyObject {}`).
- **Closures as Properties**: Use `weak` or `unowned` in capture list.
- **two-way References**: One side must be `weak`.

## Anti-Patterns

- **No strong var delegate**: Use weak.
- **No self in escaping closures**: Use [weak self].
- **No unowned unless certain**: Default to weak to prevent crashes.

## References

- [Capture Lists & Retain Cycles](references/implementation.md)
