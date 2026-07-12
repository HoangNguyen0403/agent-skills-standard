Use Spring Data JPA when the application is primarily aggregate-oriented CRUD and benefits from entity mapping, repositories, and a unit-of-work model. It is the default fit for the conventions in this skill: prefer `JpaRepository` and derived query methods, use JPQL or `@EntityGraph` for complex access, and return record projections when a full entity is unnecessary.

Choose jOOQ when the workload is SQL-heavy and needs precise vendor-specific SQL, complex reporting, or compile-time SQL shape. It gives more query control, but introduces a different access style and does not remove the need for service transaction boundaries and typed API DTOs. A mixed approach can be valid when the boundary is explicit; do not expose persistence types through controllers.

Whichever tool you choose, keep migrations in Flyway or Liquibase and never use `ddl-auto=create` in production. Set `spring.jpa.open-in-view=false`, use `@Transactional(readOnly = true)` for read services, paginate with `Pageable`/`Slice`/`Page`, and inspect queries for N+1 problems. Fix N+1 with `JOIN FETCH` or `@EntityGraph`; avoid Lombok `@Data` on entities because of proxy and equality performance issues.


