# Laravel Architecture Reference

## Slim Controllers & Service Classes

```php
// app/Http/Controllers/UserController.php
public function store(UserRequest $request, UserService $service)
{
    $service->registerUser($request->validated());
    return redirect()->route('dashboard')->with('status', __('User created'));
}

// app/Services/UserService.php
public function registerUser(array $data): User
{
    return DB::transaction(fn() => User::create($data));
}
```

## Form Requests (Validation)

```php
// app/Http/Requests/UserRequest.php
public function rules(): array
{
    return [
        'email' => 'required|email|unique:users',
        'password' => 'required|min:8|confirmed',
    ];
}
```
