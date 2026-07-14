Install Laravel Sanctum, run its migrations, and add the `HasApiTokens` trait to `User`. Configure the API guard/provider as appropriate for the application.

For token-based clients, issue a token after validating credentials:

```php
$token = $user->createToken('mobile')->plainTextToken;
return response()->json(['token' => $token]);
```

Protect routes with `auth:sanctum`:

```php
Route::middleware('auth:sanctum')->get('/me', fn (Request $request) => $request->user());
```

For first-party SPA authentication, use Sanctum's cookie/session flow, configure stateful domains and CORS/CSRF correctly, call `/sanctum/csrf-cookie`, then authenticate with the session rather than issuing personal tokens. Revoke tokens on logout with `$request->user()->currentAccessToken()?->delete()` and never return token secrets again.

