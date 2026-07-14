---
name: javascript-best-practices
description: Idiomatic JavaScript patterns and conventions for maintainable existing code. Use when reviewing or refactoring JavaScript language patterns; defer project scaffolding, dependency setup, and tool configuration.
metadata:
  triggers:
    files:
    - '**/*.js'
    - '**/*.mjs'
    keywords:
    - module
    - import
    - export
    - error
    - validation
---
# JavaScript Best Practices

## **Priority: P1 (HIGH)**


## Implementation Guidelines

- **Naming**: `camelCase` (vars/funcs), `PascalCase` (classes), `UPPER_SNAKE` (constants).
- **Errors**: Throw `Error` objects only. Handle all async errors.
- **Comments**: JSDoc for APIs. Explain "why" not "what".
- **Files**: One entity per file. `index.js` for exports.
- **Modules**: Named exports only. Order: Ext -> Int -> Rel.

## Anti-Patterns

- **No Globals**: Encapsulate state.
- **No Magic Numbers**: Use `const`.
- **No Nesting**: Guard clauses/early returns.
- **No Defaults**: Use named exports.
- **No Side Effects**: Keep functions pure.

## Code & Reference

See [references/REFERENCE.md](references/REFERENCE.md) for constants, custom errors, async patterns, and module structure examples.

## Related Topics

language | tooling

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Naming
- index.js

- Additional task-grounded exact anchors: Comments