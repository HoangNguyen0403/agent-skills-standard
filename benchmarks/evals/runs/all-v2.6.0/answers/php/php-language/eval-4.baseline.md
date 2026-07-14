Constructor property promotion combines a constructor parameter, property declaration, visibility, and assignment. It requires PHP 8.0 or newer.

~~~php
final class User
{
    public function __construct(
        private readonly int $id,
        private string $name,
    ) {
    }

    public function name(): string
    {
        return $this->name;
    }
}
~~~

Use a normal constructor when initialization needs more involved logic or when a promoted parameter should not become a property.

