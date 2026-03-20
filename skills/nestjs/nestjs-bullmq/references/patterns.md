# BullMQ Implementation Patterns

> All examples follow the conventions enforced by the SKILL.md rules.  
> Import numeric options from `src/common/constants/bull-queue.constants.ts` — never inline them.

---

## 0. Shared Constants (`bull-queue.constants.ts`)

This file is the **single source of truth** for all BullMQ numeric options. It lives in `src/common/constants/` and is imported by every processor and module.

```typescript
// src/common/constants/bull-queue.constants.ts
import { RegisterQueueOptions } from '@nestjs/bullmq';

/** Milliseconds between Redis polls when the queue is empty (BullMQ default: 5 ms).
 *  5 ms = ~200 polls/sec = ~570M Redis commands/day at idle. Use 10 000 ms. */
export const QUEUE_DRAIN_DELAY_MS = 10_000;

/** Milliseconds between stalled-job sweeps (BullMQ default: 5 000 ms). */
export const QUEUE_STALLED_INTERVAL_MS = 60_000;

/** Max times a job can stall before being permanently failed. */
export const QUEUE_MAX_STALLED_COUNT = 1;

/** Completed jobs retained in Redis per queue (prevents unbounded growth). */
export const QUEUE_REMOVE_ON_COMPLETE = 50;

/** Failed jobs retained in Redis per queue. */
export const QUEUE_REMOVE_ON_FAIL = 20;

/** Job attempts before permanent failure. */
export const QUEUE_JOB_ATTEMPTS = 3;

/** Initial delay (ms) for exponential-backoff retries. */
export const QUEUE_BACKOFF_DELAY_MS = 5_000;

export const SHARED_BULL_DEFAULT_JOB_OPTIONS = {
  removeOnComplete: QUEUE_REMOVE_ON_COMPLETE,
  removeOnFail: QUEUE_REMOVE_ON_FAIL,
  attempts: QUEUE_JOB_ATTEMPTS,
  backoff: { type: 'exponential', delay: QUEUE_BACKOFF_DELAY_MS },
};

export function getSharedBullQueueOptions(name: string): RegisterQueueOptions {
  return {
    name,
    defaultJobOptions: SHARED_BULL_DEFAULT_JOB_OPTIONS,
  };
}
```

---

## 1. Module Constants (`{feature}.constants.ts`)

Only queue/job identity goes here. Numbers stay in `bull-queue.constants.ts`.

```typescript
// src/modules/example/example.constants.ts
export const EXAMPLE_QUEUE = 'example';
export const EXAMPLE_PROCESS_JOB = 'process';
```

---

## 2. Module Registration with `defaultJobOptions`

```typescript
// src/modules/example/example.module.ts
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { isRedisEnabled } from 'src/config/redis.config';
import { getSharedBullQueueOptions } from 'src/common/constants/bull-queue.constants';
import { EXAMPLE_QUEUE } from './example.constants';
import { ExampleProcessor } from './example.processor';
import { ExampleQueueService } from './example-queue.service';

const redisEnabled = isRedisEnabled();

@Module({
  imports: [
    ...(redisEnabled
      ? [BullModule.registerQueue(getSharedBullQueueOptions(EXAMPLE_QUEUE))]
      : []),
  ],
  providers: [
    ExampleQueueService,
    ...(redisEnabled ? [ExampleProcessor] : []),
    // Mock token so DI doesn't throw when Redis is disabled
    ...(!redisEnabled
      ? [
          {
            provide: getQueueToken(EXAMPLE_QUEUE),
            useValue: { add: async () => {}, getJob: async () => {} },
          },
        ]
      : []),
  ],
  exports: [ExampleQueueService],
})
export class ExampleModule {}
```

---

## 3. Processor (Consumer) with Correct Worker Options

```typescript
// src/modules/example/example.processor.ts
import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseProcessor } from 'src/common/queue/base-processor';
import {
  QUEUE_DRAIN_DELAY_MS,
  QUEUE_MAX_STALLED_COUNT,
  QUEUE_STALLED_INTERVAL_MS,
} from 'src/common/constants/bull-queue.constants';
import { EXAMPLE_QUEUE } from './example.constants';

export interface ExampleJobData {
  entityId: string;
}

@Processor(EXAMPLE_QUEUE, {
  drainDelay: QUEUE_DRAIN_DELAY_MS, // ← essential: prevents idle polling storm
  stalledInterval: QUEUE_STALLED_INTERVAL_MS, // ← essential: reduces stall-check frequency
  maxStalledCount: QUEUE_MAX_STALLED_COUNT,
})
export class ExampleProcessor extends BaseProcessor {
  protected readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job<ExampleJobData>): Promise<void> {
    const { entityId } = job.data;
    this.logger.log(`Processing job ${job.id} for entity ${entityId}`);

    try {
      // Heavy work here
    } catch (error) {
      this.logger.error(
        `Job failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Rethrow → BullMQ handles retry with backoff
    }
  }
}
```

---

## 4. Base Processor for Error Rate Limiting

BullMQ workers emit unhandled exceptions on Redis failure (like Upstash rate limits). Extend `BaseProcessor` to throttle error logs and prevent log spam.

```typescript
// src/common/queue/base-processor.ts
import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

export abstract class BaseProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  private _lastErrorLogTime = 0;
  private _errorCountSinceLastLog = 0;

  @OnWorkerEvent('error')
  protected onWorkerError(error: Error): void {
    const now = Date.now();
    const LOG_INTERVAL_MS = 60000; // Log at most once per minute

    // Only log once per minute to avoid spamming Cloud Run / Datadog
    if (now - this._lastErrorLogTime > LOG_INTERVAL_MS) {
      const message = error?.message || String(error);
      const stack = error?.stack;

      this.logger.error(
        `Worker error (rate-limited): ${message}${
          this._errorCountSinceLastLog > 0
            ? \` (suppressed ${this._errorCountSinceLastLog} similar errors in the last minute)\`
            : ''
        }`,
        stack,
      );
      this._lastErrorLogTime = now;
      this._errorCountSinceLastLog = 0;
    } else {
      this._errorCountSinceLastLog++;
    }
  }
}
```

---

## 5. Producer (Queue Service) with Isolated `queue.add()`

The golden rule: **persist to DB first, then enqueue**. Redis failures must not roll back DB state.

```typescript
// src/modules/example/example-queue.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ExampleEntity } from './entities/example.entity';
import { EXAMPLE_PROCESS_JOB, EXAMPLE_QUEUE } from './example.constants';

@Injectable()
export class ExampleQueueService {
  private readonly logger = new Logger(ExampleQueueService.name);

  constructor(
    @InjectQueue(EXAMPLE_QUEUE) private readonly queue: Queue,
    @InjectRepository(ExampleEntity)
    private readonly repo: Repository<ExampleEntity>,
  ) {}

  async triggerProcessing(entityId: string): Promise<ExampleEntity> {
    // 1. Persist DB state FIRST — survives a Redis outage
    const entity = await this.repo.save({ id: entityId, status: 'PENDING' });

    // 2. Enqueue — wrapped so Redis errors don't propagate to the caller
    try {
      await this.queue.add(EXAMPLE_PROCESS_JOB, { entityId });
    } catch (error) {
      // Redis unavailable. Entity is PENDING in DB; cron/retry will re-enqueue.
      this.logger.warn(
        `Queue unavailable for entity ${entityId}: ${(error as Error).message}`,
      );
    }

    return entity; // API responds normally regardless of Redis state
  }
}
```

---

## 6. Throttler Fail-Open Pattern

When Redis is unavailable the `ThrottlerGuard` (global `APP_GUARD`) must **not** kill all HTTP routes. The `RedisThrottlerStorage` must catch all Redis errors and return a pass-through record.

```typescript
// src/common/throttler/redis-throttler-storage.ts (key section)

const FAIL_OPEN_RECORD = (ttl: number): ThrottlerStorageRecord => ({
  totalHits: 0,
  timeToExpire: Math.ceil(ttl / 1000),
  isBlocked: false,
  timeToBlockExpire: 0,
});

async increment(key: string, ttl: number, limit: number): Promise<ThrottlerStorageRecord> {
  try {
    const result = await this._redis.throttlerIncrement(key, ttl, limit);
    // ... normal path
  } catch (error) {
    // Fail-open: temporarily disable rate-limiting rather than kill the API.
    this.logger.warn(`Redis throttler unavailable, failing open: ${(error as Error).message}`);
    return FAIL_OPEN_RECORD(ttl);
  }
}
```

---

## 7. Processor vs. Cron — When Both Exist

```text
Cron (runs at 02:00 daily)
  → finds entities needing work
  → calls QueueService.triggerProcessing()
      → saves entity as PENDING
      → queue.add() → BullMQ

Processor (always running, idle between jobs)
  → picks up job from BullMQ
  → does the heavy work
  → updates entity to READY / FAILED
  → sends notifications
```

**Never remove the processor because a cron exists.** The cron _schedules_; the processor _executes_. Both are always required.

---

## 8. Redis Command Cost: Before vs. After

| Setting             | Default      | Project Value | Idle commands saved/day |
| ------------------- | ------------ | ------------- | ----------------------- |
| `drainDelay`        | 5 ms         | 10 000 ms     | ~570M                   |
| `stalledInterval`   | 5 000 ms     | 60 000 ms     | ~1M                     |
| `removeOnComplete`  | keep forever | 50            | Growing scan cost       |
| `removeOnFail`      | keep forever | 20            | Growing scan cost       |
| Throttler fail-open | throws       | pass-through  | Server stays alive      |
