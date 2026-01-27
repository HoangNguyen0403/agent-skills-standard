---
name: Next.js App Router
description: File-system routing, Layouts, and Route Groups.
metadata:
  labels: [nextjs, routing, app-router]
  triggers:
    files: ['app/**/page.tsx', 'app/**/layout.tsx', 'app/**/loading.tsx']
    keywords: [App Router, Layout, Route Group, parallel routes]
---

# Next.js App Router

## **Priority: P0 (CRITICAL)**

Use the App Router (`app/` directory) for all new projects.

## **Next.js 15+ Async APIs**

> [!IMPORTANT]
> `params`, `searchParams`, `cookies()`, and `headers()` are now **Promises**. You MUST await them.

### Pages & Layouts

```tsx
type Props = { params: Promise<{ slug: string }> };
export default async function Page({ params }: Props) {
  const { slug } = await params;
}
```

### Server Functions (Cookies/Headers)

```tsx
import { cookies } from 'next/headers';
const cookieStore = await cookies();
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
