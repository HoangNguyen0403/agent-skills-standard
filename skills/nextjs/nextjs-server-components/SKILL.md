---
name: nextjs-server-components
description: "RSC usage, ''use client'' directive, and Component Purity. Use when working with React Server Components or deciding where to place the ''use client'' boundary. (triggers: app/**/*.tsx, src/app/**/*.tsx, app/**/*.jsx, src/app/**/*.jsx, use client, Server Component, Client Component, hydration)"
---

# Server & Client Components

## **Priority: P0 (CRITICAL)**

> [!WARNING]
> If the project uses the `pages/` directory instead of the App Router, **ignore** this skill entirely.

Next.js (App Router) uses React Server Components (RSC) by default.

## Implementation Guidelines

- **Next.js Default**: Use **React Server Components (RSC)** for 90% of your UI. Leverage **`async components`** for direct data fetching.
- **Client Boundary**: Only use the `'use client'` directive for **interactivity** (e.g., `onClick`), **hooks** (`useState`, `useEffect`), or **browser APIs**. Place the boundary at the **leaf nodes** to maximise RSC benefits and server-side rendering.
- **Composition**: Use `<ClientWrapper><ServerDataComponent /></ClientWrapper>` to pass Server Components as `children` to Client Components. Avoid **Circular Dependencies** between server and client. Direct database access: `await db.` queries inside async RSCs, and `await params` before accessing route segments.
- **Data Fetching**: Use **`fetch`** with **`cache: 'no-store'`** or **`revalidate: 0`** to opt out of static rendering when needed.
- **Loading & UI**: Use **`Suspense`** triggers around slow async components to enable **Streaming** and better UX. Use **`loading.tsx`** for route-level loading states.
- **Serialization**: Ensure all props passed from Server to Client are **Serializable** (No functions, Dates, or Classes).
- **Security**: Never share **secrets or server-only logic** within Client Components. Use **`server-only`** package to enforce this.

- **Hydration**: Server sends HTML + RSC payload (JSON); client hydrates only Client Components. Server Components produce zero JS in the client bundle — no useState/useEffect shipped to browser.
- **Server-in-Client**: You cannot import a Server Component directly into a Client Component.
  - _Fix_: Pass Server Component as `children` prop to the Client Component. See [Composition Example](references/composition-security.md).

## Anti-Patterns

- **No secrets in Client Components**: Use `server-only` package to prevent accidental bundling.
- **No full DB objects passed to client**: Minimize serialized props; pass IDs when possible.
- **No `useState`/`useEffect` in Server Components**: These are Client Component-only hooks.
- **No `'use client'` at tree root**: Push the boundary to leaf components.

## References

- [Server/Client Composition Example](references/composition-security.md)
