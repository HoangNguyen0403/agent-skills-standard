---
name: Next.js Server Actions
description: Mutations, Form handling, and RPC-style calls.
metadata:
  labels: [nextjs, actions, mutations]
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

## **P1: Operational Standard**

### **1. Secure & Validate**

Always validate inputs and authorization within the action.

```tsx
'use server';
export async function updateProfile(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const validatedFields = ProfileSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!validatedFields.success)
    return { errors: validatedFields.error.flatten().fieldErrors };

  // mutation...
  revalidatePath('/profile');
  return { success: true };
}
```

### **2. Pending States**

Use `useActionState` (React 19/Next.js 15+) for state handling and `useFormStatus` for button loading states.

## **Constraints**

- **Closures**: Avoid defining actions inside components to prevent hidden closure encryption overhead and serialization bugs.
- **Redirection**: Use `redirect()` for success navigation; it throws an error that Next.js catches to handle the redirect.
