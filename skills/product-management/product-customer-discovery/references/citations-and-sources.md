# Citations and Authorship: Product Customer Discovery

## 1. Independent Authorship Declaration

This skill package (`product-customer-discovery`), including its instructions, protocols, reference guides, schema mappings, and evaluation definitions, is **independently authored original work** for the `agent-skills-standard` repository.

In accordance with architectural decisions **D02** and **SR-001** (recorded in `docs/srs/product-evidence-sdlc/contract-decisions.md` and `docs/srs/product-evidence-sdlc/source-reuse-register.md`):
- **No upstream text, prompt wording, instructions, templates, taxonomies, or scoring models have been copied or adapted.**
- All implementations, schemas, workflows, and evaluation rubrics were created directly to satisfy the approved requirements in `docs/srs/srs-product-evidence-sdlc.md` (REQ-002, AC-003, SRS-005).
- This declaration is an engineering rights boundary and source disclosure; it does not constitute formal legal certification.

## 2. Conceptual Citations

The following external works provided conceptual background for customer research methodology, without providing text or templates:

1. **Anthropic Knowledge Work Plugins (`synthesize-research`)**:
   - Repository: `anthropics/knowledge-work-plugins`
   - Pinned Revision: `02ffa99ff00ce4d3046ccebabb8357cb39f3ab06`
   - Register Entry: `A-M2` (`product-management/skills/synthesize-research/SKILL.md`)
   - Conceptual Influence: The distinction between observation and interpretation, tracking sample context, and noting contradictory evidence. In this package, customer discovery is anchored on empirical field observations, non-leading interview design, strict bans on synthetic persona generation, and direct schema linking to `evidence.json`. No templates, personas, or frequency scoring were adapted.

2. **Continuous Customer Discovery Principles**:
   - References: Teresa Torres (*Continuous Discovery Habits*) and Marty Cagan (*Inspired*)
   - Conceptual Influence: Conducting regular, structured interviews focused on customer stories and past behaviors rather than speculative feature requests.

3. **Jobs-to-be-Done (JTBD) Framework**:
   - References: Clayton Christensen (*Competing Against Luck*) and Bob Moesta (*Demand-Side Sales 101*)
   - Conceptual Influence: Framing customer struggles around the causal forces of progress, context, and compensatory workarounds (e.g. spreadsheets and manual hacks), rather than static demographic personas.
