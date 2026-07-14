Protect models from unintended mass assignment by declaring `$fillable` or `$guarded`:

```php
class User extends Model
{
    protected $fillable = ['name', 'email'];
}

$user->update($request->validated());
```

Prefer an allowlist with `$fillable` for application input. Validate and authorize first, then pass only the validated fields; mass-assignment protection is a defense-in-depth measure, not a replacement for either. Avoid `$guarded = []` on models exposed to untrusted input, and use explicit assignments for sensitive fields such as roles, ownership, or billing state.

