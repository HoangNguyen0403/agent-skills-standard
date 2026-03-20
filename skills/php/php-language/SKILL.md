---
name: php-language
description: "Core PHP language standards and modern 8.x features. Use when working with PHP 8.x features like enums, fibers, readonly properties, or named arguments. (triggers: **/*.php, declare, readonly, match, constructor, promotion, types)"
---

# PHP Language Standards

## **Priority: P0 (CRITICAL)**

## Structure

```text
src/
└── {Namespace}/
    └── {Class}.php
```

## Implementation Guidelines

- **Strict Typing**: Declare `declare(strict_types=1);` at file top.
- **Type Hinting**: Apply scalar hints and return types to all members.
- **Modern Types**: Use Union (`string|int`) and Intersection types.
- **Read-only**: Use `readonly` for immutable properties.
- **Constructor Promotion**: Combine declaration and assignment in `__construct`.
- **Match Expressions**: Prefer `match` over `switch` for value returns.
- **Named Arguments**: Use for readability in optional parameters.

## Anti-Patterns

- **No untyped functions**: Declare return and parameter types always.
- **No loose `==` comparison**: Use `===` for strict equality.
- **No `switch` for value mapping**: Use `match` expressions instead.
- **No global namespace logic**: Organize in classes and namespaces.

## References

- [Modern PHP Patterns](references/implementation.md)
