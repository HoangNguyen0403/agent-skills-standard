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
    - async
    - await
    - promise
    - destructuring
    - spread
    - class
---
# JavaScript Language Patterns

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Variables**: const default. let if needed. No var — block scope only.
- **Functionality**: Use **`Arrow Functions`** for callbacks/inlines; **`Function Declaration`** for core logic.
- **Async Logic**: Use async/await with try/catch and Promise.all() for parallel operations. ESM import/export only. No Callbacks — promisify everything.
- **Modern Syntax**: Use Destructuring, Spread (...), Optional Chain ?. and Nullish ?? coalescing.
- **String Handling**: Use **`Template Literals`** (backticks) for interpolation and multi-line strings.
- **Data Collections**: Prefer **`map`**, **`filter`**, and **`reduce`** over imperative `for` loops.
- **Modules**: Standardize on ESM import/export; use Named Exports over Default.
- **Encapsulation**: Leverage **`#private`** class fields for encapsulation.
- **Error States**: Throw **`new Error()`** with descriptive messages; never throw strings.

## Anti-Patterns

- No var — Block scope only.
- **No `==`**: Strict `===`.
- **No `new Object()`**: Use literals `{}`.
- No Callbacks: Promisify everything.
- **No Mutation**: Immutability first.

## Code & Reference

See [references/REFERENCE.md](references/REFERENCE.md) for modern syntax, async patterns, private fields, and functional programming examples.

## Related Topics

best-practices | tooling