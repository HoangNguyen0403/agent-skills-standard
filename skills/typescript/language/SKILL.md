---
name: TypeScript Language Patterns
description: Modern TypeScript standards for type safety, performance, and maintainability.
metadata:
  labels: [typescript, language, types, generics]
  triggers:
    files: ['**/*.ts', '**/*.tsx', 'tsconfig.json']
    keywords: [type, interface, generic, enum, union, intersection, readonly, const, namespace]
---

# TypeScript Language Patterns

## **Priority: P0 (CRITICAL)**

Modern TypeScript standards for type-safe, maintainable code.

## Implementation Guidelines

- **Type Annotations**: Use explicit types for function parameters and return values. Infer types for local variables.
- **Interfaces vs Types**: Prefer `interface` for object shapes and public APIs. Use `type` for unions, intersections, and complex types.
- **Avoid `any`**: Never use `any`. Use `unknown` for truly dynamic data, then narrow with type guards.
- **Strict Mode**: Always enable `strict: true` in `tsconfig.json`.
- **Null Safety**: Use strict null checks. Prefer optional chaining `?.` and nullish coalescing `??`.
- **Enums**: Avoid enums. Use `const` objects with `as const` or string literal unions instead.
- **Generics**: Use generics for reusable, type-safe functions and components. Avoid over-generification.
- **Type Guards**: Use `typeof`, `instanceof`, and custom type guards for runtime type narrowing.
- **Utility Types**: Leverage built-in utility types (`Partial`, `Pick`, `Omit`, `Record`, `Readonly`).
- **Immutability**: Use `readonly` for arrays and object properties that shouldn't change.
- **Const Assertions**: Use `as const` for literal types and deeply readonly objects.

## Anti-Patterns

- **No `any`**: Never bypass type safety with `any`.
- **No `Function` Type**: Use specific function signatures like `(a: string) => number`.
- **No Namespace**: Use ES modules instead of `namespace` or `module` keywords.
- **No `enum` for Strings**: Use string literal unions for better tree-shaking and debugging.
- **No Non-null Assertion**: Avoid `!` operator unless absolutely certain. Use type narrowing instead.

## Code

```typescript
// Interface for object shapes
interface User {
  readonly id: string;
  name: string;
  email?: string;
}

// Type for unions and complex types
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Generic function with type constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Const assertion for literal types
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const;

type Role = typeof ROLES[keyof typeof ROLES];

// Type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as User).id === 'string'
  );
}
```

## Reference & Examples

For advanced type patterns and utility types:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | security | tooling
