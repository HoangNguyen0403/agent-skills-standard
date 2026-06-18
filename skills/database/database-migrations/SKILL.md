---
name: database-migrations
description: Plan additive, zero-downtime schema migrations with rollout, backfill, and rollback awareness. Use when renaming columns, backfilling data, or shipping risky database changes.
metadata:
  triggers:
    files:
    - '**/migrations/*.sql'
    - 'prisma/schema.prisma'
    - '**/*.entity.ts'
    keywords:
    - migration
    - backfill
    - rollout
    - rename column
    - zero downtime
---
# Database Migrations

## **Priority: P0 (FOUNDATIONAL)**

Use expand -> backfill -> contract for risky changes.

## Rules

- Ship additive schema first.
- Backfill with resumable logic and visibility.
- Flip reads/writes only after new shape is populated.
- Drop old columns or indexes in a later safe step.

## Verify

- [ ] Migration can run without taking the app offline.
- [ ] Backfill ownership, batching, and monitoring are defined.
- [ ] Rollback or pause strategy exists.
- [ ] Old and new code paths can coexist during rollout.

## Anti-Patterns

- **No destructive one-shot rename**: expand and migrate first.
- **No hidden backfill**: long data moves need explicit plan and observability.
- **No app deploy coupling by accident**: schema and code rollout order must be clear.

## References

- [Framework Map](../references/framework-map.md)
