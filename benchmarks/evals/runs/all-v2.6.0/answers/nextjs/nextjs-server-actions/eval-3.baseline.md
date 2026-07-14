`useFormStatus` must be called by a Client Component rendered inside the `<form>` whose `action` is the Server Action:

```tsx
'use client';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

export function Form({ action }: { action: (data: FormData) => void }) {
  return <form action={action}><input name="name" /><SubmitButton /></form>;
}
```

The hook reports the status of the nearest parent form; calling it in the form component itself before the form is rendered will not observe that form. Keep the button as a small Client Component, preserve an accessible label, disable or otherwise guard duplicate submits as appropriate, and display server validation errors separately. `pending` is UI state only; the action still needs authentication, authorization, validation, idempotency where needed, and correct transaction handling.

