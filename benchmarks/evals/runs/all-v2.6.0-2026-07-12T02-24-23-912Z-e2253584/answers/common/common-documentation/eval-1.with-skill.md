# Documenting complex retry logic

Add comments that capture the policy and its intent, not a narration of each line. For example:

```ts
/**
 * Retries a transient operation while spreading competing callers over time.
 *
 * The exponential delay limits load during an outage; jitter prevents many
 * workers that failed together from retrying in the same time window. The
 * cap keeps recovery latency bounded, while the retry predicate ensures that
 * permanent failures are surfaced immediately.
 *
 * @param operation The operation whose transient failures may be retried.
 * @param maxAttempts Total attempts, including the initial call.
 * @param baseDelayMs Initial backoff delay before jitter is applied.
 * @param maxDelayMs Upper bound for the exponential delay.
 * @returns The successful operation result.
 * @throws The last error when attempts are exhausted, or immediately for a
 * non-retryable error.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
  maxDelayMs: number,
): Promise<T> {
  // Implementation omitted; keep comments beside policy decisions such as
  // retry classification, delay capping, and jitter calculation.
}
```

If a particular formula is non-obvious, document the invariant near it—for example, that jitter is bounded so the delay never exceeds `maxDelayMs`. Do not add comments merely saying “increment attempt,” “calculate delay,” or “sleep”; those repeat the code and become stale. If the behavior changes, update this policy documentation in the same change.
