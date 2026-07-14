Add Spring Boot Actuator and the Prometheus registry, then expose the Prometheus endpoint deliberately:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
```

Scrape `/actuator/prometheus` from the metrics system and verify it with:

```bash
curl http://localhost:8080/actuator/prometheus
```

Do not expose all Actuator endpoints indiscriminately. Secure `/actuator/**` with an administrative role or isolate the management port/network path, while allowing only the health endpoints required by platform probes. Add application metrics with low-cardinality tags; never use unbounded user IDs, URLs, or request values as metric labels.

For a production service, combine metrics with Micrometer tracing and structured JSON logs so operators can move from a metric to a trace and correlated log. Validate that the endpoint is reachable by the scraper, that authentication/network policy is correct, and that the application does not publish secrets or sensitive configuration through management endpoints.


