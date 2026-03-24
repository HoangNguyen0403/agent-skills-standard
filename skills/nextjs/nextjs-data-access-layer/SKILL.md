---
name: nextjs-data-access-layer
description: "Build secure, reusable data access patterns with DTOs, taint checks, and colocated authorization in Next.js. Use when centralizing database queries, transforming raw data to DTOs, adding server-only guards, or preventing sensitive data from reaching Client Components. (triggers: **/lib/data.ts, **/services/*.ts, **/dal/**, DAL, Data Access Layer, server-only, DTO)"
---

# Data Access Layer (DAL)

## Priority: P1 (HIGH)

Centralize all data access (Database & External APIs) to ensure consistent security, authorization, and caching.

## Workflow

1. **Create DAL module** in `services/` or `lib/data.ts` with `import 'server-only'`.
2. **Verify auth** inside every DAL function using `await auth()`.
3. **Transform** raw DB/API data into DTOs before returning to components.
4. **Wrap** with `cache()` from React to deduplicate requests within a render cycle.
5. **Taint-check** sensitive objects to prevent accidental client exposure.

```typescript
// lib/dal/users.ts — secure DAL function
import 'server-only';
import { cache } from 'react';
import { auth } from '@/auth';
import { db } from '@/db';

export const getUser = cache(async (id: string) => {
  const session = await auth();
  if (!session) throw new UnauthorizedError();

  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError();

  // Return DTO — never expose passwordHash, internalNotes, etc.
  return { id: user.id, name: user.name, email: user.email };
});
```

## Implementation Guidelines

- **DTOs**: Always transform raw data into plain objects. Never return ORM model instances.
- **Security**: Use `taintObjectReference` or `taintUniqueValue` from the experimental taint API to guard sensitive data.
- **Authorization**: Colocate auth checks inside every DAL function. Never rely on the UI layer.
- **Caching**: Wrap DAL functions in `cache()` to deduplicate within a single render.
- **Error Handling**: Throw standardized errors (`NotFoundError`, `UnauthorizedError`) caught by `error.tsx` or `notFound()`.

## Limitations

- **Client Components** cannot import DAL files. Use Server Actions or Route Handlers as bridges.

## Anti-Patterns

- **No auth checks outside DAL**: Auth verification must live inside DAL functions.
- **No raw ORM instances returned**: Transform to plain DTO objects before returning.
- **No `fetch('localhost/api')` in Server Components**: Call DAL functions directly.
- **No DAL imports in Client Components**: Use Server Actions or Route Handlers as bridges.
