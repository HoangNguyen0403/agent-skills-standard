---
name: javascript-language
description: Modern JavaScript (ES2022+) patterns for clean, maintainable code. Use when working with modern JavaScript features like optional chaining, nullish coalescing, or ESM.
metadata:
  triggers:
    files:
    - '**/*.js'
    - '**/*.mjs'
    - '**/*.cjs'
    keywords:
    - const
    - let
    - arrow
    - javascript async
    - javascript await
    - javascript promise
    - destructuring
    - spread
    - class
---
# JavaScript Language Patterns

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Variables**: const default. let if needed. No var — block scope only.
- **Functionality**: Use **`Arrow Functions`** for callbacks/inlines; **`Function Declaration`** for core logic.
- **Async Logic**: Use async/await with try/catch and Promise.all() for parallel operations. Prefer native Promise APIs; use `node:util.promisify` only for one-shot, error-first callbacks.
- **Module Loaders**: Preserve the module system consumers already load: `.cjs`/`type: commonjs` stays CommonJS, `.mjs`/`type: module` uses ESM. Prefer ESM for new modules only when every consumer can load it; an ESM rewrite of a working CJS module is a separate, explicit migration.
- **Modern Syntax**: Use Destructuring, Spread (...), Optional Chain ?. and Nullish ?? coalescing.
- **String Handling**: Use **`Template Literals`** (backticks) for interpolation and multi-line strings.
- **Data Collections**: Prefer **`map`**, **`filter`**, and **`reduce`** over imperative `for` loops.
- **Modules**: Standardize new modules on ESM import/export; use Named Exports over Default. Match `package.json` `type`, file extension, and the consumer's loader when editing existing code.
- **Encapsulation**: Leverage **`#private`** class fields for encapsulation.
- **Error States**: Throw **`new Error()`** with descriptive messages; never throw strings.

## Anti-Patterns

- No var — Block scope only.
- **No `==`**: Strict `===`.
- **No `new Object()`**: Use literals `{}`.
- **No blanket promisification**: `promisify` assumes one error-first callback per call; it breaks receiver-dependent methods, event/retry callbacks, Promise-returning functions and synchronous APIs.
- **No implicit ESM migration**: Never rewrite a `.cjs` or CommonJS consumer unless that consumer's loader is part of the change.
- **No Mutation**: Immutability first.

## Code & Reference

See [references/REFERENCE.md](references/REFERENCE.md) for modern syntax, async patterns, private fields, and functional programming examples.

## Related Topics

best-practices | tooling

