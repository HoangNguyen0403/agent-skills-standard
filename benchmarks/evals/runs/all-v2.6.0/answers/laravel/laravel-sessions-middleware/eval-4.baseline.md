Assuming Laravel’s session-based `web` guard:

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

public function login(Request $request)
{
    $credentials = $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (! Auth::attempt($credentials, $request->boolean('remember'))) {
        return back()->withErrors([
            'email' => 'Invalid credentials.',
        ])->onlyInput('email');
    }

    // Prevent session fixation after authentication.
    $request->session()->regenerate();

    return redirect()->intended('/dashboard');
}
```

If logging in manually, regenerate immediately after `Auth::login()`:

```php
Auth::login($user);
$request->session()->regenerate();
```

On logout:

```php
Auth::logout();

$request->session()->invalidate();
$request->session()->regenerateToken();

return redirect('/');
```
