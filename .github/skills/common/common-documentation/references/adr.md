# ADR Reference

## Location And Numbering

- One file per decision: `docs/adr/NNNN-<slug>.md`; 4-digit number, monotonic, never renumbered or reused.
- Index: `docs/adr/README.md`, one table row per ADR with number, title, status, date, and source link.
- Copy `docs/adr/0000-template.md` for a new record and append its index row in the same change.
- An absent `docs/adr/` log is not a blocker for any workflow; create it only when a decision needs recording.

## When To Write One

Write one concise ADR when architecture, a public contract, or a cross-team boundary changes. Skip it when the pattern is inferable from existing code. Do not restate API or schema detail that another document owns; link it.

## Body Sections

Terse, in this order: `Status`, `Context`, `Decision`, `Consequences`, `Source`.

- `Status`: `proposed`, `accepted`, or `superseded by NNNN`, with the date.
- `Context`: constraints and evidence that force the decision.
- `Decision`: active-voice rule a reader can apply.
- `Consequences`: what becomes easier, harder, or remains open.
- `Source`: PRD, PR, plan, or policy link.

## Superseding

Superseding means a new ADR plus a status update on the old one. Never edit an accepted decision's `Decision` text; a reversal is a new record with its own number.
