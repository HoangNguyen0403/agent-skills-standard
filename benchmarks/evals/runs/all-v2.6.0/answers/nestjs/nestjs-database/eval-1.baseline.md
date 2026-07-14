Build the TypeORM `DataSource` for the production configuration and run migrations as an explicit release/deployment step, not from every application replica. A typical script is:

```json
{
  "migration:run": "typeorm-ts-node-commonjs -d dist/database/data-source.js migration:run"
}
```

Compile the data-source and migration files into the artifact, use the production database URL, and run `migration:run` in a controlled job or CI/CD step before routing traffic to the new version. Avoid `synchronize: true` in production. Ensure migrations are backward-compatible with the old application during rolling deploys, acquire the database/provider’s migration lock or otherwise serialize execution, and back up/verify rollback strategy. Check exit status and logs; a failed migration should fail the release rather than letting pods start against an incompatible schema.

