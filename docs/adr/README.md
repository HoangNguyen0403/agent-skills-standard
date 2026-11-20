# Architecture Decision Records

Durable records of decisions that constrain architecture, public contracts, or shared conventions. One file per decision at `docs/adr/NNNN-<slug>.md`: 4-digit number, monotonic, never renumbered or reused.

## How To Use

- Read this index before planning or designing; an absent log is not a blocker.
- Write one concise ADR when architecture, a public contract, or a cross-team boundary changes; skip it when the pattern is inferable from existing code.
- Copy [0000-template.md](0000-template.md) to the next number and append one row below.
- Supersede with a new ADR plus a status update on the old one; never edit an accepted decision's Decision text.
- `status` is `proposed`, `accepted`, or `superseded by NNNN`.

| ADR | Title | Status | Date | Source |
| --- | --- | --- | --- | --- |
| [0001](0001-delivery-mode-sizing.md) | Delivery mode sizing (`brief`, `standard`, `extended`) | accepted | 2026-11-18 | [SDLC quick reference, Delivery Mode](../sdlc-workflow-quick-reference.md) |
| [0002](0002-report-only-review-disabled.md) | Report-only review disabled until calibrated evidence and owner grant | accepted | 2026-11-18 | [Review trust DD-3](../prd/prd-agent-review-trust.md), [review policy](../review-policy.md) |
| [0003](0003-generated-mirrors-never-hand-edited.md) | Generated mirrors are never hand-edited | accepted | 2026-11-18 | [CONTRIBUTING rules 9-10 and generated-output integrity](../../CONTRIBUTING.md) |
| [0004](0004-agent-factory-controls.md) | Agent factory controls D1-D4 | accepted | 2026-11-18 | [Agent factory controls](../prd/prd-agent-factory-controls.md) |
