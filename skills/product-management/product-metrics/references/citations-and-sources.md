# Citations and Authorship: Product Metrics & Value Review

## 1. Independent Authorship Declaration

This skill package (`product-metrics`), including its instructions, protocols, reference guides, schema mappings, examples, and evaluation definitions, is **independently authored original work** created specifically for the `agent-skills-standard` repository.

In accordance with architectural decisions **D02** and **SR-001** (recorded in `docs/srs/product-evidence-sdlc/contract-decisions.md` and `docs/srs/product-evidence-sdlc/source-reuse-register.md`):
- **No upstream text, prompt wording, instructions, templates, metrics catalogs, or schemas have been copied or adapted.**
- All implementations, schemas, workflows, and evaluation rubrics were created directly to satisfy the approved requirements in `docs/srs/srs-product-evidence-sdlc.md` (REQ-005, AC-009, AC-010, SRS-009).
- Hash fingerprints in this repository prove byte identity of captured reference files; they do NOT constitute formal legal certification, copyright clearance, or non-infringement guarantees.

## 2. Canonical Pinned Inputs (Audited File Register)

The following reference was inspected as an immutable file-level input per the frozen source-reuse register:

1. **Anthropic Knowledge-Work Plugins (`A-M3`)**:
   - Pinned Location: [`product-management/skills/metrics-review/SKILL.md`](https://github.com/anthropics/knowledge-work-plugins/blob/02ffa99ff00ce4d3046ccebabb8357cb39f3ab06/product-management/skills/metrics-review/SKILL.md)
   - Commit SHA: `02ffa99ff00ce4d3046ccebabb8357cb39f3ab06`
   - Raw File SHA256: `e92f364b668074c72b36fd0f69a6adef2ead66640b2c17dc824c043fb613d278`
   - Conceptual Influence: The necessity of explicit denominators, rigorous cohort boundaries, and strict attribution limits when reviewing metrics.
   - Boundaries & Exclusions: No templates, metric dashboards, cadence tables, review scripts, or universal benchmarks were copied or adapted.

## 3. Supplemental Conceptual Sources

The following external works provided high-level conceptual background regarding measurement discipline and value management, without providing text, code, or templates:

1. **Scrum Guide (2020)**:
   - Authors: Ken Schwaber and Jeff Sutherland
   - Canonical Link: [Scrum Guide Product Owner](https://scrumguides.org/scrum-guide.html#product-owner)
   - Conceptual Influence: Accountability of the Product Owner for maximizing the value of the product resulting from the work of the Scrum Team.

2. **Evidence-Based Management (EBM)**:
   - Organization: Scrum.org
   - Canonical Link: [Scrum.org EBM Guide](https://www.scrum.org/resources/online-evidence-based-management-guide)
   - Conceptual Influence: Managing value through empirical Key Value Areas (Current Value, Unrealized Value, Ability to Innovate, Time-to-Market) rather than speculative activity metrics.

3. **Silicon Valley Product Group (SVPG)**:
   - References: Marty Cagan (*Inspired*, *Empowered*)
   - Canonical Link: [SVPG Four Big Risks](https://www.svpg.com/four-big-risks/)
   - Conceptual Influence: The fundamental separation of output (shipping features, managing backlogs) from outcome (moving customer behaviors and business health); value risk validation.

## 4. Explicit Exclusions

- **Dean Peters Materials (`D-L1`, `D-X1`)**: Excluded. All schemas, formulas, prompts, and text are strictly excluded due to license incompatibility (CC BY-NC-SA 4.0) and conflicting definitions of ROI and investment heuristics.
- **Upstream Analytics Templates & Dashboards**: No vendor-specific telemetry SDKs, proprietary analytics platforms, or automated dashboard generators are included or assumed.
