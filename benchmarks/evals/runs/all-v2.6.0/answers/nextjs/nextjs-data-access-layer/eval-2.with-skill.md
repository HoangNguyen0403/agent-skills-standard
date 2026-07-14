# Return DTOs

Do not return raw Prisma model objects. They can contain sensitive fields, ORM behavior, non-serializable values, and an unstable persistence shape. Select only required fields and map them to a plain DTO:

```ts
return user && { id: user.id, name: user.name, email: user.email }
```

Keep the transformation and authorization inside the DAL, mark the module `server-only`, and taint sensitive references or values where the experimental taint API is enabled. Never pass password hashes or other private fields to a Client Component.

