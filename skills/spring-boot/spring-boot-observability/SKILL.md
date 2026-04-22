---
name: spring-boot-observability
description: Instrument Spring Boot with Micrometer metrics, distributed tracing, and structured logging. Use when adding Micrometer metrics, distributed tracing, or structured logging to Spring Boot.
metadata:
  triggers:
    files:
    - 'logback-spring.xml'
    - 'application.properties'
    keywords:
    - micrometer
    - tracing
    - correlation-id
    - mdc
---
# Spring Boot Observability

## **Priority: P0**

## Implementation Workflow

1. Add tracing and metrics dependencies to `pom.xml`
2. Configure `application.yaml` for tracing, actuator, and log correlation
3. Add structured logging with MDC context
4. Verify with `curl localhost:8080/actuator/prometheus` and check trace IDs in logs

## Enable Distributed Tracing

- **Correlation IDs**: Enable trace/span ID injection.
- **Propagation**: Propagate context across threads (`@Async`) and clients.
- **OpenTelemetry**: Use OTel bridge (`micrometer-tracing-bridge-otel`).

See [implementation examples](references/implementation.md) for application.yaml tracing configuration and actuator exposure.

## Configure Structured Logging

- **Format**: Use JSON logging (`logstash-logback-encoder`) in production.
- **MDC**: Use MDC for contextual info (userId, tenantId). Always clear MDC in finally block.
- **Output**: Log to stdout only. Let container handle shipping.

See [implementation examples](references/implementation.md) for structured logging with MDC context and Logstash encoder.

## Secure Actuator Endpoints

- **Security**: Secure `/actuator/**` with Admin role.
- **Probes**: Enable K8s Liveness/Readiness probes.
- **Verify**: Run `curl localhost:8080/actuator/prometheus` to confirm metrics exposed.

## Anti-Patterns

- **No System.out**: Use @Slf4j for all structured logging.
- **No open Actuator**: Secure /actuator/** with Admin role.
- **No DIY tracing**: Use Micrometer with OTel bridge.

## References

- [Implementation Examples](references/implementation.md)