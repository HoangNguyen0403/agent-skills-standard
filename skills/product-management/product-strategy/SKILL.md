---
name: product-strategy
description: 'Formulate coherent product strategy, synthesize opportunity frames and falsifiable hypotheses, establish non-goals and trade-offs, and bind decisions to verified strategic authority. (triggers: `product strategy decision`, `product opportunity framing`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - product strategy decision
      - product opportunity framing
---

# Product Strategy

## **Priority: P0 (CRITICAL)**

Frame strategic opportunities and falsifiable hypotheses anchored in reviewed strategic authority, explicit non-goals, and viability constraints, without conflating prioritization scores with financial ROI or fabricating approval.

## 1. Capability Preflight

Verify `product-evidence` capability before validating or committing changes to `docs/product/<slug>/evidence.json`:
1. **Skill Resolution**: Load through MCP (`get_skill("product-management", "product-evidence")`) or resolve installed root paths `<root>/product-management/product-evidence/SKILL.md`, `<root>/product-evidence/SKILL.md`, or flattened Kiro `<root>/product-management-product-evidence/SKILL.md`. A missing/excluded skill is a capability gap; never infer installation from source checkout.
2. **Companion Resource**: Resolve `scripts/validate-product-evidence.mjs` relative to the loaded package directory (ordinary `<root>/product-management/product-evidence/`; flattened `<root>/product-management-product-evidence/`). Missing companion is a separate resource gap.
3. **Runtime**: Check Node.js >=20 separately. Missing runtime is not a missing skill/resource.
4. **Offline Mode**: If any prerequisite is absent, safe research/proposal work may proceed only as `unvalidated`; no simulated validation, readiness claim, or silent sync/install.

## 2. Core Protocol

1. **Strategic Authority & Gap Audit**:
   - Inspect `strategy_authority` in `docs/product/<slug>/evidence.json`. It must bind to an exact `AUTH` record revision in the `strategy` domain (never the technical SRS or H1 implementation hash).
   - If strategy authority is absent or conflicting, set `strategy_authority: null` and record an explicit `strategy_gap`. Permit proposal-only synthesis; never record binding decisions or invent strategy mandates.
2. **Opportunity Framing (`OPP`)**:
   - Synthesize verified problems and customer jobs from `CLM` records into `OPP` records.
   - Mandate explicit **non-goals** and trade-offs in `rationale`. Define what the product deliberately will NOT do.
   - Always include the "do nothing / defer" option alongside active alternatives.
3. **Hypothesis Synthesis & Disconfirmation (`HYP`)**:
   - Formulate falsifiable hypotheses: prediction, proposed causal mechanism, and supporting claims.
   - Define unambiguous **disconfirmation criteria** (the exact observation that would prove the hypothesis false).
   - Link candidate primary metrics (`MET` refs) without claiming premature validation.
4. **Decision Recommendation Framing (`DEC`)**:
   - Create proposed decision recommendations (`status: "proposed"`, `outcome: "propose"`).
   - Strategy binding is `null` for proposed learning decisions; it is required only for recorded investment, specification, or value_review decisions. Include all `critical_claims` in `depends_on`.
   - **Immutable DEC Invariant**: Once recorded, a DEC row is immutable in `records`. Supersession or revocation requires issuing a new DEC ID in `records` with `supersedes: { id, revision }`. Never move an immutable recorded DEC to `record_history`.
   - Define explicit `revisit_triggers` on `data` (distinct from `freshness.review_triggers`).
   - **Authority Gate**: Product strategy proposals recommend actions; they do NOT grant budget or authorize spend without separate human/operator approval.
5. **No Score-to-ROI Conversion**:
   - Heuristic scores (RICE, WSJF, Kano) are relative ordering tools, not financial accounting. Never convert a prioritization score into monetary benefit, net ROI, or NPV.

## 3. Anti-Patterns & Red Flags

- **No Missing Non-Goals**: Reject strategy documents that promise everything without trade-offs.
- **No Score as ROI**: Never claim a high RICE score proves positive financial return.
- **No Rewriting Recorded Decisions**: Never edit or move a recorded DEC to `record_history`.
- **Stop if Strategy Conflicted**: If two directives conflict, set `strategy_authority: null`, record gap, and halt recording decisions.

## 4. References

- [Strategy Protocol](references/strategy-protocol.md) — Strategic alignment, non-goals, and authority binding.
- [Opportunity Framing](references/opportunity-framing.md) — Structuring `OPP` records, hypotheses, and trade-offs.
- [Evidence Mapping](references/evidence-mapping.md) — Schema mapping to `OPP`, `HYP`, and proposed `DEC` records.
- [Citations and Sources](references/citations-and-sources.md) — Conceptual citations and independent authorship statement.
- [Semantic Rubrics](references/semantic-rubrics.md) — Outcome-based grading rubrics and false-pass rejection criteria.
- [Synthetic Example Ledger](references/examples/synthetic-strategy-ledger.json) — Complete valid standalone synthetic ledger.
