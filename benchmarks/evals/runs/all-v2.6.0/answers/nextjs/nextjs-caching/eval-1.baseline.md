Revalidate the cache after the mutation, then refresh or redirect to the affected UI. Use a path when the whole route should be invalidated:

```ts
'use server';

import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  // authenticate, authorize, validate, and update the profile
  await saveProfile(formData);
  revalidatePath('/profile');
}
```

If the profile query is tagged, prefer targeted invalidation such as `revalidateTag('profile:' + userId)` wherever supported by the cache API/version. In a client transition, `router.refresh()` can request a fresh Server Component payload, but it does not replace server-side cache invalidation. Confirm the page is not deliberately using stale data, and check other layers such as the database transaction, browser cache, and client query cache. Revalidate only after a successful commit; do not hide failed writes by refreshing the page.

