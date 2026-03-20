---
name: typescript-best-practices
description: "Idiomatic TypeScript patterns for clean, maintainable code. Use when writing or refactoring TypeScript classes, functions, modules, or async logic. (triggers: **/*.ts, **/*.tsx, class, function, module, import, export, async, promise)"
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
- **Verify**: After refactoring, call `getDiagnostics` (typescript-lsp) to catch type regressions immediately. See [typescript-tooling](../typescript-tooling/SKILL.md) for the full 3-step verification workflow.

## Anti-Patterns

- **No Default Exports**: Use named exports.
- **No Implicit Returns**: Specify return types.
- **No Unused Variables**: Enable `noUnusedLocals`.
- **No `require`**: Use ES6 `import`.
- **No Empty Interfaces**: Use `type` or non-empty interface.
- **No `any`**: Use `unknown` or a specific type.
- **No Unsafe Mocks**: Cast with `jest.Mocked<T>` or `as unknown as T`.
- **No eslint-disable**: Fix root cause; never suppress warnings.

## References

See [references/examples.md](references/examples.md) for Immutable Interfaces, Exhaustiveness Checking, Assertion Functions, DI Patterns, and Import Organization.
