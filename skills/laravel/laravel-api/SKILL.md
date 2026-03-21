---
name: laravel-api
description: 'REST and JSON API standards for modern Laravel backends. Use when designing REST endpoints, API resources, or JSON API responses in Laravel. (triggers: routes/api.php, app/Http/Resources/**/*.php, resource, collection, sanctum, passport, cors)'
---

# Laravel API

## **Priority: P1 (HIGH)**

## Structure

```text
app/
└── Http/
    ├── Resources/      # Data transformation
    └── Controllers/
        └── Api/        # API specific logic
```

## Implementation Guidelines

### API Resources & Transformation

- **API Resources**: Always use **`ApiResource`** classes extending **`JsonResource`** for data transformation.
- **Collections**: Use **`UserResource::collection($users)`** for lists. Never use `response()->json($model)` or return raw models directly.
- **Data Definition**: Implement **`toArray($request)`** to define specific output fields and prevent sensitive data leakage.
- **Generation**: Use **`php artisan make:resource UserResource`** to scaffold new resources.

### Authentication & Security

- **Sanctum**: Use **`auth:sanctum`** middleware in `routes/api.php` for SPAs or mobile app authentication.
- **Traits**: Add the **`HasApiTokens`** trait to your `User` model to enable token-based authentication.
- **Token Management**: Issue tokens using **`$user->createToken('token-name')->plainTextToken`**.
- **OAuth2**: Use **Passport** only if standard OAuth2 flows or client grants are required.

### Routing & Performance

- **Versioning**: Group routes with **`Route::prefix('v1')->group(...)`** and use versioned namespaces (e.g., `App\Http\Controllers\Api\V1`).
- **Rate Limiting**: Define **`RateLimiter::for('api', ...)`** using **`Limit::perMinute(60)`** in **`AppServiceProvider`**.
- **Middleware**: Apply the **`throttle:api`** middleware to route groups in `routes/api.php`.
- **Status Codes**: Return 201 for Created, 422 for Validation errors, and 204 for No Content.

## Anti-Patterns

- **No raw model returns**: Use API Resources; prevents data leakage.
- **No `response()->json()`**: Use API Resource classes instead.
- **No session auth for APIs**: Use Sanctum or Passport tokens.
- **No static URLs in JSON**: Use route names or HATEOAS links.

## References

- [API Resource Patterns](references/implementation.md)
