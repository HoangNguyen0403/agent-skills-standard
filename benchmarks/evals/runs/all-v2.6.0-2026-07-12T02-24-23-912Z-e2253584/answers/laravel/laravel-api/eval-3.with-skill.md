Install and configure Sanctum, then use tokens and the `auth:sanctum` middleware:

```bash
php artisan install:api
php artisan migrate
```

Ensure `App\Models\User` uses `Laravel\Sanctum\HasApiTokens`:

```php
use HasApiTokens;

$token = $user->createToken('mobile-client')->plainTextToken;
```

Return the token only through the login response and send it on later requests as `Authorization: Bearer <token>`. Protect API routes in `routes/api.php` with `Route::middleware('auth:sanctum')`. Use Sanctum for first-party SPAs or simple personal-access API tokens; choose Passport when OAuth2 client grants are actually required. Revoke a token with `$user->currentAccessToken()?->delete()` on logout. Use API Resources for response shaping, validate credentials and input, and never return raw models or store plaintext tokens.

