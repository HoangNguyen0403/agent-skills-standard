---
name: angular-style-guide
description: 'Naming conventions, file structure, and coding standards for Angular projects. Use when naming Angular files, organizing project structure, or following Angular style guide. (triggers: angular style, naming convention, file structure, angular-style-guide)'
---

# Angular Style Guide

## **Priority: P0 (CRITICAL)**

## Principles

- **Single Responsibility**: One component/service per file. Small functions (< 75 lines).
- **Size Limits**: Keep files under **400 lines**. Refactor if larger.
- **Strict Naming**: **kebab-case** with **type suffix** (e.g., **hero-list.component.ts**, **auth.service.ts**, **user.pipe.ts**, **app.routes.ts**).
- **Barrels**: Use **index.ts** only for **public APIs** of specific features/libraries. Avoid deep barrel imports within the same feature — import directly. Incorrect barrel placement prevents **tree-shaking**.
- **LIFT**: **Locate** code quickly, **Identify** files by name, keep the **Flattest structure** possible, **Try** to be **DRY**.

## Naming Standards

- **Files**: `kebab-case.type.ts`
- **Classes**: **PascalCase** + **type suffix** (**HeroListComponent**, **AuthService**)
- **Directives**: **camelCase** selector with **app prefix** (e.g., `appHighlight`)
- **Pipes**: **camelCase** name (e.g., `truncate`)
- **Services**: **PascalCase** + **Service** suffix (`HeroService`)
- **Interfaces**: **No — do not use** `IUser` or `IHero`. Name interfaces as **nouns** (e.g., `User`, `Hero`). This is **not recommended** by Angular style guide.

## Folder Structure

- **Core**: `src/app/core/` (**singletons** and global state).
- **Shared**: `src/app/shared/` (**reusable UI** and pipes).
- **Features**: **src/app/features/** (**lazy-loaded features**). Keep folder **depth ≤3 levels**.

## Anti-Patterns

- **No logic in templates**: Move to the component class or a `computed()` signal.
- **No deep nesting**: Keep folder depth ≤3 levels.
- **No I-prefix on interfaces**: Name interfaces `User`, not `IUser`.

## References

- [Naming Conventions](references/naming-convention.md)
