With React 19, `useActionState` connects a Client Component form to an action and exposes the last returned state plus pending status. The action receives the previous state first, then `FormData`:

```tsx
'use client';
import { useActionState } from 'react';
import { saveProfile } from './actions';

const initialState = { ok: false, error: null as string | null };

export function ProfileForm() {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  return (
    <form action={formAction}>
      <input name="displayName" />
      <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

Define `saveProfile` as a Server Action (`'use server'`), validate/authorize there, and return only serializable state. In some React/Next combinations the hook is imported from `react` and in older examples from `react-dom`; follow the installed React 19 API. Use `useFormStatus` for a nested submit component when that is the better separation. Do not put secrets or trust client state into the returned result.

