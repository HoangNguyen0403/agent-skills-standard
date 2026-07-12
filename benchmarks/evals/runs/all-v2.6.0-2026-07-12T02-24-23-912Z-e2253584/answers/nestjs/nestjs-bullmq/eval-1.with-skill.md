Register the notifications queue with shared worker options and retention defaults, then add a processor that extends the project `BaseProcessor` rather than `WorkerHost`.

```ts
@Processor(NOTIFICATION_QUEUE, {
  drainDelay: QUEUE_DRAIN_DELAY_MS,
  stalledInterval: QUEUE_STALLED_INTERVAL_MS,
  maxStalledCount: 1,
})
export class DigestProcessor extends BaseProcessor {
  @Process(WEEKLY_DIGEST_JOB)
  async handle(job: Job<WeeklyDigestPayload>) {
    await this.notifications.sendWeeklyDigest(job.data);
  }
}
```

Use `getSharedBullQueueOptions()` in `BullModule.registerQueue()` with `removeOnComplete`, `removeOnFail`, `attempts`, and `backoff`; keep queue/job names and numeric values in constants. Keep the cron scheduler responsible for enqueueing digest IDs and the processor responsible for execution. In development use local Redis, not Upstash.

