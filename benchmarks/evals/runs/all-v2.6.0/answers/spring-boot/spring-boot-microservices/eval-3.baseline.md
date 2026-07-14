# Distributed tracing

For Spring Boot 3, use Micrometer Tracing with an OpenTelemetry or Brave bridge and export to an OpenTelemetry Collector or backend such as Jaeger or Tempo. Instrument inbound HTTP, outbound HTTP, messaging, and database boundaries with supported integrations.

An incoming request should create a trace, propagate W3C `traceparent` to downstream services, and create child spans for dependency calls. Use auto-configured clients so propagation is retained. Add bounded attributes such as route and dependency name, never tokens or personal data. Correlate logs with trace/span IDs, choose sampling intentionally, secure collector connections, and verify traces across multiple services for success, timeout, and error paths.



