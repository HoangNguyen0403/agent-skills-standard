Do not let Redis failure from a global throttler or producer become an unhandled HTTP error. Make the throttler storage fail open: catch every Redis error and return a pass-through increment result, so a Redis outage does not reject all routes. For producers, persist the database record first and wrap `queue.add()` in `try/catch`; record or retry the enqueue failure separately.

Configure processors with `drainDelay`, `stalledInterval`, and `maxStalledCount`, and extend the shared `BaseProcessor` to rate-limit raw worker Redis errors. When Redis is disabled, conditionally register the queue and provide the `getQueueToken()` mock expected by Nest DI. Use local Redis in development and add health/metrics signals so the degraded protection is visible.

