# Next.js Security Reference

## Server Action Validation (Zod)

```ts
// app/actions.ts
const schema = z.object({
  email: z.string().email(),
});

export async function submit(formData: FormData) {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: 'Invalid' };
  // ... secure logic
}
```

## Data Boundary (DTO)

```tsx
// app/profile/page.tsx
const user = await db.getUser();

// GOOD: Pass only needed fields
return <Profile user={{ name: user.name }} />;

// BAD: Pass the whole object (leaking passwordHash)
return <Profile user={user} />;
```
