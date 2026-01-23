---
name: TypeScript Language Patterns
description: Modern TypeScript standards for type safety, performance, and maintainability.
metadata:
  labels: [typescript, language, types, generics]
  triggers:
    files: ['**/*.ts', '**/*.tsx', 'tsconfig.json']
    keywords:
      [
        type,
        interface,
        generic,
        enum,
        union,
        intersection,
        readonly,
        const,
        namespace,
      ]
---

# TypeScript Language Patterns

## **Priority: P0 (CRITICAL)**

Modern TypeScript standards for type-safe, maintainable code.

## Implementation Guidelines

- **Type Annotations**: Explicit params/returns. Infer locals.
- **Interfaces vs Types**: `interface` for APIs. `type` for unions.
- **Strict Mode**: `strict: true`.
- **Null Safety**: `?.` and `??`.
- **Enums**: Literal unions or `as const`.
- **Generics**: Reusable, type-safe code.
- **Type Guards**: `typeof`, `instanceof`, predicates.
- **Utility Types**: `Partial`, `Pick`, `Omit`, `Record`.
- **Immutability**: `readonly` arrays/objects.
- **Const Assertions**: `as const` and `satisfies`.
- **Template Literals**: `on${Capitalize<string>}`.
- **Discriminated Unions**: Literal `kind` property.
- **Advanced**: Mapped, Conditional, Indexed types.
- **Access**: Default `public`. Use `private`/`protected` or `#private` for internals.
- **Branded Types**: `string & { __brand: 'Id' }`.

## Anti-Patterns

- **No `any`**: Use `unknown`.
- **No `Function`**: Use signature `() => void`.
- **No `enum`**: Runtime cost.
- **No `!`**: Use narrowing.

## Code

```typescript
// Branded Type
type UserId = string & { __brand: 'Id' };

// Satisfies (Validate + Infer)
const cfg = { port: 3000 } satisfies Record<string, number>;

// Discriminated Union
type Result<T> = { kind: 'ok'; data: T } | { kind: 'err'; error: Error };
```

## Reference & Examples

For advanced type patterns and utility types:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | security | tooling
