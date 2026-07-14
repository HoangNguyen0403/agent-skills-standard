Use a Form Request and pass only `$request->validated()` to the model.

```bash
php artisan make:request StorePostRequest
```

```php
// app/Http/Requests/StorePostRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Replace with Policy authorization if required.
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'published' => ['sometimes', 'boolean'],
        ];
    }
}
```

Define explicitly allowed attributes:

```php
// app/Models/Post.php
protected $fillable = [
    'title',
    'body',
    'published',
];
```

Use the validated data in the controller:

```php
use App\Http\Requests\StorePostRequest;
use App\Models\Post;

public function store(StorePostRequest $request)
{
    $post = Post::create($request->validated());

    return response()->json($post, 201);
}
```

Never use:

```php
Post::create($request->all());
```

The `$fillable` list and `$request->validated()` together prevent clients from assigning protected fields such as `user_id`, `role`, or `is_admin`. Assume `user_id` should be assigned server-side, for example:

```php
$post = $request->user()
    ->posts()
    ->create($request->validated());
```
