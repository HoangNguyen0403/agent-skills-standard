Keep the update in a database transaction and roll it back when the operation fails. If all mutations are in one transaction, the database provides the atomicity needed to prevent a partially applied update:

```python
try:
    with connection:
        with connection.cursor() as cursor:
            update_state(cursor)
            update_related_row(cursor)
except DatabaseError:
    # The context manager has rolled back; report or retry the failure.
    raise
```

Do not report success after an exception. If some work was already committed, or the mutation crossed an external system boundary, a database rollback cannot undo it; record the state clearly and use an idempotent retry, compensating action, outbox, or reconciliation workflow as appropriate.
