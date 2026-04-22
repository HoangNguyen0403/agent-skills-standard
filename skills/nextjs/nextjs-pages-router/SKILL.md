---
name: nextjs-pages-router
description: Implement Pages Router data fetching with getServerSideProps, getStaticProps, and API routes in Next.js legacy projects. Use when working in a pages/ directory project, adding SSR/SSG data fetching, or creating API routes.
metadata:
  triggers:
    files:
    - 'pages/**/*.tsx'
    - 'pages/**/*.ts'
    keywords:
    - Pages Router
    - getServerSideProps
    - getStaticProps
    - _app
    - useRouter
---
# Next.js Pages Router (Legacy)

## **Priority: P0 (CRITICAL)**

> [!IMPORTANT]
> project uses Next.js **Pages Router** (`pages/` directory). NOT use App Router features.

## Workflow: Add Server-Rendered Page

1. **Create page file** — Add `pages/posts/[id].tsx`.
2. **Add data fetching** — Export `getServerSideProps` or `getStaticProps` + `getStaticPaths`.
3. **Import service directly** — Never fetch your own `/api` routes from server-side hooks.
4. **Type props** — Use `InferGetServerSidePropsType<typeof getServerSideProps>`.

## getServerSideProps Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Routing Architecture**: Use **`pages/` directory**. Use **`_app.tsx`** for global state/layouts and **`_document.tsx`** for custom HTML attributes. Define dynamic routes using **brackets `[id].tsx`** or **catch-all `[...slug].tsx`**.
- **Data Fetching (SSR/SSG)**: Use **`getServerSideProps`** (for every request) or **`getStaticProps`** (at build time) with **`getStaticPaths`** for dynamic routes. Export these as standalone **`async` functions**.
- **Logic Isolation**: Never **`fetch`** your own **`/api`** endpoints from Server-Side hooks. Import **service layer** or DB logic directly.
- **Client Hooks**: Use **`useRouter()`** from `next/router` for navigation and access to query params. Use **`router.push()`** or **`<Link>`** for client-side routing.
- **APIs**: Implement **API Routes** in `pages/api/` for server-only logic or webhooks. Standardize responses with appropriate HTTP status codes.
- **Next.js 15+ Compatibility**: cautious of **Next.js 15 upgrades**; ensure all **`getServerSideProps`** return objects that match expected `PageProps`.
- **Styling**: Standardize via **CSS Modules (`*.module.css`)** or **Tailwind CSS**. Avoid global CSS unless imported in `_app.tsx`.

## Anti-Patterns

- **No fetching own /api routes from SSR**: Import service layer directly.
- **No global CSS outside _app.tsx**: Use CSS Modules or Tailwind for scoped styles.
- **No App Router features in Pages Router projects**: Avoid `app/` directory patterns.

## References

- [Server-Side Props Example](references/server-side-props.md)