---
name: system-design-mobile-client
description: "Design mobile/client and SDK/library systems where offline behavior, client authority, lifecycle, device constraints, or host compatibility affect correctness. Use for mobile-client system design, offline sync, client lifecycle, device resource limits, or SDK contracts; not framework coding or backend-only sharding."
metadata:
  triggers:
    keywords:
      - mobile client system design
      - offline sync
      - client authority
      - client lifecycle
      - SDK system design
      - SDK compatibility
      - device resource constraints
---

# Mobile and Client System Design
## **Priority: P1 (HIGH)**


Classify the work mode independently from its surface: new design, review existing, or interview practice can each target mobile/client, SDK/library, backend, or full stack. Focus on user-visible authority, lifecycle, synchronization, platform constraints, and host compatibility—not UI/framework implementation.

## Design decisions

- Name the server-authoritative state and any local display, pending, cached, or derived state. Never present optimistic/pending state as durable server success.
- For each critical client flow, link the canonical [critical-flow contract](../system-design-data-architecture/references/flow-contracts.md); do not duplicate its field checklist. Add only material client-specific lifecycle, auth, freshness, retry, conflict, and deletion decisions.
- Decide explicitly whether offline use is required. If correctness depends on a live authorization or current server state, choose online-only behavior and define unavailable/error UX; do not add a local database by default.
- If offline writes are allowed, define pending/confirmed/failed outcomes, stable operation identity, retry and deduplication, conflict resolution, freshness, account-switch/logout handling, and deletion of local and server copies.
- Bound device work: memory, disk, network, battery-sensitive work, queue growth, payload size, and resource release. Estimate only quantities relevant to the stated workload.
- Treat secure storage and authentication as trust-boundary choices: limit token and sensitive-data persistence, bind queued work to its account, and prevent replay after logout or account change.
- Select a dataflow, sequence, state, or deployment view only when it answers a named decision; prose or a table is sufficient otherwise.

For client authority, sync, authentication changes, or deletion decisions, load the [client authority and lifecycle contract](references/client-contract.md). For a reusable client library, cover its public contract, compatibility, cancellation, concurrency ownership, bounded resource use, host integration, lifecycle, and failure results; see [SDK contract](references/sdk-contract.md). For OS scheduling and persistence constraints, consult [platform constraints](references/platform-constraints.md). Framework-specific coding recipes are out of scope.

## Practice

Run the design → adverse timeline → mechanism revision → changed constraint → evidence-based debrief sequence. Use the four synthetic base/variant pairs in [practice cases](references/practice-cases.md); assumptions are not deployment evidence.
