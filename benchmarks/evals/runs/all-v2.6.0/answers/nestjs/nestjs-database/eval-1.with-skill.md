Generate and review an explicit migration whenever an entity changes, with production `synchronize: false`. Run migrations from CI/CD or a Kubernetes init container before application pods start, not from `main.ts` in every replica.

```sh
pnpm migration:generate -- -d dist/database/data-source.js src/migrations/AddIndex
pnpm migration:run -- -d dist/database/data-source.js
```

Use production credentials/configuration in the migration job, inspect the generated SQL, and make destructive changes expand-contract: add the new shape, backfill, deploy compatible code, then remove the old shape later. Track migration metadata and ensure only one migration runner applies them.

