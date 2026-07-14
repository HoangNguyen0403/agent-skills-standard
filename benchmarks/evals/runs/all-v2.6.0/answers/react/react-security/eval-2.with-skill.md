This is an IDOR/BOLA authorization vulnerability: the backend trusts the `userId` from the URL.

Assumption: the URL is something like `/users/:userId`.

Fix authorization server-side on every affected endpoint:

```ts
// GET /api/users/:userId
const requestedId = req.params.userId;
const authenticatedUser = req.user;

if (authenticatedUser.id !== requestedId && !authenticatedUser.roles.includes("admin")) {
  return res.status(404).json({ error: "Not found" }); // or 403
}

return res.json(await userService.getPrivateData(requestedId));
```

Prefer deriving the ID from the authenticated session when users may only access their own data:

```ts
const user = await userService.getPrivateData(req.user.id);
```

Do not rely on React route guards or hidden UI controls; **no client logic for permissions**. Backend authorization must validate ownership or an explicit role for every read and write operation, including nested resources and alternate API routes.

Also:

- Store sessions/JWTs in `HttpOnly` and `Secure` cookies, never `localStorage`.
- Use `SameSite=Strict` where applicable and CSRF tokens for state-changing requests.
- Validate and sanitize the URL ID and all other inputs on the backend.
- Add tests proving user A cannot access user B’s data, including guessed IDs, UUIDs, alternate methods, and missing/invalid IDs.
- Run `npm audit` or `pnpm audit`, and **pin specific dependency versions**.
