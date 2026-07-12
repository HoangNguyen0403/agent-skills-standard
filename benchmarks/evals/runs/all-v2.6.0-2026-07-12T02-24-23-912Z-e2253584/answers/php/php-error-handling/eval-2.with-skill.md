Create a domain-specific exception that extends an SPL runtime exception:

~~~php
final class UserNotFound extends RuntimeException
{
    public function __construct(int $userId)
    {
        parent::__construct("User not found: {$userId}");
    }
}
~~~

Throw it for the domain failure and catch it at the layer that can translate it into a response or recovery action. Preserve the previous exception when wrapping lower-level failures.

