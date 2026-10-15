# System Design Professionalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` for approved bounded implementation and independent review. `executing-plans` is permitted only after an explicit inline exception. Steps use checkbox syntax; workers execute their assigned brief and never spawn agents.

**Goal:** Improve professional system-design guidance, including first-class data-flow reasoning, and prove the approved scope with grounded evaluation and independent acceptance.
**Architecture:** Extend the canonical registry rather than create another design lane. Data-architecture owns one critical-flow contract; methodology facilitates it; review verifies it; existing diagramming renders selected views. Add one mobile/client skill with lazy SDK/platform references; preserve runtime tooling and workflow schemas.
**Tech Stack:** Markdown/YAML-frontmatter skills and workflows, JSON evals, existing TypeScript generation/evaluation scripts, pnpm, and the existing Python/draw.io diagram pipeline.
**Spec:** [Review brief and PRD](../../prd/prd-system-design-professionalization.md).
**Status:** Approved for Subagent-Driven implementation using authorized Personal standard profiles. Paid live runs, final acceptance, promotion, and release remain separately gated.
**Source snapshot:** `b529c2d99112db2af63aa2c32365a37759613cc6`, inspected 2026-10-11. Reconcile intervening user changes before execution; never overwrite them.
**Planning context:** `operator_profile=hybrid`; Direction maintenance lane; SNC `S2/N1/C1` (4, medium); G0/G1 approved. Provisional relative sizing: seven M tasks at 3 points plus two L tasks at 5 points = 31 points, not hours or monetary cost.

## Global Constraints

- Preserve the three modes: new design, review existing, interview practice. Classify surface independently: backend, mobile/client, SDK/library, full stack.
- Required reasoning, conditional diagram. No diagram set, specialist count, queue/cache/region, framework layer, or local database is universally mandatory.
- Extend `system-design-data-architecture`; do not add a competing data-flow skill. Only `system-design-mobile-client` is new.
- Canonical skills are under `skills/`; canonical workflows are `.agents/workflows/`. Do not hand-edit generated mirrors.
- Keep skill bodies at most 100 lines, descriptions at most 100 words, canonical workflows below 80 lines; move long examples to lazy references.
- Preserve the current outcome schema/enums, diagram spec, assertion types, CLI, and MCP runtime; no new dependency or runtime implementation change except the explicitly human-authorized T7 unverified-edge delimiter repair and focused regression test listed below. That exception grants no renderer redesign, style retuning, exporter/app upgrade, or other runtime change.
- Stable trace: `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`; `FLOW-*` is a linked design-record ID, not a new machine-readable outcome field or enum.
- Separate scope/lifecycle, evidence kind/confidence, and metric provenance. Documentation is not deployment evidence; planned checks are not exercised checks.
- All model execution requires eligible accounts and approved routes. Premium is not scheduled. Workers never spawn agents, invoke automatic eval execution, or change policy/profile settings.
- Each task has one implementation owner. Parallel work uses disjoint canonical files; integration owns metadata and generation. Do not stage or commit another worker's files.
- Workers skip build/lint/tests/formatters mid-flight. Return scenario contracts and a revision-bound receipt; the lead/integrator runs the consolidated gates once after integration. Repairs rerun only invalidated gates and evidence.
- Prefix shell commands with `rtk`; use `rtk proxy` when raw command support is needed. No commits, pushes, releases, or paid execution are authorized by this document alone.

## Review Focus

1. A payment response is lost after the side effect: retry must not create another business effect; payload conflicts and replay expiry remain explicit. T1 guidance; T6 cases; T8 adverse-timeline grading.
2. A tenant record travels through a queue/cache/projection and later must be deleted: scope and lifecycle rules must follow every material copy. T2 flow contract; T5 hard gates; T6/T8 counterexamples.
3. A logical DFD omits an external input, while a physical design legitimately uploads directly to object storage: reject unbalanced logical modeling, not real topology. T2 notation/scope guidance; T6/T7/T8 validation.
4. An offline edit outlives logout or a server-authority change: pending UI state cannot masquerade as committed server truth; sync/recovery preserves auth and conflict policy. T3; T6/T8.
5. A short, simple design needs no queue, replica, or diagram: preserve the null option and justified exclusions; a high score cannot conceal a load-bearing invariant failure. T4/T5; T6/T8/T9.

---

## 1. Human gates and dispatch readiness

| Gate                  | Human decision                                                                                         | Agent may do before approval                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| G0: Scope             | Approve PRD requirements, flow contract, boundaries, and task decomposition                            | Research, plan, report unknowns                         |
| G1: Execution         | Confirm authorized project/account domain and execution method; resolve profile eligibility            | Prepare briefs; no worker dispatch or implementation    |
| G2: Live evaluation   | Approve exact account/route/model/effort, fresh lane count, concurrency, quota/cost cap, scope, expiry | No-model preflight, manifests, estimate, isolation plan |
| G3: Acceptance        | Accept revision-bound evidence and unresolved findings                                                 | Independent findings; no agent-supplied human signoff   |
| G4: Promotion/release | Authorize fresh full-category sweep, promotion, and publication separately                             | Report selective pilot evidence; no automatic release   |

Recommended approach: **Subagent-Driven**, with parallel independent draft slices and independent review before consumers use their contracts. Inline is only a separately approved small, low-risk exception; file count does not establish low risk.

The workspace is `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/modest-chicken`, Paseo workspace `wks_7b90da1682631d0a`, project `prj_d2cfd2af46001d8b`. The human selected Personal standard profiles for this repository: `Personal · Delivery` for implementation and `Personal · Analysis & Review` for independent review. Cheap routing remains unused; no policy/profile settings changed. G2/G3/G4 remain pending.

## 2. Configured profile routing

Snapshot discovered 2026-10-11. Re-discover with `list_profiles` if configuration changes or lookup fails. Copy actual settings without changing model, effort, mode, or features. No `featureValues` were present in this snapshot; omit absent features.

| Exact profile                | Provider / model selector                 | Mode / thinking | Permitted role and boundary                                                                                                                                                             |
| ---------------------------- | ----------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal - Cheap             | `omp/google-antigravity/gemini-3.8-flash` | write / medium  | First-choice bounded implementation for eligible non-eZRX work; no design work. **Blocked until contradiction with “Must remain on Personal Codex route” is resolved by the operator.** |
| Personal · Delivery          | `omp/openai-codex/gpt-6-luna`             | write / high    | Authorized personal/business-client implementation and executable QA; never eZRX, VMO, or employer-confidential context                                                                 |
| Personal · Analysis & Review | `omp/openai-codex/gpt-6.1-sol`            | write / high    | Authorized personal/business analysis and independent review; brief is read-only despite profile mode; never eZRX, VMO, or unclassified context                                         |
| Personal · Premium Advisor   | `omp/openai-codex/gpt-6-astra`            | write / high    | Not scheduled; bounded analysis only after separate explicit premium approval; never routine implementation/review/fallback                                                             |
| EZRX · Delivery              | `omp/google-vertex/gemini-3.8-flash`      | write / high    | First-choice implementation only for authorized agentic-ezrx worktrees                                                                                                                  |
| EZRX · Analysis & Review     | `omp/google-vertex/gemini-3.8-flash`      | write / high    | Read-only analytical brief, authorized eZRX worktrees only                                                                                                                              |
| VMO · Delivery               | `omp/anthropic/claude-sonnet-5-5`         | write / high    | Authorized registered VMO implementation only                                                                                                                                           |
| VMO · Analysis & Review      | `omp/anthropic/claude-opus-5-5`           | write / medium  | Read-only analytical brief, authorized registered VMO only                                                                                                                              |

T1–T7 use the eligible delivery ladder, not an analysis or premium model as an implementation shortcut. T8 independent grading and T9 use the domain's eligible Analysis & Review profile. Independent draft reviews also use that review lane, not the delivery ladder.

For confirmed personal work, propose `Personal - Cheap` only after its route conflict is resolved. If it is ineligible, use the confirmed eligible `Personal · Delivery`; do not silently declare either eligible. For confirmed eZRX use `EZRX · Delivery`. For confirmed VMO use eligible cheap routing only if explicitly authorized, otherwise `VMO · Delivery`. Unresolved classification or missing required eligible profile blocks dispatch, not plan completion.

Illustrative materialization for an **eligible** personal standard-delivery worker:

```json
{
  "title": "T2 Data-flow guidance",
  "provider": "omp/openai-codex/gpt-6-luna",
  "workspaceId": "wks_7b90da1682631d0a",
  "settings": { "modeId": "write", "thinkingOptionId": "high" },
  "notifyOnFinish": true,
  "initialPrompt": "Read AGENTS.md and load applicable project skills first. Execute only Task 2 from the approved plan and PRD, including their shared contracts and receipt requirements. No delegation, model runs, generation, commits, or material design changes."
}
```

At actual launch, replace the short illustrative prompt with the complete bounded task packet below; do not assume the agent sees this conversation. An approved personal review uses `omp/openai-codex/gpt-6.1-sol`, `write`, `high`, and an explicit read-only/no-spawn brief. Mode text is not proof of host-enforced read-only isolation.

Failure handling: observed quota/429/resource-exhausted/provider-unavailable failures exhaust cheap routing for remaining eligible slices; argument/permission failures do not. Defective output earns one concrete AC-based correction; a second quality failure escalates only that slice to eligible standard delivery. Preserve evidence, never manufacture failures, and never auto-escalate to premium. Notifications enabled; continue independent work; no busy polling.

## 3. Shared contracts and lead responsibilities

Before implementation, the lead freezes these contracts, confirms G0/G1, records the source revision and relevant package digests, and chooses authorized worktree isolation. Workers receive the PRD, global constraints, relevant shared contracts, exact task, source citations, and review/receipt format. They load project skills themselves; inherited MCP access is not inherited skill loading.

### C1 — critical-flow record

Minimum: `FLOW-*`, linked requirement/journey, source and sink, payload meaning/purpose, transformation, authoritative owner, invariant, user-visible success/failure result, and `VER-*` with an observable condition.

Conditional fields, required when material: derived stores/caches/client state; trigger and protocol; synchronous/asynchronous delivery; durable-ack point; consistency/freshness; ordering/deduplication; retry/replay limits; backlog/backpressure; tenant/auth/privacy boundary; retention/deletion; schema change/migration/restore; target/estimated/measured capacity; evidence source and unresolved assumptions. `N/A` or omission needs a scope/risk reason, not a universal blank template.

A logical flow precedes technology selection. Physical binding follows the component decision. A flow table is sufficient where a picture adds no decision value. The record does not demand a database or queue for a stateless computation or SDK function.

### C2 — views and traceability

Keep `REQ -> HLD -> CMP -> LLD -> VER`; link applicable `FLOW-*` records to those artifacts. Dataflow answers movement/transformation/authority; sequence answers ordering and acknowledgments; state answers entity/client lifecycle; ERD answers schema relationships; deployment answers runtime placement. DFD decomposition level is not C4 level.

When explicitly reviewing a logical DFD, check entity/process/store/flow roles, named data and transformations, plausible inputs/outputs, and balanced parent/child boundary flows. Do not infer performance, concurrency, security, or runtime deployment from arrows alone. Classical process-only routing conventions do not ban direct uploads/replication in a physical architecture view. House-style renderer output must declare adapted notation; exact classical glyph support is out of scope.

### C3 — assurance and learning

Retain the existing eight-dimension semantic rubric and applicable denominator. Add flow-specific mandatory evidence/hard-failure examples, not a competing scorer. Sound: at least 85%, no applicable zero, no hard failure. Scorecard hard gates cannot be compensated by other axes. Justified `N/A` remains valid.

Readiness uses existing schema values, `completed_evidence`, `missing_evidence`, and `decision_needed`; qualify design/implementation/operations in prose. No new machine-readable status names. Practice sequence: initial design -> concrete adverse timeline -> revised mechanism -> changed constraint -> evidence-based debrief.

### C4 — ownership and receipts

Only files in each task's Files block may be mutated by that owner. T6 exclusively owns eval definitions/activation corpora and pilot fixtures; T7 owns metadata, generated output, and publication docs; T8 owns run evidence; the lead owns this PRD/plan status. Shared-file conflict or materially different contract returns to the lead; continue safe independent work.

Worker receipt: task, source revision, changed files, AC coverage, concrete before/after scenario reasoning, commands actually executed versus proposed, output/evidence locations, unresolved findings, profile/model/settings, corrections/fallback reason, available usage/cost or `unavailable`. Audit compliance before handoff. Review receipts are separate and revision-bound.

## 4. Sequence, ownership, and traceability

| Task | Delivery                                    | Depends on               | Profile role                         | Size / confidence | PRD coverage                                  |
| ---- | ------------------------------------------- | ------------------------ | ------------------------------------ | ----------------- | --------------------------------------------- |
| T1   | Distributed/quantitative correctness        | G0/G1                    | Delivery                             | M / high          | REQ-001; AC-001–002                           |
| T2   | Canonical data-flow contract and DFD review | G0/G1                    | Delivery                             | M / medium        | REQ-002; AC-003–005                           |
| T3   | Mobile/client and SDK guidance              | G0/G1                    | Delivery                             | M / medium        | REQ-003; AC-006–007                           |
| T4   | Session/practice routing and gates          | Reviewed T1–T3 contracts | Delivery                             | M / high          | REQ-002, REQ-003, REQ-004; AC-003, AC-008–009 |
| T5   | SLOs, hard gates, scope-qualified review    | Reviewed T1–T3 contracts | Delivery                             | M / high          | REQ-002, REQ-005; AC-003–005, AC-010–011      |
| T6   | Grounded evals and held-out protocol        | Reviewed T1–T5           | Delivery + independent rubric review | L / medium        | REQ-006; AC-012–013                           |
| T7   | Publication and no-model verification       | T1–T6 accepted drafts    | Delivery integration owner           | M / high          | REQ-007; AC-014–015                           |
| T8   | Approved live and semantic evidence         | Frozen T7; G2            | Lead + Analysis & Review             | L / medium        | REQ-006, REQ-008; AC-013, AC-017              |
| T9   | Independent final acceptance                | T7/T8 complete evidence  | Analysis & Review                    | M / high          | REQ-008; AC-016–018; all criteria             |

Wave A runs T1/T2/T3 concurrently. Independent reviewers check bounded drafts before Wave B starts T4/T5 concurrently. Then T6, T7, T8, and T9 follow their true dependencies. Do not parallelize metadata, generation, or immutable-run publication. Estimates are relative scope, not promised hours or dates.

---

### Task 1: Correct distributed-system and quantitative guidance

**Owner:** One eligible delivery worker. **Depends on:** G0/G1. **Acceptance:** AC-001, AC-002. **Non-goals:** New patterns, scorer/runtime changes, eval-file edits, or unrelated skill rewrites.

**Files:**

- Modify: `skills/system-design/system-design-principles/SKILL.md`
- Modify: `skills/system-design/system-design-principles/references/distributed-systems.md`
- Modify: `skills/system-design/system-design-case-catalog/SKILL.md`
- Modify: `skills/system-design/system-design-case-catalog/references/common-designs.md`
- Modify: `skills/system-design/system-design-estimation/SKILL.md`
- Modify: `skills/system-design/system-design-estimation/references/estimation-numbers.md`
- Modify: `skills/system-design/system-design-communication/SKILL.md`
- Modify: `skills/system-design/system-design-communication/references/communication-selection.md`
- Create: `skills/system-design/system-design-principles/references/idempotency-contract.md`

**Interfaces:** Consumes PRD, C1/C3, CAP/Stripe/AWS sources. Produces one linked idempotency contract plus corrected CAP/deadline/dependency guidance; T2–T6 reuse it rather than copying mechanisms.

- [ ] Read the listed guidance and the catalog's existing production payment pack. Record each contradiction and replacement invariant with a source citation.
- [ ] Replace “per attempt” and “without side effects” with stable business-operation identity and same intended effect under repetition. Define parameter mismatch, concurrent retry, lost response, retention/replay boundary, crash-before/after-commit, and recovery; preserve API-specific response differences.
- [ ] Explain CAP only for partition behavior: linearizable consistency and CAP availability are not product brands or uptime percentages. Remove fixed eventual-convergence promises; require a stated freshness/convergence objective and failure behavior.
- [ ] Distinguish end-to-end deadline allocation from adding per-hop p95/p99 values. State independence/correlation assumptions when multiplying serial availability; explain retries' effect on load and tail latency.
- [ ] Replace fixed synchronous-hop bans with dependency budgets, invariant, deadline, coupling, and failure semantics. Keep bounded synchronous work valid when it meets the requirement.
- [ ] Provide a concrete teaching ladder in the new reference: a lost payment response, concurrent duplicate, changed payload, expired key, and a requirement that forces a different mechanism. Each names the effect, state owner, adverse outcome, and verification.
- [ ] Return the AC receipt and independent review request; do not claim planned checks passed.

**Verification contract:** T6 includes lost-response/parameter-conflict/expiry cases and a percentile-addition counterexample. T8 recomputes quantities and simulates effects; lexical mentions alone fail acceptance. Consolidated format/token/alignment checks run at T7.

### Task 2: Make data-flow design a first-class contract

**Owner:** One eligible delivery worker. **Depends on:** G0/G1; C1/C2 are fixed. **Acceptance:** AC-003, AC-004, AC-005. **Non-goals:** New data-flow skill, renderer/schema/validator code, formal-glyph support, or mandatory diagrams.

**Files:**

- Modify: `skills/system-design/system-design-data-architecture/SKILL.md`
- Modify: `skills/system-design/system-design-data-architecture/references/database-scaling.md`
- Modify: `skills/common/common-architecture-diagramming/references/diagram-selection.md`
- Modify: `skills/common/common-architecture-diagramming/references/checklist.md`
- Create: `skills/system-design/system-design-data-architecture/references/flow-contracts.md`
- Create: `skills/system-design/system-design-data-architecture/references/dfd-review.md`
- Create: `skills/system-design/system-design-data-architecture/references/worked-flows.md`

**Interfaces:** Consumes C1/C2 and existing communication/integration/resilience mechanisms. Produces the canonical flow-contract reference, DFD semantic review guide, and three worked flows. Methodology/review/mobile reference these artifacts; diagramming retains its existing spec/pipeline.

- [ ] Extend description/triggers for system-level data-flow design, DFD review, data lineage, authority, and lifecycle. Keep store-selection triggers; avoid broad aliases that match unrelated framework stream/dataframe implementation questions.
- [ ] Put the compact critical-flow rule in the skill and C1 detail in `flow-contracts.md`. Identify ingress, transformations, authoritative/derived state, consumers, boundaries, invariant, adverse timeline, and verification before selecting stores or transport.
- [ ] Align touched store/consistency guidance with per-operation invariants and physical flow choices. A saga, specialized store, or universal strong-consistency label is not a mandatory consequence of a domain name; justify the mechanism and preserve existing valid access-pattern guidance.
- [ ] In `dfd-review.md`, define the four semantic roles, data labels versus process verbs, declared logical/physical scope, context-level overview, selective decomposition, and parent/child boundary-flow balance. Include black-hole input with no modeled result, miracle output without source, and insufficient-input transformation counterexamples; explain scope exclusions.
- [ ] Separate semantic review from notation/layout: classical logical routing rules, write-only filtered/audit stores with omitted reads, and crossing-edge readability. A physical signed-URL upload or CDC/replication arrow must not be erased to satisfy a logical notation convention.
- [ ] Write three worked flows: payment/order with lost acknowledgment; CDC/backfill to a derived search index with stale backfill/version fencing; mobile local edit to server with logout/conflict/deletion. State synthetic assumptions and reference existing case packs rather than duplicating them.
- [ ] Extend diagram selection beyond ETL to transactional, event, client-sync, and deletion flows. Link to the canonical semantic guide; distinguish DFD from sequence/state/ERD/deployment and DFD numbering from C4. Update the human checklist without pretending the mechanical validator checks flow correctness.
- [ ] Return the receipt and independent review. Report house-style notation honestly; do not add unsupported node kinds or diagram fields.

**Verification contract:** T6 owns cases for balanced/decomposed logical flows, missing transformations, impossible output, cross-tenant derived copies, deletion propagation, direct upload, and a stateless path requiring no store. T7 validates/renders an existing-supported `dataflow` spec; T8 independently checks semantics and flow-to-contract consistency.

### Task 3: Add focused mobile/client and SDK design coverage

**Owner:** One eligible delivery worker. **Depends on:** G0/G1; fixed C1–C3. **Acceptance:** AC-006, AC-007. **Non-goals:** Android/iOS/Flutter implementation recipes, mandatory layers/database, new backend taxonomy, or eval-file ownership.

**Files:**

- Create: `skills/system-design/system-design-mobile-client/SKILL.md`
- Create: `skills/system-design/system-design-mobile-client/references/client-contract.md`
- Create: `skills/system-design/system-design-mobile-client/references/sdk-contract.md`
- Create: `skills/system-design/system-design-mobile-client/references/platform-constraints.md`
- Create: `skills/system-design/system-design-mobile-client/references/practice-cases.md`

**Interfaces:** Consumes C1 flow contract, C2 views, C3 practice, Android/Apple source constraints. Produces one surface-specific skill and lazy references; core flow semantics remain owned by data-architecture. T4 routes this skill; T6 exclusively creates its evals.

- [ ] Define focused activation for mobile/client system design, offline sync, SDK/library system design, client authority/lifecycle, and device resource constraints. Negative boundaries include framework coding and a pure backend sharding question.
- [ ] Cover local display state versus authoritative server truth; pending/confirmed/failed states; retry/deduplication/conflict strategy; cache freshness; logout/account switch; deletion; secure storage and auth boundaries. Cross-link C1 instead of copying its complete field list.
- [ ] Explain online-only designs where correctness requires them; a local database and a four-layer architecture are alternatives, not defaults for every client.
- [ ] Cover SDK public contract/versioning, compatibility, cancellation, thread/concurrency ownership, bounded memory/network usage, host integration, lifecycle, and failure results.
- [ ] Put platform constraints and source dates in the platform reference: persisted work is not an exact background-scheduling guarantee; limits and security requirements remain platform-specific.
- [ ] Define four synthetic practice pairs: offline notes/conflict; chat send/deduplication/order; online-only banking authorization; resumable media upload. Each has workload/SLO assumptions, invariant, adverse timeline, changed constraint, rejected alternative, and verification. Include logout and deletion in the applicable pair.
- [ ] Return receipt and independent review, preserving the new skill's compact body and lazy-reference budget.

**Verification contract:** T6 adds four base/variant pairs and routing positives/negatives. T8 checks pending UI versus durable server success, conflicting edits, post-logout replay, exact scheduling claims, and SDK compatibility/cancellation. No mobile app is being implemented or visually validated.

### Task 4: Integrate flow, surface, and practice into existing facilitation

**Owner:** One eligible delivery worker. **Depends on:** Independently reviewed T1–T3 contracts. **Acceptance:** AC-003, AC-008, AC-009. **Non-goals:** New workflow, outcome-schema changes, new mode names, or repeated reference checklists.

**Files:**

- Modify: `skills/system-design/system-design-methodology/SKILL.md`
- Modify: `skills/system-design/system-design-methodology/references/four-phase-process.md`
- Modify: `skills/system-design/system-design-methodology/references/intake-checklist.md`
- Modify: `skills/system-design/system-design-methodology/references/phase-deliverables.md`
- Modify: `skills/system-design/system-design-interview-coaching/SKILL.md`
- Modify: `skills/system-design/system-design-interview-coaching/references/time-budget.md`
- Modify: `skills/system-design/system-design-interview-coaching/references/whiteboard-rules.md`
- Modify: `skills/system-design/system-design-interview-coaching/references/rubric.md`
- Modify: `skills/system-design/system-design-interview-coaching/references/mistakes.md`
- Modify: `.agents/workflows/system-design-session.md`

**Interfaces:** Consumes accepted T1 retry/deadline rules, T2 flow/DFD references, T3 surface contracts, and current workflow outcome schema. Produces one consistent phase map and handoff path; T5/T6 grade those behaviors.

- [ ] Classify mode, depth, and surface independently. Load only needed siblings; invoke data-architecture for consequential flow/state questions, mobile/client for that surface, and diagramming only when a view is selected.
- [ ] Intake names critical journeys, data inputs/outputs, trust/ownership boundaries, team/budget, and quality scenario trigger/environment/response/measure/owner. Keep blocking questions bounded and explicit assumptions usable for quick sketches.
- [ ] Estimation derives flow rate, payload, fan-out, retention, backlog/working-set, and shaping quantity where applicable. Do not force backend QPS onto a pure SDK contract or invent numbers to complete a template.
- [ ] Before component choice, outline logical critical flows. Bind accepted components to physical owners/stores/contracts, link `FLOW-*` into the existing trace, and confirm consequential ownership/invariant gaps before readiness. Keep assumptions/missing evidence visible when a complete design is not possible.
- [ ] Update every touched output template/reference to include the critical-flow record or canonical pointer. Correct phase-deliverables' source-of-truth wording: the JSON spec owns semantics; draw.io is editable presentation; image is an exported copy.
- [ ] Replace fixed two-component and sketch-per-phase mandates with decision/risk/time-selected deep dives and views. Run the C3 counterexample/changed-constraint learning sequence; grade explanation, invariant, mechanism, and adaptation, not technology counts.
- [ ] Compress the existing 88-line workflow below 80 lines using reference links; retain substantive gates, handoff, cost disclosure, and existing schema values. Add surface and flow records in the human design document, not an unreviewed machine schema extension.
- [ ] Return receipt plus a walkthrough for backend, mobile/client, SDK/library, full-stack, brownfield, and time-limited interview routes. Independent review confirms no template still imposes removed quotas.

**Verification contract:** T6 includes simple no-diagram/no-queue design, existing-system evidence, surface routing, missing ownership, and variable deep-dive cases. T8 runs actual design conversations/answers through the new gates and checks adverse-flow revision. T7 audits workflow budgets/schema and generated alignment.

### Task 5: Add journey SLOs and non-compensable flow/review gates

**Owner:** One eligible delivery worker. **Depends on:** Independently reviewed T1–T3 contracts. **Acceptance:** AC-003–005, AC-010, AC-011. **Non-goals:** Tenth scorecard axis, new semantic scorer/assertion type, new readiness enums, or indiscriminate operations-proof demands for proposals.

**Files:**

- Modify: `skills/system-design/system-design-resilience-ops/SKILL.md`
- Modify: `skills/system-design/system-design-resilience-ops/references/reliability-operations.md`
- Modify: `skills/system-design/system-design-review/SKILL.md`
- Modify: `skills/system-design/system-design-review/references/scorecard.md`
- Modify: `skills/system-design/system-design-review/references/mistakes-table.md`
- Modify: `skills/system-design/system-design-review/references/semantic-evaluation.md`
- Modify: `.agents/workflows/review-system-design.md`

**Interfaces:** Consumes C1/C2 flow and view contracts, C3 existing semantic rubric, accepted T1/T3 mechanisms. Produces journey-SLO guidance, scorecard hard gates, and flow-specific semantic evidence requirements; T6 owns calibration fixtures/evals.

- [ ] Define SLO record: journey, success/failure indicator, request or time basis, numerator/denominator, window, target, exclusions, pending/degraded semantics, owner, error-budget action. State how retries and background completion affect user-visible success.
- [ ] Evaluate durability/freshness/backlog and recovery per critical flow. Include RPO/RTO and drill evidence only when the declared scope requires them; distinguish target, plan, implementation proof, and observed operations.
- [ ] Add hard gates for material invariant/correctness, tenant authorization, sensitive-data handling/deletion, migration correctness, and recoverability. A strong aggregate score cannot hide a failed gate; unrelated axes can be justified `N/A`.
- [ ] Add flow completeness and derived-copy checks to existing requirements/data-scaling/redundancy/observability axes, not a new axis. Require owner, adverse timeline, smallest corrective action, and trace to the relevant invariant.
- [ ] Extend the existing eight-dimension semantic rubric's mandatory-evidence/hard-failure examples with lost acknowledgments, duplicate/out-of-order delivery, stale projections, unbalanced logical decomposition, direct-upload scope, tenant leaks, deletion/replay, and client sync conflicts.
- [ ] Keep scope-qualified readiness and the existing outcome schema. Proposals may establish design readiness with mechanisms/planned checks; implemented/operational claims need their corresponding evidence. Missing data cannot be silently recast as observed deployment.
- [ ] Align workflow/template/mistakes guidance with the same gates and remove contradictory prescriptions in these touched files. Return receipt and independent review of a high-scoring but unsafe design versus a simple justified design.

**Verification contract:** T6 calibrates deliberately unsound vocabulary-rich answers and sound concise alternatives. T8 checks hard failures survive high scores and verifies error-budget calculations. T7 runs outcome/workflow audits through the existing full suite; no new status schema is added.

### Task 6: Build grounded eval coverage and a held-out semantic packet

**Owner:** One eligible delivery worker; separate analysis reviewer owns rubric acceptance. **Depends on:** Reviewed T1–T5. **Acceptance:** AC-012, AC-013. **Non-goals:** Paid model execution, new scorer, assertion padding, shared report mutation, or a case catalog expansion unrelated to the gaps.

**Files:**

- Modify: `skills/system-design/system-design-principles/evals/evals.json`
- Modify: `skills/system-design/system-design-case-catalog/evals/evals.json`
- Modify: `skills/system-design/system-design-estimation/evals/evals.json`
- Modify: `skills/system-design/system-design-communication/evals/evals.json`
- Modify: `skills/system-design/system-design-data-architecture/evals/evals.json`
- Create: `skills/system-design/system-design-mobile-client/evals/evals.json`
- Modify: `skills/system-design/system-design-methodology/evals/evals.json`
- Modify: `skills/system-design/system-design-interview-coaching/evals/evals.json`
- Modify: `skills/system-design/system-design-resilience-ops/evals/evals.json`
- Modify: `skills/system-design/system-design-review/evals/evals.json`
- Modify: `skills/common/common-architecture-diagramming/evals/evals.json`
- Create: `benchmarks/evals/system-design-professionalization-skills.txt`
- Create: `benchmarks/evals/system-design-professionalization-heldout.json`

**Interfaces:** Consumes accepted skill packages, existing eval JSON schema, ten production packs, T3 four practice pairs, and T5 rubric. Produces grounded native evals, an exact 11-skill selective list, and a separate manual-semantic fixture packet. The held-out JSON is not a new runner schema/assertion type.

- [ ] Use existing `evals/evals.json` field conventions. Preserve valid consumer-visible coverage; replace incidental wording/default tests rather than re-pinning them. Every skill has at least three cases and two grounded assertions per case plus nonempty positive/negative activation corpora; target 8–10 varied positives and negatives for the new mobile skill.
- [ ] Ensure the catalog covers a base plus changed-constraint variant for each of the ten existing production packs. Retain prompt assumptions, invariant, mechanism/outcome, and recovery; do not merely assert the reference filename or case title.
- [ ] Add T1 failure/quantitative pairs, T3 four mobile pairs, T4 routing/quick/full/practice cases, and T5 journey-SLO/hard-gate cases. Test outcome boundaries; do not require a particular technology or exact risk/status label when valid alternatives exist.
- [ ] Add five flow pairs: order/payment lost acknowledgment; CDC/backfill stale projection; tenant-boundary/deletion propagation; mobile sync/logout; logical DFD balance versus physical direct upload. Include stateless/no-store and filtered write-only-store counterexamples within the applicable prompts.
- [ ] Positive flow triggers include transactional/client/lifecycle design, not only ETL. Negative triggers include dataframe manipulation, framework `Flow` coding, and a pure deployment or ERD request with no flow-design question. Common diagramming cases check view selection/notation honesty, not new renderer functionality.
- [ ] Use only existing lexical assertion types; no new `file_reference` assertions. Avoid raw `not_contains` bans on a technology whose explicit rejection is a valid answer. Ground every smoke assertion in prompt or expected behavior; keep semantic checking independent.
- [ ] Write the selective file with exactly the ten system-design keys listed above and `common/common-architecture-diagramming`. No unrelated categories are admitted to the paid scope.
- [ ] Seal a held-out packet containing 19 pairs: ten production pairs, four mobile pairs, and five flow pairs. Each record carries `case_id`, `family`, `surface`, `base_prompt`, `variant_prompt`, `changed_constraint`, `expected_invariant`, `mandatory_evidence`, `hard_failures`, and `source_fixture`. Keep these prompts distinct from training/reference wording and native eval prompts. The generation lead sees prompts only; independent graders receive expectations separately.
- [ ] Include manual rubric-calibration examples with expected sound/unsound verdicts: a vocabulary-only answer, a precise wrong calculation, a high-score tenant leak, an unbalanced logical flow, and a concise valid no-infrastructure answer. Store them as a separate `calibration` collection in the held-out packet; never count them as fresh model evidence.
- [ ] Return coverage matrix, grounded-case rationale, sealed packet digest, and independent rubric review. Do not execute model runs or repair failures by padding skill anchors.

**Verification contract:** T7 runs selective preflight, alignment, JSON/contract checks and existing eval tests. T8 independently grades held-out answers and preserves all failures. A selective pass is development evidence, not category release eligibility.

### Task 7: Integrate, regenerate, and verify the complete source package

**Owner:** Single eligible delivery integration worker; lead supervises evidence. **Depends on:** Accepted T1–T6 drafts. **Acceptance:** AC-014, AC-015. **Non-goals:** Paid runs, hand-edited exports, release/version tags, unrelated formatting or registry debt repair.

**Files:**

- Modify: `skills/metadata.json`
- Modify: `ARCHITECTURE.md`
- Modify: `CONTRIBUTING.md`
- Modify: `CHANGELOG.md`
- Modify: `skills/common/common-architecture-diagramming/scripts/render_drawio.py` — human-authorized delimiter-only integration extension; not renderer redesign.
- Modify: `skills/common/common-architecture-diagramming/scripts/test_render_drawio.py` — focused public rendered-style regression for numeric width/anchors.
- Generate only: native skill/workflow exports and indexes owned by `pnpm generate-indices`, including `.agents/skills/`, `.claude/`, `.codex/`, `.github/`, and other generator-declared targets.

**Interfaces:** Consumes accepted canonical sources/evals and the lead's baseline digests. Produces coherent metadata/docs/generated package, check receipts, token comparison, and frozen candidate inputs for T8. Does not edit task-owned guidance without sending a precise correction to its owner.

- [ ] Reconcile source changes and ownership, then update category metadata/date under maintenance policy. Snapshot system-design is `1.2.3` and workflows `1.1.5`; proposed compatible modernization patches are `1.2.4` and `1.1.6` if still current. Common references/evals also change: bump its actual current category patch and date. Rebase on intervening changes; do not invent or publish a tag.
- [ ] Document canonical flow ownership/lazy routing, mobile/client capability, evidence gate separation, and body-only eval limitations in architecture/contribution docs. Add user-facing changes under `[Unreleased]`; root package version/runtime remain unchanged.
- [ ] Run `rtk proxy pnpm generate-indices` once at this integration boundary. Capture the declared output set; never manually fix generated mirrors.
- [ ] Run the consolidated checks below once. Distinguish introduced failures from unrelated baseline debt, but do not waive a failure in this changed scope.
- [ ] Exercise the actual existing dataflow pipeline using a temporary, synthetic, house-style spec created through the specialized write tool. Use supported node kinds and fields, label payloads, mark assumptions honestly, validate, strict-render, export if tooling exists, and inspect the image. Remove temporary artifacts afterward. An unavailable exporter is a reported visual-verification limit, not a fabricated image check.
- [ ] Apply the explicitly authorized pre-existing unverified-edge style delimiter repair, verify the focused regression against baseline/current renderer behavior, run the existing renderer suite and inspect actual corrected connector arrows. This narrow extension grants no schema/style redesign, app upgrade, model execution or unrelated runtime repair. Preserve the separate desktop export limitation.
- [ ] Demonstrate the routing boundary with actual skill loading for a system-level data-flow question versus unrelated framework stream coding; record exact loaded keys and any collision. Do not change MCP/router code to hide a failed trigger design.
- [ ] Compare token totals to the frozen baseline and confirm all body/description/workflow budgets. Freeze candidate source/packet digests only after corrections; return command outputs and unresolved risks for T8.

**Consolidated commands:** Run from the authorized repository root. `RUN_ID` below denotes the actual fresh ID returned by manifest creation, not a fabricated transcript. No command here starts model workers. The manifest/estimate examples pin the proposed personal evaluation model; select and record the appropriate supported model/route before preparation for another domain, and use the same settings at execution.

```bash
rtk proxy pnpm build
rtk proxy pnpm test
rtk proxy pnpm validate:all
rtk proxy pnpm audit:sdlc
rtk proxy pnpm audit:skills
rtk proxy pnpm check-alignment
rtk proxy pnpm check-alignment:strict
rtk proxy pnpm audit:keywords
rtk proxy pnpm calculate-tokens
rtk proxy pnpm evals:audit
rtk proxy pnpm evals:preflight -- --skills-file benchmarks/evals/system-design-professionalization-skills.txt
rtk proxy env EVALS_MODEL=gpt-6.1-sol EVALS_REASONING_EFFORT=high pnpm evals:manifest -- --skills-file benchmarks/evals/system-design-professionalization-skills.txt
rtk proxy env EVALS_MODEL=gpt-6.1-sol EVALS_REASONING_EFFORT=high pnpm evals:estimate -- --run "$RUN_ID"
```

**Dataflow smoke commands:** Set `SMOKE_SPEC`, `SMOKE_DRAWIO`, and `SMOKE_PNG` to the actual temporary paths created for this check. Use synthetic assumptions, supported house-style nodes, and named payloads; no formal-notation claim. Run export only when its declared dependency is available, then read/inspect the resulting image.

```bash
rtk proxy python3 skills/common/common-architecture-diagramming/scripts/validate_spec.py "$SMOKE_SPEC"
rtk proxy python3 skills/common/common-architecture-diagramming/scripts/render_drawio.py "$SMOKE_SPEC" -o "$SMOKE_DRAWIO" --strict
rtk proxy python3 skills/common/common-architecture-diagramming/scripts/export_drawio.py "$SMOKE_DRAWIO" -f png -o "$SMOKE_PNG"
```

**Verification contract:** Build/test alone are not behavioral proof. Actual flow rendering/routing above and T8 fresh design answers provide surface evidence. If strict full-registry alignment exposes existing unrelated debt, preserve output and prove changed-scope preflight is clean; the independent reviewer decides whether that debt prevents the claimed readiness.

### Task 8: Execute separately approved live and semantic evidence

**Owner:** Lead coordinates execution; distinct eligible analysis/review agents grade answers. **Depends on:** Frozen T7 and explicit G2. **Acceptance:** AC-013, AC-017. **Non-goals:** Worker-spawned models, premium usage, reused evidence called fresh, promotion, or scorer/harness code changes.

**Files:**

- Create through existing runner only: immutable manifests/inputs/answers/results under its fresh `benchmarks/evals/runs/<run-id>/` output location.
- Create: run-local `professionalization-semantic-review.md` and `professionalization-acceptance-matrix.md` within the approved pilot evidence directory.
- Create: immutable full-package pilot prompt/answer packets in that same directory, explicitly labeled separate from native body-only runner results.
- Read only: frozen held-out packet, source snapshots, rubric, native `docs/EVALS.md` and `scripts/evals/execute.ts` execution contract.

**Interfaces:** Consumes frozen candidate/native manifest plus independently sealed held-out expectations. Produces complete lexical evidence and independent semantic evidence with exact source/model/route/usage provenance. Native runner with-skill arms receive SKILL bodies only; full-package reference evidence uses a separately declared protocol, never silently alters native snapshots.

- [ ] Inspect existing completed runs before requesting fresh execution; identify compatible evidence and staleness. This pilot's fresh claims require new answers; historical evidence may be labeled comparison only.
- [ ] Present G2 with the actual manifest answer/trigger lane counts, full-package pilot count, model/effort, account, concurrency 1, one frozen scope, quota/cost cap, stop conditions, and expiry at completion of that approved run. Report cost estimates and usage as unavailable when not exposed; no invented prices.
- [ ] Resolve the runner/profile distinction explicitly. The existing runner launches Codex CLI workers and defaults to `gpt-5.6-luna/high`; it does not materialize Paseo profiles. If an authorized personal evaluation route is approved, propose pinned `gpt-6.1-sol/high` analysis execution with read-only sandbox. This is a separately authorized CLI route, not a claim that `Personal · Analysis & Review` settings were applied. Other account domains require their own confirmed supported route; do not send context to personal Codex by convenience.
- [ ] Qualify isolation before comparison: fresh empty evaluation directory, explicit prompt/package delivery, no repository/rules/config inheritance, no expected answers or plan/PRD in generation context, and fixed tools/model/effort across arms. The runner's “no tools” instruction is advisory; do not claim host-enforced no-tool isolation without observed controls. Native agents that must load project instructions cannot be called clean no-skill baselines.
- [ ] After G2 only, the lead executes the existing native manifest using the pinned approved route. Preserve failures, interruptions, and usage. Workers/reviewers do not invoke `--execute`; no implicit retries beyond the approved lane/cost cap.
- [ ] Score, verify, gate, and report the complete native run with the commands below. Native gates: per-skill with-skill case rate strictly above 85%, assertion rate at least 85%, activation recall/specificity at least 90%, nonnegative outcome delta, complete arms. These are not the independent semantic threshold.
- [ ] Run the separate 19-pair full-package pilot through an approved isolated operator/CLI route using self-contained, hashed packets. Compare prompt-only, frozen old package, and candidate package under identical settings. The old package uses its existing routing; absence of the new mobile skill is documented, not replaced with candidate text. Supply only the applicable skill/reference packet to each package arm, record its composition, and do not use the native body-only label for it.
- [ ] Use the existing Codex execution contract for approved personal packet generation, with exact flags/model reviewed before launch; no new persistent harness/scorer is introduced. If isolation, route, or packet delivery cannot be established, preserve the reachable no-model evidence and leave semantic efficacy explicitly unverified. Do not substitute contaminated native-agent answers as causal evidence.
- [ ] Independent graders receive blinded answer arms plus prompt/expected contract, not the candidate author's justification. Recompute quantitative results, simulate adverse timelines, check FLOW/HLD/LLD/VER consistency, and grade each pair. A sound candidate requires at least 85%, no applicable zero, no hard failure; no case-level hard failure may be averaged away. A retained design must justify satisfying the changed constraint.
- [ ] Report lexical and semantic metrics separately; compare old/candidate/no-skill on identical cases, list regressions and scope limits, and distinguish body-only from full-package delivery. If an introduced failure remains, return it to the exact owner, freeze a revised candidate, and obtain fresh approval for evidence beyond the original cap. Never edit transcripts or weaken assertions to pass.

**Native execution command — forbidden before G2; example only for the approved personal CLI lane:**

```bash
rtk proxy env EVALS_MODEL=gpt-6.1-sol EVALS_REASONING_EFFORT=high EVALS_CONCURRENCY=1 pnpm evals:manifest -- --resume "$RUN_ID" --execute
```

**Post-run verification commands:**

```bash
rtk proxy pnpm evals:score -- --run "$RUN_ID"
rtk proxy pnpm evals:verify -- --run "$RUN_ID"
rtk proxy pnpm evals:gate -- --run "$RUN_ID"
rtk proxy pnpm evals:report -- --run "$RUN_ID"
```

**Verification contract:** Expected evidence, not current results: immutable complete arms, verifiable inputs, source hashes, exact delivery/model/route, graded case evidence, no hidden hard failures, and a requirement acceptance matrix. A selective pilot does not authorize full-category promotion. If G2 is unavailable, T8 is blocked and overall verified delivery is not claimed complete.

### Task 9: Independent acceptance and human handoff

**Owner:** Eligible Analysis & Review profile, separate from implementation authors. Human maintainer remains accountable. **Depends on:** T7/T8 complete revision-bound evidence. **Acceptance:** AC-016, AC-017, AC-018 and every preceding criterion. **Non-goals:** Mutations, self-approval, paid execution, release, or unbounded architecture redesign.

**Files:**

- Read only: every T1–T8 owned source/generated/doc/evidence artifact and the PRD/plan.
- Create: run-local `professionalization-final-review.md` in T8's approved evidence directory.
- Lead-only status updates: this plan and the PRD after the actual human decision; reviewers do not approve them on the human's behalf.

**Interfaces:** Consumes exact accepted candidate revision, source/check receipts, fresh run evidence, semantic rubric, requirement trace, and actual profile/approval records. Produces findings plus an acceptance recommendation, not authenticated human approval.

- [ ] Load applicable project review skills and inspect the integrated change, including linked references/templates, generated exports, and source/evidence digests. A worker's success claim is not evidence.
- [ ] Map REQ-001–REQ-008 and AC-001–AC-018 to exact artifacts and observed checks. Mark intentionally unchanged callsites/docs with a reason; reject omissions rather than silently shrink scope.
- [ ] Verify C1/C2 is single-source and actually consumed by session, practice, review, and applicable mobile guidance. Check notation honesty, flow boundary balance, authority/copy/deletion trace, adverse results, and optional-view behavior.
- [ ] Verify hard gates, readiness scope, SLO arithmetic, and paired adaptation. Report any vocabulary-rich unsafe answer as a failure even if lexical scores pass.
- [ ] Check domain/profile eligibility, copied runtime settings, independent reviewer identity, worker no-spawn compliance, live-run approval/cap, and accounting disclosures. Host control gaps are risks, not guarantees.
- [ ] Return `finding -> evidence -> consequence -> smallest fix -> owner -> invalidated verification`, with blockers separated from suggestions. Rejected slices return to their owner; the lead reruns affected evidence before renewed acceptance.
- [ ] Audit session compliance and obtain actual session cost fields where available. Deliver human-readable pass/blocked evidence per criterion, remaining debt, rollback snapshot, and G3 decision request. Keep G4 promotion/release separate.

**Verification contract:** Every criterion has observed evidence or an explicit unresolved blocker. No material introduced hard failure remains. Human acceptance is recorded outside the agent's own assertions; release/promote commands are not part of this task.

## 5. Completion and reviewer checklist

- [ ] G0/G1 recorded; profile conflict resolved or an eligible standard route explicitly selected.
- [ ] T1–T6 owned drafts reviewed; no contradictory linked guidance or weakened behavior assertions remain.
- [ ] T7 metadata/docs/generated outputs aligned; applicable consolidated checks and real routing/render smoke observed.
- [ ] Flow semantics, mobile/SDK behavior, SLO/hard gates, optional diagrams, and no-infrastructure counterexamples all exercised.
- [ ] G2 approved and T8 fresh evidence complete; body-only, full-package, lexical, and semantic results distinguished.
- [ ] T9 coverage/final findings complete and human G3 decision recorded. Pending model authorization is not verified completion.
- [ ] No release/promotion/premium/policy changes occurred under planning or implementation approval alone.

Rollback: retain baseline revision/package digests and immutable failed runs. If reverting is authorized, restore the affected canonical guidance/evals/docs/metadata as a coherent package, regenerate mirrors, and rerun invalidated no-model checks. Do not delete user work or failed evidence.

## 6. Source and change provenance

Product decisions and external citations are in the [PRD](../../prd/prd-system-design-professionalization.md#9-decision-log-and-source-provenance). Repository execution conventions: [Live evals](../../EVALS.md), canonical skill authoring/maintenance, and existing outcome contracts. The added data-flow scope follows the maintainer's explicit 2026-10-11 request; it is not an implementation already delivered.

Retrospective candidate `ags-first-class-data-flow-review`: initial research treated data-flow views as supporting artifacts without an explicit flow acceptance contract. This plan corrects that omission by extending existing ownership and preserving conditional diagrams; registry promotion still requires independent evidence/review. No trigger alias or policy change has been silently applied.
