Create the route under `app/dashboard/page.tsx`. Put route-segment UI states beside it:

```text
app/dashboard/
  page.tsx
  loading.tsx
  error.tsx
```

`loading.tsx` is the Suspense fallback shown while the segment loads:

```tsx
export default function Loading() {
  return <div aria-label="Loading dashboard" className="animate-pulse">Loading…</div>;
}
```

`error.tsx` must be a Client Component because it uses the recovery callback:

```tsx
'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <button onClick={() => reset()}>Try again</button>;
}
```

Keep data fetching in the async Server Component `page.tsx`; add `not-found.tsx` separately if missing records should produce a 404. The boundary catches errors in its segment and descendants, so handle expected validation errors in the UI rather than throwing them as infrastructure failures.

