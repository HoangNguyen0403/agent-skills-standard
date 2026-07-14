For PHP 8.2, use a `readonly class` for immutable transfer data:

```php
readonly class UserData
{
    public function __construct(
        public string $name,
        public string $email,
    ) {}
}
```

Construct it only from validated input and pass it between the controller, Action, and repository boundary. A readonly DTO prevents accidental mutation after validation and gives the use case typed fields instead of an unstructured array. If the project is on PHP 8.1, use readonly properties instead. In a Laravel domain layout, place it under `app/Domains/<Domain>/DTOs/`, keep Eloquent models separate, and avoid passing raw models or request arrays across layers.

