---
name: product-roadmap
description: 'Prioritize outcome-based product roadmaps, manage capacity and displaced work trade-offs, sequence learning milestones, and maintain portfolio coherence without dual ledgers or fake ROI. (triggers: `product roadmap prioritization`, `product portfolio trade-off`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - product roadmap prioritization
      - product portfolio trade-off
---

# Product Roadmap & Portfolio Trade-offs

## **Priority: P0 (CRITICAL)**

Sequence outcome-driven roadmaps, manage finite capacity and displaced work, anchor priorities in verified strategic authority, and maintain portfolio coherence without duplicating ledgers or conflating ranking scores with financial ROI.

## 1. Capability Preflight

Resolve and verify execution prerequisites across installed layouts before prioritizing roadmaps or evaluating portfolio trade-offs:
1. **Installed Location**: Locate `<agent-skill-root>/product-management/product-evidence/` (standard) or `<agent-skill-root>/product-management-product-evidence/` (Kiro flattened). Body lookup via MCP is not local script/runtime proof.
2. **Component Integrity**:
   - Package missing or excluded: emit gap `Capability gap: product-management/product-evidence not installed or excluded; opt in at a reviewed ref and sync.`
   - Script missing: emit gap `Capability gap: validate-product-evidence.mjs missing from installed package; repair product-evidence installation.`
   - Runtime engine: confirm Node.js $\ge 20.0.0$ (`node --version`). If $< 20$, emit gap `Capability gap: Node.js runtime >= 20.0.0 required for local validator; current environment does not meet minimum engine requirement.`
3. **Invocation inputs**: confirm an existing absolute canonical authorized narrow authority root (not `/`, home, or a parent workspace), contained regular ledger file, concrete valid UTC `--as-of`, and `--gate` exactly `structural|experiment|commit|release`. CLI may take a contained relative ledger; library `ledgerPath` is absolute.
4. **Authority and data**: inspect current exact strategy/business/authorization pairs, artifact bindings, source access/privacy/status/freshness, dependencies and cohort/team-capacity overlap. External/protected data are never fetched. Report installation, path/root, authority and evidence gaps separately; do not infer demand, consent or capacity.
5. Follow [Verification Procedures](references/verification-procedures.md) for exact revision, history and read-only portfolio predicates. Never broaden roots, install silently, validate placeholders, or infer permission from a green result.

## 2. Core Protocol

1. **Strategic Alignment & Opportunity Anchoring**:
   - Align every roadmap item with authorized strategic directives (`strategy_authority`) and framed opportunities (`OPP`). If strategy is absent or conflicting, set `strategy_authority: null` and record `strategy_gap`.
   - Every candidate initiative must link to falsifiable hypotheses (`HYP`) and explicit non-goals.
2. **Capacity Constraints & Named Displaced Work**:
   - Engineering and design capacity is strictly finite and zero-sum. Adding or accelerating an initiative must explicitly record the displaced work, deferred initiatives, or rejected alternatives in decision rationale.
   - Map technical, organizational, and regulatory dependencies explicitly. Never schedule dependent full-builds concurrently with unvalidated upstream bets.
3. **Prioritization Heuristics vs. Financial Reality**:
   - Directional ranking scores (RICE, WSJF, Kano) are relative ordering heuristics, NOT validated customer demand or financial ROI.
   - Stakeholder calendar deadlines or executive commitments do NOT erase evidence gaps or validate unproven market assumptions.
4. **Learning Milestones Over Feature Timelines**:
   - Structure roadmaps around learning milestones (risk reduction, hypothesis validation, prototype testing), not feature delivery Gantt charts.
   - Front-load high-uncertainty risks before committing capital or engineering capacity to full-scale delivery.
5. **Single Canonical Ledger & Portfolio Coherence**:
   - Never duplicate or maintain a secondary mutable evidence ledger for portfolio or cross-product rollups. Each initiative retains one canonical ledger at `docs/product/<slug>/evidence.json`.
   - Multi-initiative portfolio views are read-only documents referencing canonical initiative ledgers at exact revisions.
   - Maintain strict separation between product discovery evidence and engineering delivery traces (Outcome v1 `feature_status`: `not_started | requirements_ready | design_ready | partially_implemented | implemented | verified | released | blocked`). Product discovery IDs stay strictly outside Outcome requirement arrays.

## 3. Anti-Patterns & Red Flags

- **No Deadlines as Demand**: Never treat an executive or marketing deadline as proof of market demand.
- **No Score as Cash Return**: Never present a RICE score as expected financial return, NPV, or net ROI.
- **No Invisible Displacement**: Never insert a roadmap initiative without explicitly documenting what work was displaced.
- **No Dual Ledgers**: Never duplicate initiative evidence into a separate mutable portfolio ledger.
- **No Feature Timelines Without Validation**: Never commit fixed long-range delivery dates before validating core value hypotheses.

## 4. References

- [Roadmap Protocol](references/roadmap-protocol.md) — Sequencing, capacity trade-offs, and learning milestones.
- [Portfolio Trade-offs](references/portfolio-tradeoffs.md) — Cross-initiative coherence without mutable dual ledgers.
- [Evidence Mapping](references/evidence-mapping.md) — Schema mappings for `OPP`, `HYP`, `INV`, and `DEC` prioritization.
- [Examples & Recipes](references/examples.md) — Retained complete package-shaped synthetic ledgers and construction recipes.
- [Semantic Rubrics](references/semantic-rubrics.md) — Case-specific manual semantic rubrics and decision grading.
- [Artifact/History Procedures](references/verification-procedures.md) — authorized input checks, exact revision predicates, and manual grade receipts.
- [Concrete Fixture Cases](references/verification-cases.md) — exact synthetic roots, capacity projections, and expected predicates.
- [Citations and Sources](references/citations-and-sources.md) — Authorship statement, conceptual citations, and exclusions.
