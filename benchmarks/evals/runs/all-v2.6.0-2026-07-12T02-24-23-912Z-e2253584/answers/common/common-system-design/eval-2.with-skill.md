Common anti-patterns in system design usually come from blurred boundaries, hidden coupling, and failure-unaware integrations.

The first anti-pattern is the god class or god module. This happens when one service or component owns too many responsibilities such as validation, orchestration, persistence, and external integrations all at once. It becomes hard to test, hard to change safely, and impossible to scale selectively.

Another major anti-pattern is tight synchronous coupling between services. If every workflow requires a chain of live downstream calls, one slow or failing dependency can break the whole request path. This creates cascading failures and turns small incidents into system-wide outages. Cross-service communication should use events or queues when the work does not require an immediate response.

Hardcoding dependencies is another common mistake. When business logic directly instantiates database clients, HTTP clients, or framework objects, the core logic becomes locked to infrastructure details. This violates dependency inversion and makes testing, replacement, and incremental evolution much harder.

Premature abstraction is also harmful. Teams often build elaborate plugin systems, generic frameworks, or microservice splits before the real scaling or variation need exists. That adds complexity without solving a proven problem. Design for the current load and known change paths, then introduce abstraction when there is clear evidence it is needed.

Other common anti-patterns include:

- Leaky layers: presentation, business logic, and data access mixed together
- Multiple sources of truth: duplicated ownership of the same business data
- Non-idempotent retry paths: duplicate processing caused by naive retries
- No versioning: breaking API or schema consumers during change
- Ignoring CAP trade-offs: assuming both perfect consistency and perfect availability during partitions
- No graceful degradation: total failure when a secondary system is unavailable
- Shared resource pools for everything: one noisy dependency starves unrelated traffic
- Hidden failure handling: no timeouts, no circuit breakers, and infinite retries

A particularly dangerous anti-pattern is designing distributed workflows as if the network were reliable and immediate. In reality, calls time out, messages duplicate, partitions happen, and consumers lag. If the design does not account for that, operational failures become business logic failures.

The safer alternative is to keep modules cohesive, use interface-based seams, choose sync vs async communication deliberately, make resilience rules explicit, and document the architectural decisions. Good system design is not about maximum abstraction; it is about clear ownership, controlled dependencies, and predictable behavior under failure.

