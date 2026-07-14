# Dashboard route

Create `app/dashboard/page.tsx` as the route UI, `app/dashboard/loading.tsx` for the Suspense skeleton, and `app/dashboard/error.tsx` as a Client Component error boundary:

```tsx
// app/dashboard/error.tsx
'use client'

export default function Error({ reset }: { reset: () => void }) {
  return <button onClick={reset}>Try again</button>
}
```

Keep the page and layout as Server Components, and put interactive behavior only in leaf components. Add a `layout.tsx` when the dashboard needs persistent shared UI; do not put `<html>` or `<body>` in that nested layout.

