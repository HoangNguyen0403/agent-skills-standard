# Common Observability Anti-Patterns

- **Logging unstructured prose only.** Free-form messages are difficult to query and correlate. Use structured fields and stable event names, while keeping a concise human-readable message when useful.
- **Logging secrets or sensitive data.** Passwords, tokens, authorization headers, payment data, and unnecessary personal information can create a security and compliance incident. Redact at the source and enforce export-side filters as a second layer.
- **Using unbounded metric labels.** User IDs, request IDs, full URLs, exception text, and arbitrary query values create a time-series explosion and high costs. Put such values in logs or traces, and use bounded categories for metrics.
- **Recording every event at full fidelity forever.** Unlimited logs and traces increase cost, noise, and privacy exposure. Use appropriate levels, tail or priority sampling, retention tiers, and deliberate debug-mode controls.
- **Collecting telemetry without correlation.** Separate request IDs, trace IDs, and inconsistent field names make one incident require manual reconstruction. Propagate a standard context and include it in logs, spans, and relevant responses.
- **Instrumenting infrastructure but not user outcomes.** CPU and memory can look healthy while checkout, login, or message delivery is failing. Pair resource metrics with request success, latency, business completion, and dependency health.
- **Alerting on every threshold.** Low-value alerts cause fatigue and eventually get ignored. Alert on actionable symptoms tied to SLO impact, add severity and ownership, and link to a runbook.
- **Ignoring asynchronous work.** Queues and background jobs often lose request context or hide delayed failures. Propagate context where appropriate and measure enqueue-to-start, processing, retry, age, and dead-letter behavior.
- **Relying only on automatic instrumentation.** Framework instrumentation shows technical calls but may not reveal why a business decision failed. Add carefully named domain spans and outcome metrics at important workflow boundaries.
- **Making observability a single point of failure.** Telemetry exporters must be bounded, asynchronous where appropriate, and fail-safe. A collector outage should degrade visibility, not block requests or exhaust application resources.
- **Changing schemas casually.** Renaming fields, service identities, or label values breaks dashboards and queries. Version shared schemas, document ownership, and provide migration periods.
- **Treating dashboards as the solution.** A dashboard without an SLO, an investigative question, or an owner becomes decoration. Design views for detection and diagnosis, and test them during incidents.
