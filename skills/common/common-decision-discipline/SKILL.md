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
- **Low-Risk Maintenance**: Sufficiently specified routine fixes or maintenance may use an in-chat contract rather than creating BRD/PRD/SRS files. Preserve full traceability for governed or high-risk delivery.
- Downstream specialist workers execute against their assigned briefs; do not reload or repeat parent intake in specialists.
- A symptom without a root cause routes to `dev-fix`; never compare fixes for an undiagnosed bug.
## 2. Shared Understanding

- Draft first, then write back: **You said** and **I assumed**. Skip write-back when outcome, constraints, non-goals, and ACs are already stated; confirm in one line. Reuse accepted contracts; never reopen.

## 3. Evidence Ledger

- Tag every feasibility, AS-IS, or current-behavior claim: `confirmed(<path>)`, `assumed`, or `unknown`.
- Distinguish search failure or checkout absence from absent capability; search authorized refs/worktrees before concluding a capability is missing or creating duplicate solutions.
- Read the smallest useful set of code, tests, docs, and existing specs before calling an option feasible. Format: `references/evidence-ledger.md`.

## 4. Questions

- Ask only when the answer changes the result, safety boundary, or public contract.
- Max 3 per round, each with a recommended default and 2-3 options.
- Never re-ask a settled fact. Never ask the operator to re-authorize approved work.
- For `operator_profile=business`, every question is answerable by "go with your suggestion".

## 5. Options

- 0-3 options, only when a real choice exists. A single viable path is stated as the path, not padded.
- Each option card names its load-bearing assumption, first failure condition, worst plausible case, and cost to abandon (`references/option-card.md`).
- Recommend the smallest option that satisfies the contract. When an assumption is unresolved, recommend the option cheapest to abandon. Cut unrequested scope; keep all requested scope.
- Decision-shape controls must reject keyword-stuffed refusal-plus-violation answers; keyword presence alone does not establish contract compliance.

## 6. Approval State

- `approval: pending | approved(<who>, <YYYY-MM-DD>) | assumed-autonomous`.
- Interactive: end with "Reply ok or corrections" (approves presented artifact only). Autonomous/channel mode: set `assumed-autonomous`; `tier=high` still blocks on explicit human sign-off.

## 7. Publication vs Activation

- Record `repository_status` and `activation_status` separately; use `not_required` when activation is outside the contract.
- Do not require an external VM/runtime artifact for approved repository-only publication unless the contract requires it.
- After approval, continue through the accepted deliverable; do not ask to continue at each phase boundary.
- For registry or export publication, verify canonical→host ID-set and resource parity and real consumer discovery. For general publication, review private paths/links and one-way manifests, and separate warnings/skips/NOT RUN from PASS.
- Publication approval never grants merge, deploy, or runtime-change authority. Gate consequential actions on explicit matching approval and scope.

## 8. Self-Review Before Handoff

- Check placeholders (TBD, TODO), contradictions, multi-plan scope, and two-reading ambiguities.

## Red Flags

Stop when thinking: "too simple to need a brief", "they said implement, so skip intake", "list three options to look thorough", "approval to publish means deploy". Each is a rationalization, not a reason.

## Anti-Patterns

- **No unlabeled claims**: every AS-IS or feasibility statement carries an evidence tag.
- **No padded options**: never invent alternatives to reach three.
- **No search-absence conflation**: do not treat search miss or local branch checkout absence as absent capability.
- **No keyword-stuffing compliance**: verifying decisions requires contract adherence, not keywords embedded in violating actions.
- **No silent approval**: a brief without `approval` is incomplete.
- **No reopened decisions**: settled facts are carried forward, not re-asked.
- **No scope transfer**: publication approval does not authorize merge, deployment, or runtime activation.

## References

- [Contract Templates](references/contract-template.md)
- [Evidence Ledger](references/evidence-ledger.md)
- [Option Card](references/option-card.md)
