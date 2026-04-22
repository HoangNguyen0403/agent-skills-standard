---
name: laravel-sessions-middleware
description: Configure Redis session drivers, register security-header middleware, and prevent session fixation in Laravel. Use when switching session drivers, adding HSTS/CSP headers via middleware, or regenerating sessions after login.
metadata:
  triggers:
    files:
    - 'app/Http/Middleware/**/*.php'
    - 'config/session.php'
    keywords:
    - session
    - driver
    - handle
    - headers
    - csrf
---
# Laravel Sessions & Middleware

## **Priority: P1 (HIGH)**

## Workflow: Secure Sessions & Add Middleware

1. **Set Redis driver** — `SESSION_DRIVER=redis` in `.env`; install `predis/predis`.
2. **Regenerate on login** — Call `$request->session()->regenerate()` after authentication.
3. **Create security middleware** — Add HSTS, CSP, X-Frame-Options headers.
4. **Register globally** — Use `withMiddleware(fn($m) => $m->append(...))` in `bootstrap/app.php`.

## Security Headers Middleware Example

See [implementation examples](references/implementation.md#security-headers-middleware) for security headers middleware and directory structure.

## Implementation Guidelines

### Session Architecture

- **Drivers**: Set **`SESSION_DRIVER=redis`** in `.env` for production/scaled environments.
- **Dependencies**: Install **`predis/predis`** and **avoid file driver** due to I/O lock issues at scale.
- **Security**: Call **`$request->session()->regenerate()`** after successful authentication to prevent **session fixation**. Call **`$request->session()->invalidate()`** on logout.
- **Access**: **Never access `env('SESSION_DRIVER')`** directly in code; always use **`config('session.driver')`**. Clear caches via **`php artisan config:clear`**.

### Middleware Pipeline

- **Custom Middleware**: Use **`php artisan make:middleware EnsureTokenIsValid`**. Implement **`handle(Request $request, Closure $next): Response`**.
- **Registration**: Register new middleware in **`bootstrap/app.php`** using **`withMiddleware()`**.
- **Security Headers**: Standardize **HSTS, CSP, X-Frame-Options, and X-Content-Type-Options** in dedicated security middleware. Register as **global** middleware.
- **Priority**: Use **`withMiddleware(fn($m) => $m->append(MyMiddleware::class))`** or **`prepend()`** for highest priority.
- **Performance**: **Avoid heavy computation** in global middleware; delegate these to domain services.

## Anti-Patterns

- **No file session driver in production**: Use Redis or Memcached instead.
- **No `env()` for session config**: Use `config('session.*')` instead.
- **No heavy logic in Middleware**: Delegate complex logic to Services.
- **No sensitive data in cookies**: Store securely in server sessions only.

## References

- [Advanced Middleware Patterns](references/implementation.md)