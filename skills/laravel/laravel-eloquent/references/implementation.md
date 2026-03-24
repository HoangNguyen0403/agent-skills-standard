# Laravel Eloquent Reference

## Eager Loading (N+1 Prevention)

```php
// Good: Fetch all users and their profile in 2 queries
$users = User::with('profile')->get();

// Global Eager Loading (In Model)
protected $with = ['profile'];
```

## Reusable Scopes

```php
// app/Models/Order.php
public function scopeRecent(Builder $query)
{
    return $query->where('created_at', '>', now()->subDays(7));
}

// Usage
Order::recent()->get();
```

## Performance Processing

```php
// Use chunk for large datasets
User::chunk(100, function ($users) {
    foreach ($users as $user) {
        // ... logic
    }
});
```

## Scope + Eager Loading Example

```php
// app/Models/User.php
class User extends Model {
    protected $fillable = ['name', 'email', 'status'];
    protected $casts = ['email_verified_at' => 'datetime'];

    public function scopeActive(Builder $query): Builder {
        return $query->where('status', 'active');
    }

    public function posts(): HasMany {
        return $this->hasMany(Post::class);
    }
}

// Usage: eager-load + scope chain
$users = User::active()->with('posts')->paginate(20);
```

## Model Directory Structure

```text
app/
└── Models/
    ├── {Model}.php
    └── Scopes/         # Advanced global scopes
```
