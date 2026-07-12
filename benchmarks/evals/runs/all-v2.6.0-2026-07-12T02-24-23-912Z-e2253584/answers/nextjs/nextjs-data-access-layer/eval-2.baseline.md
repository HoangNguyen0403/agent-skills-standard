Avoid returning raw Prisma models. They couple the UI to the schema, can expose fields such as password hashes or internal flags, may contain values that are awkward to serialize, and make schema changes leak through every component.

Select only the fields needed and map to an explicit DTO:

```ts
type UserSummary = { id: string; name: string; avatarUrl: string | null };

export async function getUserSummary(id: string): Promise<UserSummary | null> {
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true },
  });
  return user && { id: user.id, name: user.name, avatarUrl: user.avatarUrl };
}
```

Keep the mapper in the server/data layer, add `import 'server-only'`, and return plain serializable values when crossing an RSC boundary. Apply authorization before selecting data, not after sending it to a component. This also gives the API a deliberate contract for nullability, formatting, and future database migrations.

