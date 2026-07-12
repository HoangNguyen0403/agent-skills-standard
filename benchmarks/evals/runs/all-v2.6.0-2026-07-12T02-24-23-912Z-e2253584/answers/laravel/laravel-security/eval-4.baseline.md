Validate the request and pass only the validated allowlisted data to the model:

```php
public function store(StoreUserRequest $request): RedirectResponse
{
    $user = User::create($request->validated());
    return to_route('users.show', $user);
}
```

The request's `rules()` and `authorize()` provide input validation and authorization; the model's `$fillable` remains defense in depth. Never pass `$request->all()` into `create()`/`update()`, and assign sensitive fields such as `is_admin`, owner IDs, or status explicitly after an authorization check. Test that an unvalidated/sensitive field cannot be changed even when supplied by the client.

