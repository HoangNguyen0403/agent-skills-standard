# Database connection pooling

Spring Boot uses HikariCP by default. Configure `spring.datasource.hikari` with values such as `maximum-pool-size`, `minimum-idle`, `connection-timeout`, `idle-timeout`, and `max-lifetime`.

Size the pool from measured database capacity and concurrency, accounting for every application instance and other clients; a larger pool can overload the database. Keep acquisition timeout below the request timeout, set max lifetime below the database/network lifetime, and use TLS and least-privilege credentials. Monitor active, idle, pending, timeout, and acquisition-latency metrics. Align transaction and statement timeouts with request and pool budgets.



