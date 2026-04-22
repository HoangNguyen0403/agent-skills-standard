---
name: nextjs-app-router
description: Configure file-system routing with nested layouts, route groups, parallel routes, and error boundaries in Next.js App Router. Use when creating page routes, adding loading/error states, or organizing routes with groups and dynamic segments.
metadata:
  triggers:
    files:
    - 'app/**/page.tsx'
    - 'app/**/layout.tsx'
    - 'app/**/loading.tsx'
    keywords:
    - App Router
    - Layout
    - Route Group
    - parallel routes
---
## **Priority: P0 (CRITICAL)**

## Workflow: Add New Route

1. **Create page** — Add `app/dashboard/page.tsx` as Server Component.
2. **Add layout** — Create `app/dashboard/layout.tsx` returning `{children}`.
3. **Add loading state** — Create `app/dashboard/loading.tsx` for Suspense boundary.
4. **Add error boundary** — Create `app/dashboard/error.tsx` with `'use client'` and `reset` prop.
5. **Await async APIs** — In Next.js 15+, `await params`, `cookies()`, `headers()`.

## Route Group Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

### Routing Architecture

- **Structure**: Use **`app/` directory**. Define routes with **`app/dashboard/layout.tsx`** returning **`{children}`**; shared UI nests inside `app/layout.tsx` automatically. Handle states with **`loading.tsx`**, **`error.tsx`**, and **`not-found.tsx`**.
- **Segments**: Organize features with **Route Groups** (brackets **`(auth)`**) to **excluded from URL path**. Use **Dynamic Routes** (brackets `[slug]`) and define static paths via **`generateStaticParams`**.
- **Specialized**: Use **Parallel Routes** (**`@modal`**) by adding slot to parent layout and providing **`default.tsx`** fallback. Use **Intercepting Routes** (`(.)route`) for advanced layouts like dashboards.

### Data & Functions

- **Next.js 15+ Async**: Always **`await`** **`params: Promise`**, **`searchParams`**, **`cookies()`**, and **`headers()`**.
- **Security**: Use **`middleware.ts`** for edge-side authentication and redirection. Ensure all **Route Handlers (`route.ts`)** secured with appropriate auth checks.
- **RSC**: Default to **React Server Components (RSC)**. Only use **`'use client'`** at leaf nodes for interactivity (hooks/events).
- **Error Boundaries**: Create **`app/dashboard/loading.tsx`** to auto-wrap routes in **Suspense boundary**. In **`error.tsx`**, use **`'use client'`** and provide **`reset: () => void`** function.

## File Conventions

- **page.tsx**: UI for route.
- **layout.tsx**: Shared UI wrapping children. Persists across navigation.
- **loading.tsx**: Suspense boundary for loading states.
- **error.tsx**: Error boundary (Must Client Component).
- **route.ts**: Server-side API endpoint.

## Structure Patterns

- **Route Groups**: Use parenthesis `(auth)` to organize without affecting URL path.
- **Private Folders**: Use underscore `_lib` to exclude from routing.
- **Dynamic Routes**: Use brackets `[slug]` or `[...slug]` (catch-all).

## Best Practices

- **RSC Boundaries**: Ensure props passed to Client Components serializable. See [RSC Boundaries & Serialization](../nextjs-architecture/references/RSC_BOUNDARIES.md).
- **Parallel Routes (`@folder`)**: Render multiple pages in same layout. Use `default.tsx` for fallback.
- **Intercepting Routes (`(..)folder`)**: Load routes within current layout context.
- **Colocation**: Keep component files, styles, and tests inside route folder.
- **Layouts**: Use Root Layout (`app/layout.tsx`) for `<html>` and `<body>` tags.
- [**Self-Hosting Standard**](references/SELF_HOSTING.md)


## Anti-Patterns

- **No unawaited async APIs**: `params`, `cookies()`, `headers()` Promises in Next.js 15+; always await.
- **No `'use client'` at tree root**: Place at leaves; keep layouts and pages as Server Components.
- **No `<html>`/`<body>` in nested layouts**: Only `app/layout.tsx` (root layout) should include them.
- **No missing `error.tsx`**: Every route segment needs Client Component error boundary.