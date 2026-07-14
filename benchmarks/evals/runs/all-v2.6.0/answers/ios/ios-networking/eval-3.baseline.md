Common iOS networking anti-patterns to avoid:

- Doing network calls on the main thread.
- Ignoring retries, timeouts, and cancellation.
- Not handling offline or poor-network conditions.
- Hardcoding URLs, headers, tokens, or API keys in code.
- Skipping TLS validation or weakening transport security.
- Treating all failures the same instead of separating transport, server, decoding, and auth errors.
- Using loosely typed parsing everywhere instead of clear request/response models.
- Duplicating request logic across the app instead of centralizing it.
- Failing to validate HTTP status codes before decoding response bodies.
- Not managing auth token refresh correctly, causing repeated 401 loops.
- Caching blindly or not caching at all when behavior should be explicit.
- Forgetting to debounce, coalesce, or cancel duplicate requests.
- Hiding networking side effects inside views or view controllers.
- Not testing networking code with mocks/stubs.
- Logging sensitive request or response data in production.

A good rule is to keep networking async, typed, testable, secure, and separated from UI code.

