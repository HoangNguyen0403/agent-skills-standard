# Product Management Framework Map

Reviewed: 2026-10-15

## Conceptual Citations & References

This category draws upon registered conceptual primary sources for evidence-grounded product discovery, validation, and measurement:

- **Evidence-Based Management (EBM)**: Professional Scrum framework for measuring value and ability to deliver value (Unrealized Value, Current Value, Time-to-Market, Ability-to-Innovate).
- **Continuous Discovery Habits (Teresa Torres)**: Opportunity Solution Trees, structured non-leading customer interviews, and assumption-testing loops.
- **Product Risk & Strategy Framing (SVPG / Marty Cagan, Richard Rumelt)**: Value, usability, feasibility, and business viability risk framing; diagnosis, guiding policy, and coherent actions.

*Note: Public citations represent conceptual foundations only (see `docs/srs/product-evidence-sdlc/source-reuse-register.md`); no upstream package or external API dependency is asserted.*

---

## Category Structure

The `product-management` category contains ten skills structured into two tiers:

### 1. Two Foundation Skills (Default-Selected)
Preserves standard SDLC discovery and requirement drafting by default. When initialized, the category uses an explicit include allowlist (`include: ["product-business-requirements", "product-requirements"]`) so default project setups gain core planning without unrequested specialist bloat.

| Skill | Focus & Core Invariants | Trigger Files / Keywords |
| --- | --- | --- |
| `product-business-requirements` | Standardize BRD / BRD-lite framing the business "Why": objectives, stakeholder impact, AS-IS to TO-BE, ROI justification. | `BRD.md`, `docs/brd/brd-*.md`, `specs/*.md` / `create brd`, `business requirements`, `business case`, `stakeholder impact` |
| `product-requirements` | Standardize PRD living-spec framing the product "What": user outcomes, INVEST user stories, Given/When/Then ACs, requirement IDs. | `PRD.md`, `docs/prd/prd-*.md`, `specs/*.md` / `create prd`, `product requirements`, `draft requirements`, `acceptance criteria` |

### 2. Eight Opt-In Skills (Evidence Ledger & Advanced Methods)
Specialized methods that remain strictly opt-in. They are never auto-installed or activated without explicit user configuration.

| Skill | Focus & Core Invariants | Trigger Files / Keywords |
| --- | --- | --- |
| `product-evidence` | Canonical product evidence ledgers, immutable recorded decisions (`DEC`), typed provenance, and scoped action gates. | `docs/product/*/evidence.json` / `product evidence ledger`, `product decision authority`, `product evidence freshness` |
| `product-market-research` | Market dynamics, competitive analysis, direct/indirect substitutes, buyer alternatives, counterevidence tracking. | `triggers.files: []` / `product market research`, `product competitive analysis` |
| `product-customer-discovery` | Ethical user discovery, non-leading interview synthesis, quote-to-insight provenance, informed consent, privacy redaction. | `triggers.files: []` / `product customer discovery`, `product research synthesis` |
| `product-strategy` | Opportunity framing, falsifiable hypotheses, explicit non-goals, strategic trade-offs, and decision authority alignment. | `triggers.files: []` / `product strategy decision`, `product opportunity framing` |
| `product-investment` | Build vs. buy vs. partner vs. defer vs. do-nothing analysis, cash vs. capacity boundaries, optional monetary calculation. | `triggers.files: []` / `product investment analysis`, `product ROI scenario` |
| `product-experimentation` | Bounded experiment design (`EXP`), precommitted thresholds, primary/guardrail metrics, ethical bounds, host authorization gates. | `triggers.files: []` / `product hypothesis validation`, `product experiment design` |
| `product-metrics` | Outcome measurement contracts (`MET`), baseline evidence, query revisions, guardrails, and post-release value review (`REV`). | `triggers.files: []` / `product measurement contract`, `product value review` |
| `product-roadmap` | Outcome-based roadmapping, capacity vs. displaced-work trade-offs, learning milestones, portfolio coherence. | `triggers.files: []` / `product roadmap prioritization`, `product portfolio trade-off` |

### Migration & Configuration for Existing Users

Existing users upgrading from `common` v2.x to v3.0.0 must stop requesting the three moved skills from `common` and configure the new `product-management` category. The replacement canonical IDs are `product-business-requirements`, `product-requirements`, and `product-evidence`.

- **Default Configuration**: `ags init` pins `product-management` with `include: ["product-business-requirements", "product-requirements"]`. This preserves core BRD/PRD authoring; `product-evidence` and the seven specialist methods remain opt-in.
- **Existing `.skillsrc` files**: Keep `common` for its remaining skills, update its ref to `common-v3.0.0`, and add the PM category with a reviewed immutable ref (a commit SHA before the first category release):
  ```yaml
  skills:
    common:
      ref: common-v3.0.0 # or reviewed immutable ref
    product-management:
      ref: product-management-v1.1.0 # use a reviewed commit SHA before release
      include: ["product-business-requirements", "product-requirements"]
  ```
- **Opting into Advanced PM Methods**: Explicitly expand the `include` list or omit it to select the full suite, including `product-evidence`:
  ```yaml
  skills:
    product-management:
      ref: product-management-v1.1.0 # or reviewed immutable ref
      # To use all 10 skills, omit `include`:
      # or list the desired skill IDs explicitly.
  ```
---

## Companion Contract: Product Evidence Ledger & Shipped Resources

Decisions across all advanced skills ground in the canonical ledger managed by `product-evidence`, supported by shipped schemas and standalone execution resources:

- **Evidence Ledger**: `docs/product/<slug>/evidence.json`
- **Identity & Storage**: Single current entity per ID; full retained historical snapshots in `record_history` / `authority_history`. Immutable recorded decisions (`DEC`).
- **Record Kinds**: `SRC`, `CLM`, `OPP`, `HYP`, `EXP`, `INV`, `DEC`, `MET`, `REV`.
- **Shipped Schemas**:
  - `skills/product-management/product-evidence/assets/product-evidence.schema.json`: Strict JSON schema for evidence ledgers.
  - `skills/product-management/product-investment/assets/investment.schema.json`: Schema for bounded investment scenarios.
- **Standalone Execution Resources**:
  - `skills/product-management/product-evidence/scripts/validate-product-evidence.mjs`: Standalone ledger validator (invoked via `node`, Node >=20).
  - `skills/product-management/product-investment/scripts/evaluate-investment.mjs`: Standalone investment scenario calculator (invoked via `node`, Node >=20).
---

## Decision Map

Use this guide to select the appropriate skill based on the product inquiry:

- **Exploring market landscape, competitor posture, or substitutes**: Load `product-market-research`.
- **Synthesizing user interviews, pains, or observed customer behavior**: Load `product-customer-discovery`.
- **Framing a new opportunity, setting non-goals, or formulating hypotheses**: Load `product-strategy`.
- **Evaluating capital allocation, build/buy/defer, or cost-capacity trade-offs**: Load `product-investment`.
- **Designing an experiment, setting sample bounds, or defining stop rules**: Load `product-experimentation`.
- **Establishing measurable outcome contracts, baselines, or reviewing post-release value**: Load `product-metrics`.
- **Sequencing releases, balancing capacity, or evaluating portfolio trade-offs**: Load `product-roadmap`.
- **Framing business goals, ROI justification, or AS-IS to TO-BE scope**: Load `product-business-requirements`.
- **Drafting PRDs, user stories, acceptance criteria, or living specs**: Load `product-requirements`.
- **Validating ledger schema, integrity, or action eligibility gates**: Load `product-evidence`.

---

## Workflow Integration

Three portable SDLC workflows orchestrate these skills across the product lifecycle:

1. **`discover-product`**:
   - Capabilities: `product-evidence` + `product-market-research` + `product-customer-discovery` + `product-strategy`.
   - Output: Opportunity frame, falsifiable hypotheses, non-goals, and learning plan proposal.
2. **`validate-product`**:
   - Capabilities: `product-evidence` + `product-investment` + `product-experimentation` (+ conditional `product-metrics`).
   - Output: Bounded experiment plan with precommitted thresholds and host authorization check.
3. **`review-product-value`**:
   - Capabilities: `product-evidence` + `product-metrics` + `product-investment` (+ conditional `product-roadmap`).
   - Output: Realized value review, attribution analysis, and advisory recommendation.

---

## Core Anti-Patterns

- **No Synthetic Truth**: Never cite synthetic examples or persona simulations as real observed customer evidence.
- **No Autonomous Execution**: Structural ledger validity is host-check-eligible only; it never grants autonomous spend, rollout, or user exposure authorization.
- **No Conflated ROI**: Never infer causal financial return from delivery completion or release events alone.
- **No Overwriting Recorded Decisions**: Decisions are immutable; changes require superseding DEC records with new IDs.
