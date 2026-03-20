---
name: spring-boot-data-access
description: "Best practices for JPA, Hibernate, and Database interactions in Spring Boot. Use when implementing JPA entities, repositories, or database access in Spring Boot. (triggers: **/*Repository.java, **/*Entity.java, jpa-repository, entity-graph, transactional, n-plus-1)"
---

# Spring Boot Data Access

## **Priority: P0**

## Implementation Guidelines

### JPA & Hibernate

- **Read-Only**: Default to `@Transactional(readOnly = true)` on Services. Override only on write methods.
- **Projections**: Use Java Records for read-only queries. Avoid fetching full Entities.
- **Pagination**: ALWAYS use `Pageable` for collections.
- **Open-In-View**: Set `spring.jpa.open-in-view=false` to detect lazy loading issues early.

### Query Optimization

- **N+1 Problem**: Use `JOIN FETCH` (JPQL) or `@EntityGraph` for relationships.
- **Bulk Operations**: Use `@Modifying` for batch updates/deletes to bypass Entity overhead.

## Anti-Patterns

- **No N+1 Selects**: Use JOIN FETCH or @EntityGraph instead of lazy loops.
- **No complex JPQL**: Move business logic to the Service layer.
- **No raw Stream returns**: Return List or Page<T> from repositories.

## References

- [Implementation Examples](references/implementation.md)
