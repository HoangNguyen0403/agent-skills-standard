---
name: nextjs-server-actions
description: Implement mutations, forms, and RPC-style calls with Next.js Server Actions. Use when implementing Server Actions, form mutations, or RPC-style data mutations in Next.js.
metadata:
  triggers:
    files:
    - 'app/**/actions.ts'
    - 'src/app/**/actions.ts'
    - 'app/**/*.tsx'
    - 'src/app/**/*.tsx'
    keywords:
    - use server
    - Server Action
    - revalidatePath
    - useFormStatus
---
# Server Actions

## **Priority: P1 (HIGH)**

> [!WARNING]
> If project uses `pages/` directory instead of App Router, **ignore** this skill entirely.

Handle form submissions and mutations without creating API endpoints.

## Implementation Guidelines

- **Directive**: Always start file or function with `'use server'`. Access `formData.get('title')` for typed form fields. Export async functions for mutations.
- **Form Handling**: Use `action` prop of `<form>` to trigger actions via `action={createPost}`. Use `useFormStatus()` for `pending` states — `disabled={pending}` on buttons. Use `useActionState` (React 19/Next.js 15) for `action={action}` form state with `<form action={action}>`.
- **Data Refresh**: Trigger UI updates using **`revalidatePath('/')`** or **`revalidateTag('tag-name')`** after successful mutation.
- **Interactivity**: For non-form triggers, invoke actions using **`useTransition`** hook to handle loading UI and prevent page from blocking.
- **Optimistic Updates**: Use **`useOptimistic`** to show expected UI state immediately before server confirms mutation.
- **Security**: **Sanitize all inputs** from `FormData`. Perform **auth checks** inside every action (`await auth()`). Limit file uploads by size and MIME type.

- **Form**: `<form action={createPost}>` (Progressive enhancements work without JS).
- **Event Handler**: `onClick={() => createPost(data)}`.
- **Pending State**: Use `useFormStatus` hook (must inside component rendered within form).

## **P1: Operational Standard**

### **1. Secure & Validate**

Always validate inputs with `z.object({` schema and `safeParse` before processing. Check authorization within action. See [Secure Action Example](references/secure-actions.md).

### **2. Pending States**

Use `useActionState` (React 19/Next.js 15+) for state handling and `useFormStatus` for button loading states.

## **Constraints**

- **Closures**: Avoid defining actions inside components to prevent hidden closure encryption overhead and serialization bugs.
- **Redirection**: Use `redirect()` for success navigation; it throws error that Next.js catches to handle redirect.

## Anti-Patterns

- **No unvalidated Server Action inputs**: Always validate with Zod before processing.
- **No skipped auth checks**: Verify session/user inside every action, not middleware.
- **No actions defined inside components**: Define in `actions.ts` to avoid closure bugs.
- **No `redirect()` in try/catch**: `redirect()` throws; catching it suppresses redirect.