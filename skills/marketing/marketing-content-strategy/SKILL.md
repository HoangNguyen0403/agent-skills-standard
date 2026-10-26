---
name: marketing-content-strategy
description: 'Develops evidence-led content strategy mapping audience intent, distribution channel, and intended action for each asset. Plans thematic clusters and editorial sequencing without keyword-volume fabrication or bulk unevidenced publishing. (triggers: `marketing content strategy`, `content planning`, `editorial sequence`, `asset intent mapping`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing content strategy'
      - 'content planning'
      - 'editorial sequence'
      - 'asset intent mapping'
---

# Marketing Content Strategy

## **Priority: P0 (CRITICAL)**

Plan evidence-led technical content mapping audience intent, distribution channel, and intended action for every asset, without fabricating keyword search volumes or producing low-value bulk publishing.

## 1. Capability Preflight & Strategy Binding

1. **Strategy Alignment**:
   - Inspect approved positioning, target segment, and strategic directives (`docs/prd/prd-*.md`, `docs/product/*/evidence.json`).
   - If strategy or audience intent evidence is absent, record an explicit `evidence_gap` and produce proposal-only drafts. Never fabricate customer motivations.
2. **Context Revision**:
   - Bind all asset proposals to an exact `context_revision` token matching the campaign and proof ledger.

## 2. Core Protocol: Intent, Channel, and Action Triad (AC-21)

Every proposed content asset MUST declare the three-part contract:
1. **Audience Intent (`intent`)**:
   - Documented technical problem, informational question, or workflow need grounded in real user evidence.
   - Categorize intent: `informational` (conceptual/architectural understanding), `procedural` (how-to setup/debugging), or `evaluative` (framework/tool trade-off analysis).
2. **Distribution Channel (`channel`)**:
   - Explicit distribution path aligned with strategy: e.g., technical blog, documentation guide, GitHub repository README, or developer release notes.
   - Refuse channel proliferation without verified maintainer capacity.
3. **Intended Action (`action`)**:
   - Concrete, observable next step for the reader: e.g., clone repository, inspect CLI spec, run local smoke test, or evaluate offline scorecard.
   - Reject vague or missing calls-to-action ("raise awareness", "boost mindshare").

## 3. Editorial Sequencing & Capacity Pacing

1. **Foundational Precedence**:
   - Foundational content (architecture principles, core schemas, reproducible setup guides) must precede derivative assets (comparisons, advanced case studies).
2. **Capacity Bounds**:
   - Content production rate must be bounded by available maintainer review hours (`capacity_hours`).
   - Never book developer labor savings as cash or promise unreviewable release velocity.
3. **Proposal-Only Lifecycle**:
   - Output artifacts must retain `state: "prepared"`, `action: "propose"`. Publication or distribution requires explicit human campaign owner authorization.

## 4. Anti-Patterns & Guardrails

- **No Keyword-Volume Fabrication**: Never invent monthly search volume, keyword difficulty, or cost-per-click metrics without primary verified data.
- **No Unmapped Assets**: Reject any proposed article, post, or guide lacking the intent-channel-action triad.
- **No Bulk Publishing**: Reject automated generation of repetitive, thin, programmatic SEO content.
- **No Universal Claims**: Anchor all technical performance references in verified proof registers.

## 5. References

- [Content Mapping](references/content-mapping.md) — Asset triad specification, schema fields, and example mappings.
- [Editorial Governance](references/editorial-governance.md) — Review workflow, capacity pacing, and state lifecycle.
