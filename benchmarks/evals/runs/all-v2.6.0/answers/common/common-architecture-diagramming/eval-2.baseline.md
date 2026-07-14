# Architecture diagramming anti-patterns

Common anti-patterns make diagrams attractive or comprehensive-looking while reducing their value as an engineering communication tool:

- **The everything diagram.** Putting users, repositories, classes, queues, regions, dashboards, and deployment details on one canvas creates noise and mixes abstraction levels. Use a small set of purpose-specific views instead.
- **Unlabeled arrows.** An arrow may mean a call, data movement, event, dependency, or network route. Without a label and direction, readers infer different behavior. Label important relationships with the operation, protocol, or event and indicate sync versus async behavior.
- **Inconsistent notation.** Reusing the same shape for a person, service, and database—or changing colors and arrow meanings between diagrams—forces readers to guess. Establish a legend and a lightweight notation standard.
- **Pretty but semantically empty diagrams.** Logos, gradients, icons, and decorative infrastructure can hide the absence of boundaries, ownership, interfaces, or runtime behavior. Every element should answer a relevant architectural question.
- **Unstated scope and audience.** A diagram without a title, system boundary, environment, or purpose is easy to misread. State what is included, what is intentionally omitted, and who should use the view.
- **Mixing logical and physical concerns without explanation.** A domain module, a process, and a cloud region are different kinds of things. Separate logical, runtime, and deployment views or clearly mark the transition between them.
- **False precision.** Showing exact replica counts, latency values, IP addresses, or vendor resources when they are unknown or frequently changing gives readers unwarranted confidence. Include details only when verified and relevant; mark assumptions.
- **Missing data ownership and security boundaries.** Showing a database without its owner, a cross-tenant path without tenancy rules, or an external call without authentication and encryption conceals important risks. Mark trust boundaries, sensitive data, and system-of-record responsibilities.
- **Hiding failure behavior.** A happy-path-only flow can imply that every dependency is reliable. For important paths, document timeouts, retries, queues, fallbacks, idempotency, and failure destinations in the diagram or an adjacent sequence/decision view.
- **Stale diagrams treated as authority.** A diagram copied into a slide deck and never updated becomes misleading. Keep editable source in version control, assign ownership, review it with relevant code changes, and include an update date or version.
- **Overloaded legends and tiny text.** If readers need to zoom or decode many colors and line styles, the view is too dense. Simplify the notation, split the diagram, and use text labels for critical semantics.
- **Using diagrams instead of decisions.** A picture does not replace an architecture decision record, interface contract, threat model, or operational runbook. Link the diagram to those artifacts and explain important trade-offs in prose.

The practical test is whether a new reader can identify scope, responsibilities, data flow, boundaries, and the behavior relevant to the decision without an oral tour. If not, simplify the view or create a more focused one.

