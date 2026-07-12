Register a named queue in the notifications module and add a processor that handles the job name:

```ts
@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  providers: [WeeklyDigestProcessor, NotificationsService],
})
export class NotificationsModule {}

@Processor('notifications')
export class WeeklyDigestProcessor {
  @Process('weekly-digest')
  async handle(job: Job<{ userId: string }>) {
    await this.mailer.sendWeeklyDigest(job.data.userId);
  }
}
```

Use the BullMQ-compatible Nest integration/version for the project; newer APIs use `WorkerHost` and inspect `job.name` in `process`. Add jobs through an injected `@InjectQueue('notifications')` queue, set `attempts`, exponential backoff, and `removeOnComplete`/`removeOnFail` policies, and make the handler idempotent. Configure Redis once with `BullModule.forRootAsync`, use a durable job ID to prevent duplicate scheduling, and emit metrics/logging for retries and failures.

