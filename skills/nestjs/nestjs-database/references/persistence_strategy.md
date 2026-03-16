# Persistence Strategy

## Database Selection Framework

### 1. Data Structure Analysis

- **Relational** (Users, Orders): **PostgreSQL** (Default). ACID, strict schema.
- **Unstructured** (Content, Catalog): **MongoDB**. Flexible schema.
- **Time-Series** (IoT, Metrics): **TimescaleDB**. High write throughput.

### 2. Access Pattern Analysis

- **OLTP** (Transactions): SQL (Postgres/MySQL).
- **OLAP** (Analytics): Columnar (ClickHouse) or Read Replicas.
- **High Throughput Write**: Cassandra or DynamoDB.

## Scaling & Production

### Connection Pooling

- **Problem**: K8s scaling exhausts connection limits.
- **Solution**: Use **PgBouncer** (Postgres) or **ProxySQL** (MySQL) in transaction mode.

### Migrations

- **Safe Execution**: Run via "init container" or CI/CD step.
- **Zero-Downtime**: Expand-Contract pattern.
  1. Expand: Add new column (nullable).
  2. Migrate: Backfill data.
  3. Strict: Deploy code using new column.
  4. Contract: Drop old column.

### Sharding & Partitioning

- **Partitioning**: Use native table partitioning for logs/events.
- **Sharding**: Avoid until >10TB data. Complexity is extreme.
