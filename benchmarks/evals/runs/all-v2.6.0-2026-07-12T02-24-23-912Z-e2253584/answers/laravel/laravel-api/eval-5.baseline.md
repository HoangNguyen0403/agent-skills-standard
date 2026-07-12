Group routes under an explicit version prefix and keep each version's contract stable:

```php
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::apiResource('users', V1\UserController::class);
});

Route::prefix('v2')->middleware('auth:sanctum')->group(function () {
    Route::apiResource('users', V2\UserController::class);
});
```

Place controllers/resources in matching namespaces such as `App\Http\Controllers\Api\V1` and `V2`. Version response resources and request rules when the representation or behavior changes; do not silently change a v1 contract. Prefer additive, backward-compatible changes where possible, document deprecation and sunset dates, and test each version's routes and payloads independently.

