---
name: nextjs-app-router
description: 'File-system routing, Layouts, and Route Groups. Use when implementing App Router routing, nested layouts, or route groups in Next.js. (triggers: app/**/page.tsx, app/**/layout.tsx, app/**/loading.tsx, App Router, Layout, Route Group, parallel routes)'
---

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Routing Architecture

- **Structure**: Use the **`app/` directory**. Define routes with **`app/dashboard/layout.tsx`** returning **`{children}`**; shared UI nests inside `app/layout.tsx` automatically. Handle states with **`loading.tsx`**, **`error.tsx`**, and **`not-found.tsx`**.
- **Segments**: Organize features with **Route Groups** (brackets **`(auth)`**) to be **excluded from URL path**. Use **Dynamic Routes** (brackets `[slug]`) and define static paths via **`generateStaticParams`**.
- **Specialized**: Use **Parallel Routes** (**`@modal`**) by adding the slot to the parent layout and providing a **`default.tsx`** fallback. Use **Intercepting Routes** (`(.)route`) for advanced layouts like dashboards.

### Data & Functions

- **Next.js 15+ Async**: Always **`await`** the **`params: Promise`**, **`searchParams`**, **`cookies()`**, and **`headers()`**.
- **Security**: Use **`middleware.ts`** for edge-side authentication and redirection. Ensure all **Route Handlers (`route.ts`)** are secured with appropriate auth checks.
- **RSC**: Default to **React Server Components (RSC)**. Only use **`'use client'`** at leaf nodes for interactivity (hooks/events).
- **Error Boundaries**: Create **`app/dashboard/loading.tsx`** to auto-wrap routes in a **Suspense boundary**. In **`error.tsx`**, use **`'use client'`** and provide a **`reset: () => void`** function.
  const theme = cookieStore.get('theme');

```

## File Conventions

- **page.tsx**: UI for a route.
- **layout.tsx**: Shared UI wrapping children. Persists across navigation.
- **loading.tsx**: Suspense boundary for loading states.
- **error.tsx**: Error boundary (Must be Client Component).
- **route.ts**: Server-side API endpoint.

## Structure Patterns

- **Route Groups**: Use parenthesis `(auth)` to organize without affecting URL path.
- **Private Folders**: Use underscore `_lib` to exclude from routing.
- **Dynamic Routes**: Use brackets `[slug]` or `[...slug]` (catch-all).

## Best Practices

- **RSC Boundaries**: Ensure props passed to Client Components are serializable. See [RSC Boundaries & Serialization](../architecture/references/RSC_BOUNDARIES.md).
- **Parallel Routes (`@folder`)**: Render multiple pages in the same layout. Use `default.tsx` for fallback.
- **Intercepting Routes (`(..)folder`)**: Load routes within current layout context.
- **Colocation**: Keep component files, styles, and tests inside the route folder.
- **Layouts**: Use Root Layout (`app/layout.tsx`) for `<html>` and `<body>` tags.
- [**Self-Hosting Standard**](references/SELF_HOSTING.md)


## Anti-Patterns

- **No unawaited async APIs**: `params`, `cookies()`, `headers()` are Promises in Next.js 15+; always await.
- **No `'use client'` at tree root**: Place at leaves; keep layouts and pages as Server Components.
- **No `<html>`/`<body>` in nested layouts**: Only `app/layout.tsx` (root layout) should include them.
- **No missing `error.tsx`**: Every route segment needs a Client Component error boundary.
```
