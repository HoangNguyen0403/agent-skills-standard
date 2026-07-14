Use a form request for validation, a controller for HTTP orchestration, and an API resource for the response:

```php
// routes/api.php
Route::post('/posts', [PostController::class, 'store']);

// app/Http/Requests/StorePostRequest.php
public function rules(): array
{
    return ['title' => ['required', 'string', 'max:255'], 'body' => ['required', 'string']];
}

// app/Http/Controllers/PostController.php
public function store(StorePostRequest $request): PostResource
{
    $post = $request->user()->posts()->create($request->validated());
    return new PostResource($post);
}
```

Add the migration/model relationship, authorize the request, and return `201 Created` (the resource can be wrapped in a JSON response if headers or metadata are needed). Feature-test validation, authorization, persistence, and the response contract.

