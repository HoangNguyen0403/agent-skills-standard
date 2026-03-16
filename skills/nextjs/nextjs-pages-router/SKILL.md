---
name: nextjs-pages-router
description: "Legacy routing, getServerSideProps conventions, and strict architectural constraints. (triggers: pages/**/*.tsx, pages/**/*.ts, Pages Router, getServerSideProps, getStaticProps, _app, useRouter)"
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

## 🚫 Anti-Patterns

- **Hallucinating Next 13+**: `export default async function Page()` is FATAL. Pages must be synchronous React components.
- **API Fetching in SSR**: Do NOT do an HTTP fetch to your own `pages/api` endpoint inside SSR. Directly import the service logic instead.
- **"use client" directives**: Do NOT use them. Everything here is implicitly a client component.

## References
- [Server-Side Props Example](references/server-side-props.md)
