In Next.js 15, request APIs such as `cookies()` are asynchronous. Await them wherever they are read:

```tsx
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  return <p>{session ? 'Signed in' : 'Signed out'}</p>;
}
```

Apply the same migration to `headers()`, and to the `params` and `searchParams` props in App Router pages/layouts where the version exposes them as promises. Update helper functions and their callers rather than suppressing the error, for example `async function getSession() { const store = await cookies(); … }`. Do not call these APIs from a Client Component; read them on the server and pass only the needed, non-sensitive data across the boundary. Run the Next codemod where appropriate, then search for every synchronous request-API use, including middleware-related helpers and tests.

