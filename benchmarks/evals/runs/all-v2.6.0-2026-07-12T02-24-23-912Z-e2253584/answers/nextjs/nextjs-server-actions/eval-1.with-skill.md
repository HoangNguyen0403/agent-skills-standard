Define the mutation in an `actions.ts` module with `'use server'`, validate its input, authenticate/authorize inside the action, delegate storage to a DAL, and revalidate the affected tag or path:

```ts
'use server'
export async function createPost(formData: FormData) {
  const title = String(formData.get('title') ?? '')
  if (!title.trim()) return { error: 'Title is required' }
  await requireUser()
  await posts.create({ title })
  revalidatePath('/posts')
}
```

Wire it with `<form action={createPost}>` and expose pending/error state as needed.

