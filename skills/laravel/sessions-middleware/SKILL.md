---
name: Laravel Sessions & Middleware
description: Expert standards for session drivers, security headers, and middleware logic.
metadata:
  labels: [laravel, session, middleware, security, high-density]
  triggers:
    files: ['app/Http/Middleware/**/*.php', 'config/session.php']
    keywords: [session, driver, handle, headers, csrf]
---

# Laravel Sessions & Middleware

## **Priority: P1 (HIGH)**

## Structure

```text
app/Http/
├── Middleware/         # Custom logic layers
└── Kernel.php          # Global/Group registration
```

## Implementation Guidelines

- **Session Driver**: Use `redis` or `memcached` for production/high-density environments.
- **Middleware Chain**: Keep logic granular; one middleware per responsibility.
- **Global Middleware**: Apply via `bootstrap/app.php` only for true globals (logging, headers).
- **Security Headers**: Standardize headers (HSTS, CSP, X-Frame) via dedicated middleware.
- **CSRF Protection**: Ensure `VerifyCsrfToken` is active for all web routes.
- **Session Lifecycle**: Use `$request->session()->regenerate()` after login/privilege changes.

## Anti-Patterns

- **File Streams**: **No file session driver**: Avoid in scaled apps due to I/O locks.
- **Env direct**: **No env('SESSION\_...')**: Always use `config('session...')`.
- **Heavy Bloat**: **No heavy logic in Middleware**: Offload to Services if >10 lines.
- **Trusting Client**: **No sensitive data in Cookies**: Store in server sessions only.

## References

- [Advanced Middleware Patterns](references/implementation.md)
