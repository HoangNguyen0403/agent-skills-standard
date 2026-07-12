To implement Row Level Security (RLS) in PostgreSQL with TypeORM, keep the security enforcement in PostgreSQL and use TypeORM only as the client that sets the right session context.

The core idea is:

- PostgreSQL decides which rows a session can read or modify.
- The application tells PostgreSQL who the current tenant or user is.
- Policies reference that session value.

This is stronger than filtering only in application code because the database itself enforces the rule.

A common multi-tenant design uses a `tenant_id` column on each protected table.

Example table:

```sql
CREATE TABLE invoices (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL
);
```

Enable RLS:

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

Create a policy that only allows access to rows for the current tenant. One common pattern is to store the tenant ID in a PostgreSQL session setting:

```sql
CREATE POLICY invoices_tenant_isolation
ON invoices
USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

For writes, add a `WITH CHECK` policy so inserted or updated rows must also belong to that tenant:

```sql
CREATE POLICY invoices_tenant_write
ON invoices
FOR INSERT, UPDATE
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

You may also choose separate policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` for finer control.

From the TypeORM side, the critical step is setting the session variable before running queries.

Example with a query runner:

```ts
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();

try {
  await queryRunner.startTransaction();

  await queryRunner.query(
    `SELECT set_config('app.tenant_id', $1, true)`,
    [tenantId]
  );

  const invoices = await queryRunner.manager.find(Invoice);

  await queryRunner.commitTransaction();
  return invoices;
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

Why this matters:

- the tenant context must be set on the same database session that executes the protected queries
- connection pooling means you cannot assume one request always gets a fresh connection
- using a query runner or transaction boundary helps ensure the context is applied predictably

Important operational details:

1. Do not rely only on ORM `where` clauses for tenant isolation.
   Those are useful, but they are not a substitute for RLS.

2. Be careful with privileged roles.
   Superusers and roles with `BYPASSRLS` are not constrained by RLS. Your application role should not have that capability.

3. Consider forcing RLS:

```sql
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
```

This helps ensure even the table owner is subject to the policies in normal use.

4. Index the policy columns.

Since policies often filter by `tenant_id`, create an index:

```sql
CREATE INDEX invoices_tenant_id_idx ON invoices (tenant_id);
```

Without this, RLS-protected queries can become slow at scale.

5. Make missing context fail closed.

If `app.tenant_id` is not set, the policy should ideally match no rows or raise an error through your design. Failing closed is safer than returning cross-tenant data.

Entity example in TypeORM:

```ts
@Entity({ name: "invoices" })
export class Invoice {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid", { name: "tenant_id" })
  tenantId!: string;

  @Column("int", { name: "amount_cents" })
  amountCents!: number;

  @Column("text")
  status!: string;
}
```

Best practice structure:

- store `tenant_id` on each protected row
- enable RLS on every tenant-scoped table
- create explicit `USING` and `WITH CHECK` policies
- set tenant context per request on the active DB session
- use a low-privilege application role
- test that one tenant cannot read or write another tenant’s rows

In short: implement RLS in PostgreSQL, not just in TypeORM, and use TypeORM to set per-request session context so PostgreSQL can enforce tenant-safe access automatically.

