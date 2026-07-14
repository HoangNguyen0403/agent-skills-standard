String concatenation with user input is SQL injection-prone. Validate the input at the request boundary and pass values separately through a parameterized query or a type-safe ORM:

```ts
const query = z.object({ email: z.string().email() });
const parsed = query.safeParse(req.query);
if (!parsed.success) {
  res.status(400).json({ error: "invalid_request" });
  return;
}

const result = await pool.query<UserRow>(
  "SELECT id, email FROM users WHERE email = $1",
  [parsed.data.email],
);
```

Do not interpolate `parsed.data.email` into the SQL string. Use Prisma/TypeORM query APIs where appropriate; if raw SQL is unavoidable, use the driver's parameter binding (or `Prisma.sql`), least-privileged database credentials, and no shell or dynamic execution.
