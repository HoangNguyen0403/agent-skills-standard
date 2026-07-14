Use a branded (nominal-like) string type and expose a constructor that validates or otherwise establishes the brand:

```ts
type UserId = string & { readonly __brand: "UserId" };

function parseUserId(value: string): UserId {
  if (!/^user_[a-z0-9]+$/.test(value)) {
    throw new Error("Invalid user ID");
  }
  return value as UserId;
}

function loadUser(id: UserId): Promise<unknown> {
  return fetch(`/users/${encodeURIComponent(id)}`).then((response) => response.json());
}

const id = parseUserId("user_123");
loadUser(id);
```

An ordinary `string` cannot be passed to `loadUser` without going through `parseUserId` or another explicitly reviewed boundary function. The brand is erased at runtime, so keep the runtime validation wherever the value enters from an external source. A `unique symbol` brand can be used instead if the brand property should be less likely to collide.
