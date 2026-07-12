Spring Boot uses HikariCP by default in the usual JDBC setup. Configure an explicit pool limit and timeouts in `application.yaml`, for example:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      max-lifetime: 1800000
      pool-name: app-pool
```

Choose `maximum-pool-size` from measured database capacity and expected concurrent queries, not from the number of application threads or pods. Multiply the per-instance pool by the maximum replica count and leave headroom for administration and other services. Tune after observing acquisition latency, active/idle connections, query time, and database saturation.

Keep service reads in `@Transactional(readOnly = true)`, paginate with `Pageable`/`Slice`/`Page`, and avoid holding connections across remote calls. Set `spring.jpa.open-in-view=false` so web rendering cannot unexpectedly keep a transaction/connection open. Use projections when entities are unnecessary and fix N+1 with `JOIN FETCH` or `@EntityGraph`. Store credentials in environment variables or a secret manager, not in committed configuration.


