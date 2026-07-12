Implement Row Level Security by making the database enforce tenant or actor visibility, while the application sets the request context explicitly for each transaction or connection scope. Keep the RLS predicate simple, index-supported, and aligned with real read/write paths.

Recommended design:

1. Put the tenant or ownership column directly on the protected table.
   - Example: `tenant_id uuid not null`
   - Simpler predicates perform better than policies that depend on heavy joins.

2. Enable RLS on the table.

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

3. Create policies for the actual access model.
   - A common pattern is to compare table `tenant_id` to a session setting.

```sql
CREATE POLICY invoices_tenant_select
ON invoices
FOR SELECT
USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY invoices_tenant_modify
ON invoices
FOR ALL
USING (tenant_id = current_setting('app.tenant_id')::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

4. Support the policy with indexes.
   - If most queries are tenant-scoped, index `tenant_id`.
   - If queries also sort or filter within a tenant, use a composite index such as `(tenant_id, created_at)` or `(tenant_id, status, created_at)`.
   - This matters because RLS predicates still need efficient plans.

5. In TypeORM, set the tenant context explicitly before queries run.
   - The safest pattern is to do this inside an explicit transaction or per-request connection scope so one request’s tenant cannot leak into another.

Example with a transaction-scoped setting:

```ts
await dataSource.transaction(async (manager) => {
  await manager.query(`SET LOCAL app.tenant_id = $1`, [tenantId]);

  const invoices = await manager.getRepository(Invoice).find({
    where: { status: 'open' },
    order: { createdAt: 'DESC' },
  });

  return invoices;
});
```

Why `SET LOCAL` helps:

- It limits the setting to the current transaction.
- It reduces cross-request leakage when using pooled connections.

Important boundaries and cautions:

- Do not rely on application-side `where tenant_id = ...` alone for security-sensitive isolation.
- Do not make RLS predicates depend on expensive joins if a direct tenant column can do the job.
- Keep writes in one explicit transaction boundary when the action spans multiple statements.
- Use explicit migrations for RLS setup, policy updates, and supporting indexes.
- Test both allowed and denied access paths, not just happy-path reads.

In short: store the tenant discriminator on the table, enable RLS, define simple indexed policies, and set the tenant context explicitly in TypeORM at the transaction boundary.

