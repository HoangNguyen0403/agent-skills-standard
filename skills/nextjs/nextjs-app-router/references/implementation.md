# nextjs-app-router Implementation Examples

## Inline Examples

```typescript
// app/(auth)/login/page.tsx — URL is /login, not /auth/login
export default function LoginPage() {
  return <LoginForm />;
}

// app/dashboard/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <button onClick={() => reset()}>Retry</button>;
}
```
