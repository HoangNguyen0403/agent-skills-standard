---
name: swift-memory-management
description: "Prevent retain cycles via ARC, weak/unowned references, and Capture Lists in Swift. Use when managing Swift ARC, avoiding retain cycles, or configuring capture lists in closures. (triggers: **/*.swift, weak, unowned, capture, deinit, retain)"
---
# Swift Memory Management

## **Priority: P0**

## Implementation Guidelines

### ARC Fundamentals

- **Default**: Strong references. Swift automatically manages retain/release.
- **Weak**: Use weak if reference can become nil during its lifetime (delegates, optional parent refs).
- **Unowned**: Use unowned if reference guaranteed to outlive referring object (rare; prefer weak).

### Capture Lists

- **Closures**: Place `[weak self]` at beginning of closure's capture list. Pattern: `{ [weak self] in guard let self = self else { return } }`.
- **Self in Structs**: No capture list needed (`self` copied by value).
- **Multiple Captures**: `[weak self, weak delegate]`.

### Retain Cycles

- **Delegates**: Always `weak var delegate`. delegate protocol should inherit from AnyObject (e.g., `protocol MyDelegate: AnyObject {}`).
- **Closures as Properties**: Use `weak` or `unowned` in capture list.
- **two-way References**: One side must `weak`.

## Anti-Patterns

- **No strong var delegate**: Use weak.
- **No self in escaping closures**: Use [weak self].
- **No unowned unless certain**: Default to weak to prevent crashes.

## References

- [Capture Lists & Retain Cycles](references/implementation.md)