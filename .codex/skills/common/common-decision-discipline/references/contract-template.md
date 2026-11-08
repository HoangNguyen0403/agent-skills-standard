# Contract Templates

## Compact Approval Card (≤250 words, human review surface)

```md
### Decision Card: [Slug / Name]
- **Outcome**: [Target deliverable and observable outcome]
- **Recommendation**: [Direction; strongest objection and reversal condition under uncertainty]
- **Scope & Non-goals**: [In-scope boundaries; explicit exclusions]
- **Impact if wrong**: [Failure consequence and cost to abandon]
- **Assumptions / Open decision**: [Load-bearing assumption or single highest-impact question]
- **Proof**: [Observable result that shows the contract is met; every option, including a single viable path, states its own Proof line]
- **Approval sought**: [Exact scoped approval; approval of this intake brief alone confers no implementation, deployment, spend, or runtime authority]
Reply ok or corrections.
```

## Quick (tier=low, in chat, no file)

Use only a concise contract/card; reuse settled facts and omit artifact headings, repeated sections, tables, and serialized outcome payload. The 250-word cap counts the whole Quick reply; omit SNC/profile/routing metadata from chat (keep it in the machine handoff). Mark every criterion or scope item the user did not state `(assumed)`.

```md
Contract: [one-line outcome; user-unstated scope or criteria marked "(assumed)"]
Constraints / non-goals: [only material boundaries]
Acceptance: [user-stated criteria; mark agent-drafted ones "(assumed)"]
Proof: [observable result that shows the contract is met]
Recommendation / objection / reversal: [when a real choice or uncertainty exists]
Approval: [state and exact scope]; pending means no planning or execution authority
Reply ok or corrections.
```

Quick must still surface consequential assumptions, evidence limits, and unresolved decisions; link detail rather than repeat it.

## Standard (tier=medium, docs/brd/brd-[slug].md)

```md
# Brief: [Name]
lane: why | direction | both; snc_tier: medium; approval: pending | approved(<who>, <YYYY-MM-DD>) | assumed-autonomous
## Decision Card
## You Said / I Assumed
## Contract
Outcome; Constraints; Non-Goals; Acceptance Criteria; mark every criterion or scope item the user did not state `(assumed)`
## Why            (Why lane only)
## Options And Recommendation
Each option states `Proof: [observable result that shows the contract is met]`; a single viable path states it too.
## Evidence
## Planner Check
## Approval
```

## Deep (tier=high, docs/brd/brd-[slug].md)

Standard, plus: decomposition into slices (brainstorm the first slice only), stakeholders, cost-benefit, delivery context, glossary, risk register with owners, independent planner check, and explicit human sign-off (autonomous mode cannot substitute human approval).
