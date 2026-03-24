# nextjs-data-access-layer Implementation Examples

## Inline Examples

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
