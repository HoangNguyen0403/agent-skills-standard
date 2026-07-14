`useState` is a Client Component hook. Keep the component server-side if it only renders fetched data; move the interactive state into a small child with `'use client'` and pass it serializable initial data. For form or mutation feedback, use a Client Component with `useActionState`, `useFormStatus`, or `useOptimistic` while keeping the Server Action secure.

