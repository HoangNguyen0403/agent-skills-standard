# Laravel API Reference

## API Resources (JSON Transformation)

```php
// app/Http/Resources/UserResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'name' => $this->full_name,
        'email' => $this->email,
        'created_at' => $this->created_at->toIso8601String(),
    ];
}
```

## API Auth (Sanctum)

```php
// routes/api.php
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
```
