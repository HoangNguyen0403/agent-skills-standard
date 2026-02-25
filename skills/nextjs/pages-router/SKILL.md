---
name: Next.js Pages Router & Architecture
description: Legacy routing, getServerSideProps conventions, and strict architectural constraints (FSD).
metadata:
  labels: [nextjs, routing, pages-router, architecture, legacy, react]
  triggers:
    files: ['pages/**/*.tsx', 'pages/**/*.ts']
    keywords:
      [Pages Router, getServerSideProps, getStaticProps, _app, useRouter, FSD]
---

# Next.js Pages Router (Legacy)

## **Priority: P0 (CRITICAL)**

> [!IMPORTANT]
> The project uses Next.js **Pages Router** (`pages/` directory). Do NOT use App Router features (`app/` directory, React Server Components, `use server`, `use client`).

## Project Structure & Architecture

Keep files in `pages/` extremely thin. They should purely import assembled pages from business logic layers (like `src/features/` or `src/components/`).

```text
/
├── pages/                    # Routing layer (Keep extremely thin)
│   ├── _app.tsx              # Global setup & Providers
│   ├── _document.tsx         # HTML skeleton (Server only)
│   └── index.tsx             # Thin wrapper importing a feature component
└── src/
    └── features/             # Business logic & domain components
```

- **Component Limits**: Extract complex logic if a UI component exceeds `500` lines.
- **Logic Leakage**: Do not put massive business logic inside UI components. Extract to hooks or services.

## Routing Conventions

- **File-System Routing**: Any `.tsx` or `.jsx` file inside `pages/` becomes a distinct route (`pages/about.tsx` -> `/about`).
- **Dynamic Routes**: Use brackets `[id].tsx` (`pages/posts/[id].tsx` -> `/posts/1`).
- **Catch-All Routes**: `[...slug].tsx` (`pages/shop/[...slug].tsx` -> `/shop/clothes/shirts`).
- **API Routes**: Code inside `pages/api/` runs strictly on the server and is not bundled with client code.

## Data Fetching & State

Do not use modern native `fetch({ cache })` caching.

### Server-Side Data (`getServerSideProps` & `getStaticProps`)

Use `getServerSideProps` (SSR) or `getStaticProps` (SSG) for server-side page data fetching. Must be exported as a standalone async function from a `pages/` file.

```tsx
import { GetServerSideProps } from 'next';
import { FeaturePage } from '@/features/page';
import { getPostData } from '@/features/services/postService';

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Directly import and call service logic here, avoiding HTTP fetches to your own Next.js APIs.
  const data = await getPostData(context.params?.id);
  return { props: { data } };
};

export default function Page({ data }) {
  // Thin wrapper around feature component
  return <FeaturePage data={data} />;
}
```

### Client-Side Fetching

For dynamic data fetching from the client side, rely on **SWR**, **React Query**, **Redux**, or standard `fetch` inside `useEffect`. Treat all UI components as standard React client components.

## Anti-Patterns

- **No App Directory**: Do not create or use an `app/` directory.
- **No Server Components**: Do not suggest React Server Components (RSC) usage.
- **No Server Actions**: Do not use `"use server"` or Next.js Server Actions.
- **No Use Client**: Do not use `"use client"` directives. All components in the Pages Router are implicitly client components (that are SSR'd).
- **Hallucinating Next 13+**: Writing `export default async function Page()` is **fatal** in the Pages router. Pages must be standard synchronous React components.
- **API Fetching in SSR**: Prefer directly importing service logic inside `getServerSideProps` rather than doing an HTTP fetch to your own `pages/api` endpoint.

## Reference & Examples

For feature-sliced design (FSD) implementation: [references/feature-sliced-design-pages.md](references/feature-sliced-design-pages.md)
