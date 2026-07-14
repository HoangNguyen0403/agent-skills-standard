Use Micrometer Tracing with the OpenTelemetry bridge (`micrometer-tracing-bridge-otel`) and configure the exporter and propagation in `application.yaml`. The trace context must be preserved across inbound requests, outbound clients, message handlers, and `@Async` work; do not generate unrelated IDs by hand.

Use structured JSON logs and include trace/span correlation fields. If request metadata is placed in MDC, clear it in a `finally` block. Log to stdout and let the runtime aggregate it. Expose metrics through Actuator and verify `/actuator/prometheus`, but secure `/actuator/**` and give administrative access only to operators.

Verification should make a request that crosses a service boundary, then confirm the same trace is visible in the downstream service and its logs. Repeat through an async path and an error path, because thread pools, message consumers, and exception handling are common places for propagation or correlation to disappear. Keep metric labels bounded and never include credentials or sensitive payloads in telemetry.


