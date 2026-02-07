# RLS Migration Patterns

All migrations creating child-centric tables should follow this pattern.

## Standard RLS template

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Table
    await queryRunner.query(`
        CREATE TABLE "my_table" ( ... "childId" uuid, ... )
    `);

    // 2. Enable RLS
    await queryRunner.query(`ALTER TABLE "my_table" ENABLE ROW LEVEL SECURITY;`);

    // 3. Create Policy (Family-Based)
    await queryRunner.query(`
        CREATE POLICY "My table access policy" ON "my_table"
        FOR ALL
        TO public
        USING (
            EXISTS (
                SELECT 1 FROM "family_members" fm
                JOIN "children" c ON c."id" = fm."childId"
                WHERE c."id" = "my_table"."childId"
                AND fm."userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
            )
        );
    `);
}
```
