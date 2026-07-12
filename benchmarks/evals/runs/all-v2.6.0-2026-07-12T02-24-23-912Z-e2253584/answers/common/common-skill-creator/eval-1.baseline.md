# GraphQL Subscriptions in NestJS Skill

Create a focused `SKILL.md` that teaches an agent how to implement and review GraphQL subscriptions in a NestJS backend. Its description should explicitly trigger on phrases such as “GraphQL subscription,” “real-time GraphQL,” “WebSocket subscription,” and NestJS `@Subscription()` work, while excluding ordinary queries, mutations, and unrelated WebSocket endpoints.

The skill should cover:

1. Confirm the GraphQL driver and transport choice (typically Apollo with `graphql-ws`), then verify compatible package versions and server configuration.
2. Define a typed event payload and GraphQL object type. Keep the subscription field contract separate from the internal event shape when they differ.
3. Implement the resolver with `@Subscription()`, an async iterator or pub/sub abstraction, and a narrowly scoped topic. Avoid a process-local pub/sub implementation when production requires multiple instances; document Redis, NATS, or another shared broker as the appropriate boundary.
4. Authenticate the WebSocket connection during the connection phase, normalize the token from the supported protocol payload, and enforce authorization for each subscription or event where tenant/resource access can change. Never trust client-supplied tenant identifiers.
5. Validate filtering server-side. Use resolver-level filters only when their cost and isolation properties are understood, and prevent cross-tenant event leakage.
6. Handle lifecycle behavior: client reconnects, completion, iterator cleanup, broker errors, backpressure, shutdown, and duplicate delivery semantics. State whether delivery is at-most-once, at-least-once, or otherwise.
7. Add tests for schema exposure, authorized and unauthorized connections, tenant isolation, filtering, publication, cleanup, reconnect behavior, and broker failure. Include an integration test that exercises the real transport rather than only calling resolver methods.
8. Include operational guidance for metrics, structured logs, subscription counts, broker health, timeouts, limits, and graceful shutdown.

The workflow should require checking the existing repository conventions before adding infrastructure, keeping secrets out of configuration and logs, documenting the client protocol, and verifying the result with linting, unit tests, integration tests, and a production-like multi-instance test when relevant. Keep the skill concise and reusable: put only a small illustrative snippet in the body and link or reference detailed examples separately.

