After the mutation commits, invalidate the affected cache and call `redirect` from the Server Action:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const session = await requireSession();
  const post = await createAuthorizedPost(session.userId, formData);
  revalidatePath('/posts');
  redirect(`/posts/${post.id}`);
}
```

`redirect` throws an internal control-flow response, so call it after successful work and do not catch it as if it were a normal application error. Validate input and authorize before the write; if validation fails, return a form error state instead of redirecting. Revalidate tags/paths after the transaction commits, and make retries/idempotency safe for operations such as payment or order creation. If the form uses `useActionState`, handle the successful redirect as the action's navigation outcome and keep expected validation errors serializable.

