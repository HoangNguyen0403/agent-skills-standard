Regenerate the session ID immediately after successful authentication:

```php
if (Auth::attempt($credentials, $remember)) {
    $request->session()->regenerate();
    return redirect()->intended('/dashboard');
}
```

On logout, invalidate the session and regenerate the CSRF token:

```php
Auth::logout();
$request->session()->invalidate();
$request->session()->regenerateToken();
```

This prevents session fixation by replacing the pre-login identifier while preserving the authenticated session data. Regenerate after login success, not before credentials are accepted, and test that the old session ID cannot authenticate after the transition.

