Use a `JsonResource` to define the public representation and its collection helper for lists:

```bash
php artisan make:resource UserResource
```

```php
class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'links' => ['self' => route('users.show', $this->resource)],
        ];
    }
}
```

Return one model as `new UserResource($user)` and a list as `UserResource::collection($users)`. The resource should expose an intentional field allowlist rather than serializing the model, which prevents accidental leakage of credentials or internal columns. For paginated results, pass the paginator to the collection helper so Laravel includes pagination metadata. Keep route names stable and use named routes for links; do not return raw models or build static URLs into the JSON.

