# Brief: Prove and Improve Agent Skills Effectiveness

slug: skill-system-effectiveness
operator_profile: hybrid
lane: both
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-05)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=1 C=2 total=5 tier=high. Cross-component assessment includes routing, evidence and trust boundaries; no implementation or host-policy change is authorized. Capability hint does not authorize premium spend. Research used two bounded read-only scouts; host token/pricing coverage is unavailable.

## Contract

**Outcome:** Determine whether agent-skills-standard meets the supplied article's operational goals, identify evidence-backed improvement opportunities, and explain benefits to maintainers and users without treating design coverage as demonstrated effectiveness.

**You said:** Compare the current design and situation with the article; identify where improvement is worthwhile and what both maintainers and users gain.

**I assumed:** Preserve the portable registry/CLI/consumer-host boundary; use the article as a capability framework, not a requirement for eight new services. Default sponsor, BA/handoff owner and decision-maker: requesting maintainer. Default validation owner: maintainer-designated independent evaluator. These roles are proposed, not organizational appointments.

**Constraints:** Reuse existing evaluation, metrics, pilot and learning mechanisms. Separate source capability, observed runtime behavior and measured value. Retain negative/incomplete results. Unknown costs remain unknown. No new generic harness, paid evaluation, runtime exposure or policy activation under this brief.

**Non-goals:** Rewrite the architecture; expand the skill catalog; certify every host; audit every skill; change security enforcement; automatically promote feedback into policy; claim the article's illustrative token savings as this project's ROI.

### Acceptance criteria and requirement trace seed

- **BRD-OBJ-001 → REQ-001 → AC-001:** Map all eight article layers to repository evidence and state whether each claim is design, implemented source, observed runtime, or measured outcome.
- **BRD-OBJ-001 → REQ-002 → AC-002:** Give a qualified good-enough verdict, with report dates, evaluated populations and limitations; do not merge different report populations.
- **BRD-OBJ-002 → REQ-003 → AC-003:** Rank improvement opportunities with maintainer benefit, user benefit, cost/risk and a measurable validation method; benefits not measured remain hypotheses.
- **BRD-OBJ-002 → REQ-004 → AC-004:** Define the first bounded slice using existing pilot/measurement contracts; identify owner, decision gate and missing evidence without reopening approved unrelated work.
- **BRD-OBJ-002 → REQ-005 → AC-005:** Save this pending brief, preserve approval boundaries, and route empirical value hypotheses to validate-product before any efficacy claim.

These are candidate PRD links, not a second editable definition of existing pilot requirements. Existing pilot AC-ROI-12/13/14 remain owned by their cited authority.

## Why

**Business objective:** Users should receive consistently useful, appropriately controlled work; maintainers should know which skills and changes improve accepted outcomes rather than only increasing catalog size or structural scores.

**Users:** Skill consumers, contributing skill authors, maintainers/reviewers, and host integration owners.

**AS-IS:** There are concrete mechanisms for all eight layers, transcript evaluations and explicit delivery-observation accounting. Published evidence does not establish complete real-task effectiveness, complete host enforcement, or attributable labor/cost savings.

**TO-BE:** Maintainers can identify exactly what is supported, on which revision/host, with what evidence; users can distinguish tested capabilities from unverified promises. Changes are adopted based on comparable accepted-task outcomes and safety checks.

**SMART metric — proposed defaults:**

1. BRD-OBJ-001: Within 10 working days after brief approval, the requesting maintainer and validation owner produce one reviewed evidence-readiness decision covering all eight layers and every claim proposed for a selected pilot. Target: 100% of those claims have an evidence scope or explicit unknown, and zero unsupported efficacy/savings claims. This is a documentation decision window, not a spend or execution commitment.
2. BRD-OBJ-002: If a separately authorized diagnostic is selected, retain the existing backend/system-design pilot hypothesis: at least 20% lower median human review/rework minutes versus current AGS, no accepted-task-rate regression, and no observed critical invariant violation. Baseline is not yet measured; window defaults to 30 days after separate pilot authorization and prerequisite readiness. Report counts, dispersion and incomplete attempts. A small diagnostic cannot establish safety or statistical significance.

First-pass acceptance, correction rounds, human review minutes, material revisions and human edit count are distinct. Do not substitute one for another. A target is not a result.

## Capability Inventory and Evidence

The following map establishes source/design coverage, not end-to-end certification. `confirmed(path)` means the cited artifact supports the stated scoped claim.

| Capability / article layer | Current evidence and status | Qualification |
| --- | --- | --- |
| Distribute skills / Library | confirmed(ARCHITECTURE.md:7-25; cli/src/services/SkillSyncService.ts:329-372) | Registry → CLI → local consumer; installation does not prove use. |
| Select skills / Trigger | confirmed(mcp/src/services/SkillIndex.ts:152-239) | File/phrase matching and composite expansion; host invocation still matters. |
| Execute procedures / Procedure | confirmed(skills/common/common-subagent-driven-development/SKILL.md:31-96) | Explicit workflow and repair steps; instructions are not an orchestration security boundary. |
| Load context / Resources | confirmed(cli/src/services/SkillSyncService.ts:634-640; mcp/src/tools/index.ts:972-995) | References/scripts/assets distributed; loading SKILL.md does not prove linked resources were read. |
| Compute deterministically / Scripts | confirmed(skills/common/common-subagent-driven-development/scripts/task_brief.py:343-397,757-796) | Concrete contract/hash checks when invoked; invocation not observed here. |
| Verify completion / Checks | confirmed(mcp/src/tools/index.ts:435-465; scripts/evals/verify.ts:65-139) | Consultation evidence and immutable transcript replay exist; neither proves a real task succeeded. |
| Bound actions / Guard | confirmed(cli/src/services/HookService.ts:189-248; docs/agent-capabilities.md:5-16) | Narrow opt-in hook controls, bypass and fail-open paths; listed native delegation dispatch remains not_verified. This matrix concerns delegation, not a blanket verdict on all host features. |
| Improve methods / Learn | confirmed(skills/common/common-session-retrospective/SKILL.md:35-61; mcp/src/retrospective/run.ts:850-881) | Consent/evidence-gated proposals; adoption requires separate authorization and review, not automatic self-training. |

### Outcome and evidence ledger

| Claim | Status |
| --- | --- |
| All eight article concepts have existing counterparts; a missing-layer rewrite is not justified by this bounded assessment. | confirmed(paths in capability map); adequacy of every individual skill is unknown. |
| Report generated 2026-10-23 covers 265 skills / 22 categories; 113/265 strict release-ready, 133/265 outcome-ready, 226/265 activation-ready; catalog NOT READY. | confirmed(evals-report.md:3-30); report population, not current full-catalog certification. |
| Baseline 42%, with-skill 72%, reported improvement 30 percentage points; trigger recall 99.62%, specificity 94.14%. | confirmed(evals-report.md:23-29); transcript assertions and description-only activation, not real-task acceptance. |
| Aggregate protocol provenance is unknown with 227 unresolved contributors; tool-free execution is unverified. | confirmed(evals-report.md:4,16-18,32); cannot certify protocol-specific aggregate comparisons. |
| Structural benchmark covers 288 skills, 9.8/10 average and synthetic token baselines. | confirmed(benchmark-report.md:5-33); rubric saturation and population/date differences prevent an efficacy or ROI conclusion. |
| First-pass acceptance, correction rounds, review effort and coverage-aware task cost have existing calculators. | confirmed(scripts/metrics/delivery.ts:554-574,627-645,708-754,894-960); observed improvements are unknown. |
| Published task economics are unavailable/withheld without per-attempt usage. | confirmed(evals-report.md:923-950); absence of evidence is not absence of accounting capability. |
| Existing backend/system-design ROI pilot is prepared, not executed; executable L3 lane is explicitly blocked pending approved design. | confirmed(benchmarks/evals/backend-system-design-roi-pilot.md:1-10,127-156,271-285). |
| Existing evidence-led-marketing work already requires comparable measurement and stopped an incomplete evaluation. | confirmed(docs/srs/srs-task-list-evidence-led-marketing.md:3-7,43-50,67-81); do not duplicate/restart that initiative through this brief. |
| Mounted MCP returned a deduplicated omitted skill body, contrary to current source's full-body contract. | confirmed(this session's load_skills_for_files response; ARCHITECTURE.md:58-66); cause/deployed revision unknown; tool QA report filed. Not proof current source is defective. |
| Metrics smoke succeeded. | unknown / NOT RUN successfully: attempted `rtk proxy pnpm metrics:report --json`; exited 1 because tsx and node_modules are absent. No report result or passing check claimed. |
| Better evidence, targeted remediation and reviewed learning will reduce user rework and maintenance waste. | assumed; validate with comparable accepted-task, review/rework and full-cost observations. |

No canonical docs/product/skill-system-effectiveness/evidence.json was identified in the inspected product directory. The adjacent evidence-led-marketing ledger belongs to a different initiative and is not duplicated or treated as approval here. Existing pilot documents cite upstream PRD authority absent from this checkout's discovered BRD/PRD paths; recover the exact authority before execution rather than inventing replacement approval.

## Options And Recommendation

| Option | Assumption / first failure | Worst case / cost to abandon | Decision |
| --- | --- | --- | --- |
| Keep architecture; qualify evidence for one existing pilot, then fix demonstrated gaps | Existing mechanisms can answer the selected question; fails if no comparable inputs or authorized execution lane | No efficacy conclusion; bounded analysis and no runtime mutation | Recommended: cheapest to abandon and avoids duplicate infrastructure. |
| Rebuild around eight layers or add a new generic evaluation platform | Existing architecture is fundamentally missing required capabilities; current evidence does not establish this | Duplicate systems, migration and maintenance without value proof; high abandonment cost | Reject for this intake. |
| Defer improvements and keep current reporting caveats | No immediate evidence decision is needed; fails when users require stronger guarantees | User value remains unproven; low immediate cost | Legitimate alternative, but does not resolve the user's confidence question. |

### Prioritized opportunities and benefits

| Priority | Improvement direction | Maintainer benefit (hypothesis unless noted) | User benefit (hypothesis) | Validation / tradeoff |
| --- | --- | --- | --- | --- |
| P0 | Qualify one existing pilot's provenance, baseline, independent oracle and runtime-lane readiness before new claims | Avoid optimizing saturated scores or funding incomparable runs | More credible capability and value claims | Use frozen comparable arms and existing pilot controls; preserve blocked/unverified lanes. Adds evidence/review effort, not guaranteed ROI. |
| P1 | Remediate weak outcome/activation cases, including near-miss negatives, using existing scorer controls | Focus work on observed failures, not more skills | Fewer incorrect activations and less corrective work | Compare same-protocol held-out cases and eventual accepted-task outcomes; do not equate specificity with production precision. |
| P1 | Verify selected host/source/runtime parity and clearly label advisory versus enforced controls | Easier integration diagnosis; fewer false guarantees | Predictable permissions and instruction delivery | Establish deployed version/revision, returned-body identity and live host controls. Host-specific upkeep; no global fail-closed policy proposed. |
| P2 | Close recurring-failure → reviewed change → held-out check loop using existing retrospective | Reuse lessons without policy churn | Fewer repeated mistakes | Track recurrence and human corrections; explicit consent and independent review before promotion. Avoid turning one-off preferences into permanent rules. |
| P2 | Measure context and total cost per accepted task rather than SKILL.md size alone | Identify unnecessary loads and expensive repair paths | Lower cost/latency only if confirmed without quality loss | Include index/body/resources, parent/workers/review/retries and human minutes; incomplete prices/coverage remain unknown. |

## Standard And Deep Sections

### First slice and scope fence

This initiative spans evidence quality, routing, host integration, learning and economics. Brainstorm only the first slice now: **qualify one existing backend/system-design ROI pilot's evidence readiness**. Other opportunities are candidates, not approved parallel implementation tasks.

First-slice outputs: link original authority; map revision/protocol/oracle evidence; record which lanes are runnable; identify the specific L3 design prerequisite; define baseline/measurement completeness; issue a go/defer/no-build recommendation. Reuse the existing pilot and delivery-observation format. No candidate sandbox design, model run, skill edit or new metric store in this slice. The explicitly missing L3 capability must not be hidden by presenting transcript replay as executable validation.

### Stakeholders, risks and cost-benefit

| Stakeholder / owner | Responsibility / impact |
| --- | --- |
| Requesting maintainer (proposed sponsor and handoff owner) | Approve scope, select pilot and identify accountable evaluator; no dates/spend committed by agent. |
| Independent evaluator (maintainer-designated) | Verify comparability and judge held-out outcomes without author-owned oracle leakage. |
| Host integration owner | Establish selected runtime identity and actual control behavior before support claims. |
| Skill authors and consumers | Supply recurring failure examples with consent; receive clearer reliability limits. |

| Risk | Mitigation | Owner |
| --- | --- | --- |
| Transcript/structure scores sold as task efficacy | Keep evidence lanes and populations separate; no unsupported ROI | Validation owner |
| New work duplicates existing approved pilot/SRS | Link exact authority and preserve its scope/consent boundaries | Handoff owner |
| Missing L3 or authority silently bypassed | Keep affected lane unverified; return explicit prerequisite for design/approval | Handoff owner |
| Feedback introduces brittle or unsafe permanent rules | Proposal-only default, held-out checks and independent review | Maintainer |
| Incomplete telemetry creates false savings | Require complete actor coverage and known rates; report minutes separately | Validation owner |

Benefits are expected, not monetized. Costs include evaluator effort, human review and any separately approved model/runtime diagnostic. No numeric financial benefit or budget is established.

**Glossary:** activation = selecting a skill; transcript assertion = judging retained answer content; executable efficacy = observing task behavior; first-pass acceptance = accepted on attempt one; host enforcement = runtime control, not prompt text; ROI = attributable value net of complete comparable costs.

### PM handoff checklist

- [x] Outcome, scope fence, non-goals and eight-layer evidence map recorded.
- [x] Existing mechanisms and overlapping pilot/SRS work identified.
- [x] Negative evidence, report limitations and missing runtime proof retained.
- [x] Candidate objective → REQ → AC trace seed recorded.
- [x] Human brief approval received; proposed sponsor role and maintainer-designated evaluator arrangement accepted. Independent evaluator identity still requires designation before validation.
- [ ] Recover exact existing pilot authority/frozen revision before any execution planning.
- [ ] Pre-register comparable baseline, rubric and acceptance/measurement window with evaluator.
- [ ] Obtain separate authorization for model spend, candidate execution and any host changes.

Stakeholder validation: requesting maintainer may approve or correct this draft in this conversation. Proposed remote review window: two working days after circulation; silence is not approval.

## Approval

Approved by the requesting maintainer on 2026-11-05 through the explicit reply “ok” to this brief's approval request. Approval includes the proposed owner arrangement, conditional metric and first-slice scope fence only. It confers no budget, pilot execution, deployment, publication, merge or runtime-exposure authority. No implementation approach is selected; present the execution gate if later planning creates a multi-task implementation plan.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-skill-system-effectiveness-20261105T075014Z",
  "slug": "skill-system-effectiveness",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "approval": "approved(requesting maintainer, 2026-11-05)",
  "started_at": "2026-11-05T07:50:14.534Z",
  "completed_at": "2026-11-05T07:54:10.803Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001", "BRD-OBJ-002"],
    "requirements": ["REQ-001", "REQ-002", "REQ-003", "REQ-004", "REQ-005"],
    "acceptance_criteria": ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005"],
    "srs": []
  },
  "completed_evidence": ["eight-layer source map", "published report scope and limitations", "existing pilot and measurement overlap", "failed local metrics smoke recorded"],
  "missing_evidence": ["comparable real-task baseline and benefit", "selected host runtime proof", "pilot upstream authority in this checkout", "runnable approved L3 lane", "complete host usage and prices"],
  "decision_needed": [],
  "recommended_next_workflow": "validate-product",
  "cost": {"source": "unavailable"},
  "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

requirements_ready records the completed intake. Human approval is recorded separately above; empirical validation and implementation readiness remain unproven.

## Open Questions

The requesting maintainer accepted the first slice, proposed owner arrangement and conditional metric. Independent evaluator designation, current catalog-wide efficacy, deployment parity and actual savings remain unresolved prerequisites for the affected validation work, not blockers to this approved brief.

## Next Workflow

Route to validate-product for the critical value hypothesis, reusing the existing pilot contract. Then plan-feature for only the evidence-backed selected improvements. validate-product is installed; empirical execution still needs its own authority and prerequisites.

## Validation Readiness Assessment — 2026-11-05

Status: `proposal_only`; delivery remains `requirements_ready`; value hypothesis remains unvalidated. This assessment reconciles earlier checkout-only unknowns; it does not replace original pilot approvals.

- **Recovered authority:** Git object `4acc21f4d:docs/prd/prd-backend-system-design-roi-improvement.md` records accepted/frozen guidance and completed T6 repository integration, but explicitly leaves T7 unauthorized. Historical pilot AC-ROI-12/13/14 correspond to that PRD's canonical AC-012/013/014; do not create duplicate requirements.
- **Recovered freeze:** `4acc21f4d:artifacts/backend-system-design-roi-improvement/evidence/reviews/accepted-source-freeze.json` identifies baseline `92d06c420f6a41f08e11579423e4e3eacdb7880d` and ten accepted source hashes. These were inspected, not all recomputed against current source.
- **Verified current packet:** Node parsed three cases (ROI-PAY-01, ROI-TEN-01, ROI-OVL-01); current SHA-256 `5fcd1f4bcc7ff439cb950afa65be0d50f5421776911585237ef1e65f4861f0d7` equals the retained `4acc21f4d:artifacts/backend-system-design-roi-improvement/evidence/reviews/T5-acceptance-review.md` packet digest. Packet status is `prepared_sealed_not_executed`; its own provenance limits it to semi-blind evidence.
- **Unrecovered artifact:** original `.agent/sdd/backend-system-design-roi-improvement/lead-dispatch-contract.md` was absent locally and produced no entries in the inspected all-ref path history. This is a precise retrieval gap, not proof it never existed.
- **Capability preflight:** Node v26.0.0 available. `.skillsrc:12-16` explicitly includes only business-requirements and requirements from product-management. `product-management/product-evidence excluded; opt in at a reviewed ref and sync`. `product-management/product-investment not installed; opt in at a reviewed ref and sync`. `product-management/product-experimentation not installed; opt in at a reviewed ref and sync`. MCP bodies and canonical source resources exist but do not establish installed executable packages. No automatic sync/configuration change was made.
- **Validation not performed:** initiative evidence ledger is absent; no current scoped learning/experiment authorization, exact MET query/baseline bindings or complete experiment bounds are retained for this initiative. No ledger validator or financial calculator was invoked with fabricated inputs.
- **Hypothesis:** improved AGS reduces median human review/rework minutes by at least 20% versus baseline AGS without accepted-task-rate regression or observed critical invariant violation. No result observed.
- **Method reused:** existing three cases × three arms × three independent repetitions = 27 diagnostic attempts; same model/tools/limits, randomized order, independent blinded grading, body-only stratum. No new sample size, scorer or harness is authorized.
- **Decision rules proposed:** success requires at least 20% review/rework reduction, no acceptance-rate regression and zero observed critical violations; complete comparable evidence below those targets fails the hypothesis for this diagnostic. Missing/confounded inputs, absent human review data or unverified runtime lanes yield inconclusive, not a pass. Small-sample limitations remain.
- **Bounds now:** budget cap `null`, permitted model attempts `0`, live-user exposure cap `0`, no activation; no execution window is authorized. A prospective experiment must freeze finite start/end instants, currency, non-null budget cap, scoped account/model/effort/concurrency, usage coverage and authenticated stop controls before execution. Stop on invariant breach, contamination, missing required telemetry, expiry or cap exhaustion; no automatic retry/expansion.
- **Lane readiness:** retained lexical/semantic preparation and documentary calibration are available; current dependencies are absent, no new L1/L2 run was performed, and L3 candidate execution remains unavailable under the pilot's explicit design gap.
- **Recommendation:** defer pilot execution; preserve accepted guidance. Next decision is whether to authorize bounded L3 design and readiness packaging (not its implementation or pilot spend), or defer empirical work. Design must retain candidate-owned behavior rather than grading a substitute implementation.
- **Routing:** recommended next workflow `null` while `AUTHORIZATION_REQUIRED`; after a scoped readiness/design decision, resume validation planning. Supported results still require separate investment/host authority before delivery commitment.
- **Verification and limits:** executed Node version and read-only packet/hash/resource inspection; recovered Git history without checkout changes. No models, candidate execution, build, tests, generators, release or exposure. The delegated lookup returned a usage-limit error and supplied no findings; retained evidence above was inspected directly.

## Cost Report

Called get_session_cost(workflow="brainstorm-feature", slug="skill-system-effectiveness"). Host-wide input/cached/output/reasoning usage, complete actor coverage and prices were not exposed; total token usage and monetary cost are unavailable. MCP counts describe only its shared process-local ledger, not isolated worker usage or total task cost. Mounted dedup/savings estimates conflict with current source's full-body-delivery contract and are not adopted as savings evidence.
