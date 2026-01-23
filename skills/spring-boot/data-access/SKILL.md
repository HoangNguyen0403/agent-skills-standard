---
name: Spring Boot Data Access
description: Best practices for JPA, Hibernate, and Database interactions in Spring Boot
metadata:
  labels: [spring-boot, jpa, hibernate, database]
  triggers:
    files: ['**/*Repository.java', '**/*Entity.java']
    keywords: [jpa-repository, entity-graph, transactional, n-plus-1]
options:
  - version: 3.x
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

- **N+1 Selects**: `**No loops in loops**: Fetch eagerly or use graphs.`
- **Logic in Queries**: `**No complex JPQL**: Use Service logic.`
- **Returning Streams**: `**No raw Streams**: Use Lists or Page.`

## References

- [Implementation Examples](references/implementation.md)
