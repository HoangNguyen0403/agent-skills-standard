---
name: Rails Best Practices
description: Practical Rails conventions for correctness, concurrency, and maintainability.
metadata:
  labels: [rails, best-practices, transactions, locking]
  triggers:
    files: ['app/**/*.rb', 'config/application.rb', 'Gemfile']
    keywords: [transaction, with_lock, lock!, ActiveRecord::Base, after_commit]
---

# Rails Best Practices

## **Priority: P0 (CRITICAL)**

Prevent data corruption and race conditions while keeping Rails code maintainable.

## Transactions

- **Use `transaction` for invariants**: Wrap multi-write business operations in a single `ActiveRecord::Base.transaction`.
- **Keep it short**: No external IO (HTTP/email/queue) inside transactions.
- **Nested transactions**: Do not rely on nested `transaction` for isolation; understand savepoints and rollback behavior.
- **After commit side effects**: Prefer enqueue/send after commit; avoid side effects that may run and then rollback.

## `with_lock` (Pessimistic Locking)

- **Default rule**: If you do read-modify-write on shared state, use `with_lock`.
- **Lock the smallest thing**: Lock the single row you mutate; avoid wide locks.
- **Order locks**: If locking multiple rows, lock in a stable order to reduce deadlocks.

## Safer Updates

- **Atomic operations**: Prefer atomic updates (`increment_counter`, `update_all`) for counters.
- **Optimistic locking**: Use `lock_version` where appropriate to detect lost updates (especially on admin edits).

## Anti-Patterns

- **TOCTOU**: Checking a condition outside the transaction and assuming it stays true.
- **Long locks**: Holding locks while doing network calls or heavy computation.
- **Silent retries**: Retrying on any error without bounds or observability.


