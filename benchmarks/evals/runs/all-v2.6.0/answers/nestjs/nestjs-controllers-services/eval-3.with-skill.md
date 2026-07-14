Use `OnApplicationShutdown` for cleanup that must happen when the application is shutting down, such as closing clients, consumers, or timers. Enable signal handling in bootstrap:

```ts
@Injectable()
export class QueueLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    await this.consumer.close();
    this.logger.log(`Closed on ${signal ?? 'application'} shutdown`);
  }
}

app.enableShutdownHooks();
```

Use `OnModuleInit` for startup connection/setup work. Keep cleanup idempotent and bounded so Kubernetes termination can complete; do not put business logic in the lifecycle hook.

