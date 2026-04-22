---
name: php-language
description: Apply core PHP language standards and modern 8.x features. Use when working with PHP 8.x features like enums, fibers, readonly properties, or named arguments.
metadata:
  triggers:
    files:
    - '**/*.php'
    keywords:
    - declare
    - readonly
    - match
    - constructor
    - promotion
    - types
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

### Core Language Standards

- **Strict Typing**: Declare **`declare(strict_types=1);`** at very top of every file.
- **Type Hinting**: Apply scalar type hints (e.g., `string`, `int`) and return types to all functions.
- **Strict Comparison**: **Avoid loose `==` comparison**; always use `===` for strict equality.

### Modern PHP 8+ Patterns

- **Match Expressions**: Prefer **`match($status)`** over `switch` for value returns. It provides strict comparison and exhaustive by default.
- **Default Case**: Use **`default => throw new InvalidArgumentException($status)`** to handle unknown states.
- **Read-only**: Use **`public readonly string $name`** for properties set once at construction.
- **Property Promotion**: Use **`public function __construct(public string $name) {}`** to reduce boilerplate.
- **Named Arguments**: Call functions with **`name: 'John', age: 25`** to skip optional parameters.
- **Flexible Types**: Use **Union types (`int|string`)** and **Intersection types (`Countable&Traversable`)**.

## Anti-Patterns

- **No untyped functions**: Declare return and parameter types always.
- **No loose `==` comparison**: Use `===` for strict equality.
- **No `switch` for value mapping**: Use `match` expressions instead.
- **No global namespace logic**: Organize in classes and namespaces.

## References

- [Modern PHP Patterns](references/implementation.md)