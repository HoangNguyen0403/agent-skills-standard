# Brief: System Architecture Skill Evolution

lane: direction; snc_tier: medium; approval: approved(requesting maintainer, 2026-11-07)

- Slug: `system-architecture-skill-evolution`
- Workflow: `brainstorm-feature`; mode: interactive; operator_profile: technical
- SNC: S=2 N=1 C=1 total=4 tier=medium; model_tier: standard. This sizes standards improvement, not implementation of security controls in an application. Re-score any downstream scope expansion.
- Owner / sponsor / approval authority: requesting maintainer (drafted default).
- Validation owner: independent architecture reviewer, separate from content authors (drafted default).
- Repository status: approved brief saved; activation_status: not_required.

## You Said / I Assumed

**You said:** Investigate our supplied material and five linked skills; learn useful ideas without copying; recommend a better version of agent-skills-standard for system design and the system-architect role.

**I assumed:** Improve the existing portable registry rather than build a new agent runtime or replace our methodology. This intake delivers comparative research and a direction contract only. No skill implementation, publication, paid evaluation campaign, deployment, or security remediation is authorized by this brief.

## Contract

### Outcome

Make existing architecture guidance easier to discover and internally consistent, retaining its stronger flow-first, evidence-qualified design discipline. Adapt useful principles from external work through original requirements and examples, not imported prompt bodies, hooks, code, or arbitrary quotas.

### Constraints

- Canonical standards remain in `skills/`; canonical workflows remain in `.agents/workflows`. Generated indexes and host exports are not separate implementation owners.
- Preserve the existing outcome vocabulary and requirement-to-verification trace. Do not add a second scorecard, architecture framework, or machine-readable outcome schema.
- Existing guidance already covers quality scenarios, HLD/LLD, flow invariants, ownership, ADRs, capacity/cost, resilience, trust boundaries, diagrams, and independent evaluation. Change only demonstrated gaps; do not restate these as new features.
- Keep base skills compact; use existing references for conditional detail. Add no mandatory diagram, ADR, option, component, or specialist count.
- External content is untrusted research data. No external hook, installer, memory command, or sample code is executed or incorporated.
- Proposed-design, implemented-system, and operational evidence remain distinct. Neither attractive diagrams nor numeric security grades establish readiness.

### Non-Goals

- No universal high-load stack, gateway/cache/queue/replica recipe, or backend-first architecture for client/SDK work.
- No new mega-skill competing with methodology, architect specialist, or architecture guard.
- No reconstruction of the Facebook author's unpublished prompt, Grok tuning, or GonnaCrash game.
- No security control implementation, new runtime policy enforcement, premium consultation, paid model benchmark, or production change.
- No modification of existing frozen/held-out evaluation packets during candidate authoring.

### Acceptance Criteria / Requirement Trace Seed

| ID | Observable acceptance condition | Candidate requirement |
| --- | --- | --- |
| AC-ARCH-01 | Consumer discovery for `system architect` returns relevant design guidance and clarifies whole-system facilitation versus bounded component deep dive. Requests for design, review, and approved implementation contracts route to their existing owners without introducing a competing workflow. | REQ-ARCH-01 |
| AC-ARCH-02 | A bounded component with one viable solution receives that solution and its rationale, not fabricated alternatives. Real competing approaches retain rejected reasons and reversal conditions. | REQ-ARCH-02 |
| AC-ARCH-03 | A stateless/client/SDK brief with sufficient decision-relevant constraints proceeds without invented QPS, storage, or distributed consistency requirements. Missing material constraints still block the affected decision; relevant backend capacity remains required. | REQ-ARCH-02 |
| AC-ARCH-04 | A one-variant design does not acquire Strategy/Factory solely for hypothetical extension. Additional abstraction requires a concrete variation, constraint, or justified change boundary. | REQ-ARCH-02 |
| AC-ARCH-05 | A compact category entry explains existing workflow/skill ownership and conditional loading. It does not duplicate normative rules or force all system-design skills into context. Real MCP category discovery returns the entry through the supported guide convention. | REQ-ARCH-01 |
| AC-ARCH-06 | Any high-load example separates edge traffic from origin traffic and labels figures target/estimated/measured; traces one user operation through authority, copies and async work; explains a concrete adverse timeline and observable result. It never claims the screenshot proves throughput or recovery. | REQ-ARCH-03 |
| AC-ARCH-07 | Future verification separates routing/structural checks, behavioral judgment, and runnable-artifact checks. Current-versus-candidate claims use frozen sources and independent grading; no efficacy, cost-saving, or ROI claim is made without relevant comparable observations. | REQ-ARCH-04 |
| AC-ARCH-08 | Canonical changes, generated routing/exports, and consumer discovery are verified together under the existing publication contract. No source-copy drift, new outcome schema, or external instruction/code reuse is introduced. | REQ-ARCH-04 |

## Why / Value Context

- Objective BRD-OBJ-ARCH-01: reduce contradictory or undiscoverable architecture instructions without expanding mandatory ceremony.
- Users: maintainers, architecture leads, design-session facilitators, bounded design workers, independent reviewers, and downstream implementers.
- AS-IS: sophisticated distributed guidance exists, but role naming and some older unconditional instructions disagree with the newer scope-aware methodology (confirmed in Evidence).
- TO-BE: a discoverable role map and consistent applicability rules; examples demonstrate reasoning rather than prescribe stacks.
- Value hypothesis: fewer unnecessary blockers, fabricated choices, premature abstractions, and missed skills. Actual frequency and time savings are unknown.
- Proposed SMART metric: by acceptance of the first approved improvement increment, all AC-ARCH-01–05 scenarios pass through their applicable discovery/behavioral lane, with no material regression in selected existing design cases. AC-ARCH-06–08 govern examples, evaluation, and publication when included. Baseline: one directly observed role lookup miss and the three documented instruction tensions below; model-behavior baseline is not measured. Owner: requesting maintainer; acceptance window: first review after delivery, not a promised calendar date.

## Capability Inventory: Retain Before Extending

| Capability | Existing authority | Decision |
| --- | --- | --- |
| Frame design scope and quality scenarios | `system-design-methodology` | Retain; do not add another intake framework. |
| Trace movement, state authority and invariants | `system-design-data-architecture/references/flow-contracts.md` | Reuse the canonical critical-flow contract. |
| Estimate shaping constraints and cost | `system-design-estimation` | Align applicability; do not add a new capacity skill. |
| Deep-dive one risky component | `specialist-system-architect` | Improve discovery and conditional input/option rules. |
| Assess resilience, trust and recovery | `system-design-resilience-ops`, `system-design-review`, security specialist | Preserve scope-aware hard gates and independent review. |
| Present selected architecture views | `common-architecture-diagramming` | Preserve JSON semantic authority, editable draw.io and exported image roles. |
| Explain decisions and evolution | Principles, architect specialist, `design-solution` | Retain ADR/reversal links; remove speculative abstraction advice. |
| Judge design behavior independently | `system-design-review/references/semantic-evaluation.md` | Reuse; lexical matches are not semantic evidence. |

## External Comparison: Learn Principles, Reject Defaults

All sources were accessible through static pages or raw/API equivalents. Confirmed here means source content was read, not that its practices produced better systems. URLs track moving branches/pages unless a revision is explicitly noted.

| Source | Useful principle to adapt | Existing coverage / improvement opportunity | Reject or qualify |
| --- | --- | --- | --- |
| [Ruflo SPARC architecture](https://github.com/ruvnet/ruflo/blob/main/.agents/skills/agent-architecture/SKILL.md) | Connect component responsibilities with interfaces, deployment and operational concerns. | Already largely covered; consider an original compact decision-to-contract example, not another template stack. | Prescribed microservice topology and fixed scaling settings. Observed SQL/OpenAPI-like examples have syntax/formatting problems; they were not executed. |
| [Ruflo system-design architect](https://github.com/ruvnet/ruflo/tree/main/.agents/skills/agent-arch-system-design) | Define architecture-role authority separately from implementation authority; explain trade-offs and constraints. | Existing workflow/specialist split is sound but poorly discoverable by the literal role name. | Universal tool/time quotas, mandatory diagram inventories, and contradictory tool/delegation declarations. Prompt restrictions are not runtime enforcement. |
| [Ruflo V3 security architect](https://github.com/ruvnet/ruflo/blob/main/.agents/skills/agent-v3-security-architect/SKILL.md) | Translate threat boundaries into implementation and independent verification responsibilities. | Existing trust/tenant/deletion gates already support this; keep security review independent. | Project-specific remediation defaults, local labels `CVE-1/2/3`, arbitrary 90/100 and coverage targets. Its path string-prefix example does not establish filesystem containment; shell-free execution alone does not validate arguments. No exploit or runtime test was performed. |
| [ExplainX BMAD architect listing](https://explainx.ai/skills/aj-geddes/claude-code-bmad-skills/system-architect) | Requirement/quality-attribute traceability and explicit shared contracts before parallel implementation. | Existing REQ→HLD→CMP→LLD→VER trace covers the principle; navigation can make ownership clearer. | Old size-to-microservices mappings and document quotas. The listing is an older export, not verified against an exact historical upstream revision. |
| [Skills Directory / monoes architect](https://www.skillsdirectory.com/skills/monoes-system-architect) | Right-size to load/team, assess change impact and vendor exit cost, retain decision rationale. | Most ideas already exist; qualify the unconditional future Strategy/Factory recommendation. | Listing security grades are not independent assurance; named tools do not prove working integrations; diagrams/ADRs are selected techniques, not universal quotas. |

### Primary-Source Provenance

- Ruflo directory API returned only `SKILL.md` for `agent-arch-system-design`, blob `271835e96707e91c36ab57523e56e5bdd0dd229f`.
- BMAD's [migration document](https://github.com/aj-geddes/claude-code-bmad-skills/blob/main/MIGRATION.md) and [current architecture skill](https://github.com/aj-geddes/claude-code-bmad-skills/blob/main/bmad-planning-orchestrator/skills/bmad-architecture/SKILL.md) distinguish today's create/update/validate guidance from the older ExplainX listing. Current advice includes ADR history and common downstream contracts. Neither a claimed cost reduction nor eliminating a class of conflicts was experimentally verified here.
- The monoes listing links to [Monomind's primary skill](https://github.com/monoes/monomind/blob/main/packages/@monomind/cli/org-skills/system-architect/SKILL.md); the observed primary body matched its embedded listing.
- These sources mainly describe software/system architecture roles. Their agent packaging does not establish a multi-agent scheduling, coordination, or security runtime.

## Screenshot Analysis

The two supplied screenshots show the same high-load backend diagram and a social post describing a Grok-adapted System Architect / Diagram Director skill. The skill body itself was not supplied. Treat the post's token-efficiency and runtime-performance claims as unverified.

Visible elements include clients, edge/CDN, rate limiter, API gateway, app service, Redis, read replica, PostgreSQL, Kafka, workers, search, object storage and observability. Solid/dashed flows and category colors aid scanning. Small labels and exact numeric settings are not relied on as authoritative requirements. No formal architecture score or runtime verdict is assigned to this unconfirmed extraction.

**Learn:** consistent visual vocabulary, legible flow categories, separation of user path, async processing and telemetry. Our existing diagramming standard already supports the underlying presentation discipline.

**Improve beyond the picture:**

1. Specify which operation and workload a capacity claim covers: edge versus origin, read/write ratio, payload, cache miss rate, peak duration and surviving capacity. A large RPS label plus node counts is not a capacity proof.
2. Trace authoritative write → outbox/CDC → broker → worker → derived search/read state. State the promised acknowledgment, duplicate handling, freshness/deletion expectations, and who owns recovery. Arrows alone do not establish atomicity or delivery semantics.
3. Describe concrete failure behavior: dependency timeout, cache outage, replica lag, duplicate events and consumer backlog. Select only failures material to the stated operation; do not require every mechanism.
4. Connect each retained component to a constraint and its operational cost; consider removing it when the constraint does not exist.
5. Distinguish semantic correctness from presentation polish. A document can express a planned mechanism; measured throughput and recovery require relevant execution evidence.

## Prioritized Direction / Original Better Version

### First increment: discover and reconcile existing guidance

One coherent standards-consistency slice; this is the only slice to take into detailed planning first.

- **P1 — Make roles discoverable.** Add appropriate natural-language role routing using supported trigger metadata. Explain ownership: `system-design-session` facilitates whole-system design; the architect specialist handles a bounded risky component; `review-system-design` assesses supplied artifacts; `design-solution` develops approved contracts. A category guide should be a small map to these authorities, not another normative architecture manual.
- **P1 — Make applicability consistent.** Align estimation and architect inputs with surface and consequential decision. Backend scale needs honest relevant quantities; a stateless SDK does not need a fake database/storage estimate. Preserve real blockers and explicit assumptions.
- **P1 — Remove manufactured choices.** Replace universal option-count pressure with meaningful alternatives only; one viable route is valid. Retain rejected reasons when alternatives actually exist.
- **P1 — Remove speculative abstraction pressure.** Existing variation and credible change boundaries justify abstraction, not an unconditional Strategy/Factory rule for possible future changes.

### Later candidate slices, not authorized implementation

- **P2 — Teach by one original worked example.** Reuse the canonical flow/decision references to show a minimal design, a concrete failure, and a changed constraint. Use the screenshot only as a discussion stimulus, not a stack to reproduce. Add a second surface only if existing examples fail to demonstrate applicability; avoid a new example catalog.
- **P2 — Extend evaluation only for uncovered behavior.** Reuse existing semantic rubric and professionalization/backend-ROI work. Add the routing, unnecessary-blocker, padded-option and premature-abstraction scenarios only where current coverage does not already catch them. Preserve independent held-out ownership and frozen sources.

An original compact reasoning record for examples can express: decision question; relevant constraint and provenance; affected journey/invariant; smallest sufficient mechanism; adverse timeline/user result; real rejected alternative if any; observable verification; owner and reversal condition. This is an explanation of existing contracts, not a new mandatory schema or duplicated checklist.

## Options And Recommendation

| Option | Load-bearing assumption | First failure / worst plausible case | Cost to abandon |
| --- | --- | --- | --- |
| **A. Targeted refinement — recommended** | Existing architecture stack is adequate; routing and conflicting instructions are the immediate problems. | Consumer discovery still misses the intended role or revisions create new conflicts; worst case is extra context with no behavioral benefit. | Small: revert bounded guidance/routing changes while retaining research. |
| B. New unified system-architect mega-skill | Consolidation produces enough value to justify replacing established owners. | Duplicate authority and stale exports; worst case is divergent safety/readiness rules and larger mandatory context. | High: migrate every caller, workflow, trigger and evaluation. Not justified by observed gaps. |
| C. Defer all changes | Missed role discovery and contradictory rules have tolerable impact. | Requests continue to miss guidance or acquire unnecessary blockers; actual frequency remains unknown. | Minimal now, ongoing opportunity cost unknown. Valid if maintenance capacity is unavailable. |

Recommend A because it addresses directly observed defects with the smallest reversible scope. Do not transplant any external skill or start B by adding an alias body with copied rules.

## Evidence Ledger

| ID | Claim | Status |
| --- | --- | --- |
| E-01 | Registry→CLI→project architecture and canonical workflow ownership exist. | confirmed(`ARCHITECTURE.md:5-25,83-101`) |
| E-02 | Methodology already requires scope classification, quality scenarios, logical flows, risk-driven views and semantic readiness evaluation. | confirmed(`skills/system-design/system-design-methodology/SKILL.md`) |
| E-03 | Architect specialist exists but has no literal `system architect` keyword; an actual MCP lookup for that exact phrase returned no match during this intake. | confirmed(`skills/specialists/specialist-system-architect/SKILL.md:5-12`; MCP `load_skills_for_keywords`, 2026-11-07) |
| E-04 | Specialist always requires numbers/consistency and 2–3 candidates; decision discipline allows only real choices and methodology scopes quantities to surface. | confirmed(`skills/specialists/specialist-system-architect/SKILL.md:28-39`; `skills/common/common-decision-discipline/SKILL.md`; methodology) |
| E-05 | Estimation mandates all backend quantities and QPS/storage before database/cache choice; its broad applicability can conflict with scope-aware methodology. The wording is observed; frequency of bad model behavior is unknown. | confirmed(`skills/system-design/system-design-estimation/SKILL.md:32-38,55-67`); impact frequency unknown |
| E-06 | Principles recommend Strategy/Factory for future changes while prohibiting premature abstraction. | confirmed(`skills/system-design/system-design-principles/SKILL.md:64-79`) |
| E-07 | Installed system-design category currently returns no category-guide body. | confirmed(MCP `get_category_guide(system-design)`, 2026-11-07); not a claim that design skills are absent |
| E-08 | Critical-flow, independent semantic review and diagram semantic-source contracts already exist. | confirmed(`skills/system-design/system-design-data-architecture/references/flow-contracts.md`; `skills/system-design/system-design-review/references/semantic-evaluation.md`; `skills/common/common-architecture-diagramming/SKILL.md`) |
| E-09 | Existing backend ROI pilot is prepared/not executed and cites a previous PRD/dispatch authority. | confirmed(`benchmarks/evals/backend-system-design-roi-pilot.md:1-10,38-40,88-116`) |
| E-10 | Related historical PRD was not located in the bounded current-worktree inventory. | unknown outside current worktree; no claim that approved authority never existed |
| E-11 | Every supplied external URL was read; BMAD listing/current-upstream distinction remains material. | confirmed(source links and provenance above); exact historical ExplainX revision unknown |
| E-12 | Screenshots contain a high-load diagram but not the skill body or capacity evidence. | confirmed(user-supplied screenshots); throughput/token-savings efficacy unknown |
| E-13 | Targeted refinement will improve actual model decisions or efficiency. | assumed; requires independent behavioral comparison before a measured claim |
| E-14 | No canonical product ledger for this slug was located; unrelated marketing ledger is not reused. | unknown outside bounded current-worktree search; no product IDs minted |

## Delivery Context, Stakeholders And Cost-Benefit

- First-slice surfaces: architect specialist trigger/body, estimation applicability, principles' evolution rule, supported system-design guide entry, generated routing/exports as required by existing tooling. Exact files and ownership are finalized by `plan-feature`; no generated index is hand-maintained.
- Handoff owner: requesting maintainer; next accountable role: planning lead. Content owners retain separate files; reviewer must be independent. No worker may silently redesign surrounding contracts.
- Expected benefit: clearer routing and fewer contradictions. Cost: bounded content maintenance, generated-output checks and scenario review. Monetary cost, development duration and model savings are not estimated from this research.
- Future evaluation recovery: locate the approved source revision and dispatch authority referenced by the existing backend ROI pilot before extending that initiative. Do not create a competing benchmark because the referenced PRD is absent locally.
- Glossary: system-design facilitator = whole-session lead; architect specialist = bounded component/flow designer; architecture guard = implementation/diff reviewer; design evidence = documented mechanism, not operational proof; semantic evaluation = behavioral judgment, not keyword coverage.

### Risks And Mitigations

| Risk | Mitigation | Owner |
| --- | --- | --- |
| Role keyword routes whole-system work to an overly narrow specialist. | Test discovery with role/scope distinctions and retain facilitator ownership. | Planning lead |
| Relaxed applicability excuses missing material inputs. | Include both sufficient non-backend and genuinely underspecified backend cases; block only consequential missing constraints. | Independent reviewer |
| New guide duplicates/stales normative rules. | Link to existing owners; keep normative changes in their canonical skills. | Registry maintainer |
| Examples become benchmark answer keys. | Separate authors and held-out graders; freeze candidate sources before evaluation. | Evaluation owner |
| External material creates false security/performance confidence. | No borrowed code/hooks; retain provenance and unknowns; require claim-appropriate evidence. | Independent reviewer |

## Verification And PM Handoff Checklist

Completed during intake:
- [x] Read project architecture and relevant standards; inspect both supplied screenshots.
- [x] Account for all five external references and follow directory provenance.
- [x] Inspect exact conflicting local instructions rather than infer absent capabilities.
- [x] Exercise real MCP keyword discovery: `system architect` → no match.
- [x] Exercise category discovery: `system-design` → installed, no guide body.
- [x] Inspect existing prepared evaluation contract without executing models or reading its held-out packet.
- [x] Run MCP compliance audit; obtain cost report. Audit proves consultation, not behavior or enforcement.

Pending after brief approval:
- [ ] `plan-feature` defines canonical REQ/AC ownership and runnable slices for the first increment only.
- [ ] Resolve supported guide convention and recover prior approved evaluation authority where relevant.
- [ ] Select existing regression coverage before adding scenarios. Keep public teaching cases separate from held-out judgment.
- [ ] Verify routing through actual MCP consumer calls; verify selected behavior independently. Repository regression command discovered: `rtk pnpm test:evals` (NOT RUN during intake).
- [ ] Verify canonical-to-export routing/resource parity if publication enters the approved scope.
- [ ] Obtain human approval for the implementation approach before multi-task edits; brief approval alone does not select inline execution or authorize spend.

No application code or skill behavior was changed; tests/build/lint and model efficacy evaluation were NOT RUN and are not required proof of this research artifact. No formal score of the screenshot architecture was issued.

## Approval

`approval: approved(requesting maintainer, 2026-11-07)`. Recorded from the operator's “Ok” response to the presented brief. Approval accepts this direction contract only. It does not authorize implementation, paid evaluation, premium advice, merging, publication or runtime exposure.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-system-architecture-skill-evolution-20261107",
  "slug": "system-architecture-skill-evolution",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-07T06:18:28Z",
  "completed_at": "2026-11-07T06:28:28Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-ARCH-01"],
    "requirements": ["REQ-ARCH-01", "REQ-ARCH-02", "REQ-ARCH-03", "REQ-ARCH-04"],
    "acceptance_criteria": ["AC-ARCH-01", "AC-ARCH-02", "AC-ARCH-03", "AC-ARCH-04", "AC-ARCH-05", "AC-ARCH-06", "AC-ARCH-07", "AC-ARCH-08"],
    "srs": []
  },
  "completed_evidence": ["E-01", "E-02", "E-03", "E-04", "E-05", "E-06", "E-07", "E-08", "E-09", "E-11", "E-12"],
  "missing_evidence": ["Historical BMAD listing revision", "Prior evaluation PRD/dispatch authority outside current inventory", "Measured model-behavior baseline and candidate comparison", "Actual user frequency and cost of observed gaps"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable"},
  "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

`requirements_ready` means the research contract can enter planning after approval, not that implementation or operations are ready. Requirement IDs above are trace seeds, not separately approved PRD records.

## Open Questions

No research-blocking question remains. The requesting maintainer approved targeted refinement (Option A). Exact historical source revision and real efficacy remain evidence limitations, not reasons to invent authority or delay the reachable consistency work.

## Next Workflow

`plan-feature`, with brief approval recorded, scoped first to discovery and instruction consistency. Later teaching/evaluation slices remain candidate work, not silently bundled implementation.

## Cost Report

`get_session_cost(workflow="brainstorm-feature", slug="system-architecture-skill-evolution", outcome="requirements_ready")` was called. MCP reported 6 unique skill bodies, 10 body returns and 1 workflow body at capture; direct reads/native task activity are not a complete MCP cost ledger. Host input/output/cached/reasoning usage, pricing and total monetary cost were unavailable. No savings or complete task-cost claim is made.
