# GraphQL Subscriptions for NestJS

Create a compact skill with frontmatter using a precise What + When description. Cover NestJS GraphQL subscription resolvers, WebSocket transport, typed async iterators, PubSub topic ownership, connection authentication, subscription-time authorization, tenant isolation, event publication after commit, unsubscribe/disconnect cleanup, multi-instance broker choice, observability, and integrated transport tests. Use surgical triggers such as `*.resolver.ts`, `graphql subscriptions`, `PubSub`, and `WebSocket`.

Required workflow: confirm driver, schema mode, transport, broker, and event contract; define explicit schema nullability and shared payload types; centralize topics; authenticate and authorize before returning an iterator; never trust client tenant IDs; publish validated events after commit; dispose listeners on every lifecycle path; test filtering, reconnects, malformed connection parameters, isolation, and end-to-end delivery.

Keep the body under 100 lines. Put transport setup, adapter code, schemas, and examples longer than 10 lines in `references/`. Include pressure-tested red flags: “subscriptions are just queries,” “in-memory PubSub is fine in production,” and “the client can provide the tenant.” Acceptance requires schema/type parity, authorized delivery, cleanup evidence, and a passing integrated transport test. Run with-skill/baseline and trigger evaluations before release.

