---
name: nextjs-architecture
description: Structure Next.js projects with Feature-Sliced Design layers, domain-grouped slices, and strict import hierarchy. Use when organizing features into FSD layers, enforcing slice boundaries, or keeping page.tsx thin.
metadata:
  triggers:
    files:
    - 'src/features/**'
    - 'src/entities/**'
    - 'src/widgets/**'
    keywords:
    - FSD
    - Feature Sliced Design
    - slices
    - segments
---
# Architecture (Feature-Sliced Design)

## **Priority: P2 (MEDIUM)**

**Warning**: FSD introduces boilerplate. Use it only if project expected to grow significantly (e.g., 20+ features). For smaller projects, simple module-based structure preferred.

## Workflow: Create New Feature Slice

1. **Create feature folder** — `src/features/auth/login/` with `ui/`, `model/`, `api/` segments.
2. **Add public API** — Export via `src/features/auth/login/index.ts`.
3. **Wire into page** — Import feature widget in `app/login/page.tsx` (thin page).
4. **Verify imports** — Ensure no upward or cross-slice imports violate layer hierarchy.

## Layer Hierarchy

`App (app/) -> Widgets -> Features -> Entities -> Shared`

See [implementation examples](references/implementation.md) for thin page example.

## Strategy

1. **RSC Boundaries**: Enforce strict serialization rules for props passed from Server to Client. See [RSC Boundaries & Serialization](references/RSC_BOUNDARIES.md).
2. **App Layer Thin**: `app/` directory (App Router) **only** for Routing.
 - _Rule_: `page.tsx` should only import Widgets/Features. No business logic (`useEffect`, `fetch`) directly in pages.
3. **Slices over Types**: Group code by **Business Domain** (User, Product, Cart), not by File Type (Components, Hooks, Utils).
 - _Bad_: `src/components/LoginForm.tsx`, `src/hooks/useLogin.ts`
 - _Good_: `src/features/auth/login/` containing both.
4. **Layer Hierarchy**: Code can only import from _layers below it_.
 - `App` -> `Widgets` -> `Features` -> `Entities` -> `Shared`.
5. **Avoid Excessive Entities**: not preemptively create Entities.
 - _Rule_: Start logic in `Features` or `Pages`. Move to `Entities` **only** when data/logic strictly reused across multiple differing features.
 - _Rule_: Simple CRUD belongs in `shared/api`, not `entities`.
6. **Standard Segments**: Use standard segment names within slices.
 - `ui` (Components), `model` (State/actions), `api` (Data fetching), `lib` (Helpers), `config` (Constants).
 - _Avoid_: `components`, `hooks`, `services` as segment names.

## Structure Reference

For specific directory layout and layer definitions, see reference documentation.

- [**FSD Folder Structure**](references/fsd-structure.md)
- [**Bundling & Compatibility**](references/BUNDLING.md)
- [**Runtime Selection (Edge/Node)**](references/RUNTIME_SELECTION.md)
- [**Debug Tricks & MCP**](references/DEBUG_TRICKS.md)

## Architecture Checklist (Mandatory)

- [ ] **Layer Imports**: any layer import from layer ABOVE it? (App > Widgets > Features > Entities > Shared)
- [ ] **Page Logic**: `page.tsx` thin, containing only Widgets/Features and zero `useEffect`/`fetch`?
- [ ] **RSC Boundaries**: Server Components isolated from Client Components with proper 'use client' boundaries?
- [ ] **Public API**: all access to slice performed via top-level `index.ts` (public API)?
- [ ] **Cross-Slice**: slices within same layer (e.g., two features) import from each other directly? (Prohibited)

- **Server Actions**: Place them in `model/` folder of Feature (e.g., `features/auth/model/actions.ts`).
- **Data Access (DAL)**: Place logic in `model/` folder of Entity (e.g., `entities/user/model/dal.ts`).
- **UI Components**: Base UI (shadcn) belongs in `shared/ui`. Feature-specific UI belongs in `features/*/ui`.


## Anti-Patterns

- **No cross-slice imports**: Slices in same layer must not import from each other directly.
- **No business logic in `page.tsx`**: Pages import Widgets/Features only; zero `useEffect`/`fetch`.
- **No file-type folders**: Group by domain (`features/auth/`), not type (`components/`, `hooks/`).
- **No premature Entity creation**: Start in Features; move to Entities only on strict reuse.