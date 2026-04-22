---
name: typescript-language
description: Apply modern TypeScript standards for type safety and maintainability. Use when working with types, interfaces, generics, enums, unions, or tsconfig settings.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    - 'tsconfig.json'
    keywords:
    - type
    - interface
    - generic
    - enum
    - union
    - intersection
    - readonly
    - const
    - namespace
---
# TypeScript Language Patterns

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Type Annotations**: Explicit params/returns. Infer locals.
- **Interfaces vs Types**: interface for APIs (supports declaration merging). type for unions, intersection types, mapped/conditional types.
- **Strict Mode**: strict: true. Null Safety: ?. and ?? — Use narrowing instead. Avoid non-null assertion (!) operator.
- **Enums**: Literal unions or `as const`. **No runtime `enum`**.
- **Generics**: Reusable, type-safe code.
- **Type Guards**: `typeof`, `instanceof`, predicates.
- **Utility Types**: `Partial`, `Pick`, `Omit`, `Record`.
- **Immutability**: `readonly` arrays/objects. Const Assertions: `as const`, `satisfies`.
- **Template Literals**: `on${Capitalize<string>}`.
- **Discriminated Unions**: Literal kind property to narrow type safely. Switch on discriminant.
- **Advanced**: Mapped, Conditional, Indexed types.
- **Access**: Default `public`. Use `private`/`protected` or `#private`.
- **Branded Types**: `string & { __brand: 'Id' }`.

## Anti-Patterns

- **NEVER use `any`**: Use `unknown` or specific interface instead.
- **No `Function`**: Use signature `() => void`.
- **No `enum`**: Runtime cost.
- **No `!`**: Avoid non-null assertion (!). Use narrowing (typeof, instanceof, if-checks).
- **No Lint Disable**: Fix root cause; never suppress.

## Testing

- **Mocking**: Use `jest.Mocked<T>` or `as unknown as T`.
- **Checklist**: Check method existence, match error constants, satisfy required properties.
- **References**: See [references/TESTING.md](references/TESTING.md) for common issues/solutions.

## Code

```typescript
// Branded Type
type UserId = string & { __brand: 'Id' };

// Satisfies (Validate + Infer)
const cfg = { port: 3000 } satisfies Record<string, number>;

// Discriminated Union
type Result<T> = { kind: 'ok'; data: T } | { kind: 'err'; error: Error };
```

## Verification

After any type change that crosses module boundaries or involves generics, unions, conditional types, or branded types: call `getDiagnostics` (typescript-lsp MCP tool) to confirm no type errors before finalizing.

## References

For advanced type patterns and utility types:
See [references/REFERENCE.md](references/REFERENCE.md).