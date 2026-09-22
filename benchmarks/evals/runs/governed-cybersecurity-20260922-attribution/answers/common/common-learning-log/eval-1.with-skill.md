You’re right—auth tokens should not be stored in `localStorage`. Use `HttpOnly; Secure; SameSite=Lax` cookies set by the server, and send requests with credentials enabled. Add CSRF protection for state-changing requests.

This User correction is a learning-log trigger: append one proposed `Iteration` entry to `AGENTS_LEARNING.md` describing the `localStorage` mistake and the cookie-based approach. It is not a `Pre-write` auto-fix.
