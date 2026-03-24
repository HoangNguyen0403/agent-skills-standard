---
name: nextjs-server-components
description: "Build async React Server Components and place 'use client' boundaries at leaf nodes for interactivity in Next.js App Router. Use when deciding RSC vs Client Component, composing server data into client wrappers, or fixing hydration errors. (triggers: app/**/*.tsx, src/app/**/*.tsx, app/**/*.jsx, src/app/**/*.jsx, use client, Server Component, Client Component, hydration)"
---

# Server & Client Components

## **Priority: P0 (CRITICAL)**

> [!WARNING]
> If the project uses the `pages/` directory instead of the App Router, **ignore** this skill entirely.

Next.js (App Router) uses React Server Components (RSC) by default.

## Workflow: Add Server/Client Component Split

1. **Default to RSC** — Write components as async Server Components for data fetching.
2. **Push `'use client'` to leaves** — Only add for interactivity (onClick, useState, useEffect).
3. **Compose via children** — Pass Server Components as `children` to Client Components.
4. **Serialize props** — Ensure all Server-to-Client props are serializable (no functions, Dates, or Classes).
5. **Guard secrets** — Import `server-only` in modules with sensitive logic.

## Composition Pattern Example

See [implementation examples](references/example.md)

## Implementation Guidelines

- **Async RSCs**: Fetch data directly inside async Server Components; use `await db.` queries and `await params` for route segments.
- **Data Fetching**: Use `fetch` with `cache: 'no-store'` or `revalidate: 0` to opt out of static rendering when needed.
- **Streaming**: Wrap slow async components in `<Suspense>` for progressive loading. Use `loading.tsx` for route-level skeletons.
- **Hydration**: Server sends HTML + RSC payload; client hydrates only Client Components. Server Components produce zero JS in the client bundle.
- **Server-in-Client**: You cannot import a Server Component directly into a Client Component.
  - _Fix_: Pass Server Component as `children` prop to the Client Component. See [Composition Example](references/composition-security.md).

## Anti-Patterns

- **No secrets in Client Components**: Use `server-only` package to prevent accidental bundling.
- **No full DB objects passed to client**: Minimize serialized props; pass IDs when possible.
- **No `useState`/`useEffect` in Server Components**: These are Client Component-only hooks.
- **No `'use client'` at tree root**: Push the boundary to leaf components.

## References

- [Server/Client Composition Example](references/composition-security.md)
