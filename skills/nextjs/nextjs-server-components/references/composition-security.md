# RSC Composition & Security

## Server-in-Client Composition

You cannot import a Server Component directly into a Client Component. Instead, pass the Server Component as a `children` prop.

```tsx
// Page.tsx (Server Component)
import ClientWrapper from './ClientWrapper';
import ServerContent from './ServerContent';

export default function Page() {
  return (
    <ClientWrapper>
      <ServerContent />
    </ClientWrapper>
  );
}

// ClientWrapper.tsx (Client Component)
('use client');
export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='client-context'>{children}</div>;
}
```

## Security with `server-only`

Prevent accidental bundling of server-side logic (e.g., database clients, API secrets) into client-side JS.

```bash
npm install server-only
```

```tsx
// lib/db.ts
import 'server-only';
export const db = new Database();
```

If a Client Component tries to import `lib/db.ts`, Next.js will throw a build error.
