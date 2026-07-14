Assuming a TypeScript/JavaScript retry function:

```ts
/**
 * Retries an operation using exponential backoff with jitter.
 *
 * JSDoc documents the public API, while inline comments explain why
 * each retry decision exists.
 *
 * @param operation Operation that may temporarily fail.
 * @param maxRetries Maximum number of retries after the initial attempt.
 * @param baseDelayMs Initial backoff duration in milliseconds.
 * @param maxDelayMs Upper bound for the calculated delay.
 * @returns The successful operation result.
 *
 * @example
 * // Usage
 * const result = await retryWithBackoff(() => fetchData(), 5, 100, 10_000);
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number,
  maxDelayMs: number,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Stop retrying once the failure is no longer considered transient.
      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential growth gives a recovering dependency time to stabilize.
      const exponentialDelay = Math.min(
        maxDelayMs,
        baseDelayMs * 2 ** attempt,
      );

      // Jitter prevents many clients from retrying simultaneously—the
      // thundering herd problem—after a shared failure.
      const delay = Math.random() * exponentialDelay;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```
