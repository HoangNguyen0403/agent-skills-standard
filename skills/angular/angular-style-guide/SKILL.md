---
name: angular-style-guide
description: "Naming conventions, file structure, and coding standards for Angular projects. Use when naming Angular files, organizing project structure, or following Angular style guide. (triggers: angular style, naming convention, file structure, angular-style-guide)"
---

# Angular Style Guide

## **Priority: P0 (CRITICAL)**

## Principles

- **Single Responsibility**: One component/service per file. Small functions (< 75 lines).
- **Size Limits**: Keep files under 400 lines. Refactor if larger.
- **Strict Naming**: `feature.type.ts` (e.g., `hero-list.component.ts`).
- **Barrels**: Use `index.ts` only for public APIs of specific features/libraries. Avoid deep barrel imports within the same feature.
- **LIFT**: **L**ocate, **I**dentify, **F**lat structure, **T**ry DRY.

## Naming Standards

- **Files**: `kebab-case.type.ts`
- **Classes**: `PascalCase` + `Type` suffix (`HeroListComponent`)
- **Directives**: `camelCase` selector (`appHighlight`)
- **Pipes**: `camelCase` name (`truncate`)
- **Services**: `PascalCase` + `Service` suffix (`HeroService`)

## Anti-Patterns

- **No logic in templates**: Move to the component class or a `computed()` signal.
- **No deep nesting**: Keep folder depth ≤3 levels.
- **No I-prefix on interfaces**: Name interfaces `User`, not `IUser`.

## References

- [Naming Conventions](references/naming-convention.md)
