Create a Form Request and keep validation there:

```bash
php artisan make:request StoreUserRequest
```

```php
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('create', User::class) ?? false; }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', 'unique:users,email']];
    }
}
```

Inject it into the controller and pass only `$request->validated()` to the Action or model. Do not use inline `$request->validate()` for this architecture, and never pass `$request->all()` to mass assignment. Form Request authorization handles permission checks while `rules()` describes input constraints; Laravel returns validation failures as `422` JSON for API requests.

