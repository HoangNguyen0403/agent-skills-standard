---
name: Next.js Server Actions
description: Mutations, Form handling, and RPC-style calls.
metadata:
  labels: [nextjs, actions, actions, mutations]
  triggers:
    files: ['**/actions.ts', '**/*.tsx']
    keywords: [use server, Server Action, revalidatePath, useFormStatus]
---

# Server Actions

## **Priority: P1 (HIGH)**

Handle form submissions and mutations without creating API endpoints.

## Implementation

- **Directive**: Add `'use server'` at the top of an async function.
- **Usage**: Pass to `action` prop of `<form>` or invoke from event handlers.

```tsx
// actions.ts
'use server';
export async function createPost(formData: FormData) {
  const title = formData.get('title');
  await db.post.create({ title });
  revalidatePath('/posts'); // Refresh UI
}
```

## Client Invocation

- **Form**: `<form action={createPost}>` (Progressive enhancements work without JS).
- **Event Handler**: `onClick={() => createPost(data)}`.
- **Pending State**: Use `useFormStatus` hook (must be inside a component rendered within the form).

## Validation & Error Handling

- **Zod**: Always validate `FormData` or arguments on the server.
- **Return Values**: Return serializable objects `{ success: boolean, error?: string }` to handle feedback on Client.

## Security

- **Authentication**: Check `auth()` (e.g., NextAuth) session inside every Server Action.
- **Closure**: Be careful with closures in Server Actions defined inside Components (they capture context encrypted). Prefer defining actions in separate files (`actions.ts`).
