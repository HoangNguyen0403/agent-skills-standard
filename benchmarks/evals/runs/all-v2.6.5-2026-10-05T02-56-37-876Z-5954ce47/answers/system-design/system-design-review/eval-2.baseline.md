A Go rewrite with microservices may help, but it is unlikely to fix checkout latency by itself. First measure the current flow: p50/p95/p99 latency, database queries, external payment/tax/inventory calls, contention, and error/retry behavior.

I’d recommend:

1. Profile the existing checkout end to end and set an explicit latency target.
2. Fix high-confidence bottlenecks first: indexes, query batching, connection pools, caching, parallel independent calls, and timeouts.
3. If the domain is tightly coupled, extract clear modules from the current service before splitting deployments.
4. Use microservices only where independent scaling or ownership justifies the added network, consistency, observability, and deployment complexity.
5. If rewriting, migrate incrementally behind an API boundary or strangler pattern; keep checkout behavior and payment/idempotency guarantees unchanged.
6. Consider Go for predictable concurrency and efficient resource use, but benchmark it against an optimized implementation in the current stack.

A sensible target architecture might separate checkout orchestration from payment, inventory, pricing, and order persistence, with explicit deadlines, idempotency keys, tracing, metrics, retries only where safe, and an outbox/event mechanism for asynchronous post-checkout work.

Assumption: the slowdown is caused by runtime or dependency bottlenecks rather than an inherently expensive business workflow. Without profiling, a full rewrite is a high-risk investment; start with measurement and an incremental extraction plan.
