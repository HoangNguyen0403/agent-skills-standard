---
name: swift-memory-management
description: Prevent retain cycles via ARC, weak/unowned references, and Capture Lists in Swift. Use when managing Swift ARC, avoiding retain cycles, or configuring capture lists in closures.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - weak
    - unowned
    - capture
    - deinit
    - retain
---
# Swift Memory Management

## **Priority: P0**

## Implementation Guidelines

### ARC Fundamentals

- **Default**: Strong references. ARC handles retain/release automatically.
- **Weak**: Use weak if the reference can become nil during its lifetime (delegates, optional parent refs).
- **Unowned**: Use unowned if the reference is guaranteed to outlive referring object (rare; prefer `weak`).

### Capture Lists

- **Closures**: `[weak self]` at beginning of the closure's capture list. Pattern: `{ [weak self] in guard let self = self else { return } }`.
- **Self in Structs**: No list needed — `self` copied by value.
- **Multiple Captures**: `[weak self, weak delegate]`.

### Retain Cycles

- **Delegates**: `weak var delegate` always. Protocol inherits from AnyObject (e.g., `protocol MyDelegate: AnyObject {}`)..
- **Closures as Properties**: Use `weak` or `unowned` in capture list.
- **Two-way References**: One side must `weak`.

## Anti-Patterns

- **No strong var delegate**: Use weak.
- **No self in escaping closures**: Use [weak self].
- **No unowned unless certain**: Default to weak to prevent crashes.

## References

- [Capture Lists & Retain Cycles](references/implementation.md)
