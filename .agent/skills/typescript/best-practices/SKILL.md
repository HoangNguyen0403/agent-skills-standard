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

## Implementation Guidelines

- **Naming**: Classes/Types=`PascalCase`, vars/funcs=`camelCase`, consts=`UPPER_SNAKE`. Prefix `I` only if needed.
- **Functions**: Arrows for callbacks; regular for exports. Always type public API returns.
- **Modules**: Named exports only. Import order: external → internal → relative.
- **Async**: Use `async/await`, not raw Promises. `Promise.all()` for parallel.
- **Classes**: Explicit access modifiers. Favor composition. Use `readonly`.
- **Types**: Use `never` for exhaustiveness, `asserts` for runtime checks.
- **Optional**: Use `?:`, not `| undefined`.
- **Imports**: Use `import type` for tree-shaking.

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
