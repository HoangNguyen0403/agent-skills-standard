Define a gate for an ability that is not naturally tied to one model, usually in `AuthServiceProvider` or a service provider:

```php
Gate::define('manage-reports', function (User $user): bool {
    return $user->is_admin;
});
```

Check it with `Gate::authorize('manage-reports')`, `Gate::allows(...)`, Blade's `@can`, or `can:manage-reports` middleware. Use policies for model/resource actions and gates for cross-cutting abilities. Decide how unauthenticated users are handled, avoid trusting client-supplied roles, and test both positive and negative paths. A gate is authorization, not input validation or authentication.

