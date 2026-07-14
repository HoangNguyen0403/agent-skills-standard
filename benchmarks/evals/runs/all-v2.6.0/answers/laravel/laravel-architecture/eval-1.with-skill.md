Keep controllers thin and make them coordinate HTTP concerns only:

1. Put input rules in a Form Request with `authorize()` and `rules()`.
2. Inject a single-responsibility Action through the constructor or method signature.
3. Pass `$request->validated()` to the Action.
4. Return a resource or view from the Action result and map HTTP status codes at the controller boundary.

```php
public function store(StoreUserRequest $request, CreateUser $create): UserResource
{
    return new UserResource($create->handle($request->validated()));
}
```

Keep Eloquent queries and business decisions out of the controller. Bind interfaces to swappable implementations in `AppServiceProvider`, and use dependency injection rather than `new` inside actions or controllers. This structure keeps validation, use-case logic, and HTTP serialization independently testable.

