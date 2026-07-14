Define the action in a server-only module and attach it to a form. The action receives `FormData` on the server:

```ts
// app/actions.ts
'use server';

export async function createMessage(formData: FormData) {
  const message = String(formData.get('message') ?? '').trim();
  if (!message) return { ok: false, error: 'Message is required' };
  const session = await requireSession();
  await db.message.create({ data: { body: message, userId: session.userId } });
  revalidatePath('/messages');
  return { ok: true };
}
```

```tsx
import { createMessage } from './actions';

export function MessageForm() {
  return <form action={createMessage}><textarea name="message" /><button>Send</button></form>;
}
```

Authenticate, authorize, validate, and normalize every field inside the action; the browser can call the action directly. Return structured expected errors for the form, keep unexpected failures logged server-side, and add CSRF defenses when session cookies are ambient.

