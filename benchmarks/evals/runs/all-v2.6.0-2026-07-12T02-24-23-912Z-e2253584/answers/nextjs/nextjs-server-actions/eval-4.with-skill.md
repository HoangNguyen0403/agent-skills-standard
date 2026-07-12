Parse `FormData` before touching storage or services, preferably with a Zod schema:

```ts
const parsed = schema.safeParse({ title: formData.get('title') })
if (!parsed.success) return { error: 'Invalid title' }
```

Then authenticate and authorize the caller, call the DAL with `parsed.data`, and revalidate the exact tag/path changed by the mutation. Do not trust raw strings, hidden fields, or client-side validation as authorization.

