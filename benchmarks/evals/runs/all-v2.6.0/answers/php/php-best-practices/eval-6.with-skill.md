Use PascalCase for classes, camelCase for methods and variables, and SNAKE_CASE for class constants:

~~~php
final class UserService
{
    private const MAX_RETRIES = 3;

    public function getUserById(int $userId): ?User
    {
        // ...
    }
}
~~~

Use descriptive names and avoid magic numbers or ambiguous abbreviations.

