Read and validate each field explicitly; `FormData` values can be missing or can be `File` objects rather than strings:

```ts
'use server';
import { z } from 'zod';

const schema = z.object({
  email: z.string().trim().email(),
  quantity: z.coerce.number().int().min(1).max(20),
});

export async function addItem(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    quantity: formData.get('quantity'),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  await saveItem({ ...parsed.data, userId: session.userId });
  return { ok: true };
}
```

Reject unexpected values and sizes, normalize deliberately, and return a serializable expected-error shape. Do not use client-side validation as the security boundary. Authenticate and authorize after parsing and before the write, and include CSRF protection for cookie-authenticated actions.

