# Structured logging

Emit one JSON event per line to stdout using Logback with a JSON encoder or the platform's logging agent. Include timestamp, level, service/environment, logger, event/message, trace ID, span ID, request ID, and relevant bounded identifiers. Prefer stable event names and fields over arbitrary prose.

Use MDC for request-scoped correlation values and propagate context across executors and messaging. Clear MDC after work completes. Do not log credentials, tokens, session IDs, request bodies, or unnecessary personal data; redact before serialization. Configure levels externally, retain useful stack traces for unexpected failures, and test that shipped events are valid JSON and correlated.



