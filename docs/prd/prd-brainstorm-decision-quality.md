# Feature Plan: Brainstorm decision quality

Status: Approved; approval: approved(requesting maintainer, 2026-11-07); operator_profile: technical; lane: direction
SNC: S=2 N=1 C=2 total=5 tier=high; model_tier: strong; delivery_mode: standard
Product/validation owner: requesting maintainer. Engineering owner: intake worker. QA owner: independent verifier. Merge/release authority: maintainer only.

## Decision brief

- **Changes:** Initial PRD elaborating the approved brief; no expanded product scope.
- **Recommendation:** Update canonical intake and its shared rules/template; independently author behavioral evaluation cases; then regenerate exports and verify a disposable consumer.
- **Impact if wrong:** A concise answer could conceal uncertainty or allow an unapproved direction into delivery. Passing structural checks cannot establish decision quality.
- **Evidence:** Existing workflow and planning contracts inspected. Current review time and comparative efficacy remain unknown.
- **Decision:** Maintainer selected “A” after the explicit plan/execution gate: Subagent-Driven implementation approved.
- **Authority:** Repository implementation and local verification only. Paid evaluation, premium models, merge, publication and runtime activation remain separate.
- **Independent slices:** Intake authoring and scenario authoring can run concurrently after approval; integration consumes both. Human timing acceptance remains separate from technical readiness.

## Outcome and guardrails

Source: [approved Direction brief](../brd/brd-brainstorm-decision-quality.md), approval recorded from maintainer's “Ok” on 2026-11-07; approved baseline SHA-256 `4be30dd1bfeb2cb8bef837425db6f7c91ef6c5b2f1df01d779b25528143ef78a` (retained original approved hash; later identifier-normalization revision normalizes parser grammar IDs without reapproving or altering approved meaning).

Objective: make wrong direction visible before planning and make review fast. Retain the approved metric: eight paired scenarios reviewed within 14 days of implementation, median review ≤2 minutes, zero critical scope/approval violations, no increase in material intent corrections against baseline. This is a target, not evidence of benefit.

Preserve SNC floors, Why/Direction lanes, no-build options, approved-context reuse, canonical evidence, and separate approval/acceptance/release authority. High SNC does not authorize premium spend. Standard document depth is sufficient: no new runtime enforcement, API/storage schema, or sensitive application boundary is introduced.

## Scope and capability inventory

Improve intake:
- Recover intent → REQ-001 (`in_scope`).
- Ask consequential questions → REQ-002 (`in_scope`).
- Explore and challenge directions → REQ-003 (`in_scope`).
- Present a compact approval → REQ-004 (`in_scope`).
- Resolve consequential guesses → REQ-005 (`in_scope`).
- Preserve approval and handoff authority → REQ-006 (`in_scope`).
- Demonstrate behavioral and export compatibility → REQ-007 (`in_scope`).

Excluded: mandatory idea quotas/teams, third-party installation, universal thinking frameworks, a new outcome status/schema, rewriting unrelated SDLC stages, deployment. No committed capability is deferred. Detailed requirements/technical design remain downstream responsibilities.

## Canonical requirements

All rows are Draft pending plan approval. Maintainer is accountable for every row; listed owner executes it. Source refs identify approved Direction brief contract clauses rather than inventing artificial business-objective IDs for a Direction brief (unlinked BRD-OBJ warnings are expected and allowed for Direction lane).

| ID | Requirement | Owner | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Preserve stated intent, exclusions and attribution of agent proposals. | Intake worker | P0 | BRD contract 1 (legacy '01') |
| REQ-002 | Elicit only consequential unresolved information, grounded in supplied/project context. | Intake worker | P0 | BRD contract 2 (legacy '02') |
| REQ-003 | Select analysis depth and expose recommendation-disconfirming evidence. | Intake worker | P0 | BRD contract 3 (legacy '03') |
| REQ-004 | Present the compact review card with conditional supporting detail. | Intake worker | P1 | BRD contract 4 (legacy '04') |
| REQ-005 | Resolve planner-critical guesses before approval, proportionate to tier. | Intake worker | P0 | BRD contract 5 (legacy '05') |
| REQ-006 | Bind scoped approval to authoritative evidence without inventing lifecycle states. | Intake worker | P0 | BRD contract 6 (legacy '06') |
| REQ-007 | Deliver independently judged scenarios and consistent native consumer exports. | QA/integration workers | P0 | BRD contract 7 (legacy '07'); scope fence |

## Canonical acceptance criteria

*ID normalization and alias mapping note:* Trace identifiers are normalized to canonical three-digit format AC-001..AC-012 for parser grammar compliance. Approved legacy identifiers ('01'..'07' / '02a'..'07b') are preserved in the legacy alias column for historical traceability; approved semantics, outcomes, owner accountability, and approval date (2026-11-07) are strictly preserved. Each row has one verification lane. Semantic evaluation means judging produced answers, not matching keywords or source wording.

| ID | Req | Legacy alias | Given / When / Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | legacy '01' | Given stated goals/exclusions, when intake reflects intent, then it preserves them, attributes added assumptions to the agent, and never invents an unsupplied rationale; when ambiguity warrants it, include one concrete success example and one anti-goal. | QA | Semantic evaluation |
| AC-002 | REQ-002 | legacy '02a' | Given settled context, when intake proceeds, then it does not ask for facts already answered. | QA | Semantic evaluation |
| AC-003 | REQ-002 | legacy '02b' | Given genuinely unknown intent, when intake asks, then it uses an open consequential question without steering toward an invented motive; known choices may use options. | QA | Semantic evaluation |
| AC-004 | REQ-002 | legacy '02c' | Given several unresolved decisions, when intake questions the maintainer, then it prioritizes the highest-impact one and batches at most three only if independent. | QA | Semantic evaluation |
| AC-005 | REQ-003 | legacy '03a' | Given a clear request or one evidenced viable path, when intake chooses direction, then it does not fabricate alternatives or force divergence; when alternatives are needed, generation precedes critique. | QA | Semantic evaluation |
| AC-006 | REQ-003 | legacy '03b' | Given a recommendation under uncertainty, when intake presents it, then it exposes the strongest objection and reversal condition; retained options identify evidence limits, decisive trade-off and outcome proof without calling an unassessed option infeasible. | QA | Semantic evaluation |
| AC-007 | REQ-004 | legacy '04' | Given a reviewable proposal, when approval is sought, then the default card meets the approved 250-word content contract; necessary over-cap risk is explicitly surfaced and linked details are not dumped into chat. | Maintainer | Manual review |
| AC-008 | REQ-005 | legacy '05' | Given planner guesses, when preapproval checking occurs, then consequential guesses are resolved from evidence or exposed with owner and affected scope, while minor builder decisions are explicitly delegated; Deep has an independent check while Quick has no mandatory agent. | QA | Semantic evaluation |
| AC-009 | REQ-006 | legacy '06a' | Given a pending brief, when output is handed off, then no planning/execution authority or approved readiness is inferred from its status or filename. | QA | Semantic evaluation |
| AC-010 | REQ-006 | legacy '06b' | Given scoped approval and a later material change, when work resumes, then only affected approval is reopened and unchanged decisions retain source-revision/approval references. | QA | Semantic evaluation |
| AC-011 | REQ-007 | legacy '07a' | Given baseline and revised intake, when eight paired scenarios are assessed, then reports retain raw outputs, independent semantic judgments and measured human timing without treating static checks as efficacy proof. | Maintainer | Comparative human evaluation |
| AC-012 | REQ-007 | legacy '07b' | Given authored changes, when a disposable consumer syncs and discovers/invokes brainstorm, then configured native artifacts and provenance correspond to the canonical revision. | Integration worker | Consumer smoke |

## Handoff decision table

| Situation | Lifecycle reporting | Authority / next action |
| --- | --- | --- |
| New initiative; brief pending | Existing `not_started`; name missing approval in evidence/decision fields | Approval pending; no approved planning handoff |
| Existing initiative; revised brief pending | Preserve evidenced lifecycle, never reset it merely for intake | Hold affected scope; unrelated approved work remains usable |
| Brief explicitly approved | `requirements_ready` where justified | `plan-feature` consumes the scoped brief; no automatic implementation consent |
| High-tier autonomous intake | Never turn `assumed-autonomous` into human approval | Explicit human sign-off still required |

Approval remains in the artifact/handoff, not an invented RunRecord field. A recommended next workflow is not permission to execute it. Reuse existing source-revision, approval-reference and evidence-lane conventions; no schema migration.

## Implementation plan and ownership

| Slice | Sole owner / files | Contract and artifact | Dependencies | Size / confidence |
| --- | --- | --- | --- | --- |
| A: Intake | Intake worker: `.agents/workflows/brainstorm-feature.md`; `skills/common/common-decision-discipline/SKILL.md` and `references/contract-template.md` | REQ-001–006; conditional Why/Deep sections, compact card, planner check, scoped open-question exception, honest status table | Approved plan and execution mode | M / high |
| B: Evaluation | QA worker: `skills/common/common-decision-discipline/evals/evals.json`; adjacent scenario/reference material only as required by existing format | REQ-007 and semantic ACs; independently derived scenario oracles, baseline/revised comparison procedure | Approved plan; independent of A | M / medium |
| C: Integration | Integration owner: generated exports; applicable SDLC quick reference/changelog, workflow release metadata; audit changes only if existing semantic checks require them | REQ-007; generated parity and consumer proof; preserve workflow line budget by linking detail, not dropping controls | A + B | M / medium |
| D: Review | Independent reviewer, no implementation ownership | Assess all ACs and unchanged safety boundaries; report actual PASS/FAIL/NOT RUN | Integrated result | S / high |

A and B run in one parallel batch, with no shared edits. C owns all generated files and resolves interface disagreements. Never hand-edit each host copy. Do not change `plan-feature`/`sdlc` unless a demonstrated handoff incompatibility requires the smallest aligned update. No new SRS is needed for this schema-preserving document contract; material technical contract discovery routes to `design-solution` instead of an unapproved redesign.

Execution profiles: use authorized implementation ladder at dispatch time, preserving exact model/effort/settings. Analysis/review is separate. Named role is not account authorization. Full live evaluation requires separately scoped quota/provider authorization; if absent, finish repository checks and report live efficacy NOT RUN rather than fabricate it.

## Verification procedure

1. Freeze the current intake revision and existing assertions before changing behavior. Canonical baseline SHA-256: `cfe34b3d2807342e490e2c74a3c442cf0a4f1c1b2ae6dba33e190a7c1ed8dc94`.
2. B defines eight cases from the approved brief: clear, vague, solution-biased, settled-context, sensitive/high-tier, pending-approval, multi-slice, negative-evidence. Preserve independently defined oracles; never weaken them to accept implementation output.
3. After integration, run `rtk pnpm audit:sdlc`, `rtk pnpm generate-indices --check`, and relevant generation checks. Structural PASS is not behavioral PASS. Generate exports using `rtk pnpm generate-indices` per staging conventions.
4. Use existing decision-eval selection `common/common-decision-discipline`: `rtk pnpm evals:preflight -- --skills-file <selection>` and `rtk pnpm evals:manifest -- --skills-file <selection>`. Resolve concrete selection path in the worker's evidence. Execute/resume the manifest only under matching authorization; verify executed runs with `rtk pnpm evals:verify -- --run <runId>`.
5. In a disposable consumer, use reviewed local source configuration and `rtk ags sync`; verify canonical/native digests and workflow catalog provenance, then MCP `list_workflows`/`get_workflow` and actual native workflow invocation. Do not publish a remote ref or change this user's live installation to conduct the smoke.
6. Maintainer times paired review outputs and records corrections. Human review must distinguish concise-but-wrong from genuinely actionable. Missing live evaluation or human timing remains a named acceptance gap, not proof that all targets passed.

These are planned commands/scenarios, not executed verification. Focused existing tests are selected if tooling code changes; do not add tests asserting copied prose or keyword presence.

## Status and receipt

- Intake and this implementation plan: approved by requesting maintainer, 2026-11-07; execution: Subagent-Driven, selected “A”.
- `feature_status`: requirements_ready inherited from the approved intake, not an approved implementation plan.
- Run record: [plan receipt](../../artifacts/runs/brainstorm-decision-quality/20261107T063151Z-plan-feature.json).
- Completed: approved-source reuse, requirement/AC decomposition, schema-compatible status decision, ownership and verification planning.
- Missing: implementation and behavioral/consumer/human evidence; plan approval and execution selection are settled.
- PM owns requirements; engineering implements; independent QA verifies; maintainer approves plan and human acceptance. None grants release authority.
- Cost: host tokens/full actor cost unavailable; no savings claim.
- Planning checks: receipt JSON parses with scoped identity, seven requirements, twelve criteria and pending approval retained. Full scoped outcome audit could not execute: `tsx` is unavailable and this checkout has no `node_modules`. No dependency installation or behavioral efficacy run was performed.
- Independent plan review identified three omitted source obligations; the canonical rows now retain conditional intent examples/anti-goals, complete option-analysis controls, and explicit delegation of minor builder decisions.

## References and next workflow

Evidence: `.agents/workflows/plan-feature.md:14-35`; `.agents/workflows/sdlc.md:42-56`; `scripts/outcome/schema.ts:16-67`; `docs/sdlc-workflow-quick-reference.md:251-283`; `package.json`; `CONTRIBUTING.md`; external-source analysis remains in the approved brief.

Next workflow: `implement-feature` using Subagent-Driven execution; verification follows implementation. Approval does not grant merge, publication, paid evaluation, or activation authority.
