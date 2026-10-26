# Mapping and synthesis

## Build a single source map

Reconcile the outline with inspected source boundaries. Track continuations, shared pages, figures, tables, appendices, and other material rather than assuming headings align to pages. Use one canonical disposition per source span, with reason and actual output target or stable source locator. Allowed statuses: `converted`, `partial`, `reference-only`, `excluded`, `unresolved`. Numerical page coverage is not semantic completeness.

For each synthesized claim, preserve conditions/modality, actor and role, inputs/outputs, limits, trade-offs, and provenance (`source` or `project-authored`). Keep authored recommendations explicit and do not attribute them to the source. Do not silently fill gaps or reproduce a proprietary matrix wholesale. Keep a single canonical card/collection; reconcile contradictory disposition lists instead of publishing both.

## Useful source-map fields

| Field         | Record                                       |
| ------------- | -------------------------------------------- |
| Source span   | Stable page/section/table locator            |
| Disposition   | Status and reason                            |
| Output        | Exact file and heading/anchor, or none       |
| Fidelity note | Material distinction preserved or unresolved |
| Provenance    | Source, project-authored, or mixed           |

Keep detailed coverage data outside the always-loaded entry. Link selected leaves from the entry; do not require loading a huge manifest before using one card. Record source and output identity hashes separately from semantic review.

## Synthesis boundary

Freeze accepted source packets and outputs before assembly. Preserve accepted copies; normalize shared identity once during assembly. Require bounded-ID selection of only the needed leaf. Keep lookup read-only; require explicit authorization for any mutating build or publication action.
