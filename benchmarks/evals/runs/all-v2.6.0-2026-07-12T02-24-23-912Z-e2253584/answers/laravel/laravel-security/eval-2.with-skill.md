Define a Gate for a global capability and check it at the use site:

```php
Gate::define('admin', fn (User $user): bool => $user->isAdmin());

if (Gate::allows('admin')) {
    // perform the global admin operation
}
```

Blade can use `@can('admin')`. Prefer Policies when the decision is about a specific model, such as whether a user may update a particular post. For a platform-wide administrator bypass, define `Gate::before(fn (User $user) => $user->isAdmin() ? true : null)` in the authorization provider. Keep authorization logic centralized and do not compare `$user->role` inline across controllers.

