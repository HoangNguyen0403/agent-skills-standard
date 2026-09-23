You’re right—auth tokens should be stored in `HttpOnly`, `Secure` cookies, not `localStorage`.

The server should issue them via `Set-Cookie`; configure an appropriate `SameSite` policy and add CSRF protection where needed. `HttpOnly` prevents client-side JavaScript from reading the token.
