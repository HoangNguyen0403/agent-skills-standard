# Brief: Brainstorm for direction quality, not paperwork

slug: brainstorm-decision-quality
operator_profile: technical
lane: direction; snc_tier: high; model_tier: strong; approval: approved(requesting maintainer, 2026-11-07)
SNC: S=2 N=1 C=2 total=5 tier=high
Owner / sponsor / validation owner / handoff owner: requesting repository maintainer (approved).

## Decision card

- **Outcome:** Users can quickly detect a wrong direction and approve a contract that a planner can use without consequential guessing.
- **Recommendation:** Strengthen existing brainstorm intake with intent playback, selective exploration/challenge, a consequential-guess check, and a compact approval card. Reuse existing decision-first planning vocabulary.
- **Scope:** Canonical brainstorm workflow, supporting shared template, behavioral evals, and generated exports. Change downstream contracts only where handoff compatibility requires it.
- **Main trade-off:** More analysis behind the scenes; less prose in the review surface. Concision must not hide uncertainty or remove safety gates.
- **What would reverse this choice:** Comparative runs show that a presentation-only change resolves both review burden and direction errors; then prefer that smaller change.
- **Approval sought:** This improvement direction and scope only. No implementation, model-spend, merge, deployment, or runtime authority.

## You said / I assumed

**You said:** Current brainstorm quality is below expectations; wrong direction undermines agent delivery. Learn from the three references, fit our SDLC, and make review easier and quicker rather than verbose.

**Approved assumptions:** Improve the current workflow rather than replace SDLC or install third-party packs. A short human-facing card may link deeper evidence and machine handoff data. The maintainer accepted the proposed length and evaluation targets; they remain targets, not measured results.

## Contract

**Capabilities:** Recover intent; inspect relevant context; explore real alternatives; challenge the recommendation; expose consequential uncertainty; obtain scoped approval; preserve decisions into planning.

**Constraints:** Preserve SNC risk floors, Why/Direction separation, evidence provenance, no-build/defer options, existing approval boundaries, and approved-context reuse. Do not equate missing information with infeasibility. High-tier work retains explicit human approval.

**Non-goals:** New universal thinking framework, mandatory ten-idea output, always-on agent teams, a new document layer, rewriting all SDLC stages, or moving PRD/SRS design into brainstorming.

### Acceptance criteria (direction contracts)

- **Contract clause 1 [legacy '01'] — Intent fidelity:** Distinguish user-stated intent from agent proposals. Preserve requested outcomes and exclusions; include one concrete success example and one anti-goal when they resolve ambiguity. Do not invent a rationale when the user has not supplied one.
- **Contract clause 2 [legacy '02'] — Consequential questions:** Research before asking. Default to the single highest-impact unresolved decision; batch only independent decisions, at most three. Never re-ask settled facts. Allow open intent elicitation when intent is genuinely unknown; offer concrete options when the choice is understood.
- **Contract clause 3 [legacy '03'] — Selective analysis:** Separate generation from critique where alternatives are needed; skip forced divergence for a clear request or sole viable path. Retained options state evidence limits, decisive trade-off, and outcome proof. The recommendation exposes its strongest objection and reversal condition, not merely supportive evidence.
- **Contract clause 4 [legacy '04'] — Review surface:** Default approval card is at most 250 words, excluding linked evidence and machine metadata. Show outcome, recommendation, scope/non-goals, impact if wrong, material assumptions/open decision, and exact approval sought. Do not dump the full artifact into chat. A consequential risk that cannot fit must be explicitly surfaced, not omitted to meet the cap.
- **Contract clause 5 [legacy '05'] — Planner check:** Before approval, identify guesses that would materially change outcome, scope, safety, or public contract. Resolve from context, mark minor builder decisions as delegated, or return the consequential question with owner and affected scope. Use an independent check for Deep; do not mandate another agent for Quick.
- **Contract clause 6 [legacy '06'] — Approval integrity:** A pending brief never grants downstream execution authority. Preserve authoritative artifact/revision and approval references; changed material scope invalidates affected approval only. Resolve the current pending-versus-ready reporting ambiguity using existing outcome schema compatibility, not an unreviewed new status.
- **Contract clause 7 [legacy '07'] — Behavioral proof:** Compare current and revised intake on clear, vague, solution-biased, settled-context, sensitive/high-tier, pending-approval, multi-slice, and negative-evidence scenarios. Judge intent preservation, invented facts, consequential omissions, approval leakage, and review effort. Keyword presence alone is not a pass.

*Trace identifier normalization note:* Canonical acceptance criteria IDs are normalized to three-digit format AC-001..AC-012 in the PRD for parser grammar compliance. The seven approved Direction contract clauses correspond to canonical criteria as follows:
- Contract clause 1 (legacy '01') maps to AC-001.
- Contract clause 2 (legacy '02') decomposes to AC-002, AC-003, AC-004.
- Contract clause 3 (legacy '03') decomposes to AC-005, AC-006.
- Contract clause 4 (legacy '04') maps to AC-007.
- Contract clause 5 (legacy '05') maps to AC-008.
- Contract clause 6 (legacy '06') decomposes to AC-009, AC-010.
- Contract clause 7 (legacy '07') decomposes to AC-011, AC-012.
Approved semantics, outcomes, and scope boundaries remain unchanged.

## Options and recommendation

| Option | Benefit / cost | First failure / abandonment |
| --- | --- | --- |
| Presentation only | Smallest change; better readability | Fails if substantive direction errors remain; cheap to replace |
| Targeted intake improvement — recommended | Addresses direction and review without replacing SDLC | Fails if planner still needs material guesses or review expands; localized rollback |
| Full multi-agent design workflow | Broader exploration for novel architecture | Unproven benefit for routine intake; higher cost and duplicated planning; expensive to abandon |

Defer if evaluation cannot distinguish improvement from added ceremony. No measured superiority is claimed.

## SDLC mapping

`brainstorm-feature` (why/direction and approval) → `plan-feature` (canonical requirements/ACs and slices) → `design-solution` when technical contracts need decisions → `implementation-readiness` → implementation and verification.

Carry source revision, approval reference, profile/lane/tier, scope, assumptions, evidence and unresolved decisions. Align with existing delivery-mode routing; do not infer low risk from short output. Keep technical verification, business acceptance and release authority separate. Use `validate-product` only when an actual value hypothesis needs empirical testing.

First bounded slice: improve brainstorm's interaction, review surface, and approval/handoff semantics. Supporting slices: semantic evaluation and export/documentation parity. Plan exact implementation ownership after brief approval.

## Evidence

| Claim | Status |
| --- | --- |
| Intake already has grounding, said/assumed, bounded questions/options, and approval | confirmed(.agents/workflows/brainstorm-feature.md:17-33) |
| Template mixes Why and Standard/Deep sections; pending approval coexists with ready output | confirmed(.agents/workflows/brainstorm-feature.md:49-68); behavioral impact unmeasured |
| Decision-first review and canonical AC ownership already exist downstream | confirmed(.agents/workflows/plan-feature.md:23-35) |
| Revision/authority reuse and separate evidence lanes already exist | confirmed(.agents/workflows/sdlc.md:42-56) |
| Existing shared discipline already supplies option failure conditions and high-tier human sign-off | confirmed(skills/common/common-decision-discipline/SKILL.md) |
| Superpowers contributes intent playback, anti-goals, and a planner's consequential-question check | confirmed([brainstorming](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md), [builder check](https://github.com/obra/superpowers/blob/main/skills/brainstorming/builder-check-prompt.md)); mutable main, read 2026-11-07 |
| Thinking article separates creative, analytical, critical and systems modes | confirmed([article](https://www.ysskrishna.space/blog/thinking-skills-for-ai-agents-cursor-claude-code)); not efficacy evidence |
| Marketplace describes divergent generation, feasibility and challenge passes | confirmed([listing](https://mcpmarket.com/tools/skills/brainstorming-agent)); secondary source |
| Primary OrchestKit prescribes those passes and also introduces substantial orchestration | confirmed([pinned skill](https://github.com/yonatangross/orchestkit/blob/64d099011bdbe4ad970781f0d5823c8ab0440715/src/skills/brainstorm/SKILL.md)); instructions, not outcome proof |
| Proposed changes reduce reviewer time and direction drift | assumed; requires comparative runs |
| Current review time, correction rate, and efficacy baseline | unknown |

No matching brainstorm-improvement brief or product evidence ledger was found in bounded repository discovery. Do not reuse unrelated product IDs. The supplied screenshot is motivation for human direction-setting, not evidence that its roadmap method improves outcomes.

## Validation and handoff checklist

Approved SMART metric: within 14 days of implementing the change, maintainer reviews eight paired scenario outputs; target median review time ≤2 minutes, zero critical scope/approval violations, and no increase in material intent corrections versus current workflow. Record baseline first; do not infer quality from length alone. Owner and acceptance window are approved defaults.

Risks: overcompression hides a boundary; staged questions prolong review; independent checking adds cost. Maintainer owns acceptance; planner owns checks against canonical criteria AC-001..AC-012 (corresponding to legacy clauses '01'–'07'). Mitigate with linked evidence, consequential-only questions, and tier-sized checking.

- [x] Three references inspected; primary OrchestKit source checked beyond the listing.
- [x] Current intake and downstream authority contracts inspected.
- [x] Scope fence, options and behavioral acceptance targets drafted.
- [x] Maintainer approves this revision and proposed validation defaults.
- [ ] Planner defines canonical REQ/AC mapping and comparison execution.
- [ ] Implementer proves generated-export parity and real consumer behavior.

## Approval and open questions

approval: approved(requesting maintainer, 2026-11-07). Evidence: maintainer replied “Ok” to the presented brief. Approval covers this direction, scope, and validation defaults only; it grants no implementation, model-spend, merge, deployment, or runtime authority. No unresolved intake decisions. Recommended next workflow: plan-feature.

## Outcome report

```json
{"schema_version":1,"run_id":"brainstorm-decision-quality-20261107T062533Z","slug":"brainstorm-decision-quality","workflow":"brainstorm-feature","feature_status":"requirements_ready","started_at":"2026-11-07T06:23:21.878Z","completed_at":"2026-11-07T06:25:33Z","requirement_trace":{"brd_objectives":[],"requirements":[],"acceptance_criteria":["AC-01","AC-02","AC-03","AC-04","AC-05","AC-06","AC-07"],"srs":[]},"completed_evidence":["reference-comparison","intake-and-handoff-inspection","human-brief-approval-2026-11-07"],"missing_evidence":["comparative-behavioral-results","review-time-baseline"],"decision_needed":[],"recommended_next_workflow":"plan-feature","cost":{"source":"unavailable"},"agent":{"identity":"orchestrator","model":"openai-codex/gpt-6.1-sol"}}
```

`requirements_ready` describes the approved intake brief, not an approved implementation plan or execution authority. Next workflow: `plan-feature`. Registry publication and runtime activation are not performed.

## Cost report

Session-cost tool called for brainstorm-feature. Host token usage, full actor pricing and total cost unavailable; no savings claim. No implementation tests or live efficacy evaluation executed in this intake.
