---
name: nextjs-server-actions
description: Implement secure Next.js Server Actions for mutations, forms, and optimistic UI. Use when building actions, form flows, auth checks, or revalidation after writes.
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

Build action files as secure server entrypoints, not as thin wrappers around unsafe form data.

## Recipe

1. **Define action in `actions.ts`** with `'use server'`.
2. **Parse input** with a schema before touching storage or services, for example `z.object({ ... }).safeParse(...)` or `formData.get('title')` -> validated shape.
3. **Authorize inside the action**; middleware alone is not enough.
4. **Delegate to DAL/service layer**; keep storage details out of route UI files.
5. **Revalidate exact tags/paths** owned by the mutation.
6. **Expose pending and optimistic state** with `useFormStatus`, `useActionState`, `useTransition`, or `useOptimistic` as needed. Typical form wiring is `<form action={createPost}>` or `<form action={action}>`, with `useFormStatus()` and `disabled={pending}` inside the submit child.

## Verify

- [ ] Action validates `FormData` or arguments before processing.
- [ ] Action performs authn/authz inside the server function.
- [ ] Mutations call DAL/service code, not raw storage from components.
- [ ] Success path revalidates tags or paths.
- [ ] Redirects or thrown errors are handled in the expected control flow.

## Anti-Patterns

- **No unvalidated Server Action inputs**: Always validate with Zod before processing.
- **No skipped auth checks**: Verify session/user inside every action, not middleware.
- **No actions defined inside components**: Define in `actions.ts` to avoid closure bugs.
- **No `redirect()` in try/catch**: `redirect()` throws; catching it suppresses redirect.

## References

- [Framework Map](../references/framework-map.md)
- [Secure Action Example](references/secure-actions.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- action={action}
- action={createPost}
