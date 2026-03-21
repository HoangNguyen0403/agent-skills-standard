---
name: nestjs-bullmq
description: 'Standard workflow for BullMQ jobs in NestJS. Use for: queue processors, redis-throttler, Upstash limits, idle polling (10s), stalled jobs, and retention. Triggers on: bullmq, processors, registerQueue, drainDelay, stalledInterval, removeOnComplete, Redis outages, or failing background tasks. (triggers: **/*.processor.ts, **/*.module.ts, **/bull-queue.constants.ts, **/redis-throttler*.ts, queue, background job, worker, processor, bullmq, drainDelay, stalledInterval, removeOnComplete, redis limit, upstash, fail-open, throttler)'
---

# NestJS BullMQ Implementation

## **Priority: P0 (Critical)**

## Guidelines

- **Set idle polling**: Add `drainDelay` + `stalledInterval` + `maxStalledCount` to every `@Processor`. Default `drainDelay` (5 ms) burns 570M Redis commands/day at idle. See [patterns.md](references/patterns.md#3-processor-consumer-with-correct-worker-options).
- **Throttle worker error logs**: BullMQ workers emit raw unhandled ReplyErrors on Redis failure (e.g. Upstash rate limits). Always extend `BaseProcessor` instead of `WorkerHost` to rate-limit these logs. See [patterns.md](references/patterns.md#4-base-processor-for-error-rate-limiting).
- **Set job retention**: Add `removeOnComplete`, `removeOnFail`, `attempts`, `backoff` to every `BullModule.registerQueue`. See [patterns.md](references/patterns.md#2-module-registration-with-defaultjoboptions).
- **Use shared constants**: All numeric options live in `src/common/constants/bull-queue.constants.ts`. Key constants: `QUEUE_DRAIN_DELAY_MS` (10 000 ms), `QUEUE_STALLED_INTERVAL_MS` (60 000 ms). Use `getSharedBullQueueOptions` helper for `registerQueue`. Queue/job names go in `{feature}.constants.ts`. Never inline magic numbers.
- **Wrap every `queue.add()`**: Persist DB record first, then enqueue inside try-catch. Redis errors must not surface as 500s. See [patterns.md](references/patterns.md#5-producer-queue-service-with-isolated-queueadd).
- **Throttler fail-open**: `ThrottlerGuard` is registered as global `APP_GUARD` — a Redis blip propagates errors to ALL HTTP routes. `RedisThrottlerStorage.increment()` must catch all Redis errors and return a fail-open pass-through record. A Redis blip must not kill all HTTP routes. See [patterns.md](references/patterns.md#6-throttler-fail-open-pattern).
- **Guard new queues**: Follow `isRedisEnabled()` conditional + mock token pattern in every module. NestJS DI throws on startup without mock.
- **Keep processor and cron**: Cron schedules; processor executes. Both always required — they are complementary. See [patterns.md](references/patterns.md#7-processor-vs-cron--when-both-exist).
- **Use local Redis in dev**: Never point dev machines at Upstash — idle workers exhaust free tier (500K/day) in minutes.

## Anti-Patterns

- **No bare `@Processor(NAME)`**: Always pass worker options object with `drainDelay` and `stalledInterval`.
- **No bare `WorkerHost` extension**: Always extend `BaseProcessor` instead to intercept and rate-limit worker errors.
- **No `registerQueue` without `defaultJobOptions`**: Omitting causes unbounded Redis memory growth.
- **No inline numbers**: Use `bull-queue.constants.ts` — never write `10_000`, `60_000`, `50`, `20`, `3`, or `5_000` directly.
- **No unguarded `queue.add()`**: Wrap in try-catch; persist DB state first.
- **No throws in throttler increment**: Catch Redis errors; return fail-open record.
- **No missing mock token**: Provide `getQueueToken` mock when `redisEnabled = false`.
- **No removing processor because cron exists**: They serve different roles.
- **No cloud Redis in dev**: Use local Docker Redis.

## References

- [All Code Patterns](references/patterns.md)
- [Evals](evals/evals.json)
