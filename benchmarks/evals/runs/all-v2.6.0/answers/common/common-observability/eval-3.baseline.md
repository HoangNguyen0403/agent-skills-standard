# Quick-Start Observability Example

For a small HTTP service, add a request middleware that creates a trace span, propagates the incoming trace context, and records a structured completion event:

```pseudo
onRequest(request):
    context = extractTraceContext(request.headers)
    with span("http.server", context) as span:
        start = now()
        increment("http.requests", labels={
            service: SERVICE,
            route: request.routeTemplate,
            method: request.method
        })

        try:
            response = handle(request)
            span.set("http.status_code", response.status)
            if response.status >= 500:
                span.recordError("server_error")
            return response
        except error as err:
            span.recordException(err)
            log.error("request_failed", {
                trace_id: span.traceId,
                request_id: request.id,
                route: request.routeTemplate,
                method: request.method,
                error_type: classify(err)
            })
            raise
        finally:
            duration = now() - start
            observe("http.duration_ms", duration, labels={
                service: SERVICE,
                route: request.routeTemplate,
                method: request.method
            })
```

Use route templates such as `/users/{id}`, never the raw URL, as metric labels. Configure the logger and exporter to redact credentials and personal data, send telemetry through a collector, and retain trace context when making outbound calls:

```pseudo
with span("orders.reserve", parent=currentContext()) as span:
    headers = injectTraceContext({})
    result = http.post("inventory/reservations", headers=headers)
```

Then create one dashboard showing request rate, error rate, latency percentiles, dependency failures, and saturation. Define an SLO such as “99.9% of successful requests complete within 500 ms over 30 days,” and alert only when the observed error-budget burn is actionable. Finally, test a request through the service and dependency to confirm that the log, metric, and trace share the expected service name and trace ID.
