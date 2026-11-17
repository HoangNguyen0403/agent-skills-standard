# System Design Framework Map

Reviewed: 2026-11-16

## Delivery Disclosure & Scope Boundary

- **Registry-Backed Only**: This navigation guide is delivered from the canonical repository registry via MCP `get_category_guide`.
- **Installed-Host Limitation**: Inspected sync and packaging tools do not replicate category-root `references/framework-map.md` files into separately installed agent host directories. Universal host synchronization is not claimed.
- **Authority & Discovery**: Resolving architecture guidance identifies applicable standards; it does not confer autonomous implementation authority or spawn worker agents.

---

## Role & Surface Map

| Role / Surface | Primary Owner | Focus & Invariants | When to Load |
| --- | --- | --- | --- |
| **Facilitator (Broad Entry)** | `system-design-methodology` | Classify mode, depth, and surface; trace logical flows before physical binding; price null option. | Broad architecture queries, system design sessions, "system architect" requests. |
| **Bounded Specialist** | `specialist-system-architect` (specialist) | Deep dive on single risky component/flow; evaluate viable candidate approaches; failure mode analysis; bounded tool budget. | Deep dive on a single component or flow with caller-supplied constraints. |
| **Approved Contract Route** | `design-solution` (workflow) | Elaborate technical requirements, architecture, API/event/data contracts, and verification from an approved PRD or product goal under recorded authority gates. | Approved PRD or feature brief ready for delivery contracts; do not blanket restart already-approved work with methodology intake. |
| **Artifact Intake** | `system-design-artifact-intake` | Parse external diagrams, Draw.io, PlantUML, Excalidraw, whiteboard photos, architecture screenshots. | Architecture diagrams, image reviews, or external visual artifacts. |
| **Design Evaluation** | `system-design-review` | Scorecard, semantic soundness evaluation, evolution roadmap. | System design review, scalability audit, pre-implementation gate. |
| **Interview Prep** | `system-design-interview-coaching` | Time-budgeted practice rounds, practice rubric, whiteboard rules. | Interview practice, mock rounds, candidate coaching. |

---

## Conditional Sibling Skills

Do not load every sibling skill upfront. Load conditionally when a surface or risk is identified during Phase 0/Phase 3:

- **Data / Storage Paths**: Load `system-design-data-architecture` when consequential data flows, partitioning, replication, tenant isolation, or polyglot persistence shape the decision.
- **Client & Device Surfaces**: Load `system-design-mobile-client` for mobile apps, SDKs, client authority, lifecycle, or offline synchronization.
- **Scale & Sizing Constraints**: Load `system-design-estimation` when quantitative traffic, storage, or bandwidth thresholds shape architectural choices; do not demand irrelevant metrics for stateless/client components.
- **Core Principles & Modularity**: Load `system-design-principles` for microservice boundaries, coupling, clean architecture, or idempotency rules.
- **Infrastructure Blocks**: Load `system-design-building-blocks` for standard components (load balancers, CDN, caches, rate limiters, pub/sub).
- **Distributed Coordination**: Load `system-design-integration-patterns` for durable execution, sagas, CQRS, event sourcing, or transactional outbox.
- **Operations & Availability**: Load `system-design-resilience-ops` for failover, disaster recovery, RPO/RTO, multi-region setups, and rollout strategies.
- **Protocols & Transport**: Load `system-design-communication` for gRPC vs REST vs GraphQL, WebSockets, or SSE trade-offs.
- **Production Reference Patterns**: Load `system-design-case-catalog` for real-world design templates or outage case studies.

---

## Decision Routing Summary

1. **Broad entry**: User asks for "system design", "system architect", or high-level architecture -> Start with `system-design-methodology`.
2. **Deep component dive**: Main session identifies a single high-risk component -> Delegate bounded question to `specialist-system-architect`.
3. **Approved contract elaboration**: Approved PRD or delivery contract in place -> Route to `design-solution` respecting authority gates; do not blanket restart with methodology.
4. **Existing diagram/visual**: Architecture image or diagram provided -> Load `system-design-artifact-intake`.
5. **Post-design audit**: Completed design needing readiness scorecard -> Load `system-design-review`.

## Cross-Category Routes

| Concern | Owner | When |
| --- | --- | --- |
| API contracts | [`common-api-design`](../../common/common-api-design/SKILL.md) | Endpoint semantics, consumer compatibility, pagination, or HTTP contracts |
| Threats and object-level authorization | [`common-owasp`](../../common/common-owasp/SKILL.md); [`common-security-standards`](../../common/common-security-standards/SKILL.md) | Trust boundaries, threat review, authorization, or security controls |
| Schema and data modeling | [`database-schema-design`](../../database/database-schema-design/SKILL.md) | Entity shape, cardinality, ownership, or schema evolution |
| Transactions | [`database-transactions`](../../database/database-transactions/SKILL.md) | Atomicity, locking, retries, or consistency boundaries |
| Telemetry | [`common-observability`](../../common/common-observability/SKILL.md) | Logs, metrics, traces, SLOs, or alerts |
| Production debugging | [`common-debugging`](../../common/common-debugging/SKILL.md) | Reproducing and diagnosing an observed failure |
| Active incidents | [`incident-hotfix`](../../../.agents/workflows/incident-hotfix.md); [`monitor-respond`](../../../.agents/workflows/monitor-respond.md) | Containing an active incident or responding to a control-band breach |
