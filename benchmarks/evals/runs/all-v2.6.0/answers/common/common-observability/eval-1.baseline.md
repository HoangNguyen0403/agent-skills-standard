# Implementing Common Observability Best Practices

Treat observability as the ability to explain why a system behaved a certain way using correlated logs, metrics, and traces. Start by defining the important user journeys and service-level objectives, then instrument the boundaries and failure paths that affect those objectives.

## Core practices

1. **Instrument the three signals.**
   - **Metrics:** Counters for requests, errors, and events; gauges for current state; histograms for latency, size, and queue age. Use stable, bounded labels such as service, route template, method, status class, and deployment version.
   - **Logs:** Emit structured JSON with a timestamp, severity, service, environment, event name, outcome, and correlation identifiers. Log once at the layer that can add useful context, and include actionable error details without secrets or personal data.
   - **Traces:** Create spans for inbound requests, outbound HTTP/RPC calls, database operations, queues, and meaningful business operations. Propagate trace context across process and asynchronous boundaries.

2. **Make telemetry consistent.** Define a shared schema for resource attributes, service names, request IDs, trace IDs, error fields, and timestamps. Use automatic instrumentation where reliable, then add manual spans and domain events around business decisions that infrastructure instrumentation cannot explain.

3. **Control cost and cardinality.** Prefer route templates over raw URLs, categories over arbitrary user input, and sampled traces over unlimited collection. Apply retention and sampling policies by environment and by incident value. Never use high-cardinality identifiers as metric labels.

4. **Secure the data.** Minimize collection, redact tokens and credentials before export, avoid unnecessary personal data, restrict access by role, encrypt transport and storage, and define retention/deletion rules. Treat telemetry as production data, not as harmless debug output.

5. **Turn signals into operations.** Build dashboards around SLOs and user outcomes rather than individual hosts. Alert on symptoms such as error-budget burn, unavailable traffic, sustained latency, queue growth, and saturation. Each alert should identify impact, provide a runbook link, and have a clear owner.

6. **Validate continuously.** Test instrumentation in unit or integration tests, verify context propagation across representative calls, monitor telemetry pipeline health, and review dashboards and alerts after releases. Ensure telemetry degradation does not break the application.

A practical implementation order is: establish naming and data conventions; instrument ingress and egress; add error and business metrics; enable trace propagation; centralize collection; create SLO dashboards and alerts; then tune sampling, retention, and privacy controls using real traffic.
