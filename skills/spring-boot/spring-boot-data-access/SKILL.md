---
name: spring-boot-data-access
description: Optimize JPA, Hibernate, and database interactions in Spring Boot. Use when implementing JPA entities, repositories, or database access in Spring Boot.
metadata:
  triggers:
    files:
    - '**/*Repository.java'
    - '**/*Entity.java'
    keywords:
    - jpa-repository
    - entity-graph
    - transactional
    - n-plus-1
---
# Spring Boot Data Access

## **Priority: P0**

## Configure JPA and Spring Data

- **Read-Only**: Default to **`@Transactional(readOnly = true)`** on Services to optimize DB resources.
- **Projections**: Use **`Java Records`** for **Read-Only** query results. Avoid fetching full **`@Entity`** objects when not necessary.
- **Pagination**: ALWAYS use **`Pageable`** and **`Slice`** (or `Page`) to prevent loading massive datasets.
- **Spring Data**: Prefer **`JpaRepository`** and **`Query methods`**. Use **`@Query`** with JPQL for complex logic. Use Flyway or Liquibase for migrations; never use `ddl-auto=create` in production.

See [implementation examples](references/implementation.md) for repository projections, EntityGraph, and transactional patterns.

## Optimize Queries and Transactions

- **N+1 Problem**: Fix **`N+1`** selects using **`JOIN FETCH`** (JPQL) or **`@EntityGraph`**.
- **Open-In-View**: Set `spring.jpa.open-in-view=false` in **`application.yaml`**.
- **Bulk Operations**: Use **`@Modifying`** with `@Query` for updates/deletes to bypass EntityManager overhead.
- **Connection Pool**: Configure **`HikariCP`** with explicit `maximum-pool-size`. Tune Hikari pool-size based on expected concurrent queries.

## Anti-Patterns

- **No N+1 Selects**: Use **`JOIN FETCH`** or **`@EntityGraph`** instead of lazy-loading in loops.
- **Entity Inflation**: Don't use `@Data` (Lombok) on Entities as it breaks Proxy and `hashCode`/`equals` performance.
- **Transactional Leak**: Don't put `@Transactional` on public `Repository` methods if `Service` already transactional.
- **Raw SQL**: Avoid native SQL unless JPQL/Criteria API insufficient.

## References

- [Implementation Examples](references/implementation.md)