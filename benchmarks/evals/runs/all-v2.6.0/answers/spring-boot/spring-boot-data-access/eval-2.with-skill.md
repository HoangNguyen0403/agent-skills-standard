Use Flyway or Liquibase for versioned, reviewable migrations. Keep each migration immutable and apply it as part of deployment before code that depends on the new schema. For example, with Flyway add the Spring Boot Flyway integration and place migrations under `db/migration` using names such as `V1__create_orders.sql` and `V2__add_status.sql`.

Keep schema ownership and migration history with the service. Do not use `spring.jpa.hibernate.ddl-auto=create` in production; it can destroy or recreate data. Prefer a non-destructive setting such as `validate` (or a deliberately managed `none`) so Hibernate checks rather than owns production schema evolution. Test migrations against the real database engine, including clean installation and upgrade-from-current-version paths.

Database changes should be backward compatible during rolling deployment: add nullable/new structures first, deploy code that can read both shapes if needed, backfill, then enforce constraints or remove old fields later. Put transaction boundaries in services, use `@Transactional(readOnly = true)` for reads, and ensure migration failures stop deployment rather than being silently ignored.


