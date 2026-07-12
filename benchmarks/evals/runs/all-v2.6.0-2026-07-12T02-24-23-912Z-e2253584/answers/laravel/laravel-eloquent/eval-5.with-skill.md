Define an explicit `$fillable` allowlist and create models only from validated input:

```php
class User extends Model
{
    protected $fillable = ['name', 'email'];
}

$user = User::create($request->validated());
```

`$fillable` prevents unexpected request fields from being assigned. Pair it with a Form Request and never pass `$request->all()` to `create()` or `update()`. Keep casts for dates, JSON, and domain types in `$casts` so values have consistent behavior. Treat mass-assignment protection as one layer: authorization and validation must still decide which caller may change which fields.

