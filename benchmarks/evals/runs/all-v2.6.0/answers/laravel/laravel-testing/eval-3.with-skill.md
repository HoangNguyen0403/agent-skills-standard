Generate and define an Eloquent factory:

```bash
php artisan make:factory PostFactory --model=Post
```

```php
public function definition(): array
{
    return [
        'title' => fake()->sentence(),
        'body' => fake()->paragraph(),
        'published_at' => fake()->optional()->dateTime(),
    ];
}
```

Use it in tests with `Post::factory()->count(3)->create(['user_id' => $user->id])`. Factories provide valid, readable test data and keep persistence setup consistent. Prefer them over `DB::table()->insert()`; use states when tests need meaningful variants such as `published()` or `draft()`.

