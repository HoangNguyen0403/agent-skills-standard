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
