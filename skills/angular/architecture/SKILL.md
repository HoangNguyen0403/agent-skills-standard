---
name: Architecture
description: Standards for Angular project structure, feature modules, and lazy loading.
metadata:
  labels: [angular, architecture, structure, modules]
  triggers:
    files: ['angular.json']
    keywords:
      [
        angular components,
        standalone,
        feature module,
        lazy loading,
        loadComponent,
        loadChildren,
      ]
---

# Angular Architecture

## **Priority: P0 (CRITICAL)**

## Principles

- **Feature-Based**: Organize by feature, not type (e.g., `features/dashboard/` containing components, services, and models).
- **Standalone First**: Use Standalone Components/Pipes/Directives. Eliminate `NgModule` unless interacting with legacy libs.
- **Core vs Shared**:
  - `core/`: Global singletons (AuthService, Interceptors).
  - `shared/`: Reusable UI components, pipes, utils (Buttons, Formatters).
- **Smart vs Dumb**:
  - **Smart (Container)**: Talks to services, manages state.
  - **Dumb (Presentational)**: Inputs/Outputs only. No logic.

## Guidelines

- **Lazy Loading**: All feature routes MUST be lazy loaded using `loadComponent` or `loadChildren`.
- **Flat Modules**: Avoid deep nesting of modules.
- **Barrel Files**: Use carefully. Prefer direct imports for better tree-shaking in some build tools (though modern bundlers handle barrels well).

## Verification Checklist (Mandatory)

- [ ] **Lazy Loading**: Are all feature routes using `loadComponent` or `loadChildren`?
- [ ] **Standalone**: Are components, pipes, and directives standalone?
- [ ] **Core/Shared**: Are global services in `core/` and reusable UI in `shared/`?
- [ ] **Smart/Dumb**: Are presentational components logic-free with only @Input/@Output?
- [ ] **Signals**: Are you using Signals for local state where applicable (Angular 16+)?

- [Folder Structure](references/folder-structure.md)
