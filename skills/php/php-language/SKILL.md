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
- **Read-only**: Use **`public readonly string $name`** (8.1+) for properties that must not be modified after initialization. Readonly is not "constructor-only": 8.1–8.3 allow a write only from the declaring class scope, 8.4+ widens that to `protected(set)`, and 8.6 allows declaration defaults.
- **Property Promotion**: Use **`public function __construct(public string $name) {}`** to reduce boilerplate.
- **Named Arguments**: Call functions with **`name: 'John', age: 25`** to skip optional parameters.
- **Flexible Types**: Union types (`int|string`, 8.0). Intersection types take class/interface types only (`Countable&Traversable`, 8.1); `string&Countable` is invalid. Combine union with intersection only via DNF parentheses (`(Countable&Traversable)|null`, 8.2).
- **Version Minima**: State the engine minimum before newer syntax: union types/`match`/promotion/named arguments 8.0; intersection/`readonly`/`never` 8.1; DNF types/`readonly` classes 8.2; readonly property defaults 8.6.

## Anti-Patterns

- **No untyped functions**: Declare return and parameter types always.
- **No loose `==` comparison**: Use `===` for strict equality.
- **No `switch` for value mapping**: Use `match` expressions instead.
- **No global namespace logic**: Organize in classes and namespaces.

## References

- [Modern PHP Patterns](references/implementation.md)