Define a reusable local scope on the model:

```php
use Illuminate\Database\Eloquent\Builder;

public function scopeActive(Builder $query): Builder
{
    return $query->where('active', true);
}
```

Call it fluently with `User::active()->verified()->get()`. Scopes keep filters close to the model's query vocabulary and prevent controllers from duplicating conditions. Type the `Builder` argument and return value, keep the scope focused, and do not put broad business workflows in a model scope. If the result needs relationships, combine the scope with explicit eager loading such as `User::active()->with('profile')->get()`.

