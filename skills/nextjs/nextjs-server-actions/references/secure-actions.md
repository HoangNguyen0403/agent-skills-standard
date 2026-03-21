# Secure Server Actions

## Validation & Type Safety

Always validate `FormData` on the server using a schema library like `zod`.

```tsx
// actions.ts
'use server';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  content: z.string().min(10),
});

export async function submitFeedback(prevState: any, formData: FormData) {
  const validated = schema.safeParse({
    email: formData.get('email'),
    content: formData.get('content'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  // Proceed with authorized DB mutation
  await db.feedback.create({ data: validated.data });

  revalidatePath('/feedback');
  return { success: true };
}
```

## State Management with `useActionState`

Use the `useActionState` hook (React 19) to handle server state, errors, and pending status in the client.

```tsx
// FeedbackForm.tsx
'use client';
import { useActionState } from 'react';

export function FeedbackForm() {
  const [state, action, isPending] = useActionState(submitFeedback, null);

  return (
    <form action={action}>
      <input name='email' type='email' />
      {state?.errors?.email && <span>{state.errors.email}</span>}
      <button disabled={isPending}>Submit</button>
    </form>
  );
}
```
