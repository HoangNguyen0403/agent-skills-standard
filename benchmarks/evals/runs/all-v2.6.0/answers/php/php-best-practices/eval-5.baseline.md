Extract genuinely shared, stateless behavior into a trait when the consuming classes have the same capability and contract. Keep the trait small, avoid hidden mutable state and complex dependencies, and document required methods or properties. Prefer composition or a service when the behavior is a separate responsibility.

~~~php
trait FormatsTimestamps
{
    private function formatTimestamp(DateTimeImmutable $value): string
    {
        return $value->format(DateTimeInterface::ATOM);
    }
}

final class AuditEntry
{
    use FormatsTimestamps;
}
~~~

