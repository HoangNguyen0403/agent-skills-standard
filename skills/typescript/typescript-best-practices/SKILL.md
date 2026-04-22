---
name: typescript-best-practices
description: Write idiomatic TypeScript patterns for clean, maintainable code. Use when writing or refactoring TypeScript classes, functions, modules, or async logic.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    keywords:
    - class
    - function
    - module
    - import
    - export
    - async
    - promise
---
# TypeScript Best Practices

## **Priority: P1 (OPERATIONAL)**

## Implementation Guidelines

- **Naming**: Use **`PascalCase`** for Classes/Types/Interfaces, **`camelCase`** for variables/functions, and **`UPPER_SNAKE`** for static constants.
- **Functions**: Use **`arrow functions`** for callbacks/logic; **`function declaration`** for top-level exports. Always type **`public API`** returns.
- **Modules**: Use **`Named exports`** ONLY to enable better refactoring/auto-imports.
- **Async**: Use **`async/await`** with **`Promise.all()`** for parallel execution. Implement **`try-catch`** for error handling; type **`catch(e) as unknown`** and narrow before use. Avoid **`.then().catch()`** chains.
- **Classes**: Explicitly use **`private`**, **`protected`**, and **`public`** modifiers. Favor **`composition`** over inheritance and **`dependency injection`** with **`constructor injection`** and interfaces over singletons for testability.
- **Type Safety**: Use **`never`** for exhaustiveness checks in switch-cases.
- **Optional**: Use **`optional chaining`** (`?.`) and **`nullish coalescing`** (`??`) over manual checks.
- **Imports**: Enforce **`external packages → internal modules → relative imports`** order automatically via **`eslint-plugin-import`**. Use **`import type`** for interfaces/types to ensure better tree-shaking and zero runtime overhead.
- **Validation**: Use **`Zod`** or **`Tsoa`** for runtime boundary validation.

## Anti-Patterns

- **No Default Exports**: Use named exports.
- **No Implicit Returns**: Specify return types.
- **No Unused Variables**: Enable `noUnusedLocals`.
- **No `require`**: Use ES6 `import`.
- **No Empty Interfaces**: Use `type` or non-empty interface.
- **No `any`**: Use `unknown` or specific type.
- **No Unsafe Mocks**: Cast with `jest.Mocked<T>` or `as unknown as T`.
- **No eslint-disable**: Fix root cause; never suppress warnings.

## References

See [references/examples.md](references/examples.md) for Immutable Interfaces, Exhaustiveness Checking, Assertion Functions, DI Patterns, and Import Organization.