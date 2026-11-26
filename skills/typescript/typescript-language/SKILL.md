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
- **Immutability**: `readonly` arrays/objects. Const Assertions: `as const`; `satisfies` requires TS ≥ 4.9.
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

## Compatibility Preflight

Before emitting newer syntax or changing the compiler, state the checked facts:

- **Compiler**: locked version (`tsc --version`, lockfile). Gate `satisfies` at ≥ 4.9.
- **Config**: `target`, `lib`, `module`/`moduleResolution`, `types`, `rootDir`. TS 7 defaults differ: `strict` true, `module` `esnext`, `types` `[]`, `rootDir` `./`.
- **Runtime**: emitted syntax and APIs must run on the declared Node/browser floor.
- **Tool peers**: plugins, `typescript-eslint`, test transforms, compiler-API consumers. TS 7.0 ships no compiler API; keep TS 6 available when a peer needs one.

## Verification

After a type change that crosses module boundaries or involves generics, unions, conditional or branded types: run the project's own check (`tsc --noEmit`, CI typecheck, or configured editor diagnostics). Use a `getDiagnostics` LSP tool only when one is actually installed; never assume availability.

## References

For advanced type patterns, utility types, and the compatibility matrix:
See [references/REFERENCE.md](references/REFERENCE.md).

