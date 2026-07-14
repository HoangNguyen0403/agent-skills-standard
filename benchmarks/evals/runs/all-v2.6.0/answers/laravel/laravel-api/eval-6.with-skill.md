Return status codes that describe the result and keep response bodies resource-backed:

- Creation: return `new PostResource($post)` with `201 Created` (or `->response()->setStatusCode(201)`).
- Validation failure: let a Form Request produce Laravel's `422 Unprocessable Entity` JSON response.
- Successful deletion with no representation: return `response()->noContent()` for `204 No Content`.
- Successful reads: use `200 OK` and a resource or resource collection.

For example:

```php
public function store(StorePostRequest $request): JsonResponse
{
    $post = Post::create($request->validated());
    return (new PostResource($post))->response()->setStatusCode(201);
}

public function destroy(Post $post): Response
{
    $post->delete();
    return response()->noContent();
}
```

Do not return `204` with a JSON body, and do not expose raw Eloquent models. Feature-test both the status and the resource shape.

