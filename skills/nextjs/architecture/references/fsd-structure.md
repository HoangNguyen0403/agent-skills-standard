# Feature-Sliced Design (FSD) Structure

Adapted for Next.js App Router.

## Directory Layout

```text
app/                 # App Layer (Routing & Layouts)
  (app)/             # Public Pages
    page.tsx
  layout.tsx         # Root Provider Setup
  globals.css        # Global Styles

src/                 # Source Content
  widgets/           # Compositional Layers (Header, Footer, Sidebar)
    header/
      ui/
      index.ts

  features/          # User Interactions (AddToCart, FilterList)
    auth-login/
      ui/            # LoginForm.tsx
      model/         # Server Actions, Zod Schemas
      index.ts

  entities/          # Business Models (Product, User)
    product/
      ui/            # ProductCard.tsx (Presentation only)
      model/         # types.ts, complex validation
      index.ts

  shared/            # Reusable, Business-Agnostic
    ui/              # Buttons, Inputs (shadcn)
    lib/             # Utils, Hooks
    api/             # Base fetch wrappers & Simple CRUD
      client.ts
      endpoints/
        orders.ts    # Simple API calls (keep out of entities)
    auth/            # Auth Session/Tokens
      index.ts
    config/          # Env vars
```

## Segments (Inner Structure)

Files inside slices (e.g., `features/login/*`) must follow these standard segment names:

| Segment       | Purpose                      | Examples                                               |
| :------------ | :--------------------------- | :----------------------------------------------------- |
| **`ui/`**     | Visual components            | `LoginForm.tsx`, `ProductCard.tsx`                     |
| **`model/`**  | Business logic, state, types | `actions.ts` (Server Actions), `store.ts`, `schema.ts` |
| **`api/`**    | Remote data interactions     | `fetchProduct()`, `useProductQuery()`                  |
| **`lib/`**    | Helper functions             | `formatCurrency.ts`, `dateUtils.ts`                    |
| **`config/`** | Configuration & constants    | `env.ts`, `constants.ts`                               |

**Note**: Do not use generic folder names like `components/`, `hooks/`, or `utils/` inside slices. Use the semantic segments above.

## Anti-Patterns ("Excessive Entities")

1. **Refactor Later**: Don't start with `entities/`. Put logic in `features/` or `pages/` (slices) first. Extract to `entities/` only when strictly reused.
2. **Auth is Shared**: User session/tokens often belong in `shared/auth` or `shared/session`, not `entities/user`, because they are app-wide context distinct from the business entity "User".
3. **CRUD in Shared**: Simple API endpoints (CRUD) without complex domain logic logic should go in `shared/api/endpoints/`. Don't create an entity just to wrap a fetch call.

## Layer Responsibilities

1. **App (`app/`)**:
   - **Role**: Entry point. Contains _only_ Next.js routing files (`page.tsx`, `layout.tsx`).
   - **Rule**: Files here should be thin wrappers that import widgets or features.
2. **Widgets (`src/widgets/`)**:
   - **Role**: Assemble features and entities into self-contained blocks (e.g., `Header`, `ProductList`).
3. **Features (`src/features/`)**:
   - **Role**: Handle user scenarios (e.g., `AuthByEmail`, `ToggleTheme`). Contains form logic & Server Actions.
4. **Entities (`src/entities/`)**:
   - **Role**: Business domain concepts. High reuse potential.
   - **Warning**: Avoid "Anemic Domain Models". If it's just data types, put them in `shared/api`.
5. **Shared (`src/shared/`)**:
   - **Role**: UI Kit (Buttons), Utils, API Clients. No business logic.
