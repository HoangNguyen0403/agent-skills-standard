# Fix async request APIs

In Next.js 15, request APIs are promises. Await `cookies()` wherever it is read, and apply the same migration to `headers()`, `params`, and `searchParams`:

```tsx
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  return <Dashboard session={session?.value ?? null} />
}
```

Update middleware, layouts, route handlers, and server actions too; run the async request API codemod or search for unawaited calls before verifying with `next build`.

