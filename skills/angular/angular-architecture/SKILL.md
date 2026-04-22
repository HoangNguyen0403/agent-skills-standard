---
name: angular-architecture
description: Standards for Angular project structure, feature modules, and lazy loading. Use when structuring Angular apps, defining feature modules, or configuring lazy loading.
metadata:
  triggers:
    files:
    - 'angular.json'
    keywords:
    - angular components
    - standalone
    - feature module
    - lazy loading
    - loadComponent
    - loadChildren
---
# Angular Architecture

## **Priority: P0 (CRITICAL)**

## Principles

- **Feature-Based**: Organize by **feature folder** (e.g., `features/dashboard/`) containing components, services, and models. Apply **LIFT**: **Locate**, **Identify**, **Flat structure**, **Try DRY**.
- **Standalone First**: **Use standalone components**, Pipes, and Directives. **Eliminate NgModule** for new code; use **standalone: true** (or default in Angular 20+).
- **Core vs Shared**:
 - `core/`: **Global singletons** (AuthService, Interceptors). **Never put singletons in shared/**.
 - `shared/`: Reusable UI components, pipes, utils (Buttons, Formatters).
- **Smart vs Dumb**:
 - **Smart (Container)**: Talks to services, manages state.
 - **Dumb (Presentational)**: Inputs/Outputs only. No logic. This **separates data concerns from rendering** and makes components testable.

## Guidelines

- **Lazy Loading**: All feature routes MUST lazy loaded using **loadComponent** or **loadChildren**.
 - Example: `{ path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) }`
- **Flat Modules**: Avoid deep nesting of modules.
- **Barrel Files**: Use carefully. Prefer direct imports for better tree-shaking in some build tools (though modern bundlers handle barrels well).

## Verification Checklist (Mandatory)

- [ ] **Lazy Loading**: all feature routes using `loadComponent` or `loadChildren`?
- [ ] **Standalone**: components, pipes, and directives standalone?
- [ ] **Core/Shared**: global services in `core/` and reusable UI in `shared/`?
- [ ] **Smart/Dumb**: presentational components logic-free with only @Input/@Output?
- [ ] **Signals**: you using Signals for local state where applicable (Angular 16+)?

## Anti-Patterns

- **No NgModule**: Eliminate NgModule for new code; use standalone components.
- **No eager feature imports**: Lazy load all features with `loadComponent` or `loadChildren`.
- **No type-based folders**: Organize by feature, not by `/components`, `/services` top-level dirs.

## References

- [Folder Structure](references/folder-structure.md)