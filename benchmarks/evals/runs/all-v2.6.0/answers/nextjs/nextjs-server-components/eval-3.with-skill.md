Yes—an async Server Component can call the database directly, preferably through a server-only DAL:

```tsx
export default async function Page() {
  const user = await getUserDto()
  return <Profile user={user} />
}
```

Authenticate and authorize inside the DAL, return a minimal DTO, and never expose ORM instances or secrets to Client Components. Do not fetch the application’s own API route from the server; call the service directly.

