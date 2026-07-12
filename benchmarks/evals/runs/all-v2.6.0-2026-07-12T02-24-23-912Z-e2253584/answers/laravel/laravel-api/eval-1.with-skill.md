Build the endpoint as a versioned, resource-backed route:

1. Create a Form Request for validation, for example `StorePostRequest`, and use `$request->validated()`.
2. Create `PostResource` with `php artisan make:resource PostResource`; expose only deliberate fields in `toArray()`.
3. Implement a controller action that creates the model and returns `new PostResource($post)` with status `201`.
4. Register it under `routes/api.php`, such as `Route::prefix('v1')->middleware('throttle:api')->group(...)`. Add `auth:sanctum` when the endpoint is protected.

```php
Route::prefix('v1')->middleware(['throttle:api', 'auth:sanctum'])->group(function () {
    Route::post('/posts', [PostController::class, 'store']);
});

public function store(StorePostRequest $request): PostResource
{
    $post = Post::create($request->validated());
    return new PostResource($post);
}
```

Do not return the raw Eloquent model or `response()->json($model)`. Define explicit resource fields, verify validation returns `422`, and test the successful response as `201` with the expected JSON structure.

