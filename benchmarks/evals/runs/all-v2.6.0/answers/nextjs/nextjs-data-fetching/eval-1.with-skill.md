Make the Server Component async and fetch data directly where it is needed:

```tsx
export default async function Page() {
  const data = await fetch('https://example.com/data', { cache: 'force-cache' }).then((r) => r.json())
  return <pre>{JSON.stringify(data)}</pre>
}
```

For database access, call the DAL/service directly rather than your own `/api` route. Use `no-store` or revalidation settings according to freshness, and stream slow reads behind `Suspense` instead of blocking the entire route.

