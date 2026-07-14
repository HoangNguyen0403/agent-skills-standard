Yes, a small data access layer is worthwhile once database calls are spread across many Server Components. Keep it server-only and make it the boundary for authentication context, authorization, input validation, query selection, transactions, error mapping, and DTO shaping:

```ts
// src/server/users.ts
import 'server-only';

export async function getUserSummary(userId: string) {
  // authorize the caller, query only required columns, and map the result
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatarUrl: true },
  });
}
```

Components should depend on this stable use-case/query API, not on Prisma models or a global DB client. Keep the layer proportional: do not create needless repositories for every one-line query. Use `server-only` and module boundaries to prevent client imports, and test authorization and query behavior at the boundary. For mutations, combine the DAL with Server Actions or Route Handlers and revalidate affected data after commit.

