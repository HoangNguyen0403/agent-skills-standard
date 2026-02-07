# BullMQ Implementation Patterns

## 1. Queue Service (Producer) Pattern

Encapsulate queue interactions in a dedicated service. Use strongly typed job names and data.

```typescript
// src/modules/example/example-queue.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export const EXAMPLE_QUEUE = 'example-queue';

@Injectable()
export class ExampleQueueService {
  private readonly logger = new Logger(ExampleQueueService.name);

  constructor(@InjectQueue(EXAMPLE_QUEUE) private readonly queue: Queue) {}

  async scheduleJob(id: string, data: any, delay: number) {
    // Unique Job ID prevents duplicates
    const jobId = `job-${id}`;

    await this.queue.add(
      'process-data', // Named job
      { id, ...data },
      {
        delay,
        jobId,
        removeOnComplete: true, // Cleanup successful jobs
        removeOnFail: { count: 3 }, // Keep last 3 failed for debugging
      },
    );
  }

  async cancelJob(id: string) {
    const job = await this.queue.getJob(`job-${id}`);
    if (job) await job.remove();
  }
}
```

## 2. Processor (Consumer) Pattern

Use `WorkerHost` for cleaner class-based workers.

```typescript
// src/modules/example/example.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EXAMPLE_QUEUE } from './example-queue.service';

@Processor(EXAMPLE_QUEUE)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job<any, any, string>) {
    this.logger.log(`Processing job ${job.id} (${job.name})`);

    try {
      // Handle job logic
      await this.doWork(job.data);
    } catch (error) {
      this.logger.error(`Job failed: ${error.message}`);
      throw error; // Rethrow to trigger BullMQ retry logic
    }
  }

  private async doWork(data: any) {
    // Business logic here
  }
}
```

## 3. Module Registration

Register the queue and processor in your feature module.

```typescript
// src/modules/example/example.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ExampleQueueService, EXAMPLE_QUEUE } from './example-queue.service';
import { ExampleProcessor } from './example.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EXAMPLE_QUEUE,
    }),
  ],
  providers: [ExampleQueueService, ExampleProcessor],
  exports: [ExampleQueueService],
})
export class ExampleModule {}
```
