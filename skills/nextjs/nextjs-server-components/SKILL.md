---
name: nextjs-server-components
description: "RSC usage, ''use client'' directive, and Component Purity. Use when working with React Server Components or deciding where to place the ''use client'' boundary. (triggers: app/**/*.tsx, src/app/**/*.tsx, app/**/*.jsx, src/app/**/*.jsx, use client, Server Component, Client Component, hydration)"
---

# Server & Client Components

## **Priority: P0 (CRITICAL)**

> [!WARNING]
> If the project uses the `pages/` directory instead of the App Router, **ignore** this skill entirely.

Next.js (App Router) uses React Server Components (RSC) by default.

## Server Components (Default)

- **Behavior**: Rendered on server, sent as HTML/Payload to client. Zero bundle size for included libs.
- **Capabilities**: Async/Await, Direct DB access, Secrets usage.
- **Restrictions**: No `useState`, `useEffect`, or Browser APIs (`window`, `localstorage`).

## Client Components

- **Directive**: Add `'use client'` at the VERY TOP of the file.
- **Usage**: Interactivity (`onClick`), State (`useState`), Lifecycle effects, Browser APIs.
- **Strategy**: Move Client Components to the leaves of the tree.
  - _Bad_: Making the root layout a Client Component.
  - _Good_: Wrapping a `<Button />` in a Client Component.

## Composition Patterns

- **Server-in-Client**: You cannot import a Server Component directly into a Client Component.
  - _Fix_: Pass Server Component as `children` prop to the Client Component. See [Composition Example](references/composition-security.md).

## Anti-Patterns

- **No secrets in Client Components**: Use `server-only` package to prevent accidental bundling.
- **No full DB objects passed to client**: Minimize serialized props; pass IDs when possible.
- **No `useState`/`useEffect` in Server Components**: These are Client Component-only hooks.
- **No `'use client'` at tree root**: Push the boundary to leaf components.

## References

- [Server/Client Composition Example](references/composition-security.md)
