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

## File Conventions

- **page.tsx**: The UI for a route.
- **layout.tsx**: Shared UI wrapping children. Persists across navigation.
- **template.tsx**: Similar to layout, but remounts on navigation.
- **loading.tsx**: Suspense boundary for loading states.
- **error.tsx**: Error boundary (Must be Client Component).
- **not-found.tsx**: Custom 404 UI.
- **route.ts**: Server-side API endpoint.

## Structure Patterns

- **Route Groups**: Use parenthesis `(auth)` to organize routes without affecting URL path.
  - `app/(auth)/login/page.tsx` -> `/login`
- **Private Folders**: Use underscore `_lib` to exclude folders from routing.
- **Dynamic Routes**: Use brackets `[slug]`.
  - `app/blog/[slug]/page.tsx` -> `/blog/abc`
- **Catch-all**: `[...slug]` matches subsequent segments.

## Navigation

- **Link Component**: Use `<Link href="/dashboard">` for prefetching.
- **Programmatic**: Use `useRouter` hook (Client Components only).
  - `router.push('/dashboard')`
- **Redirect**: Use `redirect('/login')` in Server Components.

## Best Practices

- **Colocation**: Keep component files, styles, and tests inside the route folder.
- **Layouts**: Use Root Layout (`app/layout.tsx`) for `<html>` and `<body>` tags.
