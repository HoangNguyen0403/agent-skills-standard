---
name: marketing-strategy
description: 'Formulates bounded developer marketing campaign strategies, selects channel mixes within explicit capacity and cash limits, and documents rejected channels. (triggers: `marketing strategy selection`, `developer marketing channel mix`, `campaign strategy bounds`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing strategy selection'
      - 'developer marketing channel mix'
      - 'campaign strategy bounds'
      - 'marketing channel selection'
---

# Marketing Strategy

## **Priority: P0 (CRITICAL)**

Formulate bounded marketing strategies for developer tools. Constrain channel selection strictly within maintainer capacity hours and authorized cash budgets, mandate explicit documentation of rejected channels with rationale, enforce community rules, and hold outputs in prepared proposal state.

## 1. Capability Preflight

Verify consumed PM capabilities and strategic authority before selecting channels:
1. **Consumed Capabilities Resolution**:
   - Check `product-strategy` via MCP (`get_skill("product-management", "product-strategy")`) or installed root `<root>/product-management/product-strategy/SKILL.md` (ordinary) / `<root>/product-management-product-strategy/SKILL.md` (flattened).
   - Check `product-evidence` via MCP (`get_skill("product-management", "product-evidence")`) or installed root `<root>/product-management/product-evidence/SKILL.md`.
   - Missing or excluded skill is an explicit capability gap; never infer installation from monorepo source checkout.
2. **Companion Resource**: Check `scripts/validate-product-evidence.mjs` relative to resolved `product-evidence`. Missing companion is a resource gap.
3. **Evidence & Authority Distinction**:
   - Distinguish missing capability (tooling absent) from missing strategic authority (`strategy_authority: null` or ledger absent).
   - If strategy authority is missing, record a `strategy_gap`; strategy proceeds strictly in proposal state (`state: "prepared"`, `outcome: "propose"`).
   - No auto-install, no ambient network fetching, no simulated validation, and no silent repo fallback.

## 2. Core Protocol

1. **Bounded Channel Mix Selection (AC-20)**:
   - Select a focused, realistic channel mix tailored to developer adoption (e.g. technical documentation, GitHub release notes, in-depth technical walkthroughs, developer community forums).
   - Constrain the mix strictly within stated maintainer hours and cash limits.
2. **Explicit Rejected Channels with Rationale (AC-20)**:
   - Every strategy document MUST list evaluated and rejected channels alongside clear justifications (e.g. paid PPC ads rejected due to zero cash budget and developer skepticism; cold email outreach rejected due to negative trust and anti-spam norms; trade show sponsorships rejected due to excessive cost).
3. **Community Anti-Spam & Rule Compliance**:
   - Strictly prohibit any tactics that violate platform guidelines or community trust (e.g. unsolicited direct messages on Discord/Slack, promotional spamming of developer subreddits, automated GitHub issue creation).
4. **Prepared / Proposal-Only State (AC-04)**:
   - Campaign outputs must remain `state: "prepared"`, never `published` or `active`.
   - Autonomous publishing, ad purchasing, or mass outreach without human decision approval (`DEC` record) is forbidden.
5. **Cash vs. Capacity Accounting**:
   - Track cash costs and maintainer labor hours as separate non-convertible metrics. Never treat volunteer or maintainer hours as cash expenses or convert capacity savings to cash margin.

## 3. Anti-Patterns & Red Flags

- **No Unbounded Channel Blitz**: Reject plans proposing 10+ concurrent channels without maintainer capacity.
- **No Unexplained Rejections**: Never pick channels without documenting evaluated and rejected alternatives.
- **No Community Guideline Breaches**: Reject any strategy that encourages astroturfing or unsolicited outreach.
- **No Autonomous Launch**: Never transition campaigns to active/published without recorded human authority.

## 4. References

- [Strategy Selection Protocol](references/strategy-selection-protocol.md) — Channel evaluation, resource budgeting, and governance.
- [Channel Matrix Template](references/channel-matrix-template.md) — Matrix template for evaluating and rejecting candidate channels.
