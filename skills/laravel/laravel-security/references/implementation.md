# Laravel Security Reference

## Authorization (Policies)

```php
// app/Policies/PostPolicy.php
public function update(User $user, Post $post): bool
{
    return $user->id === $post->user_id;
}

// In Controller
$this->authorize('update', $post);
```

## Safe Environments

```php
// config/services.php
'stripe' => [
    'key' => env('STRIPE_KEY'),
],

// In Code (GOOD)
$key = config('services.stripe.key');

// In Code (BAD)
$key = env('STRIPE_KEY'); // Will fail if config is cached
```
