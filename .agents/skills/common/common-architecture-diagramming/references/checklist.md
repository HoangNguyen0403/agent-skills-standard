# Validation Checklist

`validate_spec.py` checks the mechanical half only. This page covers human review; neither the validator nor a rendered diagram proves flow correctness. Review semantic scope and completeness separately using the canonical [DFD review guide](../../../system-design/system-design-data-architecture/references/dfd-review.md).

## Automated (the validator fails the build)

- [ ] Required metadata present: title, type, audience, version, date, scope
- [ ] Every node kind is in the catalogue
- [ ] Every edge is labelled and connects two declared nodes
- [ ] No orphan nodes, no duplicate ids, no undeclared groups
- [ ] Exec diagrams are at or under twelve nodes
- [ ] Node and edge `metric` at or under 48 characters
- [ ] (warning only) Tech container, deployment, and dataflow diagrams carry at least one metric
- [ ] Layout check clean (`render_drawio.py --strict`): no overlaps, no edge through a third
      box, no label on a box or on another label
- [ ] ERD entities list their columns; every relation has a cardinality

For any manifest-participating view, require the complete view contract, canonical identities,
separate `lifecycle`/`evidence_confidence`, captured evidence revision/digest, and metric
provenance. This applies to context, container, component, deployment, dataflow, sequence, state,
and ERD views. For related views, require bounded allowlisted source records and expected
relationship IDs; treat changed captures as `review-needed`, not proof of runtime drift.


## Dataflow semantics (when applicable)

- [ ] State the question, system boundary, logical/physical scope, and decomposition level; do not confuse DFD decomposition with C4.
- [ ] Check external entities, transforming processes, stores, and directional data flows; label payloads as data and transformations as actions.
- [ ] Every process has plausible inputs and outputs; identify black-hole input with no modeled result, miracle output without a source, and transformations lacking sufficient input.
- [ ] Parent and child views preserve boundary inputs/outputs. State excluded flows and the reason; explicitly mark filtered/write-only views whose reads are omitted.
- [ ] Preserve actual physical upload, CDC, and replication topology. Do not apply logical-only routing conventions to physical views.
- [ ] Treat crossing edges as readability concerns, not semantic failure. Use sequence/state/ERD/deployment for ordering, lifecycle, schema, or placement claims.
- [ ] Confirm that a stateless path may require no store or queue, and a flow view is optional when prose or a table answers the question.

The validator checks shape, metadata, supported kinds, edges, and layout; it cannot judge transformations, authoritative ownership, freshness, lifecycle, or whether a flow is plausible.
## Judgement (yours)

- [ ] **One question.** Can you state in a sentence what this diagram answers?
- [ ] **One level.** No components sitting beside whole systems.
- [ ] **Business names.** Would a manager recognise every label without the team's glossary?
- [ ] **Acronyms expanded** on first use, in the label or the scope line.
- [ ] **Protocols on edges** where they matter, and only where they matter.
- [ ] **Direction is honest.** Arrows point the way the request or data actually goes.
- [ ] **Ours versus theirs** is visible without reading — internal blue, external grey.
- [ ] **Numbers that justified the box are on the box.** Every node that exists because of a
      constraint carries `metric` and `constraint`; a box with neither is decoration until proven otherwise.
- [ ] **Every UNVERIFIED node is deliberate**, listed in your report, and not quietly dropped.
- [ ] **Scope states the exclusions**, not just the inclusions.
- [ ] **Rendered image checked by eye.** Labels clear of boxes, no line crossing a third box,
      legend complete. The validator cannot see any of this.

That last one is not optional. Every layout defect found so far in this pipeline was
invisible in the XML and obvious in the PNG.
