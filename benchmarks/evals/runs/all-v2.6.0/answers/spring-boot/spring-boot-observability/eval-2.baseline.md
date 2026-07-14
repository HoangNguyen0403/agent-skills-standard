# Prometheus metrics

Add Actuator and `micrometer-registry-prometheus`, then expose the endpoint as needed:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
```

Prometheus can scrape `/actuator/prometheus`. Protect the endpoint or use network policy as appropriate. Use counters for events, gauges for current state, and timers/distributions for latency. Add custom metrics through `MeterRegistry` or observations, but keep labels low-cardinality: never use user IDs, raw URLs, or unbounded error messages as tags. Define histogram and alert policies deliberately and verify scrape failures, instance labels, and dashboards.



