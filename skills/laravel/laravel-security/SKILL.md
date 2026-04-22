---
name: laravel-security
description: Harden Laravel apps with Policies for model authorization, Gate-based RBAC, validated mass assignment, and CSRF protection. Use when creating authorization policies, securing env config access, or preventing mass assignment vulnerabilities.
metadata:
  triggers:
    files:
    - 'app/Policies/**/*.php'
    - 'config/*.php'
    keywords:
    - policy
    - gate
    - authorize
    - env
    - config
---
# Laravel Security

## **Priority: P0 (CRITICAL)**

## Workflow: Secure Resource

1. **Generate policy** — `php artisan make:policy PostPolicy --model=Post`.
2. **Implement policy methods** — Return `bool` for `view`, `update`, `delete` actions.
3. **Authorize in controller** — Call `$this->authorize('update', $post)`.
4. **Add Gate bypass** — Define `Gate::before()` for admin users in `AuthServiceProvider`.
5. **Validate inputs** — Use Form Request with `$request->validated()` for `Model::create()`.

## Policy Example

See [implementation examples](references/implementation.md#policy-example) for Policy class with controller authorization.

## Implementation Guidelines

### Authorization & RBAC

- **Policies**: Always use **`php artisan make:policy PostPolicy --model=Post`** for model-level authorization.
- **Checkers**: Implement **`update(User $user, Post $post): bool`** and call **`$this->authorize('update', $post)`** in controllers.
- **Gates**: Use `Gate::define('admin', fn(User $user) => ...)` for global permissions. Check with `Gate::allows('admin')` or Blade `@can('admin')`. prefer Policies for model-bound checks; use Gates for global permissions.
- **Admin Bypass**: Define **`Gate::before(fn($u) => $u->isAdmin() ? true : null)`** in **`AuthServiceProvider`**.

### Configuration & Environment

- **Environment**: Only call env() inside config/\*.php files. Access via `config('app.key')` in your application code. never env() in controllers; use config() instead.
- **Caching**: Run **`php artisan config:cache`** to validate that `env()` isn't used where it shouldn't .

### Data & Input Security

- **Mass Assignment**: Use Form Request with rules() and call $request->validated() for Model::create(). Define $fillable on model; never pass $request->all() to create().
- **CSRF**: Ensure @csrf directive in all Blade `<form>` tags. active on web routes by default; use `->except(['/webhook'])` only for trusted third-party callbacks.
- **Role-Based Access**: Use Policies with role checks in policy methods; define `Gate::before` for admin bypass; or use `spatie/laravel-permission`; never inline $user->role === 'admin'.

## Anti-Patterns

- **No `env()` outside config files**: Access via `config()` helper.
- **No custom auth logic**: Use Laravel's built-in auth system.
- **No unvalidated mass assignment**: Always call `validated()`.
- **No auth logic in Blade**: Pass permissions as data from controller.

## References

- [Policy & Env Best Practices](references/implementation.md)