After successful authentication, regenerate the session ID before continuing:

```php
if (Auth::attempt($credentials)) {
    $request->session()->regenerate();
    // redirect to the authenticated destination
}
```

This prevents session fixation by replacing the pre-authentication identifier. On logout, invalidate the session and regenerate the CSRF token as appropriate:

```php
$request->session()->invalidate();
$request->session()->regenerateToken();
```

Keep the session driver configured through `config('session.driver')`; do not read environment variables directly in application code. Test that login changes the session ID and logout removes the authenticated session.

