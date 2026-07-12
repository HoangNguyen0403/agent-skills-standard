Use `getStaticProps` to generate the page at build time, optionally with Incremental Static Regeneration:

```tsx
import type { GetStaticProps, InferGetStaticPropsType } from 'next';

export const getStaticProps: GetStaticProps = async () => {
  const posts = await loadPosts();
  return { props: { posts }, revalidate: 600 };
};

export default function Posts(
  { posts }: InferGetStaticPropsType<typeof getStaticProps>,
) {
  return <PostList posts={posts} />;
}
```

Without `revalidate`, the output stays static until the next build. With it, Next.js can regenerate after the interval according to ISR behavior. Return `notFound` or a redirect when appropriate, and ensure the props are serializable. For dynamic paths, pair `getStaticProps` with `getStaticPaths`; use `fallback: 'blocking'` or `true` according to the desired first-request loading behavior. Use `getServerSideProps` instead when the result is user-specific or must be fresh on every request.

