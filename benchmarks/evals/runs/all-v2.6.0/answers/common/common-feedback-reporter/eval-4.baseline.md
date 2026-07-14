Assumption: you’re using the App Router intentionally.

For Next.js 14 App Router, put routes under `app/`, not `pages/`:

```text
app/
  dashboard/
    page.tsx        # /dashboard
  api/
    users/
      route.ts      # /api/users
```

Use `pages/` only for the Pages Router:

```text
pages/
  dashboard.tsx     # /dashboard
  api/users.ts      # /api/users
```

The skill guidance is incorrect for your setup; follow App Router conventions such as `page.tsx`, `layout.tsx`, `loading.tsx`, and `route.ts`.
