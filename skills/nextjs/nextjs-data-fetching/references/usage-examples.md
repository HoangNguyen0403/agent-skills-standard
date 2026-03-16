# Next.js Data Fetching Usage Examples

## Server Side: Direct Database/Service Access

Avoid fetching your own API routes from Server Components. Access the database/service layer directly.

```tsx
// Service layer (e.g., in lib/db.ts)
export async function getPosts() {
  'use cache'; // Next.js 16 caching directive
  return db.posts.findMany();
}

// Server Component (e.g., in page.tsx)
export default async function Page() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

## Parallel Fetching

Use `Promise.all()` to prevent waterfalls when fetching multiple independent resources.

```tsx
const [user, posts] = await Promise.all([getUser(id), getPosts()]);
```

## Client-Side Fetching (SWR/React Query)

Use for user-specific data that doesn't require SEO.

```tsx
'use client';
import useSWR from 'swr';

function UserProfile() {
  const { data, error } = useSWR('/api/user', fetcher);
  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;
  return <div>Hello {data.name}!</div>;
}
```
