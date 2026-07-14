Create a resource with `php artisan make:resource UserResource`. Map only the public fields and explicitly control relationships:

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->when($request->user()?->can('viewEmail', $this->resource), $this->email),
            'posts' => PostResource::collection($this->whenLoaded('posts')),
        ];
    }
}
```

Return `UserResource::collection(User::with('posts')->paginate())` for a collection. Resources can add `with()` metadata and `additional()` response data; avoid exposing the model wholesale. Use `whenLoaded` so a collection does not accidentally trigger lazy-loading queries.

