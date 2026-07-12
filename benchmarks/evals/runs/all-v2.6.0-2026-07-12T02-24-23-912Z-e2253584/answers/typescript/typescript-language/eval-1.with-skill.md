Prefer a literal union or a const object for application roles instead of a runtime `enum`. This keeps the allowed values available to TypeScript without emitting enum JavaScript:

```ts
export const USER_ROLES = ["admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  readonly role: UserRole;
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}
```

If roles arrive from a request or database, validate the string at that boundary before treating it as `UserRole`; `as const` does not perform runtime validation. A runtime enum can be justified for a legacy API that requires its emitted object, but a literal union is the default for type safety and smaller output.
