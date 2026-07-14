Apply SOLID by giving each class one responsibility, extending behavior through interfaces or composition, keeping subclasses substitutable, using small focused interfaces, and injecting abstractions rather than constructing concrete dependencies inside services.

~~~php
interface Notifier
{
    public function send(string $message): void;
}

final class OrderService
{
    public function __construct(private Notifier $notifier)
    {
    }

    public function place(): void
    {
        // Persist the order through another injected abstraction, then notify.
        $this->notifier->send('Order placed');
    }
}
~~~

