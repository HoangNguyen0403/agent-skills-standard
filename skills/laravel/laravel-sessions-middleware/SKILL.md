---
name: laravel-sessions-middleware
description: 'Expert standards for session drivers, security headers, and middleware logic. Use when configuring session drivers, security headers, or custom middleware in Laravel. (triggers: app/Http/Middleware/**/*.php, config/session.php, session, driver, handle, headers, csrf)'
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
