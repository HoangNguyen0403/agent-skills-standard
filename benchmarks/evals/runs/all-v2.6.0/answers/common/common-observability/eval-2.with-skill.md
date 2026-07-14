# Common observability anti-patterns to avoid

- **Plain-text production logging:** Avoid ad hoc strings and `console.log`. They are difficult to query and correlate. Emit JSON through a structured logger.
- **Broken correlation:** Do not drop `X-Request-Id` or W3C `traceparent` at an ingress, async job, queue, or outbound HTTP boundary. Carry correlation through async context and propagate it downstream.
- **No distributed tracing:** Logs alone cannot reliably explain latency across services. Instrument service boundaries with OpenTelemetry and preserve W3C propagation.
- **Dynamic span names:** Avoid names such as `GET /users/123`. Use route templates such as `GET /users/:id`; concrete IDs belong in carefully selected attributes, not span names.
- **Unclosed spans:** Do not return, throw, timeout, or cancel without ending the span. Record the exception and status, then close it in a `finally`-style cleanup path.
- **Sensitive logging:** Never log access tokens, passwords, credentials, or full request bodies. Redact sensitive fields before serialization.
- **Unbounded metric labels:** User IDs, request paths, email addresses, and arbitrary error messages create cardinality explosions. Use bounded dimensions and route templates.
- **Incomplete metrics:** Tracking only traffic or only errors is insufficient. Instrument request rate, error rate, latency histograms with p50/p95/p99 views, and saturation.
- **Raw-threshold alert fatigue:** A single latency or error spike is not an SLO. Alert on SLO burn rates, preferably over multiple windows, so alerts represent meaningful budget consumption.
- **Instrumentation without verification:** Do not assume telemetry works because code compiles. Test propagation, failure-path span cleanup, JSON validity, redaction, and metric cardinality.
