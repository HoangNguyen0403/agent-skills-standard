Implement `OnModuleDestroy` or `OnApplicationShutdown` in the provider that owns the resource. Release timers, database clients, message consumers, sockets, and worker pools there:

```ts
@Injectable()
export class ConsumerService implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    await this.consumer.close({ signal });
  }
}
```

Enable shutdown hooks in bootstrap with `app.enableShutdownHooks()`, so Nest handles termination signals. Make cleanup idempotent, bounded by a timeout, and tolerant of an already-closed resource. Use `OnModuleDestroy` for module lifecycle cleanup and `OnApplicationShutdown` when the process signal matters. In Kubernetes, set a sufficient `terminationGracePeriodSeconds`, use readiness to stop new traffic, and allow in-flight work to drain before force termination.

