Use the TypeORM `DataSource.transaction` callback or a `QueryRunner`, and perform every operation that must be atomic through the transaction-scoped manager:

```ts
await this.dataSource.transaction(async manager => {
  const account = await manager.findOneByOrFail(Account, { id });
  account.balance -= amount;
  await manager.save(account);
  await manager.insert(LedgerEntry, { accountId: id, amount: -amount });
});
```

Do not use a globally injected repository inside the callback, because it may use a different connection and escape the transaction. Select an appropriate isolation level, keep the transaction short, and let errors escape so TypeORM rolls back. Handle deadlocks/serialization failures with bounded retries where appropriate, enforce database constraints, and avoid external network calls inside the transaction. With a `QueryRunner`, connect, start, commit/rollback, and release it in `try/catch/finally`.

