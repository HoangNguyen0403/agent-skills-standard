Use Policies for model-bound access and Gates for global abilities. A typical setup is:

```php
Gate::before(fn (User $user) => $user->isAdmin() ? true : null);
```

Then define methods such as `update(User $user, Post $post): bool` in `PostPolicy` and call `$this->authorize('update', $post)`. For organization or role checks, keep the rule inside the Policy or a dedicated permission package rather than writing `$user->role === 'admin'` throughout controllers. Validate input with Form Requests and pass `$request->validated()` to models. Test allowed, denied, unauthenticated, and cross-tenant cases explicitly.

