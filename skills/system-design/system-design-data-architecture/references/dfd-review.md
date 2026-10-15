# DFD Semantic Review

Review semantics before notation or layout. First state the intended question, system boundary, logical or physical scope, and decomposition level. A context-level view shows the system as one process and its external entities/data crossing the system boundary. Decompose selectively when a decision or risk needs detail; link parent and child views and preserve every boundary input and output. Do not confuse DFD decomposition levels with C4 levels.

## Four roles

- **External entity:** actor or neighboring system outside the modeled boundary that sends or receives data.
- **Process:** a named transformation that consumes input and produces a result. Label it with an action (verb phrase), not only a component name.
- **Data store:** retained data read or written by processes; name what it holds. State authority or derived status where relevant.
- **Data flow:** directional, labeled data exchanged between modeled roles. Label the payload (noun phrase), not just a protocol or vague verb. Include protocol only when it matters to the question.

A process needs plausible input and output. For example: a **black hole** takes `Submit order` but models neither an order-state write nor an order result; a **miracle** emits `Payment receipt` without any order/payment input or recorded capture; an **insufficient-input transformation** claims `Invoice total = $120` from item quantities alone, with no unit prices or other stated inputs. Identify an omitted external flow if the modeled boundary hides a required source, sink, or result. These are semantic defects, not styling issues.

At every decomposition boundary, reconcile parent inputs and outputs with the child: no unexplained added, dropped, or changed data. Internal child flows need not appear at the parent. State filtered views explicitly: a write-only audit/filtered view can intentionally omit reads; do not invent a read path to satisfy a blanket store-input/output rule.

## Scope limits and physical paths

For an explicitly modeled **classical logical DFD**, route data between external entities and stores through a process: do not draw direct entity-to-entity, entity-to-store, or store-to-store flows. A direct store/entity route hides processing/validation that must either be modeled as a process or explicitly excluded from this view's scope. These are logical modeling conventions, not a ban on actual runtime topology. Do not erase physical paths to satisfy them: direct client-to-object-store signed-URL upload and CDC/replication from a source store are valid physical flows when their contract, boundary, authority, and controls are explained. A filtered/write-only audit view may intentionally show process-to-audit-store writes and omit reads; state that omission rather than inventing a read path. Label who authorizes access and where validation/ownership lives when material.

A logical DFD is not a call trace, concurrency model, entity lifecycle, security proof, capacity model, or deployment map. Use a sequence for ordering/acknowledgments, a state view for lifecycle, an ERD for relationships, or deployment view for placement when those questions matter. Do not infer any of those properties from arrows alone.

## Notation versus readability

Only after semantics pass, inspect notation consistency and layout. The repository renderer uses house-style nodes, not formal Yourdon/Gane–Sarson glyphs; describe it as an adapted/house-style diagram and do not claim formal glyph compliance. Do not add unsupported node kinds or fields. Crossing edges are a readability concern: reroute, split a dense view, or annotate it, but a crossing alone does not establish incorrect data semantics.

Use the [diagram selection guide](../../../common/common-architecture-diagramming/references/diagram-selection.md) for alternate view choice and the [flow contract](flow-contracts.md) for the canonical critical-path record.
