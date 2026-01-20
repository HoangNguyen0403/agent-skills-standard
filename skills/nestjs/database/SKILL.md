---
name: NestJS Database
description: Data access patterns, Scaling, Migrations, and ORM selection.
metadata:
  labels: [nestjs, database, typeorm, prisma, mongodb]
  triggers:
    files: ['**/*.entity.ts', 'prisma/schema.prisma']
    keywords: [TypeOrmModule, PrismaService, MongooseModule, Repository]
---

# NestJS Database Standards

## **Priority: P0 (FOUNDATIONAL)**

Database integration patterns and ORM standards for NestJS applications.

## Selection Framework

### 1. Data Structure Analysis (The "What")

- **Structured & Highly Related**: Users, Orders, Inventory, Financials.
  - **Choice**: **PostgreSQL** (Default).
  - _Why_: Strict schema validation, ACID transactions, complex generic queries (Joins).
- **Unstructured / Polymorphic**: Product Catalogs (lots of unique attributes), CMS Content, Raw JSON blobs.
  - **Choice**: **MongoDB**.
  - _Why_: Schema flexibility, fast development speed for flexible data models.
- **Time-Series / Metrics**: IoT Sensor Data, Stock Prices, Server Logs.
  - **Choice**: **TimescaleDB** (Postgres Extension).
  - _Why_: Compression, hypertable partitioning, rapid ingestion.

### 2. Access Pattern Analysis (The "How")

- **Transactional (OLTP)**: "User buys items to cart".
  - **Requirement**: Strong Consistency (ACID). **SQL** is mandatory.
- **Analytical (OLAP)**: "Dashboard showing sales trends".
  - **Requirement**: Aggregation speed. Columnar storage (ClickHouse) or Read Replicas.
- **High Throughput Write**: "1M events/sec".
  - **Requirement**: Append-only speed. **Cassandra** / **DynamoDB** (Leaderless replication).

### 3. Decision Matrix

| Feature Needed         | Primary Choice    | Alternative            |
| :--------------------- | :---------------- | :--------------------- |
| General Purpose App    | **PostgreSQL**    | MySQL                  |
| Flexible JSON Docs     | **MongoDB**       | PostgreSQL (JSONB)     |
| Search Engine          | **ElasticSearch** | PostgreSQL (Full Text) |
| Financial Transactions | **PostgreSQL**    | (None)                 |

## Patterns

- **Repository Pattern**: Isolate database logic.
  - **TypeORM**: Inject `@InjectRepository(Entity)`.
  - **Prisma**: Create a comprehensive `PrismaService`.
- **Abstraction**: Services should call Repositories, not raw SQL queries.

## Configuration (TypeORM)

- **Async Loading**: Always use `TypeOrmModule.forRootAsync` to load secrets from `ConfigService`.
- **Sync**: Set `synchronize: false` in production; use migrations instead.

## Scaling & Production

- **Read Replicas**: Configure separate `replication` connections (Master for Write, Slaves for Read) in TypeORM/Prisma to distribute load.
- **Connection Multiplexing**:
  - **Problem**: Scaling K8s pods to 100+ exhausts DB connection limits (100 pods \* 10 connections = 1000 conns).
  - **Solution**: Use **PgBouncer** (Postgres) or **ProxySQL** (MySQL) in transaction mode. Do NOT rely solely on ORM pooling.
- **Migrations**:
  - **NEVER** run `synchronize: true` in production.
  - **Execution**: Run migrations via a dedicated "init container" or CD job step. Do **NOT** auto-run inside the main app process on startup (race conditions when scaling to multiple pods).
- **Soft Deletes**: Use `@DeleteDateColumn` (TypeORM) or middleware (Prisma) to preserve data integrity.

## Architectures (Multi-Tenancy & Sharding)

- **Column-Based (SaaS Standard)**: Single DB, `tenant_id` column.
  - _Scale_: High. _Isolation_: Low.
  - _Code_: Requires Row-Level Security (RLS) policies or strict `Where` scopes.
- **Schema-Based**: One DB, one Schema per Tenant.
  - _Scale_: Medium. _Isolation_: Medium. Good for B2B.
- **Database-Based**: One DB per Tenant.
  - _Scale_: Low (max ~500 tenants per cluster). _Isolation_: High.
  - _Code_: Requires "Connection Switching" middleware. Complex.
- **Horizontal Sharding**:
  - **Logic**: Shard massive tables by a key (e.g. `user_id`) across physical nodes to exceed single-node write limits.
  - **Complexity**: Extreme. Avoid until >10TB data. Use "Partitioning" first.
- **Partioning (Postgres)**:
  - **Strategy**: Use native Table Partitioning (e.g., by range/date) for massive tables (Logs, Audit, Events).
  - **App Logic**: Ensure partition keys (e.g., `created_at`) are included in `WHERE` clauses to enable "Partition Pruning".

## Migrations & Data Evolution

- **Separation**:
  - **Schema Migrations (DDL)**: Structural changes (`CREATE TABLE`, `ADD COLUMN`). Fast. Run before app deploy.
  - **Data Migrations (DML)**: transforming data (`UPDATE users SET name = ...`). Slow. Run as background jobs or separate scripts purely to avoid locking tables for too long.
- **Zero-Downtime Field Migration (Expand-Contract Pattern)**:
  1. **Expand**: Add new column `new_field` (nullable). Deploy App v1 (Writes to both `old` and `new`).
  2. **Migrate**: Backfill data from `old` to `new` in batches (background script).
  3. **Contract**: Deploy App v2 (Reads/Writes only `new`). Drop `old_field` in next schema migration.
- **Seeding**:
  - **Dev**: Use factories (`@faker-js/faker`) to generate mock data.
  - **Prod**: Only seed static dictionaries (Roles, Countries) using "Upsert" logic to prevent duplicates.

## Best Practices

1. **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
2. **Indexing**: Define indexes in code (decorators/schema) for frequently filtered columns (`where`, `order by`).
3. **Transactions**: Use `QueryRunner` (TypeORM) or `$transaction` (Prisma) for all multi-step mutations to ensure atomicity.
