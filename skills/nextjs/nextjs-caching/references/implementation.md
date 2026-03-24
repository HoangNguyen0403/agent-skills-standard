# nextjs-caching Implementation Examples

## Inline Examples

```typescript
// app/posts/actions.ts
'use server';
import { revalidateTag } from 'next/cache';

export async function createPost(data: FormData) {
  await db.post.create({ data: { title: data.get('title') as string } });
  revalidateTag('posts'); // purge all fetches tagged 'posts'
}

// app/posts/page.tsx
async function getPosts() {
  return fetch('/api/posts', { next: { tags: ['posts'], revalidate: 60 } });
}
```
