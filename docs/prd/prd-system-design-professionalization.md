# System Design Professionalization — Review Brief and PRD

**Status:** Approved for Subagent-Driven implementation. Human selected Personal standard profiles; live evaluations, final acceptance, promotion, and release remain separately gated.
**Owner / approver:** Requesting maintainer. **Integration owner:** Execution lead. **Independent assurance:** Eligible analysis/review agent plus human acceptance.
**Source snapshot:** `b529c2d99112db2af63aa2c32365a37759613cc6`, inspected 2026-10-11.
**Planning context:** `operator_profile=hybrid` (inferred); `lane=Direction` (registry-maintenance delivery); SNC working assessment `S2/N1/C1`, total 4, medium. G0 scope and G1 execution/account authorization approved.

## 1. Five-minute human review

Approve or amend these decisions before dispatch:

1. **Evolve, do not rewrite.** Preserve requirements-first sizing, constraint-driven components, brownfield evidence, risk-selected deep dives, HLD/LLD traceability, optional diagrams, and scope-qualified readiness.
2. **Make data-flow reasoning explicit.** Model critical journeys from input through transformation, authoritative state, derived copies, and output. Review correctness, boundaries, failure, and lifecycle before accepting the component design.
3. **Extend the existing data-architecture skill.** It owns the canonical flow contract. Methodology facilitates it; communication/integration explain transport mechanisms; diagramming renders selected views; review checks behavior. Do not create a competing DFD skill or rendering pipeline.
4. **Add one focused mobile/client skill.** Separate design mode from system surface, with lazy SDK and platform references rather than framework implementation recipes.
5. **Separate evidence gates.** Structural checks, lexical evals, independent semantic review, and human approval prove different things. Passing vocabulary checks cannot establish architecture safety or professional effectiveness.
6. **Delegate bounded file slices.** Nine tasks, one implementation owner per file, independent reviewers, serialized publication. Profile eligibility and the cheap profile's contradictory route note must be resolved before dispatch.

### What changes / what stays

| Change                                                                                     | Preserve                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Correct misleading CAP, idempotency, eventual-consistency, latency, and hop-count guidance | Existing registry, CLI, MCP, scorer, and diagram renderer    |
| Critical-flow contracts and conditional logical/physical flow views                        | No mandatory diagram set or deep-dive quota                  |
| Mobile/client/SDK decision coverage                                                        | Backend guidance and existing three session modes            |
| Journey SLOs and non-compensable correctness/security gates                                | Existing workflow outcome schema and justified `N/A` scoring |
| Counterexample-led practice and expanded behavioral evaluation                             | Ten existing synthetic production case packs                 |

## 2. Problem and evidence

The conversational research brief is the product-intent source; there is no separately approved BRD. The maintainer wants professional, real-world system-design guidance, a delegation-ready plan, and explicit data-flow coverage.

Existing coverage is partial, not absent:

- `system-design-methodology/references/phase-deliverables.md` includes ownership, consistency, and optional `dataflow` views, but not a reusable end-to-end flow acceptance contract.
- `system-design-data-architecture/SKILL.md` emphasizes store selection/scaling and per-flow consistency; its description/triggers do not make data-flow design a first-class entry point.
- `common-architecture-diagramming/references/diagram-selection.md` already supports `dataflow`; its decision tree emphasizes extraction/transformation/load rather than transactional, client, and lifecycle paths.
- `system-design-review` traces hot/critical paths, but its scorecard needs explicit flow completeness, trust-boundary, derived-copy, and failure checks.
- Contradictions include catalog “idempotency key per attempt,” principles “repeatable without side effects,” a milliseconds-to-seconds bound for eventual consistency, product-level CAP labels, percentile addition, a blanket synchronous-hop limit, and coaching's fixed two-component deep dive.

These are proposed guidance corrections. No architecture efficacy or runtime behavior improvement has yet been measured.

## 3. Objectives, users, and outcomes

| ID      | Objective                                                                                      | Success evidence                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| OBJ-001 | Produce reviewable designs grounded in requirements, invariants, workload, ownership, and cost | Case answers explain the mechanism and user-visible outcome, not just component names                          |
| OBJ-002 | Cover end-to-end data movement across backend, client, and SDK surfaces                        | Critical-flow contracts identify authority, derived copies, boundaries, adverse timelines, and verification    |
| OBJ-003 | Enable safe, economical delegation and human acceptance                                        | Exact-file briefs, eligible profile routing, immutable evidence, independent findings, explicit approval gates |

Users: design-session facilitator, architecture reviewer, interview learner, bounded implementation worker, and maintainer approving registry changes.

User stories:

- As a designer, I need to follow an order or record through the system so that component choices preserve its invariant.
- As a reviewer, I need to distinguish proposed mechanisms from observed operations so that a high score cannot hide a correctness or privacy failure.
- As a mobile/SDK designer, I need authority, sync, lifecycle, and compatibility constraints so that backend-only assumptions do not dictate the design.
- As a maintainer, I need bounded tasks and visible evidence so that I can approve scope and reject weak delivery without redoing the entire plan.

## 4. Requirements and acceptance criteria

All requirements are **approved for implementation**. P0 is required for acceptance; P1 is included in this delivery, not deferred.

| ID      | Requirement                                                                                      | Priority / objective  | Acceptance criteria    | Owner task   |
| ------- | ------------------------------------------------------------------------------------------------ | --------------------- | ---------------------- | ------------ |
| REQ-001 | Correct distributed-system and quantitative guidance across primary skills and linked references | P0 / OBJ-001          | AC-001, AC-002         | T1           |
| REQ-002 | Make critical data-flow design explicit, proportional, and traceable                             | P0 / OBJ-001, OBJ-002 | AC-003, AC-004, AC-005 | T2, T4, T5   |
| REQ-003 | Support mobile/client and SDK design without prescribing universal layers or storage             | P1 / OBJ-002          | AC-006, AC-007         | T3, T4       |
| REQ-004 | Integrate mode/surface routing and risk-driven practice into existing workflows                  | P1 / OBJ-001, OBJ-002 | AC-008, AC-009         | T4           |
| REQ-005 | Use journey SLOs, hard gates, and evidence-qualified readiness                                   | P0 / OBJ-001          | AC-010, AC-011         | T5           |
| REQ-006 | Expand grounded, behavior-focused evaluation and independent semantic calibration                | P0 / OBJ-001, OBJ-002 | AC-012, AC-013         | T6, T8       |
| REQ-007 | Publish coherent canonical guidance and generated exports within token budgets                   | P0 / OBJ-003          | AC-014, AC-015         | T7           |
| REQ-008 | Deliver profile-safe execution and independent human-reviewable acceptance                       | P0 / OBJ-003          | AC-016, AC-017, AC-018 | T8, T9, lead |

### Observable criteria

The 18 IDs are traceability groups. Distinct adverse timelines and surface variants become separate pass/fail rows in T6/T8 evidence; one passing variant cannot compensate for another failing variant. Application market, feature-toggle, and UI-platform tags are not applicable to this registry-only delivery; each design fixture declares its own surface.

Acceptance-to-requirement bindings:

- AC-001 and AC-002 verify REQ-001.
- AC-003, AC-004, and AC-005 verify REQ-002.
- AC-006 and AC-007 verify REQ-003.
- AC-008 and AC-009 verify REQ-004.
- AC-010 and AC-011 verify REQ-005.
- AC-012 and AC-013 verify REQ-006.
- AC-014 and AC-015 verify REQ-007.
- AC-016, AC-017, and AC-018 verify REQ-008.

- **Acceptance ID**: AC-001 — Given retries after a payment response is lost, guidance preserves the operation's intended effect, uses stable business-operation identity across retries, and explains conflicting parameters, retention/replay, concurrency, and client-visible results. It does not promise identical responses for every API or fresh keys per transport attempt.
- **Acceptance ID**: AC-002 — Given a partition or a latency target, guidance distinguishes CAP consistency/availability from uptime, avoids fixed eventual-convergence bounds, treats deadlines separately from per-hop percentiles, and states assumptions for serial availability calculations. Hop budgets follow dependency/failure constraints, not a universal maximum.
- **Acceptance ID**: AC-003 — Given a critical journey, the output traces named inputs, transformations, authoritative state, derived copies, consumers, owner, invariant, and verification. Applicable transport, durability, freshness, ordering, deduplication, backpressure, recovery, and retention/deletion rules are concrete; unknowns are visible rather than invented.
- **Acceptance ID**: AC-004 — Given a request for a flow view, the agent selects logical versus physical scope, names the modeled boundary and decomposition level, labels arrows with data, and preserves parent/child boundary flows. A DFD does not claim call order, concurrency, state transitions, or deployment proof; sequence/state/deployment views answer those questions when needed.
- **Acceptance ID**: AC-005 — Given a logical DFD with missing transformations, impossible outputs, or an omitted external flow, review identifies the semantic defect. Given a physical direct-upload or replication path, review preserves the real topology instead of banning it using logical DFD notation rules. A filtered write-only/audit view states omitted reads rather than inventing them. Crossing edges are a readability issue, not proof of incorrect data semantics.
- **Acceptance ID**: AC-006 — Given offline-capable versus online-only client requirements, guidance chooses an appropriate authority/sync policy rather than universally requiring a local database. It covers pending/failed/confirmed state, conflict resolution, deletion, and authentication changes.
- **Acceptance ID**: AC-007 — Given an SDK or background-work requirement, guidance covers API compatibility, cancellation/concurrency, bounded resource use, lifecycle constraints, and evidence. It does not promise exact background schedules on mobile operating systems.
- **Acceptance ID**: AC-008 — Given any of the existing three modes, surface is classified independently as backend, mobile/client, SDK/library, or full stack. Quick sketches retain explicit assumptions; full sessions confirm consequential gates. No workflow outcome enum or handoff schema is silently expanded.
- **Acceptance ID**: AC-009 — Given a time-limited practice session, the learner commits to a design, receives a concrete counterexample, revises the affected mechanism, then evaluates a changed constraint. Zero, one, or multiple deep dives depend on unresolved risk and time, not a fixed quota.
- **Acceptance ID**: AC-010 — Given an SLO proposal, it states the user journey, indicator, numerator/denominator or time basis, window, target, exclusions, pending/degraded effects, owner, and error-budget action. Retry-attempt success cannot substitute for operation success.
- **Acceptance ID**: AC-011 — Given a design with a material correctness, authorization, privacy/deletion, migration, or recovery defect, the verdict cannot be rescued by other scorecard points. Design readiness, implementation verification, and operations evidence remain distinct; `N/A` requires a scope-specific reason.
- **Acceptance ID**: AC-012 — Given changed guidance, every changed skill has grounded evals and activation positive/negative cases. All ten existing production packs have a base and changed-constraint case in the catalog suite. New mobile and flow cases test mechanisms and adverse outcomes, not exact wording or mandatory infrastructure.
- **Acceptance ID**: AC-013 — Given candidate answers, independent semantic review recomputes requested quantities, simulates adverse timelines, and checks adaptation. A sound answer requires at least 85%, no applicable zero, and no hard failure. An unchanged mechanism can pass a paired case only with a justified re-evaluation. Lexical gates are reported separately.
- **Acceptance ID**: AC-014 — Given integrated sources, generation synchronizes exports without hand edits. Relevant category/workflow metadata, architecture/contribution docs, and the unreleased changelog agree with the delivered scope. No CLI/MCP/scorer/renderer implementation change is included.
- **Acceptance ID**: AC-015 — Given publication checks, skill bodies remain at most 100 lines, descriptions at most 100 words, workflows below 80 lines, and long examples live in lazy references. Token reports compare the old and new package; no savings claim is made without measurements. Unrelated full-registry debt is distinguished from introduced failures.
- **Acceptance ID**: AC-016 — Before dispatch, account/domain eligibility is confirmed, actual profile settings are copied, ownership is disjoint, and workers receive the full bounded brief. Workers do not delegate, spawn model runs, or make material design changes.
- **Acceptance ID**: AC-017 — Before a paid live run, the human approves the exact account/model/effort, lane count, concurrency, scope, budget cap, and expiry. Existing eval-harness execution is not represented as applying a Paseo profile; source snapshots and answers remain immutable. Body-only runner results do not establish linked-reference effectiveness.
- **Acceptance ID**: AC-018 — Before acceptance, an independent reviewer maps every requirement/criterion to evidence, separates observed checks from planned checks, records unresolved findings, and returns a human-reviewable verdict. Agents cannot supply human approval or authorize release.

## 5. Data-flow design contract

**Required reasoning, conditional diagram.** The minimum critical-flow record contains `FLOW-*`, linked `REQ-*`, source/sink, payload meaning/purpose, transformation and authoritative owner, invariant, user-visible result, and `VER-*`. Add risk-specific fields only when applicable; explain significant exclusions.

| Concern                   | Questions the design must answer                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope and meaning         | What data enters/leaves? Which journey, boundary, and logical/physical level? What transforms it?                                                          |
| State and ownership       | Who may write authoritative state? Which cache, projection, queue, file, or client state is a derived copy?                                                |
| Delivery and correctness  | When is acceptance durable? What happens if delivery duplicates, reorders, stalls, or disappears? How are retries/replay reconciled?                       |
| Capacity and freshness    | What bounds rate, size, fan-out, backlog age, latency, and staleness? Which inputs are targets, estimates, or measurements?                                |
| Trust and lifecycle       | Where are tenant/auth boundaries enforced? What sensitive data crosses them? How do deletion, expiry, schema change, migration, and restore affect copies? |
| Evidence and verification | Which source supports each claim? What adverse timeline tests it? Who observes the pass/fail condition?                                                    |

DFD concepts: external entities, processes, stores, and labeled data flows; logical versus physical scope; context-level overview and selective decomposition with balanced boundary inputs/outputs. Do not confuse DFD level numbers with C4 levels. Classical notation conventions apply only to an explicitly modeled DFD. The existing renderer uses house-style nodes, not formal Yourdon/Gane–Sarson glyphs; no claim of formal-notation compliance is permitted.

Workflow placement: identify journeys/boundaries during intake; estimate their rate, size, retention, and fan-out; sketch logical flows before component selection; bind them to physical ownership/contracts during HLD; simulate adverse timelines during LLD; verify flow completeness and hard gates before readiness.

## 6. Scope, optimization, and non-goals

In scope: ten system-design skills affected by this plan, the common diagramming references/evals, two canonical workflows, their generated exports, metadata/docs, and approved selective evaluation evidence. Only the mobile/client skill is new.

Optimization: one canonical semantic contract in data-architecture; concise routing pointers elsewhere; no copied checklist in every skill; lazy flow/DFD/mobile references; reuse existing mechanisms and ten production packs; do not load every sibling on every request.

Out of scope: production application implementation, framework recipes, new renderer/schema/assertion types, CLI/MCP runtime refactors, paid-course reproduction, profile/policy edits, premium consultation, automatic release, and unrelated skill remediation. Exact classical DFD glyph support would require a separately reviewed renderer scope change; it is not necessary for semantic flow coverage.

## 7. Delivery, responsibility, and approval

| Wave | Tasks                                          | Owner role                                                        | Exit                                                                     |
| ---- | ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A    | T1 correctness; T2 data flow; T3 mobile/client | Separate eligible delivery workers                                | Bounded drafts independently reviewed; contracts frozen                  |
| B    | T4 workflow/practice; T5 SLO/review            | Separate eligible delivery workers                                | Consumers agree with accepted contracts                                  |
| C    | T6 behavioral evals                            | Eligible delivery worker; independent rubric reviewer             | Prompt/expected contracts grounded, held-out packet sealed               |
| D    | T7 publication and no-model checks             | Single integration worker                                         | Canonical/generated/doc/metadata alignment proven                        |
| E    | T8 live evidence                               | Lead coordinates approved execution; independent analysis graders | Selective lexical and full-package semantic evidence reported separately |
| F    | T9 final acceptance                            | Independent analysis/review owner; human accountable              | Requirement coverage and unresolved risks visible; human decides         |

RACI: maintainer accountable for scope, account classification, spend, acceptance, and release; lead responsible for dispatch/integration/evidence; workers responsible for bounded changes; independent reviewers responsible for findings, consulted on contract risks. Implementers cannot approve their own changes.

Human authorized `Personal · Delivery` and `Personal · Analysis & Review` for this repository and selected Subagent-Driven execution. `Personal - Cheap` is unused because its Google model conflicts with its Personal Codex route restriction; no profile setting was changed. Premium profiles are not scheduled.

Human gates: **G0** scope/contract approval and **G1** Subagent-Driven execution with Personal standard profiles are approved. **G2** exact paid-evaluation authorization, **G3** final acceptance, and **G4** category promotion/release remain pending. Approval does not authorize commits, pushes, premium usage, or release.

## 8. Evidence, risks, and rollout

Proposed sizing: overall L, medium confidence. The largest uncertainty is fresh model/evaluation eligibility and lexical-versus-semantic disagreement, not production coding. There are no promised dates, monetary savings, or efficacy claims.

| Risk                                                       | Mitigation / owner                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Flow coverage becomes diagram bureaucracy                  | Minimum reasoning contract; selected views only; T2/T4/T5                                |
| DFD rules erase real runtime paths                         | Declare notation/scope; direct-upload and replication counterexamples; T2/T6             |
| More references inflate contexts or remain unread          | Lazy routing and body-only versus full-package evidence separation; T4/T7/T8             |
| Existing prescriptions undermine constraint-first behavior | Remove linked contradictions in touched guidance, preserve justifiable choices; T1/T2/T6 |
| Models learn eval wording instead of reasoning             | Grounded prompts, held-out pairs, blinded grading, no anchor padding; T6/T8              |
| Wrong account or implicit paid execution                   | Domain/profile gate, runner-route approval, no worker spawning; lead                     |
| Source changes invalidate evidence                         | Freeze/hash inputs; revision-specific remediation and new approval where needed; lead    |

Candidate rollout: review sources and no-model checks, run the separately approved pilot, accept only the verified scope, then request any full-category release sweep/promotion separately. Revert to the recorded pre-change canonical snapshot and regenerate exports if an introduced regression remains unresolved. A blocked paid run leaves efficacy unverified, not complete.

## 9. Decision log and source provenance

| Decision                                                               | Status / reason                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Extend data-architecture instead of adding a DFD skill                 | Proposed; existing owner already covers state, consistency, copies, and retention         |
| Keep flow reasoning mandatory for critical paths; diagrams conditional | Proposed; semantic completeness without diagram quotas                                    |
| Add mobile/client skill with lazy SDK/platform references              | Proposed; distinct constraints not adequately covered by backend-only guidance            |
| Keep existing tooling and outcome schema                               | Proposed; no demonstrated need for runtime changes                                        |
| Independent semantic and lexical gates                                 | Proposed; scorer cannot establish correctness                                             |
| Personal domain/profile classification                                 | Unresolved dispatch prerequisite; public repository metadata is not account authorization |

Sources consulted 2026-10-11; synthetic fixtures remain assumptions, not claims about real deployments:

- [IBM: Data flow diagrams](https://www.ibm.com/think/topics/data-flow-diagram) — components, logical/physical views, decomposition, collaboration/security use.
- [GeeksforGeeks: DFD introduction](https://www.geeksforgeeks.org/software-engineering/what-is-dfddata-flow-diagram/) and [DFD rules](https://www.geeksforgeeks.org/software-engineering/rules-for-data-flow-diagram/) — introductory notation; blanket store input/output and crossing rules need scope/readability qualifications.
- [Gilbert–Lynch CAP paper](https://www.cs.princeton.edu/courses/archive/spr22/cos418/papers/cap.pdf), [Stripe idempotency contract](https://docs.stripe.com/api/idempotent_requests), [AWS retry/backoff guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — distributed correctness and retry semantics.
- [Google SRE: Implementing SLOs](https://sre.google/workbook/implementing-slos/), [SEI: ATAM collection](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/), [OWASP threat modeling](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) — journey objectives, quality scenarios, boundaries.
- [Android offline-first](https://developer.android.com/topic/architecture/data-layer/offline-first), [Apple background strategies](https://developer.apple.com/documentation/BackgroundTasks/choosing-background-strategies-for-your-app) — platform constraints, not universal architectural recipes.
- User-supplied [Stoic Engineer article](https://medium.com/@stoic.engineer/understanding-data-flow-in-system-design-from-input-to-insight-3cfca4d81397) and [Bibek Poudel article](https://medium.com/@bibeknese0/system-design-basics-to-advanced-part-2-5aaf4c1be2c3): direct fetch failed; browser returned empty documents; search identified titles only. Their unread bodies are not evidence for this proposal.

## 10. Planning handoff

| Role                                                  | Planning / source delivery                             | Independent verification                               | Spend, acceptance, release                            |
| ----------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------- |
| Maintainer / product and UAT approver                 | Accountable; approves scope                            | Consulted; reviews evidence                            | Accountable; human approval required                  |
| Lead / architect                                      | Responsible for contracts, dispatch, integration       | Accountable for complete evidence; cannot self-approve | Responsible for presenting exact decisions            |
| Content workers / backend, client, SDK subject owners | Responsible for assigned guidance; no application code | Consulted; respond to findings                         | Informed; cannot authorize                            |
| Independent reviewer / QA                             | Consulted on risks                                     | Responsible for findings and case-level verdicts       | Consulted; cannot supply human signoff                |
| Integration / release owner                           | Responsible for metadata, docs, generation             | Responsible for no-model check receipts                | Responsible only after separate release authorization |

**Scope fences:** In scope is Section 6's registry/workflow/evidence delivery. Out of scope is Section 6's runtime, account-policy, and release work. Deferred delivery items: none; separately authorized release is not silently deferred implementation.

**Sizing:** Provisional 31 relative points using M=3 and L=5 across seven M and two L tasks; medium confidence. These are scope estimates, not hours, prices, or a promised calendar window.
**Analytics / telemetry:** Record case-level failures, changed-constraint adaptation, lexical/semantic rates, activation recall/specificity, source/package token counts, correction count, and available usage/cost. No application analytics feature is introduced.
**Technical routing:** No separate application architecture/SRS work is required for this guidance-only scope. A proposed runtime/schema/renderer change must return for `design-solution` and scope approval; an approved unchanged plan proceeds to `implementation-readiness`.

### Outcome report — planning only

```json
{
  "schema_version": 1,
  "run_id": "plan-feature-system-design-professionalization-20261011T162915Z",
  "slug": "system-design-professionalization",
  "workflow": "plan-feature",
  "feature_status": "blocked",
  "started_at": "2026-10-11T16:07:01.978Z",
  "completed_at": "2026-10-11T16:29:15Z",
  "requirement_trace": {
    "brd_objectives": ["OBJ-001", "OBJ-002", "OBJ-003"],
    "requirements": [
      "REQ-001",
      "REQ-002",
      "REQ-003",
      "REQ-004",
      "REQ-005",
      "REQ-006",
      "REQ-007",
      "REQ-008"
    ],
    "acceptance_criteria": [
      "AC-001",
      "AC-002",
      "AC-003",
      "AC-004",
      "AC-005",
      "AC-006",
      "AC-007",
      "AC-008",
      "AC-009",
      "AC-010",
      "AC-011",
      "AC-012",
      "AC-013",
      "AC-014",
      "AC-015",
      "AC-016",
      "AC-017",
      "AC-018"
    ],
    "srs": []
  },
  "completed_evidence": [
    "Human-reviewable PRD and nine-task execution plan authored",
    "Plan contract check: eight requirements, eighteen AC groups, nine task briefs, fifty-five unique owned paths; no failures",
    "Prettier check passed for both planning documents"
  ],
  "missing_evidence": [
    "Human scope and execution approval",
    "Authorized account/domain classification and eligible profile decision",
    "Implementation and fresh behavioral evidence; not part of completed planning"
  ],
  "decision_needed": [
    "Approve or amend the proposed scope and Subagent-Driven execution",
    "Confirm project/account eligibility and resolve the cheap profile route conflict or select an eligible standard route"
  ],
  "recommended_next_workflow": "implementation-readiness",
  "cost": { "source": "unavailable" },
  "agent": {
    "identity": "planning-orchestrator",
    "model": "openai-codex/gpt-6.1-sol:high"
  }
}
```

`blocked` qualifies subsequent implementation pending approval; the requested planning artifacts are delivered. This inline report is not a paid eval run, a persisted release record, or a human approval.
