---
name: laravel-architecture
description: "Enforce core architectural standards for scalable Laravel applications. Use when structuring controllers, service layers, action classes, Form Requests, or Service Container bindings in Laravel projects. (triggers: app/Http/Controllers/**/*.php, routes/*.php, controller, service, action, request, container)"
---

# Laravel Architecture

## Priority: P0 (CRITICAL)

## Structure

```text
app/
├── Http/
│   ├── Controllers/    # Slim (Request/Response only)
│   └── Requests/       # Validation logic
├── Services/           # Business logic (Optional)
└── Actions/            # Single-purpose classes (Preferred)
```

## Workflow

1. **Create Form Request** for validation (`php artisan make:request StoreUserRequest`).
2. **Create Action class** with a single `handle()` method for the use case.
3. **Inject Action** into controller via constructor DI.
4. **Bind interfaces** in `AppServiceProvider` for swappable implementations.

## Controller Pattern

```php
// app/Http/Controllers/PostController.php — slim controller
class PostController extends Controller
{
    public function __construct(private CreatePostAction $createPost) {}

    public function store(StorePostRequest $request): JsonResponse
    {
        $post = $this->createPost->handle($request->validated());
        return response()->json($post, 201);
    }
}
```

## Action Class

```php
// app/Actions/CreatePostAction.php — single-purpose business logic
class CreatePostAction
{
    public function __construct(private PostRepository $posts) {}

    public function handle(array $data): Post
    {
        return $this->posts->create($data);
    }
}
```

## Service Container Binding

```php
// app/Providers/AppServiceProvider.php
$this->app->bind(PostRepository::class, EloquentPostRepository::class);
```

## Validation

- Use Form Requests with `authorize()` and `rules()` methods.
- Call `$request->validated()` in the controller for mass assignment.
- Never use inline `$request->validate()`.

## Anti-Patterns

- **No logic in Controllers**: Move to Services or Action classes.
- **No manual instantiation**: Use Service Container via DI.
- **No inline `$request->validate()`**: Favor Form Request classes.
- **No excessive global helpers**: Use class-based logic instead.

## References

- [Slim Controller Patterns](references/implementation.md)
