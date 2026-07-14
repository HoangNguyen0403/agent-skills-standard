Move the JWT out of `localStorage`; any XSS can read it. Store it in an `HttpOnly; Secure` cookie set by the backend:

```http
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/
```

Call the API with cookies enabled:

```ts
fetch("/api/profile", {
  credentials: "include",
});
```

For state-changing `PUT`/`POST`/`DELETE` requests, add CSRF-token protection. Use `SameSite=Strict` where applicable; cross-site deployments require `SameSite=None; Secure` plus robust CSRF protection.

Also:

- Never use `dangerouslySetInnerHTML` for unsanitized content; use `DOMPurify.sanitize(input)`.
- Avoid `javascript:` URLs and use a restrictive Content Security Policy (CSP).
- Enforce authentication, authorization, and input validation on the backend; never rely on client permission logic.
- Send `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy`.
- Run `npm audit` or `pnpm audit`, and pin specific dependency versions.
- Invalidate existing localStorage tokens and rotate/revoke them during migration.
