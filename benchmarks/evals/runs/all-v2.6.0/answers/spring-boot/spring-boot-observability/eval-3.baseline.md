# Distributed tracing

Use Spring Boot 3's Micrometer Tracing integration with an OpenTelemetry or Brave bridge and export through OTLP to a collector/backend. Configure endpoint, service name, sampling, and credentials externally. Let Spring instrument inbound HTTP and use auto-configured RestClient/WebClient, messaging, and other instrumented components for propagation.

Create server spans, propagate W3C trace context, and create child spans for dependency calls. Add bounded operation/outcome attributes and no secrets or sensitive personal data. Correlate logs with trace and span IDs, record errors, and test paths across services and asynchronous boundaries. Exporter failure should be observable without taking down business traffic.



