---
name: laravel-sessions-middleware
description: "Expert standards for session drivers, security headers, and middleware logic. Use when configuring session drivers, security headers, or custom middleware in Laravel. (triggers: app/Http/Middleware/**/*.php, config/session.php, session, driver, handle, headers, csrf)"
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

- **No file session driver in production**: Use Redis or Memcached instead.
- **No `env()` for session config**: Use `config('session.*')` instead.
- **No heavy logic in Middleware**: Delegate complex logic to Services.
- **No sensitive data in cookies**: Store securely in server sessions only.

## References

- [Advanced Middleware Patterns](references/implementation.md)
