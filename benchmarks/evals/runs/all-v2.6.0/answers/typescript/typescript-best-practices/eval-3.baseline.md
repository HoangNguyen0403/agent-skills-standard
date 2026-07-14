A growing base class usually indicates that unrelated responsibilities are being coupled through inheritance. Prefer composition: extract cohesive behaviors into small interfaces or services, and inject the collaborators into the class that coordinates them.

```ts
interface Notifier {
  notify(message: string): Promise<void>;
}

interface AuditLog {
  record(event: string): Promise<void>;
}

class OrderService {
  constructor(
    private readonly notifier: Notifier,
    private readonly auditLog: AuditLog,
  ) {}

  async complete(orderId: string): Promise<void> {
    await this.auditLog.record(`order.completed:${orderId}`);
    await this.notifier.notify(`Order ${orderId} completed`);
  }
}
```

Keep inheritance only where the subtype is genuinely substitutable for the base type and the shared behavior is stable. Otherwise, split the large base class by responsibility, expose narrow interfaces, and move policy-specific behavior into injected collaborators. Migrate callers incrementally and add tests around each extracted behavior before deleting the old hierarchy.
