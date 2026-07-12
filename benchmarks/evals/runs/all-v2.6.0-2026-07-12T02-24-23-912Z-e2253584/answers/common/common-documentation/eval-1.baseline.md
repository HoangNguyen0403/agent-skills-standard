Document the function’s intent, retry policy, and termination behavior rather than narrating every line. For example:

```js
/**
 * Runs an operation until it succeeds or the retry budget is exhausted.
 *
 * The delay grows exponentially from `baseDelayMs`, capped at
 * `maxDelayMs`. Each delay includes bounded random jitter so concurrent
 * callers do not retry in lockstep (thundering-herd prevention).
 *
 * `maxAttempts` includes the initial attempt. Errors from the final attempt
 * are rethrown unchanged; callers can therefore apply their normal error
 * handling. Only errors accepted by `shouldRetry` are retried.
 */
async function retryWithBackoff(operation, {
  maxAttempts = 5,
  baseDelayMs = 100,
  maxDelayMs = 10_000,
  jitterRatio = 0.2,
  shouldRetry = () => true,
} = {}) {
  // Implementation intentionally omitted from the comment example.
}
```

If the actual jitter formula, retryable error classes, or delay cap differs, document those exact rules. Keep the comment updated when the policy changes; avoid stating that all failures are retryable if the implementation excludes validation, authentication, or other permanent errors.
