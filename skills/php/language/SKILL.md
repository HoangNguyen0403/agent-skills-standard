---
name: PHP Language Standards
description: Core PHP language standards and modern 8.x features.
metadata:
  labels: [php, language, 8.x]
  triggers:
    files: ['**/*.php']
    keywords: [declare, readonly, match, constructor, promotion, types]
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

- **No Type Context**: Avoid functions without return or parameter types.
- **Sloppy Comparison**: **No ==**: Use `===` for strict comparison.
- **Legacy Syntax**: **No switch**: Use `match` for simple value mapping.
- **Global Scope**: **No Globals**: Never define logic in global namespace.

## References

- [Modern PHP Patterns](references/implementation.md)
