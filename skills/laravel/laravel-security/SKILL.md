---
name: laravel-security
description: "Security standards for hardening Laravel applications. Use when securing authentication, authorization, input validation, or CSRF in Laravel. (triggers: app/Policies/**/*.php, config/*.php, policy, gate, authorize, env, config)"
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

- **No `env()` outside config files**: Access via `config()` helper.
- **No custom auth logic**: Use Laravel's built-in auth system.
- **No unvalidated mass assignment**: Always call `validated()`.
- **No auth logic in Blade**: Pass permissions as data from controller.

## References

- [Policy & Env Best Practices](references/implementation.md)
