Use a DTO to make an input/output contract explicit and keep transport arrays from leaking through the application. With modern PHP:

```php
final readonly class CreateUserData
{
    public function __construct(
        public string $name,
        public string $email,
    ) {}

    public static function fromRequest(StoreUserRequest $request): self
    {
        return new self(...$request->validated());
    }
}
```

Pass the DTO to an application service, validate before constructing it, and map it to a response resource afterward. Keep DTOs immutable, typed, serialization-aware when crossing queues, and free of persistence behavior. For complex nested input, use named factories or a mapper rather than relying on array unpacking order.

