Assuming a JavaScript/TypeScript retry function:

```ts
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 5,
  baseDelayMs = 250,
  maxDelayMs = 10_000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Do not wait after the final attempt because no retry will follow.
      if (attempt === maxAttempts - 1) {
        break;
      }

      // Exponential backoff increases the delay after each failed attempt.
      const exponentialDelay = Math.min(
        baseDelayMs * 2 ** attempt,
        maxDelayMs,
      );

      // Full jitter randomizes the delay to prevent synchronized retries
      // from multiple clients overwhelming the service simultaneously.
      const jitteredDelay = Math.random() * exponentialDelay;

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  // Preserve the original failure after all retry attempts are exhausted.
  throw lastError;
}
```
