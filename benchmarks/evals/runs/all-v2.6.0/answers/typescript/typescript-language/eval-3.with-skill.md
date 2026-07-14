Use a branded type so a validated ID is not interchangeable with an arbitrary string:

```ts
export type UserId = string & { readonly __brand: "UserId" };

export function parseUserId(value: string): UserId {
  if (!/^usr_[a-zA-Z0-9]+$/.test(value)) {
    throw new Error("Invalid user ID");
  }
  return value as UserId;
}

export function loadUser(id: UserId): Promise<User> {
  return repository.findById(id);
}
```

Only the parser (or a schema validator at the input boundary) should create the brand. The `loadUser` signature now rejects a plain `string`; avoid a non-null assertion and keep the runtime validation separate from the compile-time brand.
