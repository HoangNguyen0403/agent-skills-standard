---
name: laravel-api
description: "REST and JSON API standards for modern Laravel backends. Use when designing REST endpoints, API resources, or JSON API responses in Laravel. (triggers: routes/api.php, app/Http/Resources/**/*.php, resource, collection, sanctum, passport, cors)"
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

- **API Resources**: Always use Resources/Collections for JSON formatting.
- **RESTful Actions**: Follow standard naming (`index`, `store`, `update`).
- **Auth**: Use **Sanctum** for SPAs/Mobile or **Passport** for OAuth2.
- **Status Codes**: Return appropriate HTTP codes (201 Created, 422 Unprocessable).
- **Versioning**: Prefix routes with version tags (e.g., `api/v1/...`).
- **Rate Limiting**: Configure `RateLimiter` to protect public endpoints.

## Anti-Patterns

- **No raw model returns**: Use API Resources; prevents data leakage.
- **No `response()->json()`**: Use API Resource classes instead.
- **No session auth for APIs**: Use Sanctum or Passport tokens.
- **No static URLs in JSON**: Use route names or HATEOAS links.

## References

- [API Resource Patterns](references/implementation.md)
