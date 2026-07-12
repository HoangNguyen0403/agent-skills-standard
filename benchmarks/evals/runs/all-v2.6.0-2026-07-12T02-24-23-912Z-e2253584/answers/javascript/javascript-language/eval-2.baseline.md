# Safely accessing nested properties

Use optional chaining (`?.`) when an intermediate value may be `null` or `undefined`:

```js
const city = user?.profile?.address?.city;
```

If a fallback is appropriate only for `null` or `undefined`, use nullish coalescing (`??`):

```js
const displayName = user?.profile?.name ?? 'Unknown user';
```

Use `??`, not `||`, when valid values such as `0`, `false`, or `''` must be preserved. Optional chaining returns `undefined` for a missing chain; it does not validate the shape or type of arbitrary data. For untrusted input, validate the object at the boundary and handle invalid data explicitly. Use bracket notation with optional chaining for dynamic keys, for example `payload?.items?.[index]`.
