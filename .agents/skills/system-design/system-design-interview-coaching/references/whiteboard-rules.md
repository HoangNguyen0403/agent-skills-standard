# Whiteboard Rules

A practice round happens in chat. Mermaid is an optional sketching medium; a board is not required for every phase. Do not open `.drawio` mid-round.

Choose a board only when it helps answer the current question. The view and level follow the design question, not a fixed phase quota.

| Question | Useful view | Keep out unless needed |
|---|---|---|
| What data crosses a boundary and who owns it? | Logical dataflow with named payloads and transformations | Call order, deployment claims |
| What happens in order or after an acknowledgment is lost? | Sequence | Unrelated components |
| How does client/entity state change through retry, logout, conflict, deletion? | State | Unneeded schema detail |
| What relationships or runtime placement matter? | ERD or deployment | Unproven boxes |
| No view adds decision value | Prose, table, or no sketch | Mandatory diagram |

For a selected flow, explain the logical boundary before physical binding. A logical DFD labels external entities, action-named processes, retained stores, and data-named flows; check plausible inputs/outputs and balanced parent-child boundaries. State intentional omissions. Logical notation does not ban physical direct uploads or replication.

Do not infer call order, concurrency, lifecycle, security, capacity, or deployment from DFD arrows. Use a sequence, state, ERD, or deployment view only when that question matters. Keep DFD decomposition separate from C4 level.

In chat, concise Mermaid is optional. If a canonical diagram is produced, the JSON spec is semantic source of truth, `.drawio` is editable presentation, and image is exported copy; follow `common-architecture-diagramming`.
