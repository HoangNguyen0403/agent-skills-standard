# Kubernetes health checks

Add Actuator and enable liveness/readiness probes:

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
```

Spring Boot commonly exposes `/actuator/health/liveness` and `/actuator/health/readiness`. Configure Kubernetes liveness to restart a stuck process and readiness to remove an instance that cannot serve traffic. Do not put external database or broker availability in liveness; dependency outages should normally affect readiness, not restart every pod.

Use a startup probe or suitable initial delay for slow startup. Tune period, timeout, thresholds, and termination grace period, protect actuator access, and test startup, dependency failure/recovery, and graceful shutdown.



