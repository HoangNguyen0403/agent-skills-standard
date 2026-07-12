Use a Form Request and a model allowlist:

```php
class StorePostRequest extends FormRequest
{
    public function rules(): array
    {
        return ['title' => ['required', 'string'], 'body' => ['required', 'string']];
    }
}

class Post extends Model
{
    protected $fillable = ['title', 'body'];
}

$post = Post::create($request->validated());
```

Never pass `$request->all()` to `create()` or `update()`. The Form Request validates and authorizes the operation; `$fillable` prevents fields outside the intended contract from being assigned. Add a Policy for model permission checks and treat validation, authorization, and mass-assignment protection as separate layers.

