# Citations and Authorship: Product Market Research

## 1. Independent Authorship Declaration

This skill package (`product-market-research`), including its instructions, protocols, reference guides, schema mappings, and evaluation definitions, is **independently authored original work** for the `agent-skills-standard` repository.

In accordance with architectural decisions **D02** and **SR-001** (recorded in `docs/srs/product-evidence-sdlc/contract-decisions.md` and `docs/srs/product-evidence-sdlc/source-reuse-register.md`):
- **No upstream text, prompt wording, instructions, templates, matrices, or schemas have been copied or adapted.**
- All implementations, schemas, workflows, and evaluation rubrics were created directly to satisfy the approved requirements in `docs/srs/srs-product-evidence-sdlc.md` (REQ-002, AC-003, SRS-005).
- This declaration is an engineering rights boundary and source disclosure; it does not constitute formal legal certification.

## 2. Conceptual Citations

The following external works provided conceptual background for market analysis and product risk principles, without providing text or templates:

1. **Anthropic Knowledge Work Plugins (`competitive-brief`)**:
   - Repository: `anthropics/knowledge-work-plugins`
   - Pinned Revision: `02ffa99ff00ce4d3046ccebabb8357cb39f3ab06`
   - Register Entry: `A-M1` (`product-management/skills/competitive-brief/SKILL.md`)
   - Conceptual Influence: The general concept of comparing alternatives and buyer contexts. In this package, market research is re-anchored on strict provenance, untrusted data protection, explicit counterevidence tracking, and schema integration with `evidence.json`. No templates, scoring rubrics, or prose were adapted.

2. **Scrum Guide (2020)**:
   - Authors: Ken Schwaber and Jeff Sutherland
   - Conceptual Influence: The definition of the Product Owner as responsible for maximizing the value of the product resulting from work of the Scrum Team, anchoring research to explicit decisions and value outcomes.

3. **Silicon Valley Product Group (SVPG)**:
   - Reference: *Four Big Risks* (Marty Cagan)
   - Conceptual Influence: Structuring research around Value Risk (whether customers will buy it or users choose to use it) and Viability Risk (whether the solution works within business constraints).
