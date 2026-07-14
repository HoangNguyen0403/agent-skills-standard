When a workflow creates an order, reserves inventory, and publishes an event, the main question is which parts must succeed or fail together, and which parts can be made reliable through asynchronous recovery.

At a high level:

- Creating the order row and reserving inventory are usually part of the same business state change.
- Publishing the event often should not be done as a direct external side effect inside the same database transaction.

The main things to think about are:

1. Define the true atomic boundary

Ask whether “order created” without “inventory reserved” is valid. In most systems, the answer is no. That means the database writes for:

- inserting the order
- decrementing or reserving stock
- writing any reservation records

should typically happen in one database transaction so they commit together or roll back together.

If either step fails, the transaction should fail so you do not leave a partial state such as:

- an order that looks confirmed but has no stock
- stock reduced without any matching order

2. Avoid publishing to a message broker inside the same fragile unit of work

The hard part is the event. If you publish the event directly during the transaction, several failure modes appear:

- the event is sent, but the database transaction later rolls back
- the database commits, but the event publish fails
- the publish succeeds, but the caller times out and retries, causing duplicates

A normal database transaction usually cannot atomically commit together with an external broker unless you use specialized distributed transaction infrastructure, which is often avoided because it adds complexity and operational risk.

3. Use the transactional outbox pattern

A common design is:

- in one database transaction:
  - create the order
  - reserve inventory
  - insert an outbox record describing the event to publish
- commit
- after commit, a background publisher reads the outbox and sends the event

This gives you an important guarantee: if the order and inventory reservation commit, the event record also exists. If the transaction rolls back, the event record is never created. That keeps database truth and publish intent aligned.

4. Plan for idempotency and duplicate handling

Even with an outbox, event delivery is usually at-least-once, not exactly-once. So:

- event consumers should be idempotent
- the publisher should tolerate retries
- the event should include a stable event ID or order ID

Likewise, the order creation request itself may be retried by clients or upstream services. You may need:

- an idempotency key on the request
- a unique constraint that prevents duplicate order creation

5. Prevent overselling with correct concurrency control

Inventory reservation is usually the concurrency hotspot. If two orders try to reserve the last unit at the same time, you need a strategy that prevents both from succeeding.

Common approaches:

- row-level locking with `SELECT ... FOR UPDATE`
- an atomic update such as `UPDATE inventory SET available = available - ? WHERE sku = ? AND available >= ?`
- optimistic concurrency with a version column

The right choice depends on traffic and contention, but the important point is that the check and the reservation update must be concurrency-safe, not split into separate unsafe steps.

6. Choose isolation level carefully

Think about what anomalies matter:

- dirty reads are usually unacceptable
- lost updates are dangerous for inventory
- non-repeatable reads or write skew can matter depending on schema design

Many systems can work with read committed plus explicit locking on inventory rows. Some need repeatable read or stronger guarantees. The key is to protect the stock reservation invariant, not just to “use a transaction” in name only.

7. Decide the business state model

The order may need intermediate states such as:

- `PENDING`
- `RESERVED`
- `FAILED`
- `CONFIRMED`

Be explicit about what state is written inside the transaction. For example:

- create order as `RESERVED` only if stock reservation succeeds
- or create order as `PENDING`, then move to `RESERVED` in the same transaction

The state model should make partial failures understandable and recoverable.

8. Think about compensation if the full workflow spans services

If inventory is in another service with its own database, you may not be able to do one local transaction for everything. Then this becomes a distributed workflow problem:

- reserve inventory in the inventory service
- create order in the order service
- publish events between them

In that case, think in terms of sagas and compensating actions instead of one ACID transaction. For example, if payment later fails, you may need to release inventory.

9. Make failure recovery explicit

You should know what happens when:

- the transaction fails before commit
- the process crashes after commit but before publish
- the publisher sends the event but crashes before marking the outbox row complete
- the consumer processes the same event twice

A good design is one where each of these cases is expected and recoverable without manual data repair most of the time.

10. Add database constraints to enforce invariants

Application logic alone is not enough. Helpful constraints may include:

- foreign keys between orders and reservations
- unique keys for idempotency
- check constraints preventing negative quantities where appropriate

Constraints help catch bugs and race conditions that slip past service code.

Practical recommendation:

- Put order creation and inventory reservation in one local database transaction.
- Write an outbox event record in that same transaction.
- Publish the event asynchronously after commit.
- Make the publisher and consumers idempotent.
- Protect inventory with locking or atomic conditional updates.

That approach usually gives the best balance of correctness, simplicity, and operability.

