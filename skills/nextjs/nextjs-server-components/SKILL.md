---
name: nextjs-server-components
description: "Build async React Server Components and place 'use client' boundaries at leaf nodes for interactivity in Next.js App Router. Use when deciding RSC vs Client Component, composing server data into client wrappers, or fixing hydration errors."
metadata:
  triggers:
    files:
    - 'app/**/*.tsx'
    - 'src/app/**/*.tsx'
    - 'app/**/*.jsx'
    - 'src/app/**/*.jsx'
    keywords:
    - use client
    - Server Component
    - Client Component
    - hydration
---
# Server & Client Components

## **Priority: P0 (CRITICAL)**

> [!WARNING]
> If project uses `pages/` directory instead of App Router, **ignore** this skill entirely.

App Router uses React Server Components (RSC) by default.

## Workflow: Add Server/Client Component Split

1. **Default to RSC** — Async Server Components for data fetching.
2. **Push `'use client'` to leaves** — Interactive leaf nodes only (Button, Form, Chart). Keep layouts/pages as Server Components to maximise RSC benefits.
3. **Compose via children** — Pass Server Components as `children` to Client Components.
4. **Serialize props** — Server-to-Client props must be serializable (no functions, Dates, or Classes).
5. **Guard secrets** — Import `server-only` in modules with sensitive logic.

## Composition Pattern Example

See [implementation examples](references/example.md)

## Implementation Guidelines

- **Async RSCs**: Fetch directly in async Server Components — `await db.` queries, `await params` for route segments.
- **Data Fetching**: `fetch` with `cache: 'no-store'` or `revalidate: 0` opts out of static rendering.
- **Streaming**: Wrap slow async components in `<Suspense>`. Use `loading.tsx` for route-level skeletons.
- **Hydration**: Server sends HTML + RSC payload; client hydrates only Client Components. Server Components: zero JS in client bundle.
- **Server-in-Client**: Cannot import Server Component into Client Component.
- _Fix_: Pass as `children` prop. See [Composition Example](references/composition-security.md).

## Anti-Patterns

- **No secrets in Client Components**: Use `server-only` package to prevent accidental bundling.
- **No full DB objects passed to client**: Minimize serialized props; pass IDs when possible.
- **No `useState`/`useEffect` in Server Components**: These Client Component-only hooks.
- **No `'use client'` at tree root**: Push boundary to leaf components.

## References

- [Server/Client Composition Example](references/composition-security.md)
