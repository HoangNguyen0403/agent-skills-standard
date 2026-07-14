After authorization and a successful mutation, invalidate the affected data and call `redirect()`:

```ts
await updatePost(input)
revalidatePath(`/posts/${id}`)
redirect(`/posts/${id}`)
```

`redirect()` throws a framework control-flow exception, so do not put it inside a `try/catch` that catches and suppresses it. Validate the input and perform auth inside the action before the mutation.

