Use a trait only for small, genuinely cross-cutting behavior:

~~~php
trait HasTimestamps
{
    private DateTimeImmutable $updatedAt;

    public function touch(): void
    {
        $this->updatedAt = new DateTimeImmutable();
    }
}

final class User
{
    use HasTimestamps;
}
~~~

Keep traits focused and lightweight; do not use them to hide unrelated state or business responsibilities.

