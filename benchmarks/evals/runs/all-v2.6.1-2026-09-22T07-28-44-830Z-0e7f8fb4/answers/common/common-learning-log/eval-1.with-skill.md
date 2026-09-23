You’re right—the earlier recommendation was wrong. Store auth tokens in server-set `HttpOnly; Secure; SameSite=Lax` cookies, so client-side JavaScript cannot access them. Send requests with credentials enabled and add CSRF protection where needed.

Assumption: this is a browser-based app with a server-side auth endpoint.

This user correction is a `Pre-write` trigger: append one `Iteration` entry to `AGENTS_LEARNING.md` using the `AGENTSLEARNING,append` remediation.
