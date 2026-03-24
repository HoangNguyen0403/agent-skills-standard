# Laravel Architecture Reference

## Slim Controllers & Service Classes

```php
// app/Http/Controllers/UserController.php
public function store(UserRequest $request, UserService $service)
{
    $service->registerUser($request->validated());
    return redirect()->route('dashboard')->with('status', __('User created'));
}

// app/Services/UserService.php
public function registerUser(array $data): User
{
    return DB::transaction(fn() => User::create($data));
}
```

## Form Requests (Validation)

```php
// app/Http/Requests/UserRequest.php
public function rules(): array
{
    return [
        'email' => 'required|email|unique:users',
        'password' => 'required|min:8|confirmed',
    ];
}
```

## Project Structure

```text
app/
├── Http/
│   ├── Controllers/    # Slim (Request/Response only)
│   └── Requests/       # Validation logic
├── Services/           # Business logic (Optional)
└── Actions/            # Single-purpose classes (Preferred)
```

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
