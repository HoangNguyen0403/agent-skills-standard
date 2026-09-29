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

| SNC tier | Depth | Artifact |
| --- | --- | --- |
| `tier=low` (0-2) | Quick | Contract in chat, no file; `approval` in the Handoff Payload |
| `tier=medium` (3-4) | Standard | Core brief file |
| `tier=high` (5-6) | Deep | Full brief; decompose multi-subsystem ideas first; optional `specialist-architecture-guard` review |

- Score with `common-task-complexity-routing`; label as inference until scouted. The tier only rises once work starts.
- A symptom without a root cause routes to `dev-fix`; never compare fixes for an undiagnosed bug.

## 2. Shared Understanding

- Draft first, then write back two lists: **You said** and **I assumed**. Allow one correction round.
- Skip the write-back when outcome, constraints, non-goals, and acceptance criteria are already stated; confirm in one line.
- Reuse an accepted contract; never reopen it.

## 3. Evidence Ledger

- Tag every feasibility, AS-IS, or current-behavior claim: `confirmed(<path>)`, `assumed`, or `unknown`.
- Read the smallest useful set of code, tests, docs, and existing `docs/brd|prd|srs` before calling an option feasible.
- Resolve what evidence can settle; label only what stays unknowable. Format: `references/evidence-ledger.md`.

## 4. Questions

- Ask only when the answer changes the result, safety boundary, or public contract.
- Max 3 per round, each with a recommended default and 2-3 options.
- Never re-ask a settled fact. Never ask the operator to re-authorize approved work.
- For `operator_profile=business`, every question is answerable by "go with your suggestion".

## 5. Options

- 0-3 options, only when a real choice exists. A single viable path is stated as the path, not padded.
- Each option card names its load-bearing assumption, first failure condition, worst plausible case, and cost to abandon (`references/option-card.md`).
- Recommend the smallest option that satisfies the contract. When a critical assumption is unresolved, recommend the option cheapest to abandon.
- Cut unrequested scope; keep all requested scope.

## 6. Approval State

- `approval: pending | approved(<who>, <YYYY-MM-DD>) | assumed-autonomous`.
- Interactive: end with "Reply ok or corrections". An ok approves only the artifact presented.
- Autonomous or channel mode with no confirmation channel: set `assumed-autonomous` and continue. Readiness warns, and blocks only at `tier=high`.

## 7. Self-Review Before Handoff

- Placeholders: TBD, TODO, empty sections.
- Contradictions between sections.
- Scope: one plan, or needs splitting.
- Ambiguity: a requirement with two readings; pick one and state it.

## Red Flags

Stop when thinking: "too simple to need a brief", "they said implement, so skip intake", "it's a bug, pick a fix", "list three options to look thorough", "ask again to be safe", "they approved the idea, so the plan is approved". Each is a rationalization, not a reason.

## Anti-Patterns

- **No unlabeled claims**: every AS-IS or feasibility statement carries an evidence tag.
- **No padded options**: never invent alternatives to reach three.
- **No silent approval**: a brief without `approval` is incomplete.
- **No reopened decisions**: settled facts are carried forward, not re-asked.

## References

- [Contract Templates](references/contract-template.md)
- [Evidence Ledger](references/evidence-ledger.md)
- [Option Card](references/option-card.md)
