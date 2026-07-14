The likely cause is idle BullMQ workers polling Redis too aggressively. A bare processor uses BullMQ's very small default `drainDelay`; multiplied by a continuously running dev worker, it can consume the Upstash free quota even when no jobs are available.

Use local Docker Redis for development and configure every processor with shared constants such as `drainDelay: 10_000`, `stalledInterval: 60_000`, and a bounded `maxStalledCount`. Do not point dev workers at Upstash. Also remove completed/failed jobs with queue `defaultJobOptions` and avoid starting duplicate workers. Monitor Redis command volume after the change.

