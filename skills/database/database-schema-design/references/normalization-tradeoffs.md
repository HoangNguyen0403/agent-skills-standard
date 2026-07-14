# Normalization Tradeoffs

## When to normalize

- The related data has independent lifecycle (created/updated/deleted on its own schedule) from its parent.
- Multiple parents can reference the same child row (many-to-one or many-to-many).
- Write frequency on the child is high relative to the parent — normalizing avoids rewriting the whole parent document/row for a child update.
- Strong consistency/uniqueness constraints are needed on the child (a foreign key + unique index enforces integrity the database can guarantee).

## When to denormalize / embed

- The child is always read together with the parent and never accessed independently (e.g. an address embedded in an order snapshot).
- Read latency matters more than storage/update cost, and the embedded data changes rarely relative to reads (read-heavy, write-light).
- Document stores (Mongo) especially: embed when cardinality is bounded and small (an order's line items) — reference when cardinality is large or unbounded (a customer's entire order history).

## Cardinality drives the boundary

- **One-to-few, bounded, always-together**: embed (e.g. an address on an order).
- **One-to-many, unbounded, or independently queried**: separate table/collection with a foreign key or reference.
- **Many-to-many**: always a separate join table/collection with an explicit owner for cleanup (who deletes the join row when either side is deleted).

## Common failure modes

- **Embedding unbounded arrays**: a document that embeds "all comments ever" grows without limit and eventually hits document-size limits or degrades every read of the parent.
- **Normalizing a value object**: splitting `{street, city, zip}` into its own table when it has no independent lifecycle and is never queried alone — this just adds a join for no benefit.
- **Denormalizing for a performance problem that hasn't been measured**: prefer starting normalized and adding a read-optimized denormalized view/cache once a specific query is proven slow (see `database-query-performance`), rather than denormalizing the schema upfront.
