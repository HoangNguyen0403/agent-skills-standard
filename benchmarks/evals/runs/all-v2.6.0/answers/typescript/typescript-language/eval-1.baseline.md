An enum can work, but it is not always the best representation for user roles. A string-literal union is often simpler at API and serialization boundaries because it emits no runtime code and rejects unknown values at compile time:

```ts
const roles = ["admin", "editor", "viewer"] as const;
type UserRole = (typeof roles)[number];

function canDeleteUsers(role: UserRole): boolean {
  return role === "admin";
}
```

String enums are also reasonable when a named runtime object is useful. Avoid numeric enums for persisted or external values because their numeric representation is opaque and can have reverse-mapping behavior. Regardless of the choice, validate values received from HTTP, storage, or configuration at runtime; TypeScript types alone do not validate untrusted data.
