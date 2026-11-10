# Brainstorm Review and Handoff

## 1. Compact Approval Card Contract

The default review card presented for human approval must be ≤250 words (excluding linked evidence and machine metadata). The cap counts the whole Quick in-chat reply and, for Standard/Deep, the Decision Card. For Quick, present only the concise in-chat contract/card: reuse settled facts, omit repeated sections, full artifact headings/tables, and serialized payload, and omit SNC/profile/routing metadata from chat (keep it in the machine handoff); link any necessary detail.

Required fields:
- **Outcome**: Target deliverable and observable value.
- **Recommendation**: Chosen direction; under uncertainty, expose strongest objection and reversal condition.
- **Scope & Non-goals**: In-scope boundaries and explicit exclusions.
- **Impact if wrong**: Consequence if the recommendation or primary assumption fails.
- **Material assumptions / Open decisions**: Critical assumptions, or the single highest-impact open decision.
- **Approval sought**: Exact scoped decision requested; approval of this intake brief alone confers no implementation, deploy, spend, or runtime authority (explicit implementation-plan approval in downstream plan/design may grant repository implementation, never implicit spend, release, or runtime activation).

Over-cap rule: if a consequential risk cannot fit within 250 words, surface it in one line labelled `Over-cap risk:` rather than omitting it to satisfy the word limit.

## 2. Numeric Evidence

A numeric target, threshold, duration, budget, or rate appears only when the user supplied it or it is cited from a `confirmed(<path>)`; otherwise write `unknown` and use `measure first` as the proof. Agent-proposed success examples and anti-goals are non-numeric. This applies to every option, card, and brief line.

## 3. Pre-Approval Planner Check

Before presenting the proposal for approval:
- **Consequential guesses**: Identify any guess that materially alters outcome, scope, safety boundary, or public contract. Resolve from code/evidence, or expose with owner and affected scope.
- **Builder decisions**: Explicitly mark minor implementation/builder choices as delegated.
- **Proportional review**: `tier=high` (Deep) requires an independent check; `tier=low` (Quick) has no mandatory agent review.

## 4. Handoff and Lifecycle Table

| Situation | Lifecycle reporting (`feature_status`) | Authority / Next action |
| --- | --- | --- |
| New initiative; brief pending | `not_started`; name missing approval in evidence/decision | No planning or execution authority; hold downstream action |
| Existing initiative; revised brief pending | Preserve evidenced lifecycle, never reset merely for intake | Hold affected scope; unrelated approved work usable |
| Brief explicitly approved | `requirements_ready` where justified | Recommend `plan-feature` on scoped brief; no execution consent |
| High-tier autonomous intake awaiting human sign-off | `not_started` (new) or preserved evidenced lifecycle | No planning or execution authority until explicit human sign-off |

## 5. Scoped Invalidation and Reopening

- A pending brief never grants downstream execution authority or approved readiness. Approval of this intake brief alone confers no implementation, deployment, or runtime authority.
- Material scope changes reopen only affected approval; unchanged decisions retain their original source-revision and approval references.
