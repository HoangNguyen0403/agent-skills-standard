---
name: TypeScript Best Practices
description: Idiomatic TypeScript patterns for clean, maintainable code.
metadata:
  labels: [typescript, best-practices, idioms, conventions]
  triggers:
    files: ['**/*.ts', '**/*.tsx']
    keywords: [class, function, module, import, export, async, promise]
---

# TypeScript Best Practices

## **Priority: P1 (OPERATIONAL)**

Idiomatic patterns for writing clean, maintainable TypeScript code.

## Implementation Guidelines

- **Naming Conventions**:
  - PascalCase for classes, interfaces, types, enums
  - camelCase for variables, functions, methods, parameters
  - UPPER_SNAKE_CASE for constants
  - Prefix interfaces with `I` only when necessary for disambiguation
- **Functions**:
  - Prefer arrow functions for callbacks and short functions
  - Use regular functions for methods and exported functions
  - Always specify return types for public APIs
- **Modules**:
  - One export per file for major components/classes
  - Use named exports over default exports for better refactoring
  - Organize imports: external -> internal -> relative
- **Async/Await**:
  - Prefer `async/await` over raw Promises
  - Always handle errors with try/catch in async functions
  - Use `Promise.all()` for parallel operations
- **Classes**:
  - Use `private`/`protected`/`public` modifiers explicitly
  - Prefer composition over inheritance
  - Use `readonly` for properties that don't change after construction
- **Exhaustiveness Checking**: Use `never` type in `switch` cases.
- **Assertion Functions**: Use `asserts` for runtime type validation.
- **Optional Properties**: Use `?:`, not `| undefined`.
- **Type Imports**: Use `import type` for tree-shaking.

## Anti-Patterns

- **No Default Exports**: Use named exports.
- **No Implicit Returns**: Specify return types.
- **No Unused Variables**: Enable `noUnusedLocals`.
- **No `require`**: Use ES6 `import`.
- **No Empty Interfaces**: Use `type` or non-empty interface.
- **Use any**: Never use `any`, use `unknown` only when necessary.

## Reference & Examples

See [references/examples.md](references/examples.md) for code samples including:

- Immutable Interfaces
- Exhaustiveness Checking
- Assertion Functions
- Dependency Injection Patterns
- Import Organization

## Related Topics

language | tooling | security
