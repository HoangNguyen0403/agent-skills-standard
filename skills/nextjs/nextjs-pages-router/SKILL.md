---
name: nextjs-pages-router
description: 'Legacy routing, getServerSideProps conventions, and strict architectural constraints. Use when working in a Pages Router project with getServerSideProps, getStaticProps, or _app in Next.js. (triggers: pages/**/*.tsx, pages/**/*.ts, Pages Router, getServerSideProps, getStaticProps, _app, useRouter)'
---

# Next.js Pages Router (Legacy)

## **Priority: P0 (CRITICAL)**

> [!IMPORTANT]
> The project uses Next.js **Pages Router** (`pages/` directory). Do NOT use App Router features.

## Implementation Guidelines

- **Routing Architecture**: Use the **`pages/` directory**. Use **`_app.tsx`** for global state/layouts and **`_document.tsx`** for custom HTML attributes. Define dynamic routes using **brackets `[id].tsx`** or **catch-all `[...slug].tsx`**.
- **Data Fetching (SSR/SSG)**: Use **`getServerSideProps`** (for every request) or **`getStaticProps`** (at build time) with **`getStaticPaths`** for dynamic routes. Export these as standalone **`async` functions**.
- **Logic Isolation**: Never **`fetch`** your own **`/api`** endpoints from Server-Side hooks. Import the **service layer** or DB logic directly.
- **Client Hooks**: Use **`useRouter()`** from `next/router` for navigation and access to query params. Use **`router.push()`** or **`<Link>`** for client-side routing.
- **APIs**: Implement **API Routes** in `pages/api/` for server-only logic or webhooks. Standardize responses with appropriate HTTP status codes.
- **Next.js 15+ Compatibility**: Be cautious of **Next.js 15 upgrades**; ensure all **`getServerSideProps`** return objects that match the expected `PageProps`.
- **Styling**: Standardize via **CSS Modules (`*.module.css`)** or **Tailwind CSS**. Avoid global CSS unless imported in `_app.tsx`.

## References

- [Server-Side Props Example](references/server-side-props.md)
