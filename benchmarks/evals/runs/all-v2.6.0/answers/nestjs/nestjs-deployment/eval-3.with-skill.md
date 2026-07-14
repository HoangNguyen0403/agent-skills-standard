Run TypeORM migrations once per release in a Kubernetes init container or a serialized pre-deploy/CI job. Do not run them in `main.ts`, because every application pod may race to apply the same migration.

The migration job should use the production `DataSource`, wait for database connectivity, run `migration:run`, and fail the rollout on error. Keep `synchronize: false`, inspect generated migrations, and use expand-contract changes for zero-downtime compatibility. Init containers are a good fit when each app pod must wait for the schema, while a separate release job is preferable when migrations are long or operationally sensitive.

