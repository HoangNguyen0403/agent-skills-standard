For a mutation initiated by your Next.js UI, a Server Action can replace a bespoke API endpoint. Put the mutation in a `'use server'` module, call it from a form or a Client Component, validate the `FormData`, check the session and resource authorization, perform the write, and revalidate the affected path/tag.

```tsx
<form action={updateProfile}>
  <input name="displayName" />
  <button type="submit">Save</button>
</form>
```

Use a Route Handler when the endpoint is a public/integration API, needs a non-form HTTP contract, must be consumed by another client, or has explicit HTTP semantics. Server Actions are still network-callable server entry points: do not trust hidden fields, expose secrets, skip CSRF protections for cookie sessions, or assume UI visibility is authorization. Return a serializable result, show pending/error state, and revalidate only after a successful transaction. Keep domain logic in a server service/DAL so it is testable independently of the action wrapper.

