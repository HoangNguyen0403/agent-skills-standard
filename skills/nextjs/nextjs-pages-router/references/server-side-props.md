# SSR Data Fetching

```tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  const data = await getPostData(context.params?.id);
  return { props: { data } };
};
```
