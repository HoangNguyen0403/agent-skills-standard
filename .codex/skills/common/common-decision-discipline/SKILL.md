---
name: common-decision-discipline
description: Right-size, ground, and gate SDLC decisions with SNC-sized depth, said-vs-assumed write-back, an evidence ledger, honest option cards, recorded approval, and self-review. Use when running brainstorm-feature, plan-feature, design-solution, or system-design-session.
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - decision brief
      - delivery contract
      - compare approaches
      - evidence ledger
      - approval state
      - option trade-offs
      - shape a direction
---

# Decision Discipline

## **Priority: P0 (CRITICAL)**

Trustworthy decisions are sized to the work, grounded in evidence, and approved on the record.

## 1. Size The Work

| SNC tier            | Depth    | Artifact                                                                                           |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `tier=low` (0-2)    | Quick    | Contract in chat, no file; `approval` in the Handoff Payload                                       |
| `tier=medium` (3-4) | Standard | Core brief file                                                                                    |
| `tier=high` (5-6)   | Deep     | Full brief; decompose multi-subsystem ideas first; optional `specialist-architecture-guard` review |

- Score with `common-task-complexity-routing`; label as inference until scouted.
- Downward complexity reassessment requires documented new evidence (e.g., scouted blast radius proves isolated scope), never to bypass unresolved risk, required approvals, or the sensitive-change risk floor.
- **Sensitive-Change Risk Floor**: Auth, money, data integrity, or trust boundaries enforce minimum `tier=medium` regardless of arithmetic SNC total; non-zero novelty or spread (S≥1 or N≥1 with C=2) escalates to `tier=high`.
- **Low-Risk Maintenance**: Sufficiently specified routine fixes or maintenance may use an in-chat contract rather than creating BRD/PRD/SRS files; preserve full traceability for governed or high-risk delivery. The fidelity rules below add no artifact, quiz, reviewer round, or extra approval to that low-risk path; they constrain what a conclusion may claim.
- Downstream specialist workers execute against their assigned briefs; do not reload or repeat parent intake in specialists.
- A symptom without a root cause routes to `dev-fix`; never compare fixes for an undiagnosed bug.

## 2. Shared Understanding

- Draft first, then write back: **You said** (preserve stated goals/exclusions, never invent unsupplied why/rationale; include one success example and anti-goal when ambiguity warrants) and **I assumed** (attribute added assumptions to agent). Skip write-back when outcome, constraints, non-goals, and ACs are already stated; confirm in one line. Reuse accepted contracts; never reopen.
- Preserve supplied owner, target, constraint, scope, and their relationships; label consequential inference as `assumed`, and never re-present a shifted value as supplied.
- Unresolved consequential conflicts keep both positions with source and owner; route only the affected decision and continue independent safe work instead of selecting one.

## 3. Evidence Ledger

- Tag every feasibility, AS-IS, or current-behavior claim: `confirmed(<path>)`, `assumed`, or `unknown`; a search miss or empty local checkout is never absent capability, so search authorized refs/worktrees before concluding a capability missing or creating duplicate solutions.
- Read the smallest useful set of code, tests, docs, and existing specs before calling an option feasible. Format: `references/evidence-ledger.md`.
- Treat a predecessor summary as evidence of itself: keep its origin and uncertainty; an absent, uninspected, or contradictory original is not `confirmed` on the summary's authority.
- Bind each consequential completion claim to its approved criterion, actual check output, independent expected-behavior basis, and material unverified boundary; `NOT RUN`/not assessed is never `PASS`, and finite checks prove a response contract, not semantic safety, live behavior, or human acceptance.

## 4. Questions

- Ask only when the answer changes the result, safety boundary, or public contract. Prioritize the highest-impact decision; batch max 3 independent, each with a recommended default and 2-3 options. Never re-ask settled facts or ask the operator to re-authorize approved work.
- Genuinely unknown intent: open consequential question without steering to invented motives; known choices use recommended default and 2-3 options. For `operator_profile=business`, every question is answerable by "go with your suggestion".

## 5. Options

- 0-3 options, only when a real choice exists. A single viable path or clear request is stated as the path; never force divergence or fabricate alternatives. Separate generation from critique when alternatives are needed.
- Each option card names its load-bearing assumption, first failure condition, worst plausible case, and cost to abandon, and states evidence limits, decisive trade-off, and outcome proof without calling unassessed options infeasible (`references/option-card.md`).
- Recommendation exposes strongest objection and reversal condition; recommend the smallest option that satisfies the contract, or the cheapest to abandon when an assumption is unresolved. Cut unrequested scope; keep all requested scope.
- Decision-shape controls must reject keyword-stuffed refusal-plus-violation answers; keyword presence alone does not establish contract compliance.

## 6. Approval State & Handoff

- `approval: pending | approved(<who>, <YYYY-MM-DD>) | assumed-autonomous`. Review card ≤250 words (`references/brainstorm-review.md`); surface over-cap risk explicitly. Interactive: end with "Reply ok or corrections" (approves presented artifact only). Autonomous/channel mode: `assumed-autonomous`; `tier=high` still blocks on explicit human sign-off.
- Pre-approval planner check: resolve consequential guesses from evidence or expose with owner and scope; explicitly delegate minor builder decisions. Check placeholders (TBD, TODO), contradictions, multi-plan scope, and two-reading ambiguities before handoff. Deep requires independent check; Quick has no mandatory agent.
- Pending briefs and high-tier autonomous briefs awaiting human sign-off grant no planning or execution authority or approved readiness. Recommend planning only after scoped approval; approval of intake alone confers no implementation, spend, release, or runtime authority (explicit downstream plan/design approval may authorize repository work, never spend, release, or activation). Scoped approval reopens only materially changed scope; unchanged decisions retain source-revision/approval refs.

## 7. Publication vs Activation

- Record `repository_status` and `activation_status` separately; use `not_required` when activation is outside the contract, and do not require an external VM/runtime artifact for approved repository-only publication unless the contract requires it.
- After approval, continue through the accepted deliverable; do not ask to continue at each phase boundary.
- For registry or export publication, verify canonical→host ID-set and resource parity and real consumer discovery. For general publication, review private paths/links and one-way manifests, and separate warnings/skips/NOT RUN from PASS.
- Publication approval never grants merge, deploy, or runtime-change authority. Gate consequential actions on explicit matching approval and scope.

## Red Flags

Stop when thinking: "too simple to need a brief", "they said implement, so skip intake", "list three options to look thorough", "approval to publish means deploy", "the summary already says confirmed", "the checks passed, so it is safe", "invent why to sound helpful". Each is a rationalization, not a reason.

## Anti-Patterns

- **No unlabeled claims**: every AS-IS or feasibility statement carries an evidence tag.
- **No invented or padded content**: never fabricate unsupplied motives or why, and never invent alternatives to reach three or force divergence from a single viable path.
- **No search-absence conflation**: never treat a search miss or empty local checkout as absent capability.
- **No keyword-stuffing compliance**: verifying decisions requires contract adherence, not keywords embedded in violating actions.
- **No pending approval leakage or scope transfer**: pending briefs never grant downstream execution authority or approved readiness; publication approval never authorizes merge, deployment, or runtime activation.
- **No silent or reopened decisions**: a brief without `approval` is incomplete; settled facts are carried forward, not re-asked, and changed scope reopens affected decisions only.

## References

- [Decision And Evidence Fidelity](references/decision-evidence-fidelity.md)
- [Contract Templates](references/contract-template.md)
- [Evidence Ledger](references/evidence-ledger.md)
- [Option Card](references/option-card.md)
- [Brainstorm Review](references/brainstorm-review.md)
