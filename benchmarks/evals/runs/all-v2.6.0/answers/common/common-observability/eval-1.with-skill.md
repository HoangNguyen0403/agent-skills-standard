# Implementing common observability best practices

Use three coordinated signals—structured logs, distributed traces, and RED metrics—to make every request diagnosable without exposing sensitive data.

## Logging and correlation

- Emit JSON structured logs in production through a real logger such as Pino or Zap; do not use `console.log`.
- At the request boundary, extract `X-Request-Id` and/or the W3C `traceparent` header. Create or validate a request correlation value, attach it to async context, and include it in every log emitted during that request.
- Include stable fields such as timestamp, severity, service, environment, route template, HTTP method, status code, duration, request ID, trace ID, and error type.
- Record useful event context, but never log tokens, passwords, credentials, or full request bodies. Redact or hash sensitive identifiers where necessary.

## Tracing

- Instrument services with OpenTelemetry and propagate W3C `traceparent` across HTTP, queues, and other service boundaries.
- Create spans at meaningful boundaries: inbound requests, outbound calls, database operations, and message processing.
- Name HTTP spans with the method and route template, for example `GET /users/:id`, rather than the concrete path `GET /users/123`. This prevents high-cardinality telemetry.
- Add bounded attributes such as status code, dependency name, retry count, and outcome. End spans on every success, error, timeout, and cancellation path; record exceptions before ending error spans.

## Metrics and alerting

Publish the required RED signals for each important service or endpoint:

- request rate (requests per second),
- error rate (5xx and relevant application errors),
- latency histogram with p50, p95, and p99 views,
- saturation, such as CPU, memory, worker queue depth, connection pools, or concurrency utilization.

Use route templates and bounded labels. Define service-level objectives for availability and latency, then alert on multi-window SLO burn rates instead of isolated raw threshold spikes. Dashboards should link metrics to representative traces and logs using trace/request IDs.

Finally, verify the instrumentation itself: test propagation, confirm spans close under failures, check that logs remain valid JSON, inspect label cardinality, and run a redaction test for sensitive fields.
