Version routes with a prefix and keep version-specific controllers or resources isolated:

```php
use App\Http\Controllers\Api\V1\PostController;

Route::prefix('v1')->middleware('throttle:api')->group(function () {
    Route::apiResource('posts', PostController::class);
});
```

For larger APIs, place controllers under `App\Http\Controllers\Api\V1` and use a corresponding `V1` resource representation when the response contract differs. Add `auth:sanctum` to protected groups. Keep route names and contracts explicit, and introduce `v2` as a separate group rather than silently changing the `v1` response. Test each version's status codes and JSON shape. The prefix is the public compatibility boundary; it should not be mixed with static URLs or raw model serialization.

