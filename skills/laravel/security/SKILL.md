---
name: Laravel Security
description: Security standards for hardening Laravel applications.
metadata:
  labels: [laravel, security, audit, hardening]
  triggers:
    files: ['app/Policies/**/*.php', 'config/*.php']
    keywords: [policy, gate, authorize, env, config]
---

# Laravel Security

## **Priority: P0 (CRITICAL)**

## Structure

```text
app/
├── Policies/           # Model-level permission
└── Http/
    └── Middleware/      # Custom security layers
```

## Implementation Guidelines

- **Authorization**: Always use Policies or Gates (no `$user->role ===`).
- **Environment**: Never use `env()` outside of config files. Use `config()`.
- **Validation**: Strict validation via Form Requests to prevent injection.
- **Auth Guarding**: Use `auth()->user()` type-shadowing or interfaces.
- **XSS Safety**: Leverage Blade `{{ $var }}` automatic escaping.
- **CSRF**: Ensure `@csrf` is present in all state-changing forms.

## Anti-Patterns

- **Raw Env**: **No env() in code**: Access through config to allow caching.
- **Manual Auth**: **No custom auth logic**: Use Laravel's built-in system.
- **Unvalidated Mass**: **No unvalidated create**: Always use `validated()`.
- **Logic in Blade**: **No auth logic in View**: Pass permissions as data.

## References

- [Policy & Env Best Practices](references/implementation.md)
