Add Spring Boot Actuator and expose health groups for Kubernetes probes. Configure liveness and readiness separately so a dependency outage does not necessarily make the process liveness-fail:

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
```

Kubernetes can then use `/actuator/health/liveness` and `/actuator/health/readiness` as HTTP probes. Liveness should answer “can this process recover without a restart?”; readiness should answer “should this pod receive traffic?” Include database or broker checks in readiness only when that dependency is required to serve traffic. Do not put external dependencies in liveness, or a transient outage can cause a restart loop.

Set sensible `initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, `failureThreshold`, and `terminationGracePeriodSeconds` for the actual startup and shutdown behavior. Enable `server.shutdown=graceful` with a bounded timeout so the pod drains requests. Secure other `/actuator/**` endpoints with an administrative role and expose only the probe endpoints publicly. Verify both endpoints against a running container and test dependency-failure transitions.


