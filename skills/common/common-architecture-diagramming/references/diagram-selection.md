# Diagram Selection Guide

Pick from the message you need to land, not from the diagram you drew last time.

| Message | `type` | Audience |
| :--- | :--- | :--- |
| Who uses this system and what does it depend on | `context` | Everyone |
| What are the deployable parts and what do they run on | `container` | Architects, developers |
| Which modules inside one container own a decision or dependency | `component` | Developers |
| Where does it run: region, cluster, network boundary | `deployment` | Ops, architects |
| How data moves from source to result, including transaction, event, client-sync, deletion, and batch paths | `dataflow` | Architects, developers, data |
| What is the exact order of calls, acknowledgments, retries, or replay in one flow | `sequence` | Developers |
| What states can one entity or client edit be in, including conflict/logout/deletion | `state` | Product, developers |
| Which tables exist and how they relate | `erd` | Developers, data |

## Decision tree

1. Mapping the whole ecosystem and its external dependencies? `context`
2. Showing technology choices and deployable units? `container`
3. Showing module boundaries and dependencies inside one container? `component`
4. Explaining where things physically run? `deployment`
5. Following data end to end, including transactions, events, CDC/backfill, client sync, or deletion? `dataflow`
6. Debugging/specifying call order, acknowledgment, retry, or replay? `sequence`
7. Describing entity or client-state lifecycle and conflict transitions? `state`
8. Documenting schema relationships? `erd`, generated from schema files with `schema_to_spec.py`

## Not covered here

- **Flowcharts and decision trees.** Business logic is not architecture. Use Mermaid inline
  in the document that explains the decision.
- **Design-session artefacts** are drawn here too, not elsewhere;
  `system-design-methodology/references/phase-deliverables.md` says which type at which phase.

## Dataflow semantics

Use dataflow when the question concerns movement, transformation, authority, or derived copies; it is not an ETL-only view. State logical or physical scope, modeled boundary, and decomposition level. Keep parent/child boundary flows balanced; decomposition level is not C4 level. Label flows with the data, and use the canonical [DFD semantic review](../../../system-design/system-design-data-architecture/references/dfd-review.md). Logical notation rules do not erase physical signed-URL uploads or CDC/replication. Select sequence, state, ERD, or deployment separately when order/acknowledgment, lifecycle, schema, or placement matters. A DFD does not prove those properties.

Views remain conditional: prose or a table is sufficient if a diagram adds no decision value.
