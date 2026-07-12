Generate a factory and define its default state:

```bash
php artisan make:factory PostFactory --model=Post
```

```php
final class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        return ['title' => fake()->sentence(), 'body' => fake()->paragraph()];
    }
}
```

Use states for meaningful variants, relationships for associated data, and sequences for deterministic variation. In tests, create persisted records with `Post::factory()->create()` or non-persisted input with `make()`. Keep factories valid under database constraints and avoid hiding the behavior a test is intended to prove behind excessive setup.

