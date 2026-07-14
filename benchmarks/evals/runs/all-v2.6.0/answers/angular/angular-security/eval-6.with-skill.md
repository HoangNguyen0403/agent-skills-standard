# Secure auth-token storage in Angular

Do not store bearer tokens, refresh tokens, or session secrets in `localStorage` or `sessionStorage`: JavaScript can read them after an XSS, and they persist beyond the page in ways that increase exposure. Prefer a server-managed session or token in a cookie with `HttpOnly`, `Secure`, and an appropriate `SameSite` setting. The browser then sends the auth cookie without Angular reading the secret.

For same-origin requests, normal `HttpClient` requests send the cookie. For a separate API origin, enable credentials explicitly and configure the server's CORS policy to allow only the exact application origin:

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
```

Register that interceptor only for the intended client configuration. Protect cookie-authenticated state-changing requests against CSRF using the server's CSRF mechanism and Angular's XSRF support where applicable; `HttpOnly` prevents token theft by JavaScript but does not itself prevent CSRF. Use short-lived sessions, rotation/revocation, server-side authorization, and logout invalidation, and never log the token. Do not put API keys or other secrets in Angular source or its compiled bundle. If an access token must exist in the browser, keep it in memory with an explicit expiry and understand that this is a fallback with different tradeoffs, not a reason to use web storage.

