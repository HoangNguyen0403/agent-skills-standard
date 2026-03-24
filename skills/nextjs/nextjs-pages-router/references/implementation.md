# nextjs-pages-router Implementation Examples

## Inline Examples

```typescript
// pages/posts/[id].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const post = await postService.findById(params!.id as string);
  if (!post) return { notFound: true };
  return { props: { post } };
};

export default function PostPage({ post }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <article>{post.title}</article>;
}
```
