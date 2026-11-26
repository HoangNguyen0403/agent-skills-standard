# TypeScript Language Patterns Reference

Advanced type patterns and utility implementations.

## Compatibility Matrix

| Construct | Minimum | Check before use |
| --- | --- | --- |
| `satisfies` | TS 4.9 | locked compiler version |
| `const` type parameters | TS 5.0 | locked compiler version |
| `import type`/`export type` | TS 3.8 | — |
| `verbatimModuleSyntax` | TS 5.0 | emit/module resolution |
| TS 7 default changes (`strict`, `module`, `types`, `rootDir`) | TS 7.0 | per-project tsconfig overrides |
| Programmatic compiler API (plugins, `typescript-eslint`, custom transformers) | TS ≤ 6 | TS 7.0 has no compiler API |

Pin the compiler in the lockfile, not by range. A newer `typescript` release is not a reason to lift the project's runtime floor.

## Advanced Generic Patterns

```typescript
// Conditional types
type NonNullable<T> = T extends null | undefined ? never : T;

// Mapped types
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Template literal types
type EventName<T extends string> = `on${Capitalize<T>}`;

// Recursive types
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
```

## Branded Types for Type Safety

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

// Prevents mixing IDs at compile time
function getUser(id: UserId) { /* ... */ }
getUser(createUserId('123')); // OK
// getUser('123'); // Error: Type 'string' is not assignable to type 'UserId'
```

## Discriminated Unions

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'square'; size: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'square':
      return shape.size ** 2;
  }
}
```
