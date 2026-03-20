---
name: nextjs-pages-router
description: "Legacy routing, getServerSideProps conventions, and strict architectural constraints. Use when working in a Pages Router project with getServerSideProps, getStaticProps, or _app in Next.js. (triggers: pages/**/*.tsx, pages/**/*.ts, Pages Router, getServerSideProps, getStaticProps, _app, useRouter)"
---

# Next.js Pages Router (Legacy)

## **Priority: P0 (CRITICAL)**

> [!IMPORTANT]
> The project uses Next.js **Pages Router** (`pages/` directory). Do NOT use App Router features.

## Architecture Constraints

- **Thin Pages**: Files in `pages/` must be extremely thin routing wrappers.
- **Routing Rules**: Dynamic uses `[id].tsx`, Catch-all uses `[...slug].tsx`.
- **API Routes**: Code inside `pages/api/` runs strictly on the server.

## Data Fetching

- **Server-Side**: Use `getServerSideProps` (SSR) or `getStaticProps` (SSG). Export as standalone async function.
- **Client-Side**: Rely on SWR, React Query, Redux, or `fetch` in `useEffect`.

## Anti-Patterns

- **No `async` page exports**: Pages Router pages must be synchronous React components.
- **No HTTP fetch to own `/api` in SSR**: Import service logic directly in `getServerSideProps`.
- **No `'use client'` directive**: Pages Router is implicitly client; the directive causes errors.

## References
- [Server-Side Props Example](references/server-side-props.md)
