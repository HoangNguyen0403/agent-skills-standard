Use a Form Request for non-trivial request validation:

```bash
php artisan make:request StorePostRequest
```

```php
public function authorize(): bool
{
    return $this->user()?->can('create', Post::class) ?? false;
}

public function rules(): array
{
    return ['title' => ['required', 'string', 'max:255'], 'body' => ['required', 'string']];
}
```

Inject it into the controller and use `$request->validated()` rather than raw input. Use conditional rules, custom messages, and `after()` hooks only when needed. Validation is not authorization: enforce permissions with policies/gates as well. For small internal endpoints, inline `$request->validate()` is acceptable, but reusable or complex rules belong in a request class or rule object.

