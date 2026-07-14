Put shareable filter state in the URL query string. The page can read it on the server for the initial result, while a small Client Component updates it from the controls:

```tsx
'use client';
const router = useRouter();
const pathname = usePathname();
const params = useSearchParams();

function setFilter(value: string) {
  const next = new URLSearchParams(params.toString());
  value ? next.set('status', value) : next.delete('status');
  router.replace(`${pathname}?${next}`, { scroll: false });
}
```

Parse and validate query values on the server, define defaults, and use a canonical ordering/encoding so equivalent filters have stable URLs. Debounce text search, preserve unrelated parameters, and use a form/link strategy where possible for accessibility. The server page can fetch based on `searchParams`; the route transition then re-renders the affected Server Components. Keep ephemeral UI such as an open dropdown in local component state rather than putting every transient value in the URL.

