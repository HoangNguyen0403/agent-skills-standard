Treat the form value as untrusted input and enforce authentication and authorization inside the action:

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const idSchema = z.string().uuid();

export async function deletePost(formData: FormData) {
  const session = await requireSession();
  const postId = idSchema.parse(formData.get('postId'));
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post || post.authorId !== session.userId) throw new Error('Forbidden');
  await db.post.delete({ where: { id: postId } });
  revalidatePath('/posts');
}
```

Prefer an atomic delete constrained by both ID and owner/tenant when the ORM supports it, and return a safe expected-error state rather than exposing internals. Add CSRF defenses for cookie-authenticated actions, rate-limit sensitive operations, and never rely on a hidden field or UI visibility for authorization. Consider audit logging and idempotent behavior for retries.

