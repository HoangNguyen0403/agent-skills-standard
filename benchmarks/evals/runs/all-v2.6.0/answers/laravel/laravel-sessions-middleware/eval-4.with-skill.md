Regenerate the session immediately after successful authentication:

```php
if (Auth::attempt($credentials)) {
    $request->session()->regenerate(); // Prevents session fixation

    return redirect()->intended('/dashboard');
}
```

On logout:

```php
$request->session()->invalidate();
$request->session()->regenerateToken();
```

For scaled production environments, prefer Redis:

```env
SESSION_DRIVER=redis
```

Install `predis/predis`, use `config('session.driver')` rather than `env()` in application code, and avoid the file driver because of I/O locking problems.
