`useFormStatus` must run in a Client Component that is a descendant of the `<form>` using the action:

```tsx
'use client'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
}
```

Use `<form action={serverAction}>` and render `SubmitButton` inside it. Keep the action server-side and validate/authenticate it independently.

