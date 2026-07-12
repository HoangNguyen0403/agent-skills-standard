Create a custom exception by extending Exception or a more specific built-in/domain exception. Give it a meaningful name and, when useful, typed properties or a static constructor for structured context.

~~~php
final class InsufficientFunds extends RuntimeException
{
    public function __construct(
        public readonly int $accountId,
        public readonly int $requestedCents,
        public readonly int $availableCents,
    ) {
        parent::__construct('Insufficient funds for account ' . $accountId);
    }
}
~~~

Throw it where the domain rule is detected and catch it only where the application can make a meaningful decision.

