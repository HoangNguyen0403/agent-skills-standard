`Access-Control-Allow-Origin: *` is unsafe on authenticated routes and violates the OWASP checklist's A05/API8 guidance. It permits any origin to make cross-origin requests. It must not be combined with credentials, and changing it to `*` is not an acceptable way to support authenticated browser clients.

Replace it with an explicit origin allowlist and return the matching origin only when it is approved. Enable credentials only when the application needs cookie-based authentication, and include `Vary: Origin` so caches do not reuse one origin's response for another:

```js
const allowedOrigins = new Set([
  "https://app.example.com",
  "https://admin.example.com",
]);

app.use((req, res, next) => {
  const origin = req.get("Origin");

  if (origin && allowedOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
```

Do not allow arbitrary reflected origins, `null`, broad subdomain suffix matches, or development origins in production. If routes use bearer tokens and do not need browser cookies, omit `Access-Control-Allow-Credentials`; CORS is not authentication or authorization, so every authenticated endpoint still needs server-side authorization and CSRF protection where cookie authentication is used. Test approved, unapproved, preflight, credentialed, and production-origin cases.
