---
name: nestjs-search
description: Integrate Elasticsearch and implement search index Sync patterns in NestJS. Use when integrating Elasticsearch or implementing search index sync in NestJS.
metadata:
  triggers:
    files:
    - '**/*.service.ts'
    - '**/search/**'
    keywords:
    - Elasticsearch
    - CQRS
    - Synchronization
---
# Search Engine & Full-Text

## **Priority: P1 (OPERATIONAL)**

- **Pattern**: **CQRS (Command Query Responsibility Segregation)**.
 - **Write**: To Primary Database (Postgres/MySQL). Source of Truth.
 - **Read (Complex)**: To Search Engine (Elasticsearch, OpenSearch, MeiliSearch). Optimized for filtering, fuzzy search, and aggregation.

## Synchronization ( Hard Part)

- **Dual Write (Anti-Pattern)**: `await db.save(); await es.index();`.
 - _Why_: Partial failures leave data inconsistent. Slows down HTTP response.
- **Event-Driven (Recommended)**:
 1. Service writes to DB.
 2. Service emits `EntityUpdated`.
 3. Event Handler (Async) pushes to Queue (BullMQ).
 4. Worker indexes document to Search Engine with retries.
- **CDC (Golden Standard)**: Change Data Capture (Debezium). Connects directly to DB transaction log. No app conceptual overhead, but higher ops complexity.

## Organization

- **Module**: Encapsulate client in `SearchModule`.
- **Abstraction**: Create generic `SearchService<T>` helpers.
 - `indexDocument(id, body)`
 - `search(query, filters)`
- **Mapping**: Use `class-transformer` to map Entities to "Search Documents". Keep docs flatter than relational entities.

## Testing

- **E2E**: not mock search engine in critical E2E flows.
- **Docker**: Spin up `elasticsearch:8` container in test harness to verify indexing works.

## Anti-Patterns

- **No dual writes to DB + ES**: Use event-driven or CDC pattern; dual writes risk partial failure inconsistency.
- **No Elasticsearch for structured queries**: Use DB indexes for filtering; ES for full-text and complex search.
- **No ES mocks in E2E search tests**: Spin up `elasticsearch:8` container to verify indexing behavior accurately.