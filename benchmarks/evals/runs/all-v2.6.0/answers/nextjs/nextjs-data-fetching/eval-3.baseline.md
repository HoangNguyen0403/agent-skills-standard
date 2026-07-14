Use time-based or on-demand revalidation depending on how updates happen. Time-based revalidation can be attached to the request:

```ts
const posts = await fetch('https://example.test/posts', {
  next: { revalidate: 600, tags: ['posts'] },
}).then((r) => r.json());
```

When a CMS publish or Server Action changes the data, invalidate the affected tag or path after the write succeeds:

```ts
import { revalidateTag } from 'next/cache';

await publishPost(id);
revalidateTag('posts');
```

Use `revalidatePath('/blog')` when the rendered route itself should be invalidated. Use `cache: 'no-store'` instead when the result must be fresh on every request. Make cache keys and tags tenant/user-safe, and remember that browser/client router or SWR caches may need their own refresh. In Next.js 15, prefer explicit cache configuration rather than assuming historical defaults.

