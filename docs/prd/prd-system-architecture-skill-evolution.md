# Feature Plan: System Architecture Skill Evolution

Status: plan approved; owner: requesting maintainer; delivery_mode: standard
slug: system-architecture-skill-evolution
operator_profile: technical; lane: direction; snc_tier: medium; model_tier: standard
source_approval: approved(requesting maintainer, 2026-11-07)
plan_approval: approved(requesting maintainer, 2026-11-07)
execution_approach: subagent-driven; selected by requesting maintainer on 2026-11-07
repository_status: planning_artifacts_only; activation_status: not_required

## Decision Brief

- **Changes since approved brief:** Operational decomposition, atomic acceptance conditions and schema-compatible trace identifiers only, plus an explicit delivery boundary discovered during planning. A category-root guide works when MCP reads the canonical registry; inspected sync/generation paths do not establish that it reaches separately installed host directories. The requesting maintainer approved registry-backed guide discovery now and deferred installed-host guide delivery on 2026-11-07. Universal host support is not claimed.
- **Recommendation:** Improve broad role discovery, add a compact category navigation guide, and reconcile the three documented instruction conflicts. Keep the existing methodology, bounded architect specialist, flow contracts, outcome schema and review framework.
- **Impact if wrong:** Broad routing may load an inappropriate specialist, relaxed input rules may hide missing material constraints, or a guide may be advertised where it is unavailable. Verify the exact consumer boundary and preserve negative cases rather than assert universal compatibility.
- **Evidence and limitations:** Reuse the approved BRD evidence ledger. Exact phrase lookup and category discovery were exercised during intake. Planning inspected supported routing/guide paths and regression intent; no candidate exists, no implementation checks have run, and no model-efficacy baseline is measured.
- **Decision owner:** Requesting maintainer approved this PRD, including the registry-backed guide boundary. Expanding installed-host resource delivery would require a separately scoped CLI/sync slice, not an unreviewed addition to this plan.
- **Approval recorded:** Focused plan approved by requesting maintainer on 2026-11-07. The maintainer separately selected Subagent-Driven, authorizing readiness checks followed by bounded implementation and independent verification. Publication, paid evaluations, premium advice, merging and runtime exposure remain unauthorized.
- **Independently actionable work:** Instruction-consistency slice B is independent of guide delivery. All implementation remains gated on plan/readiness and execution-approach authorization.

## Outcome And Guardrails

**Objective:** Carry approved `BRD-OBJ-001`: reduce contradictory or undiscoverable architecture instructions without expanding mandatory ceremony.

**Outcome:** A maintainer requesting a system architect can discover the correct broad entry, navigate existing roles, and apply consistent decision-relevant input, option and abstraction rules.

**Metric:** By first-increment acceptance, the in-scope AC rows below have claim-appropriate evidence and no material regression in selected existing routing/design checks. The approved source target for AC-001–005 is retained. Baseline: observed exact-role lookup miss, absent category-guide response and documented conflicting instructions. Frequency of harm, time savings and model-decision quality are unmeasured. Owner: requesting maintainer; acceptance window: first review after delivery, not a calendar commitment.

**Guardrails:** Preserve real missing-input blockers, existing bounded specialist responsibility, logical-flow-first reasoning, conditional view/deep-dive selection, independent semantic judgment, trust/data/recovery hard gates and evidence provenance. Do not introduce component, option, document, specialist or diagram quotas. No new application API, data schema, authorization mechanism or runtime enforcement is in scope.

## Scope And Non-Goals

### In Scope

```text
Improve architecture standards
├── Discover existing guidance — REQ-001
│   ├── Route the broad architect phrase — in_scope
│   ├── Explain role and surface ownership — in_scope
│   └── Serve canonical category navigation through registry-backed MCP — in_scope
├── Reconcile decision rules — REQ-002
│   ├── Require only material quantities and constraints — in_scope
│   ├── Consider genuine alternatives only — in_scope
│   └── Justify abstraction with actual variation or a concrete boundary — in_scope
└── Verify changed surfaces — REQ-004
    ├── Exercise real routing and guide retrieval — in_scope
    ├── Review applicability and decision behavior independently — in_scope
    └── Check affected generated package/index consistency — in_scope
```

### Deferred

- Original high-load worked example: REQ-003 / AC-006 below. It remains a later candidate, not bundled into first-increment implementation.
- Live current-versus-candidate evaluation, ROI claims and expansion of held-out cases. The existing backend ROI pilot remains prepared/not executed; recover its approved PRD/dispatch authority before extending it. No held-out packet was opened during this planning phase.
- Installed-host delivery of category-root guides. Planning found no established copy path in the inspected sync/generation code. This is a delivery limitation, not an assertion that a source guide is absent or that every host is incapable of finding it. Its future scope owner is the requesting maintainer; it has no delivery commitment or invented ticket.

### Out Of Scope

New mega-skills, matcher redesign, broad CLI changes, additional architecture frameworks or scorecards, workflow ownership replacement, new runtime/security controls, reproduction of external prompts/code/hooks, diagram restyling, paid model campaigns, production mutation, public release or host activation. Web/mobile story tags, markets and toggles do not apply to this registry/MCP standards contract.

## Source Authority And Identifier Normalization

Authoritative approved source: [BRD](../brd/brd-system-architecture-skill-evolution.md), approved by requesting maintainer on 2026-11-07. Its identifiers were normalized to the repository's numeric trace grammar (`BRD-OBJ-001`, `REQ-001..004`, `AC-001..008`; semantics and scope unchanged; its seed table now links rather than re-declares IDs) so the trace audit and RunRecord schema accept them; the BRD digest after normalization is SHA-256 `cf26095b52626c25fb64128b977bb16314f974cff0ae6ec3b6b32e9236bae684`. This PRD owns the canonical delivery definitions and atomizes three source criteria into additional rows:

- AC-001 is split into AC-001 (discovery) and AC-009 (role boundaries).
- AC-003 is split into AC-003 (sufficient constraints) and AC-010 (consequential missing input).
- AC-004 is split into AC-004 (hypothetical extension) and AC-011 (concrete variation).
- REQ-003 and AC-006 are deferred. AC-008 is scoped to affected routing/skill-package outputs, with no installed-host guide parity claim; AC-005 is the registry-backed consumer boundary.

## Requirements And Acceptance Criteria

Owners are accountable roles, not already-dispatched agents. The requesting maintainer is Product/approval owner for every requirement. Engineering ownership is assigned below; independent QA owns verification. Priorities and draft statuses are proposed defaults under the accepted direction.

| Req ID | Requirement | Engineering owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Make the existing architecture entry and role map discoverable through supported keyword and registry-backed category-guide surfaces. | Guide/routing owner | P1 | Draft | BRD-OBJ-001 |
| REQ-002 | Align estimation, bounded architect and evolution guidance with scope-aware material inputs, meaningful choices and justified abstraction. | Instruction-consistency owner | P1 | Draft | BRD-OBJ-001 |
| REQ-003 | Teach the existing architecture contracts through an original high-load example only if a later increment approves it. | Future example owner, appointed by requesting maintainer | P2 | Deferred | BRD-OBJ-001 |
| REQ-004 | Produce claim-appropriate evidence for changed routing, guidance and affected generated outputs without implying model efficacy, publication or runtime enforcement. | Integration owner | P1 | Draft | BRD-OBJ-001 |

Each AC is defined once here. The verification lane is canonical in this table; later sections reference IDs, not duplicate expected outcomes.

| AC ID | Req ID | Given | When | Then | QA owner | Verification lane | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | The real canonical registry and exact, case-varied or boundary-delimited longer inputs containing `system architect` | MCP keyword discovery resolves the request | Methodology is returned as the broad entry; phrase fragments and embedded-word near misses do not activate its new trigger. Existing independently matched owners remain valid. | Independent QA verifier | MCP consumer integration | In scope |
| AC-002 | REQ-002 | A bounded component brief leaves one viable approach after real constraints are applied | An independent reviewer follows the revised specialist contract | The contract permits the justified approach without manufactured alternatives, while retaining rejection reasons for genuinely considered rejected options. | Independent architecture reviewer | Public decision walkthrough | In scope |
| AC-003 | REQ-002 | A stateless/client/SDK brief supplies all constraints material to its decision and has no relevant backend store/traffic or distributed-consistency question | An independent reviewer applies estimation and architect guidance | The decision can proceed without inventing or demanding irrelevant QPS, storage or consistency figures, and any actual assumptions remain visible. | Independent architecture reviewer | Public decision walkthrough | In scope |
| AC-004 | REQ-002 | A one-variant component has no established variation or concrete extension boundary | An independent reviewer applies evolution guidance | Hypothetical future change alone does not require Strategy/Factory or equivalent abstraction. | Independent architecture reviewer | Public decision walkthrough | In scope |
| AC-005 | REQ-001 | MCP is configured to read the canonical registry with the new system-design guide | Category discovery is invoked | The returned guide provides a compact conditional navigation map to existing owners without duplicating their normative rules or implying that every sibling must be loaded. | Independent QA verifier | MCP consumer integration | In scope |
| AC-006 | REQ-003 | A later increment authorizes an original high-load example | Its validation owner reviews capacity and failure claims | Edge/origin workload and figure provenance are distinguished; one consequential operation is traced through authority and copies with an adverse timeline and observable result, without presenting screenshot claims as measurements. | Future independent example reviewer | Independent example review | Deferred |
| AC-007 | REQ-004 | Local verification and independent walkthrough evidence are assembled | The integration owner reports results | Routing/structural checks, manual behavioral judgment and any runnable-artifact evidence are labeled separately; no unexecuted/live-model effectiveness, ROI, security enforcement or operations claim is inferred. | Independent QA verifier | Evidence-boundary review | In scope |
| AC-008 | REQ-004 | Canonical changes and configuration-selected generated routing/skill-package outputs are integrated | The verifier checks affected publication surfaces locally | Expected package/index resources are consistent with canonical owners and real discovery works at the declared source boundary; category-root guide sync limitations are reported rather than mislabeled as parity. This grants no publication authority. | Independent QA verifier | Integrated repository acceptance | In scope |
| AC-009 | REQ-001 | Broad whole-system, narrow component, artifact-review and approved-contract requests are presented | The reviewer follows the role map and discovery results | Existing facilitator, bounded specialist, artifact reviewer and contract workflow responsibilities remain distinct; broad phrase discovery alone does not spawn a worker or confer implementation authority. A genuine narrow phrase may legitimately co-match its specialist. | Independent architecture reviewer | Role-boundary walkthrough | In scope |
| AC-010 | REQ-002 | A consequential backend/component decision lacks a material workload, invariant, SLO or consistency constraint needed to choose safely | The reviewer applies revised input applicability | The affected recommendation remains blocked with the missing input named; irrelevant-field relaxation does not invent evidence or waive a real blocker. | Independent architecture reviewer | Public decision walkthrough | In scope |
| AC-011 | REQ-002 | A concrete variation, compatibility requirement or change boundary justifies an abstraction | The reviewer applies revised evolution guidance | The mechanism can be selected with its actual rationale; removing the speculative default does not become a blanket ban on Strategy/Factory or other appropriate patterns. | Independent architecture reviewer | Public decision walkthrough | In scope |

## Delivery Decisions And Evidence

### Proposed decisions

1. **Broad role routing belongs to methodology.** Add the complete phrase to its trigger metadata, not simultaneously to the specialist. Existing matching is additive across owners; ranking does not make it exclusive. Keep qualified specialist triggers intact. Selection is not delegation.
2. **Use the established guide convention.** The canonical path is `skills/system-design/references/framework-map.md`, ordinary Markdown. The existing handler reads it from its configured skills directory; no new parser, guide schema or MCP command is needed.
3. **Keep applicability conditional.** Do not loosen the bounded component/flow scope. Material quantities and invariants remain required where they shape the recommendation. Absence of an irrelevant field is different from absence of a relevant constraint.
4. **Do not add source-string tests for prose.** Metadata routing/guide retrieval have real consumer contracts suitable for regression tests. Choice/applicability/abstraction rules need independent semantic walkthroughs using public constraints, not tests that merely detect the new wording.
5. **Publish nothing during implementation verification.** Local generation/checks may validate affected outputs after execution approval; merge, external publication and host activation remain separate authority.

### Evidence references

| Evidence | Status / decision supported |
| --- | --- |
| Approved BRD and its E-01–E-14 ledger | confirmed(source digest above); settled intent, constraints, external comparisons, screenshot limitations and unknown efficacy are reused without repeating intake. |
| `mcp/src/services/SkillParser.ts:43-100`; `mcp/src/services/SkillIndex.ts:207-297` | confirmed(inspected by bounded planning scout); declared trigger metadata drives additive phrase matching and fixed guide-path lookup. |
| `mcp/src/tools/index.ts:307-400` | confirmed(inspected by planning scout); guide retrieval uses the configured skills directory and records guide consultation separately. |
| `skills/golang/references/framework-map.md`; `skills/product-management/references/framework-map.md` | confirmed(inspected by planning scout); existing plain-Markdown guide convention. |
| `scripts/generate-indices.ts`; `scripts/generation/isolated-stage.ts`; `cli/src/services/SyncService.ts:1442-1548` | confirmed(bounded inspection); package mirroring/index generation does not establish category-root guide distribution. Universal installed-host support remains unknown/unverified. |
| `skills/specialists/specialist-system-architect/SKILL.md` | confirmed(source SHA-256 `65d33ebe701a9de2bc297223525f7768168d17f4f1059f358ec58df2599369d5`); current input/option constraints. |
| `skills/system-design/system-design-estimation/SKILL.md` | confirmed(source SHA-256 `5ce0074b3351cc3ecc3b230c45bf17af7e31955d89a5c1b00db59418f2bb6fd7`); backend applicability tension. |
| `skills/system-design/system-design-principles/SKILL.md` | confirmed(source SHA-256 `cc23d605aa944bf39e8f7cb32f1d6293959b3a7972ffbf6fd4200ee6e5656397`); speculative pattern guidance versus existing anti-pattern. |
| `mcp/test/Tools.spec.ts`; `mcp/test/SkillIndex.spec.ts`; `cli/src/services/__tests__/IndexGeneratorService.spec.ts` | confirmed(source inspection); existing generic guide/routing/index checks. Their current PASS status was not established during planning. |
| `scripts/evals/system-design-behavior.test.ts` | confirmed(source inspection); existing canned-response scorer regressions, not live agent behavior. Bounded inspection did not locate the specific new instruction cases; this does not prove global absence. |
| `scripts/outcome/schema.ts:15-110`; `scripts/outcome/schema.test.ts:9-37` | confirmed(direct read); supported status, numeric trace-ID rules and planning receipt contract. |

No canonical product ledger for this slug was located during intake. No strategy/OPP/DEC/MET records or product evidence IDs are invented. Value, glossary, assumptions and risks carry forward from the approved BRD; no new stakeholder meaning is inferred from the repeated confirmation.

## Implementation Plan And Task Slices

These are proposed assignments for later execution, not dispatched implementation. File ownership is exclusive. A and B can run concurrently after authority/readiness gates; C integrates their results; R independently reviews without owning implementation.

| Slice | Exact component boundary / expected artifact | Trace references | Dependencies | Owner / estimate / confidence | Per-slice routing |
| --- | --- | --- | --- | --- | --- |
| A — Discover roles and guide | Own `skills/system-design/system-design-methodology/SKILL.md` frontmatter, new `skills/system-design/references/framework-map.md`, and relevant cases in `mcp/test/SkillIndex.spec.ts` / `mcp/test/Tools.spec.ts`. Output compact navigation and actual routing/guide regression evidence. No specialist-file edit, matcher redesign or CLI copy change. | REQ-001; AC-001/005/009 | Approved plan, execution approach and readiness | Guide/routing owner; M; high confidence for registry-backed path | S=1 N=1 C=1 total=3 medium; standard-capability eligible implementation route |
| B — Reconcile existing instructions | Own `skills/specialists/specialist-system-architect/SKILL.md`, `skills/system-design/system-design-estimation/SKILL.md`, `skills/system-design/system-design-principles/SKILL.md`. Output compact consistent rules, preserving material blockers and specialist boundaries. Existing references may be linked; any discovered contradictory reference is reported to integration owner before widening ownership. | REQ-002; AC-002/003/004/010/011 | Approved plan, execution approach and readiness; independent of A | Instruction-consistency owner; M; medium confidence because semantic review is required | S=1 N=1 C=1 total=3 medium; standard-capability eligible implementation route |
| C — Integrate affected registry outputs | Own generation invocation, provenance receipts, changed `_INDEX.md`/registry index/export outputs selected by existing configuration, and necessary existing category metadata/docs/changelog updates under current project conventions. Enumerate generated destinations before dispatch; do not hand-edit generated copies. Output coherent local artifacts and verification receipts. | REQ-004; AC-007/008 | A and B complete; changes accepted against briefs | Integration owner; M; medium confidence for configuration-specific generation | S=2 N=0 C=1 total=3 medium; standard-capability eligible route; existing tooling first |
| R — Review semantics and evidence | Read-only independent review of delivered source/evidence and AC references. Produce cited findings and criterion-level results; no A/B/C edits, approvals, hidden benchmark reads or deployment. | All in-scope ACs | Candidate A/B content available; final integrated verdict after C | Independent architecture/QA reviewer; S; medium confidence | S=1 N=0 C=1 total=2 low, adequate eligible analysis/review profile; never implementation ladder by default |

T-shirt estimates are relative maintenance scope, not time or financial commitments. Parent tier does not force a premium model. Discover current profiles at dispatch and preserve selected model/effort/features; no worker may delegate or redesign beyond its brief. Independent review does not provide human approval. If A/B share a newly needed file, integration owner assigns one owner before edits.

### Verification Execution Shape

Use existing test entrypoints and consumer tools; commands below were discovered, not run against a candidate:

- MCP regression: `rtk pnpm --dir mcp exec vitest run test/Tools.spec.ts test/SkillIndex.spec.ts`.
- Existing system-design scorer regression: `rtk pnpm exec node --import tsx --test scripts/evals/system-design-behavior.test.ts`. It loads existing public eval definitions, not the held-out packet. Report it only as scorer regression evidence.
- CLI category-index regression, if generated routing is affected: `rtk pnpm --dir cli exec vitest run src/services/__tests__/IndexGeneratorService.spec.ts`.
- Supported local producer: `rtk pnpm generate-indices`; parity/check mode: `rtk pnpm generate-indices --check`. The wrapper may write staging/provenance artifacts; do not describe it as a zero-write read-only check. Inspect expected destinations and honor existing ownership/provenance before invocation.
- Existing generation regressions if generation surfaces change: `rtk pnpm test:generation`. Keyword audit `rtk pnpm audit:keywords` is advisory and category-local, not proof of cross-category routing correctness.

Actual smoke proof must call MCP keyword discovery and category retrieval against the candidate registry, recording the configured source. A stale mounted server must not be mistaken for a failing candidate or a successful installed-host sync; use a correctly pointed disposable consumer if needed. Exercise positive/negative/mixed phrase cases described by the canonical ACs without adding bare-word trigger overreach.

For prose-only rules, the independent reviewer records the provided public constraints, applied decision, cited mechanism/rationale, and contrary interpretation that would fail the corresponding AC. Compare the old and revised instructions where it clarifies the demonstrated contradiction. This is document-semantic verification, not a paid model-efficacy campaign, predictive model benchmark or production exercise. Do not modify frozen/held-out packets to match the candidate. Existing public tests should not be duplicated with source-text assertions.

Run focused checks after integration, not repeatedly during parallel authoring. Any real behavioral code/test change must follow applicable project TDD rules. Unexecuted commands stay NOT RUN. New runtime/artifact paths, if later approved, need their own consumer smoke; a manual reasoning review cannot substitute for it.

## Responsibility And Approval Boundaries

| Decision / activity | Accountable | Responsible | Consulted / informed |
| --- | --- | --- | --- |
| Product scope, guide boundary and plan acceptance | Requesting maintainer | Planning lead | Engineering/integration owner, independent QA |
| Canonical content and routing | Integration owner | Exclusive A/B owners | Independent architecture reviewer |
| Technical evidence and acceptance recommendation | Independent QA verifier | Independent architecture reviewer and integration verifier | Requesting maintainer |
| Execution-approach selection | Requesting maintainer | Orchestrator records selection | Assigned workers |
| Merge, publication, release or host activation | Requesting maintainer | No executor authorized by this plan | Engineering and QA informed |

No rollout, telemetry event, hosted pilot or user-data transition is committed. Local generated artifacts are not a release. If the installed-guide delivery limitation must be fixed in this increment, pause only A's distribution claim/C's affected checks, define a new approved delivery slice, and re-score its real blast radius; B remains independently specified.

## Open Consequential Decisions

| Decision | Owner | Affected slice | Required input / consequence |
| --- | --- | --- | --- |
| Execution approach selected | Requesting maintainer | A/B/C | Subagent-Driven selected on 2026-11-07: readiness checks, bounded workers, integration and independent verification only. |

There is no unresolved architecture requiring a new SRS for the proposed canonical-registry slice. Supporting all separately installed guide consumers would be a new delivery-contract question for `design-solution` if approved. Historical evaluation authority and actual efficacy remain limitations of deferred work, not blockers for the scoped instruction corrections.

## Risks And Change Impact

- Routing overlap: preserve independently matched specialist owners; test exact phrase, longer/case-varied phrases and embedded-word negatives, not winner-takes-all routing. Owner: A/independent QA.
- Missing material input: relaxing irrelevant-field requirements must not imply choosing safely without the shaping constraint. Owner: B/independent reviewer.
- Silent distribution claim: source existence is not host install evidence. Owner: C/independent QA.
- Context duplication: guide links role owners instead of restating their normative contracts. Owner: A.
- Trace drift: source approval remains bound to the BRD digest; normalized IDs preserve explicit lineage. Material revision reopens only affected ACs/authority, not the complete intake. Owner: planning lead.
- Evaluation contamination or false efficacy claim: no hidden packet access, no fabricated measurements, no substitution of lexical success for semantic review. Owner: independent reviewer.

## Status, Receipt And References

- `feature_status: requirements_ready` means a testable draft plan exists, not that implementation, independent verification or approval is complete.
- Planning receipt: [plan-feature-20261107.json](../../artifacts/runs/system-architecture-skill-evolution/plan-feature-20261107.json). Schema-valid does not mean approved, implemented or verified.
- Approved direction and external-source citations: [BRD](../brd/brd-system-architecture-skill-evolution.md); the source is unchanged by planning.
- Canonical methodology and source owners: `skills/system-design/`, `skills/specialists/specialist-system-architect/`, `skills/common/common-decision-discipline/`.
- Run-record contract: `scripts/outcome/schema.ts`; prior numeric-ID normalization precedent: `docs/prd/prd-testing-reference-improvements.md`.
- Deferred evaluation authority: `benchmarks/evals/backend-system-design-roi-pilot.md`; its referenced approved PRD/dispatch record was not recovered in this bounded current-worktree inventory.

## Planning Verification Results

- PASS: four unique canonical requirements and eleven unique canonical ACs match the planning receipt; the approved BRD digest is unchanged; local Markdown links resolve; plan approval remains pending.
- PASS: the canonical `validateRunRecord` function returned zero issues, and a filesystem scope check found exactly one matching planning record. Node v26 loaded the original TypeScript module directly with a loader alias from `fs-extra` to real `node:fs` for its `existsSync` use and the correct schema directory supplied as `__dirname`. No validator source was modified. This is a schema-function check, not the CLI runner.
- INFRASTRUCTURE FAILURE: the scoped `rtk pnpm audit:outcome --records --required --dir artifacts/runs/system-architecture-skill-evolution --slug system-architecture-skill-evolution --workflow plan-feature --run-id plan-feature-20261107 --json` invocation could not start because `tsx` and local `node_modules` are absent. Dependencies were not installed. Readiness must establish an authorized dependency environment before repository runner commands can be credited.
- NOT RUN: candidate MCP/scorer/generation checks, independent candidate walkthrough, model efficacy evaluation and publication parity. This phase changed planning artifacts only.
- The native schema check emitted Node's module-type detection warning; it was not suppressed and no project module configuration was changed.

## Next Workflow

`implementation-readiness`, with plan approval recorded and execution approach still an explicit separate selection. No implementation worker has been launched. Recommend Subagent-Driven if implementation is authorized: A/B concurrently, then C integration and R independent acceptance review.

## Cost Report

Host input/output/cached/reasoning usage, pricing and complete task cost are unavailable. MCP workflow telemetry is requested at handoff; consultation counts do not prove complete actor costs, correct skill delivery, instruction enforcement or model efficacy. No premium consultation, paid evaluation campaign, runtime exposure or publication was performed.
