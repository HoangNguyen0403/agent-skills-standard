# nextjs-rendering Implementation Examples

## Inline Examples

```typescript
// app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetch(`/api/posts/${slug}`, { next: { revalidate: 3600 } });
  return <article>{post.title}</article>;
}
```
