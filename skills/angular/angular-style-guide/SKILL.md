---
name: angular-style-guide
description: Naming conventions, file structure, and coding standards for Angular projects. Use when naming Angular files, organizing project structure, or following Angular style guide.
metadata:
  triggers:
    keywords:
    - angular style
    - naming convention
    - file structure
    - angular-style-guide
---
# Angular Style Guide

## **Priority: P0 (CRITICAL)**

## Principles

- **Single Responsibility**: 1 component/service per file. Functions < 75 lines.
- **Size Limits**: Files < **400 lines**. Refactor if larger.
- **Strict Naming**: **kebab-case** with **type suffix** (e.g., **hero-list.component.ts**, **auth.service.ts**, **user.pipe.ts**, **app.routes.ts**).
- **Barrels**: `index.ts` for public APIs only. No deep barrel imports within same feature — import directly. Wrong barrel placement breaks **tree-shaking**.
- **LIFT**: **Locate** code quickly, **Identify files** by name, keep **Flattest structure** possible, **Try** to be **DRY**.

## Naming Standards

- **Files**: `kebab-case.type.ts`
- **Classes**: **PascalCase** + **type suffix** (**HeroListComponent**, **AuthService**)
- **Directives**: **camelCase** selector with **app prefix** (e.g., `appHighlight`)
- **Pipes**: **camelCase** name (e.g., `truncate`)
- **Services**: **PascalCase** + **Service** suffix (`HeroService`)
- **Interfaces**: No — do not use `IUser`/`IHero`. Name as nouns: `User`, `Hero`. The I-prefix is not recommended by Angular style guide.

## Folder Structure

- **Core**: `src/app/core/` (**singletons** and global state).
- **Shared**: `src/app/shared/` (**reusable UI** and pipes).
- **Features**: `src/app/features/` (**lazy-loaded**). Folder **depth ≤ 3 levels** — no deeper nesting.

## Anti-Patterns

- **No logic in templates**: Move to component class or `computed()` signal.
- **No deep nesting**: Keep folder depth ≤3 levels.
- **No I-prefix on interfaces**: Name interfaces `User`, not `IUser`.

## References

- [Naming Conventions](references/naming-convention.md)
