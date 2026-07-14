# Database migrations

Use Flyway or Liquibase. With Flyway, place ordered scripts such as `db/migration/V1__create_users.sql` under the migration location; applied versions and checksums are recorded in its history table. Liquibase provides changelogs and rollback metadata.

Run migrations at startup for simple controlled deployments or as a separate release job when schema changes should be independently controlled. Never edit an applied migration; add a new one. Make rolling deployments compatible: add structures before code uses them, then remove old structures later. Review destructive changes, test against a production-like database, coordinate locks and permissions, and back up data before risky operations.



