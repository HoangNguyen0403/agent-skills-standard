Use `validated()` as the input boundary, then enforce model-level protection with `$fillable` or `$guarded`.

```php
// app/Http/Requests/StoreUserRequest.php
class StoreUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12'],
        ];
    }
}
```

```php
// app/Models/User.php
class User extends Model
{
    protected $fillable = [
        'name',
        'email',
        'password',
    ];
}
```

```php
public function store(StoreUserRequest $request)
{
    $user = User::create([
        ...$request->validated(),
        'password' => Hash::make($request->validated('password')),
    ]);

    return response()->json($user, 201);
}
```

Do not validate attacker-controlled fields such as `is_admin`, `role`, `user_id`, or `created_by` merely to pass them into `create()` or `update()`. Assign privileged attributes explicitly:

```php
$user->update($request->validated());
$user->is_admin = false; // or authorize and set explicitly
$user->save();
```

`validated()` removes fields that have no validation rule, but it does not replace Laravel’s mass-assignment protection. Keep `$fillable` narrowly scoped, or use `Model::unguarded()` only in tightly controlled internal code.
