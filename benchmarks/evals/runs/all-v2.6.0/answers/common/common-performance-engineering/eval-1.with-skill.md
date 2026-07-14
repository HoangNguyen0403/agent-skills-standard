Start with a baseline: measure endpoint latency (including p50/p95/p99), database query count and duration, CPU, memory, and payload size for representative users and order counts.

The observed bottleneck is an N+1 query pattern. Replace per-order product lookups with a bounded batch operation:

1. Fetch the user’s orders with pagination and a stable ordering.
2. Extract the distinct product IDs from those orders.
3. Fetch all required products in one query, for example `WHERE id IN (...)`, or use a bulk/data-loader layer that batches requests per request context.
4. Build an in-memory `Map<productId, Product>` and resolve each order’s product references with O(1) lookups.

Select only required columns, enforce a maximum page size, and ensure indexes support the order/user and product-ID predicates. If the same product data is reused across requests, add a cache with an explicit TTL and invalidation strategy; do not use an unbounded cache. Keep database access asynchronous and avoid serial network or filesystem work in the request path.

Re-profile after the change. Confirm query count is constant with respect to the number of orders (typically one orders query plus one products query), p95 latency and database time improve, memory remains bounded, and pagination/load tests do not regress. Add a benchmark or integration test that compares query count and latency as order count grows. Do not claim success from a single fast request without the before/after measurements.
