---
name: common-decision-discipline
description: Right-size, ground, gate, and continue SDLC work — SNC-sized depth, said-vs-assumed write-back, evidence ledger, honest option cards, recorded approval, self-review, and once-per-run workflow handoff. Use in any SDLC workflow, including brainstorm-feature, plan-feature, design-solution, system-design-session, and at every handoff.
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
      - auto_continue
      - workflow handoff
---
# Decision Discipline

## **Priority: P0 (CRITICAL)**

Trustworthy decisions are sized to the work, grounded in evidence, and approved on the record.

## 1. Size The Work

- `tier=low` (0-2) -> Quick: contract in chat, no file; `approval` in the Handoff Payload. `tier=medium` (3-4) -> Standard: core brief file. `tier=high` (5-6) -> Deep: full brief; decompose multi-subsystem ideas first; optional `specialist-architecture-guard` review.
- Score with `common-task-complexity-routing`; label as inference until scouted. Downward reassessment requires documented new evidence (e.g. scouted blast radius proves isolated scope), never to bypass unresolved risk, required approvals, or the risk floor. **Sensitive-Change Risk Floor**: auth, money, data integrity, or trust boundaries enforce minimum `tier=medium` regardless of arithmetic SNC total; non-zero novelty or spread (S≥1 or N≥1 with C=2) escalates to `tier=high`.
- **Low-Risk Maintenance**: Sufficiently specified routine fixes or maintenance may use an in-chat contract rather than creating BRD/PRD/SRS files; preserve full traceability for governed or high-risk delivery. The fidelity rules below add no artifact, quiz, reviewer round, or extra approval to that path; they constrain what a conclusion may claim.
- Downstream specialist workers execute against their assigned briefs; do not reload or repeat parent intake. A symptom without a root cause routes to `dev-fix`; never compare fixes for an undiagnosed bug.

## 2. Shared Understanding

- Draft first, then write back: **You said** (preserve stated goals/exclusions, never invent unsupplied why/rationale; include one success example and anti-goal when ambiguity warrants) and **I assumed** (attribute added assumptions to the agent). Skip write-back when outcome, constraints, non-goals, and ACs are already stated; confirm in one line. Reuse accepted contracts; never reopen.
- Preserve supplied owner, target, constraint, scope, and their relationships; label consequential inference `assumed`; never re-present a shifted value as supplied. Unresolved consequential conflicts keep both positions with source and owner; route only the affected decision and continue independent safe work instead of selecting one.

## 3. Evidence Ledger

- Tag every feasibility, AS-IS, or current-behavior claim: `confirmed(<path>)`, `assumed`, or `unknown`. A search miss or empty local checkout is never absent capability; search authorized refs/worktrees before concluding a capability missing or creating duplicate solutions. Read the smallest useful set of code, tests, docs, and existing specs before calling an option feasible. Format: `references/evidence-ledger.md`.
- Treat a predecessor summary as evidence of itself: keep its origin and uncertainty; an absent, uninspected, or contradictory original is not `confirmed` on the summary's authority.
- Bind each consequential completion claim to its approved criterion, actual check output, independent expected-behavior basis, and material unverified boundary; `NOT RUN`/not assessed is never `PASS`, and finite checks prove a response contract, not semantic safety, live behavior, or human acceptance.

## 4. Questions

- Ask only when the answer changes the result, safety boundary, or public contract. Prioritize the highest-impact decision; batch max 3 independent, each with a recommended default and 2-3 options. Never re-ask settled facts or ask the operator to re-authorize approved work.
- Genuinely unknown intent: open consequential question without steering to invented motives; known choices use a recommended default and 2-3 options. For `operator_profile=business`, every question is answerable by "go with your suggestion".

## 5. Options

- 0-3 options, only when a real choice exists. A single viable path or clear request is stated as the path; never force divergence or fabricate alternatives. Separate generation from critique when alternatives are needed.
- Each option card names its load-bearing assumption, first failure condition, worst plausible case, cost to abandon, evidence limits, decisive trade-off, and outcome proof without calling unassessed options infeasible (`references/option-card.md`).
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

## 8. Continuation

- Apply identically at direct workflow entry and at `/sdlc` entry, and at every handoff. Only `mode=autonomous|channel` with explicit `auto_continue=true` enables automatic successors. Absent or `false` opt-in starts none; `mode=interactive` stays interactive and reports that automatic chaining is unavailable; unknown or conflicting values pause before successor execution naming the exact conflict. Never infer autonomous mode from `auto_continue` alone. Continuation preference never grants action authority.
- Order: preserve settled evidence → resolve the actual result (never a template example or a merely printed successor name) → apply opt-out/mode → validate the candidate against the task work-item and revision, scope fence, authority, prerequisites, and specialized workflow gates → check capability and repeated state → load the successor → perform its work → record the observed result. Specialized gates, terminal branches, and caller-return contracts always dominate this contract.
- Outputs: `continue` (loaded successor plus performed-work evidence), `paused` (pending action, exact missing approval/input/owner), `terminal` (real terminal/null result or accepted deliverable), `stage_only` (opt-out or interactive without chaining). A successor only named in `recommended_next_workflow`, or whose body was read but not run, is not continuation: execute it and record its settled outcome, or record why the run paused/ended. Never report execution before it occurred; retrieving or printing a workflow body is not execution.
- Carry in the task's existing authoritative artifact, without fabricating missing fields: slug; work-item reference + source revision; mode/`auto_continue`; approval actor, reference, and scope; scope fence/stop boundary; execution approach; current stage/action; last settled action with evidence refs; candidate successor; pause reason/owner/required input; technical/acceptance/release lane refs; previous unresolved-state identity.
- Select the successor from the actual task-linked result, never a fixed chain or `CORE_SDLC_CHAIN`. A specialist/subprocedure returns control to its calling workflow rather than starting new global intake. A missing workflow, standard, or host capability pauses with the capability gap and the manual resume input.
- No-progress: the same unresolved state without changed input or evidence pauses with its cause and required change; no arbitrary retry and no invented successful terminal status. Paused work stays pending.
- Recovery: re-check work-item identity, approved revisions, scope, authority, and evidence before the next unfinished action. A possibly performed consequential effect is reconciled from authoritative evidence or paused for human reconciliation, never replayed blindly; an interrupted action's completion is unknown until reconciled.
- Checkpoint persistence: if writing the authoritative checkpoint fails, report the actual completed effect and the write failure, pause successor advancement with owner and required resume input, and never manufacture a receipt, undo, or replay the effect.
- Evidence: keep export/static/lookup checks distinct from actual successor execution, host persistence, and human acceptance; unexercised hosts and surfaces stay `not assessed`.

## Record Decisions

- Record a choice among materially different outcomes when you choose it by applying a named pre-approved rule (`rule`) or by using a default not covered by a rule (`default-pending-review`). Following an outcome explicitly selected by a human or using a routine tool is not a decision. Record only a permitted choice; the record never authorizes action or replaces a required human gate. Decisions that change approved scope or contract use the ADR-lite form (`supersedes:` decision ids, `supersedes_approval:` approval revision, `invalidates:` REQ-/AC-/SRS- ids, human approver); field semantics live only in [Decision Record](references/decision-record.md).

## Red Flags

Stop when thinking: "too simple to need a brief", "they said implement, so skip intake", "list three options to look thorough", "approval to publish means deploy", "the summary already says confirmed", "the checks passed, so it is safe", "the successor name is enough", "invent why to sound helpful". Each is a rationalization, not a reason.

## Anti-Patterns

- **No unlabeled claims**: every AS-IS or feasibility statement carries an evidence tag.
- **No invented or padded content**: never fabricate unsupplied motives or why, and never invent alternatives to reach three or force divergence from a single viable path.
- **No search-absence conflation**: never treat a search miss or empty local checkout as absent capability.
- **No keyword-stuffing compliance**: verifying decisions requires contract adherence, not keywords embedded in violating actions.
- **No approval leakage or scope transfer**: pending briefs never grant execution authority or approved readiness; publication approval never authorizes merge, deployment, or runtime activation; continuation opt-in never authorizes the successor's action.
- **No silent, reopened, or replayed decisions**: a brief without `approval` is incomplete; settled facts are carried forward, not re-asked; changed scope reopens affected decisions only; uncertain effects are reconciled, not replayed.

## References

[Decision And Evidence Fidelity](references/decision-evidence-fidelity.md) · [Contract Templates](references/contract-template.md) · [Evidence Ledger](references/evidence-ledger.md) · [Option Card](references/option-card.md) · [Brainstorm Review](references/brainstorm-review.md)
