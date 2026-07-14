Use a TypeORM `QueryRunner` or an injected `EntityManager` for every multi-step mutation, and pass that manager through all repository operations so they share one transaction.

```ts
const runner = dataSource.createQueryRunner();
await runner.connect();
await runner.startTransaction();
try {
  const users = runner.manager.getRepository(UserEntity);
  await users.save(user);
  await runner.manager.getRepository(AuditEntity).save(audit);
  await runner.commitTransaction();
} catch (error) {
  await runner.rollbackTransaction();
  throw error;
} finally {
  await runner.release();
}
```

Keep the transaction short, avoid external network calls inside it, and never mix the default repository with the transactional manager. Roll back on every failure and keep production schema changes in migrations.

