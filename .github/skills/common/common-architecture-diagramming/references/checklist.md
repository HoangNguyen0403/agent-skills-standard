# Validation Checklist

`validate_spec.py` enforces the mechanical half. This page covers the half a script cannot
judge. Run through it before handing a diagram to anyone.

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
