# CSRF protection

Yes. Treat every Server Action as a public server entry point: verify the session and authorize the operation inside the action, validate the input, and check the `Origin` (or trusted `Referer`) against the application origin before changing state. Keep the session in an `HttpOnly`, `Secure` cookie with `SameSite: 'Lax'` or `'Strict'`; SameSite is defense in depth, not a replacement for server-side checks.

