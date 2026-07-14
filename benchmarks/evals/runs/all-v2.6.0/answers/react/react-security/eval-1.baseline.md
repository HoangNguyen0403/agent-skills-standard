Storing a JWT in `localStorage` exposes it to theft if your React app suffers an XSS vulnerability.

Prefer:

- Store the refresh token in an `HttpOnly`, `Secure`, `SameSite` cookie.
- Keep short-lived access tokens in memory only.
- Use refresh-token rotation and revoke compromised tokens.
- Add CSRF protection for cookie-authenticated requests.
- Enforce a strong Content Security Policy and avoid unsafe HTML/script injection.

If `localStorage` is unavoidable, minimize token lifetime, never store refresh tokens there, and rigorously prevent XSS.
