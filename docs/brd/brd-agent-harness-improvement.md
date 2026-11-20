# Brief: Evidence-Backed Agent Harness Improvement

lane: direction; snc_tier: high; approval: approved(requesting operator, 2026-11-06)

- Slug: `agent-harness-improvement`
- Operator profile: technical; delivery mode: extended; capability hint: strong, not premium authorization.
- SNC: S=2 N=2 C=2 total=6. Cross-product routing and trust boundaries justify Deep discovery; this document changes no runtime controls.
- Sponsor, decision-maker, validation owner, and handoff owner: requesting operator, proposed default. Product planning owner: operator-designated maintainer of the first slice.
- Repository status: discovery brief saved. Activation status: not_required.
- Evidence snapshot: 2026-11-06; agent-skills-standard source/package version 2.7.4; installed Paseo 0.8.0; installed OMP 18.16.0. OMP public source tag v18.16.0, tree SHA `650f3a108229ee11bf68ba3377f4e8c3391cd424`. Public documentation is mutable and may exceed installed behavior.

## Contract

**Outcome:** choose a defensible first investment in the existing harness across Paseo, OMP, and agent-skills-standard, with evidence-qualified current state, leverage, expected value, tradeoffs, and falsifiable acceptance criteria. Do not treat architecture diagrams or instruction quality scores as proof of safety or ROI.

**You said:** investigate the supplied articles/images deeply, compare our current situation, and identify what to leverage and the ROI/tradeoffs of improvement.

**I assumed:** personal/open-source research; no implementation, deployment, paid experiment, policy activation, premium consultation, credential access, or cross-client data movement is authorized. Original article URLs were not provided; screenshot statements are evaluated against primary sources without inventing authorship.

**Constraints:** reuse existing lifecycle, authorization, routing, telemetry, and evaluation mechanisms. Keep host-specific enforcement out of portable skill policy. Separate source implementation, installed configuration, observed execution, and actual denial. Preserve unknowns. No production or real-user exposure. Brief approval is not runtime or expenditure authority.

**Non-goals:** replacing either agent runtime; building a new memory database, semantic cache, scheduler, pricing service, or orchestration framework; globally enforcing every prose rule; changing model profiles/accounts; implementing all candidate slices together.

### Acceptance criteria for the recommended first slice

These are proposed downstream requirements, not claims that this discovery implemented them. Upstream reference-only criteria; formal declarations reside in the canonical PRD requirements table (see [editorial identity mapping](../../artifacts/agent-harness-improvement/trace-repair-20261107/identity-mapping.md)).

| Criterion | Observable acceptance |
| --- | --- |
| Criterion AC-001 | A version/revision-bound capability record identifies the owner, entrypoint, configuration evidence, and support status for intent/assignment, model/account authorization, context, tools, recovery, verification, and economics. Unknown and unsupported remain distinct. |
| Criterion AC-002 | A dispatch-surface inventory covers Paseo creation, model/settings updates, CLI launches, schedules/heartbeats, and OMP-native workers. Each states which control is reused and which remains unverified; no launch route inherits a safety claim solely from another route. |
| Criterion AC-003 | Every promoted enforcement claim has retained allowed/denied execution evidence at its actual boundary. Include missing/expired approval and wrong-project/account cases where the claimed control covers them. Prompt compliance, serialized configuration, synthetic fixtures, and credential availability cannot promote a claim to live enforcement. No real premium request is needed or authorized by this brief. |
| Criterion AC-004 | One bounded non-sensitive task can be traced from assignment through completion notification and independent acceptance using existing IDs/receipts. Cancelled/timed-out attempts remain non-completed. Recovery evidence identifies what is persisted and what must be revalidated. |
| Criterion AC-005 | The same task's accounting declares expected actors, including parent, workers, review, repairs, failures, and cancellations. Missing usage/prices remain unavailable; API money, subscription quota, tokens, cache activity, and elapsed time remain separate. |
| Criterion AC-006 | The recommendation names evidenced gaps, no-change findings, and a stop/defer result when added controls or optimization cannot be justified. No second runtime or telemetry store is introduced merely to complete the baseline. |

## Why / Value Rationale

**Problem hypothesis:** policy and capability exist at several layers, but evidence is not sufficient to infer an end-to-end enforced or economically superior system. The danger is both underestimating existing controls and assuming instructions prove stronger guarantees than they provide.

**AS-IS:** substantial portable standards, native runtime controls, and orchestration surfaces; uneven integration/denial evidence and incomplete comparable full-task economics.

**TO-BE:** operators can tell what is enforced, by which owner, for which revision, and at what observed total task cost before approving additional investment.

**Objective ID**: BRD-OBJ-001

**Objective BRD-OBJ-001 → candidate REQ-001 → AC-001–006:** within 14 calendar days of separately authorized first-slice execution, classify all seven capability areas and every listed dispatch surface, retain evidence for every promoted support claim, and produce one complete task/acceptance/accounting walkthrough. Owner: validation owner. This is a proposed SMART target, not a delivery commitment.

**Optimization hypothesis, not validated ROI:** after baseline establishment, test one change at a time. A proposed decision threshold is at least 10% lower median active operator handling time per accepted task, with no observed acceptance or safety regression. Baseline, sample sufficiency, variance, review labor, and exposure/budget limits must be precommitted in `validate-product`; 10% is a decision target, not a prediction. Reject monetary savings claims without comparable complete actor coverage and resolved prices.

## Article Investigation

The architecture diagram is a useful responsibility checklist, not an implementation specification. Its numbered order is not sufficient: authorize before each effect, revalidate changed arguments, and verify the result. Human approval needs explicit scope and identity; a confidence score alone does not establish permission. Retries after external side effects require idempotency/reconciliation, not blind replay. Offline evaluation can propose policy changes, not authorize automatic privilege changes.

| Supplied theme | Primary-source finding | Implication |
| --- | --- | --- |
| Concrete rather than vague instructions | Anthropic recommends concrete, verifiable instructions and project-specific information [S1, S2]. This is guidance, not a universal percentage gain. | Keep exact commands, domain constraints, and non-obvious gotchas; move mechanically checkable rules to existing tools where appropriate. |
| Instruction rot and pruning | Official guidance recommends removing outdated/conflicting or readily discoverable information [S1, S2]. The screenshot's particular 79/100 tool result is not independently verified. | Review deletion/replacement as well as addition; score retained rules by applicability and outcomes, not line growth. |
| Under 200 lines / “1%” | Under 200 lines per CLAUDE.md is a recommendation [S1], not a universal hard limit. The screenshot's “1% of the picture” is rhetoric about the whole setup, not an empirically established context-budget fraction. | Minimize always-loaded content, but do not delete necessary safeguards to satisfy an arbitrary percentage. Imports still consume context. |
| ETH −3% / +20% headline | Original v1 [S3a] contains the −3% introductory headline; revised v3 [S3b] reports average generated-file resolution decreases of 0.5% and 2%, neither statistically significant, and average cost increases of 20% and 23% on SWE-bench Lite and CTXbench. Developer files outperform generated files but do not significantly outperform no files in that revision. | Pin the paper revision. Neither “instructions always hurt” nor “our skills save 20%” follows. Python issue-resolution benchmarks do not measure our full delivery lifecycle. |
| Cache invalidation | Claude documentation describes model/effort-sensitive cache behavior, including top-level effort changes [S4]. Scope varies by model/provider and cache layer. | Record cache reads/writes and actual route identity. Avoid mid-session switching by default, but measure rather than imposing a cross-provider myth. |
| Worktrees, plan mode, rewind | Worktrees separate checkout edits, not credentials/process/network access [S5]. Permission mode matters [S2]. Checkpointing cannot transactionally undo arbitrary shell/external effects [S6]. | Use worktrees for collision avoidance; separate permissions/sandboxing and external recovery contracts. |
| Commands/skills and deprecated commands | Official changelog records merged commands/skills, `/vim` removal while retaining editor-mode configuration, and removal of ultraplan [S8]. These are Claude-version facts, not Paseo/OMP requirements. | Follow installed adapters rather than copying another runtime's command list. |
| Subscription pricing | Screenshot quotes $20 monthly / $17 annual-equivalent Pro pricing; this investigation did not independently resolve current subscription pricing. API/cache prices are not subscription prices. | Do not use those rates to price our task savings or infer quota. |
| Learning roadmap | Models → tools → loop → context → memory → reliability → evals → orchestration is educational sequencing, not proof that more agents or memory are necessary. Long-running harness evidence emphasizes progress state and real verification [S7]. | Evaluate from the first baseline; add orchestration only for useful isolation, independence, or latency. |

## Current Situation: Capability Inventory

Status vocabulary: **implemented** = source evidence; **observed** = exercised read-only behavior; **unverified** = no end-to-end proof here. None of these is interchangeable with absence.

| Capability (verb–object) | Paseo | OMP | agent-skills-standard / reuse |
| --- | --- | --- | --- |
| Capture intent and assign work | Workspace/agent IDs, caller identity, notifications and profiles are exposed; create_agent execution was observed in this research. | Native task surfaces exist; exact assignment transfer still needs boundary evidence. | Validated standalone assignment packets, seven lifecycle operations and independent acceptance contracts already exist [E1, E6]. Reuse, do not invent another task format. |
| Authorize models and actions | Installed create handler forwards provider/settings/caller identity, not a named profile ID [E8]. Profile notes are selection guidance, not proof of account/premium authorization. | Native per-call model grants exclude project settings as granting authority and intersect operator/live allowlists [E7]. Approval deny/prompt controls exist but are not OS containment [S9]. | Advisory policy checker and optional blocking hooks exist. No project rules were in force in this checkout; installed Codex hook is reminder-only [E2–E4]. No cross-route premium gate was verified. |
| Supply context and memory | Provides runtime placement/system context; no claim of a second memory engine. | Compaction, persisted session context, memory backends and recovery are documented at v18.16.0 [S10–S12]; upstream default-off memory does not imply local memory is off. | Tier-aware skill routing and full-body/digest accounting exist. Consultation does not prove worker receipt, comprehension, or enforcement [E1]. |
| Route and isolate work | Profiles copy provider/model/mode/effort settings; managed workspaces/worktrees and lifecycle already exist. | Native task/eval/workpool model selection has source-level grants [E7]. | Per-slice placement/capability guidance and host-specific capability records exist [E1, E5, E6]. Host routes still require separate authorization. |
| Recover and stop work | Notifications and lifecycle APIs exist; integrated cancellation across owners not exercised. | Versioned recovery contract covers retry classification, backoff/cancellation and unsafe-replay boundaries [S12]. | Receipts distinguish cancel/timeout from completion. Existing retrospective and pruning tools are not automatic instruction adoption [E1, E6]. |
| Observe cost and outcomes | Activity/snapshots exist; aggregate billing across native workers is unverified. | Installed help exposes stats/bench and cost/time controls; documented cost ceiling permits in-flight overshoot [E9]. | SessionJournal/task economics can account for missing actors; synthetic/partial prices cannot establish savings [E1]. No new ledger required before testing existing integration. |
| Verify accepted outcomes | Lifecycle completion does not itself prove acceptance. | Native tools/runtime capabilities do not prove a task's correctness. | Existing evals, qualification, audits and independent review contracts; current committed report is transcript-assertion evidence, not executable-task success [E5, E10]. |

### Concrete local findings

- `ags --version` returned 2.7.4; installed help exposes verify, audit, doctor, hooks, evals and policy commands.
- `ags hooks status` reports Claude, Codex and Copilot hooks installed. This does not prove those hosts invoke them, or that OMP invokes any of them.
- `ags policy status` returned `(no rules in force)`; built-in protections are conditional on enforce-mode installation.
- Directly running the installed Codex hook with a synthetic Write event emitted the skill-loader reminder and exited successfully. No file was edited. This proves that hook's reminder behavior only, not runtime interception or denial.
- Canonical hook generation includes optional blocking, `AGS_POLICY_BYPASS`, and fail-open exception handling [E3]; the installed Codex hook [E4] is the simpler advisory variant. Treat generated source, installed bytes and invoked behavior separately.
- The dated eval report has 265 covered skills, 113 strict release-ready, unresolved protocol contributors, and NOT READY catalog/outcome/activation statuses [E10]. Its 42% baseline / 72% with-skill aggregate is not a measured engineering productivity gain.
- Structural benchmark reports 9.8/10 average and 96% of skills ≥9/10, explicitly warning of rubric saturation and synthetic baselines [E11]. Improve behavioral evidence rather than pursuing a higher structural score.
- Architecture references `docs/validation/context-aware-delegation-protocol.md` and related artifacts that were not present in this checkout's inspected paths. Their absence here does not prove absence on other branches; do not cite them as current executable evidence.

## Options And Recommendation

### A. Reuse and qualify existing harness controls — recommended

First deliver the bounded assurance baseline (AC-001–006). Then authorize only corrections backed by actual gaps. Assumption: current owner boundaries can be observed without creating a second runtime. First failure condition: acceptance traces cannot be collected through supported interfaces. Worst plausible case: instrumentation/authority gaps prevent comparison; report unverified and stop promotion. Cost to abandon: retain a useful capability inventory and evidence without runtime migration.

### B. Build a unified control plane now — defer

One global gate/ledger could simplify reasoning, but it risks duplicating OMP grants, Paseo lifecycle, and existing accounting while leaving CLI/nested/scheduled paths uncovered. Load-bearing assumption: all dispatch owners can share authenticated authority and complete usage. First failure: one reachable route bypasses that boundary. Worst case: false safety plus migration/maintenance burden. Cost to abandon: high because of coupled adapters/state migration. Reconsider only after baseline identifies a genuine shared gap; commercial replacement/buy options were not evaluated and have no justified procurement recommendation here.

### C. Keep current behavior; no runtime build — legitimate fallback

Maintain existing controls and correct only unsupported claims/docs. Assumption: current risk and operator rework are acceptable. First failure: a demonstrated policy escape or material operational incident. Worst case: continued rework or safety exposure. Cost to abandon: low. Prefer this over speculative caching/routing work if the baseline cannot demonstrate a worthwhile benefit.

## Opportunity Backlog And Tradeoffs

Only slice 1 is shaped for handoff. The rest are candidate investments, not approved plans or automatic dependencies.

| Order / slice | Leverage / owner | Expected value hypothesis | Tradeoff and confidence |
| --- | --- | --- | --- |
| 1. Qualify harness assurance | Reuse capability qualification, assignment receipts, live runtime IDs and SessionJournal; joint runtime/standards maintainers | Prevent duplicate engineering and false guarantees; establish where optimization can be measured | Low irreversibility; moderate evidence work; high confidence in reuse, unknown realized financial return |
| 2. Close demonstrated authorization gaps | Runtime-owned project/account/scope grants; reuse OMP operator-authority distinction and Paseo caller identity | Avoid unauthorized account or premium dispatch; fewer human interventions | Potentially high avoided-loss value, but low frequency and severity data are unknown. Fail-closed outages and cross-route integration are real costs. Security review and explicit authority required |
| 3. Prune instruction overhead | Existing routing/freshness/feedback; standards owner | Less irrelevant context, fewer conflicting rules and redundant discovery calls | Likely broad applicability, unmeasured size of benefit. Over-pruning can remove rare safety knowledge; use paired outcomes, reversible changes and human adoption |
| 4. Strengthen recovery/acceptance handoff | Existing packets/checkpoints/session state; Paseo + OMP integration owner | Less restart archaeology, fewer duplicate actions and false completion | Additional evidence maintenance; stale checkpoints can mislead. Never interpret worktree/checkpoint rollback as external rollback |
| 5. Tune placement, model and cache | Existing profiles, eligible routes, per-call grants and metering | Reduced total task cost or latency, not necessarily both | Cheap-worker repair/review and cache churn can exceed savings. Native vs Paseo actor accounting must be complete first |
| Defer semantic result caching | No verified current need; runtime/data owner if later justified | Reuse repeated safe retrievals | ACL, project isolation, freshness, invalidation and poisoning risks; do not cache authorization decisions or assume prompt caching solves result validity |

### Ownership Boundary

- **Paseo:** project/workspace identity, launch/update/scheduling integration, caller context, lifecycle and user-facing approval/status surfaces.
- **OMP:** native dispatch/model grants, execution-time tool approval, context/recovery, native usage and stop behavior.
- **agent-skills-standard:** portable policies/contracts, standards delivery, evidence validation, reproducible evals and truthful reporting. It must not claim to authenticate human grants or sandbox other runtimes.
- These are recommended responsibility boundaries, not a claim that an integrated enforcement protocol is already deployed.

## ROI And Measurement

No realized monetary ROI is established. Current source/docs establish mechanisms, not comparable outcome/cost baselines.

For a comparable cohort, measure:

- **Primary proposed value metric:** active operator handling minutes per independently accepted task; include corrections, review, recovery and failure handling.
- **Technical diagnostics:** acceptance/escaped-defect rate, false-completion rate, restart time, denied-action coverage, relevant/irrelevant skill loads, cache reads/writes, worker repair frequency and p50/p95 elapsed time.
- **Cost:** sum all parent/worker/reviewer/failed/cancelled attempts; report missing actors and token categories; keep subscription quota separate from API spend. Fewer tokens or faster completion alone is not financial ROI.
- **Recurring net value:** accepted-task volume × (handling time avoided × approved value of time + measured comparable runtime-cost reduction) − maintenance cost.
- **Payback:** one-time implementation/validation cost ÷ positive recurring net value. If value is non-positive or prices/coverage unresolved, payback is unavailable—not zero.
- **Risk value:** separately estimate event frequency × impact reduction only with defensible incident evidence. Do not monetize “zero incidents observed” as eliminated risk.

Use matched tasks, frozen requirements/runtime/model configuration, independent acceptance, and one changed variable per comparison. Count setup, review, failures, cache writes and maintenance. Do not change routing, instructions and effort in the same treatment and attribute the result to one factor. Small cohorts are directional evidence, not causal certainty; report per-task regressions and inconclusive outcomes.

## Evidence Ledger

No canonical `docs/product/agent-harness-improvement/evidence.json` was found in the inspected product inventory; no strategy/OPP/DEC/MET IDs are minted or duplicated. E/S labels below are document-local citations, not product-authority records.

| ID | Claim / evidence | Status |
| --- | --- | --- |
| E1 | Routing, consultation limits, lifecycle/economics and publication boundaries: [ARCHITECTURE.md](../../ARCHITECTURE.md), especially lines 28–66, 151–182 and ADR-021 | confirmed(ARCHITECTURE.md); referenced external/absent artifacts are not independently confirmed |
| E2 | Installed CLI version/help, hook status and empty project policy inventory | confirmed(read-only command observations in this discovery; version 2.7.4) |
| E3 | Cooperative bypass/block/fail-open hook source | confirmed(cli/src/services/HookService.ts:201–248) |
| E4 | Installed advisory-only Codex loader and direct reminder execution | confirmed(.codex/hooks/preedit-skill-loader.js:1–64); OMP interception unknown |
| E5 | Host/surface/revision support qualification | confirmed(docs/agent-capabilities.md; scripts/harness-smoke/qualification.ts); live host dispatch support generally not_verified in the committed matrix |
| E6 | Assignment and independent acceptance contracts | confirmed(skills/common/common-subagent-driven-development/SKILL.md; its scripts/task_brief.py and references/progress-receipts.md); execution authority remains host-owned |
| E7 | OMP native operator-owned model grant implementation | confirmed(https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/model-approval.ts); live denial not exercised |
| E8 | Paseo forwards provider/settings and caller identity, without named profile ID at this handler | confirmed(installed @getpaseo/server/dist/server/server/agent/tools/paseo-tools.js:1033–1078); downstream deployment-wide premium/account gate unknown |
| E9 | Runtime version/help smoke | confirmed(research-worker command observations: Paseo 0.8.0, OMP 18.16.0, both --help); budget/cancel behavior not exercised |
| E10 | Committed transcript-assertion metrics and limits | confirmed(evals-report.md:1–32); dated historical report, not a fresh eval |
| E11 | Structural rubric saturation and synthetic savings bands | confirmed(benchmark-report.md:3–33); no behavioral/monetary inference |
| A1 | Operator handling overhead is material enough to justify optimization | assumed; validation owner measures baseline before investment |
| A2 | Current cross-runtime actor accounting can be completed without a new store | assumed; runtime maintainers verify supported IDs/exports during slice 1 |
| U1 | Immutable, cross-route project/account/premium authorization in this deployment | unknown; runtime maintainers supply actual dispatch/denial evidence |
| U2 | Full-task cost, subscription quota, acceptance rate and recovery baseline | unknown; no current ROI calculation is supportable |
| U3 | Original screenshot article identity and current subscription price | unknown; does not block technical discovery |

### Primary Sources

- S1: [Claude instructions/memory](https://code.claude.com/docs/en/memory).
- S2: [Claude best practices](https://code.claude.com/docs/en/best-practices).
- S3a: [Original context-file study v1](https://arxiv.org/html/2602.11988v1); S3b: [revised study v3](https://arxiv.org/html/2602.11988v3). v3 evaluates 300 SWE-bench Lite tasks and 138 CTXbench tasks with four agent/model pairings; limited external validity for our current multi-runtime workflows.
- S4: [Claude prompt-cache behavior/pricing](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
- S5: [Claude worktrees](https://code.claude.com/docs/en/worktrees).
- S6: [Claude checkpointing](https://code.claude.com/docs/en/checkpointing).
- S7: [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents).
- S8: [Official Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).
- S9: [OMP v18.16.0 approval contract](https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/approval-mode.md).
- S10: [OMP v18.16.0 compaction](https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/compaction.md).
- S11: [OMP v18.16.0 memory](https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/memory.md).
- S12: [OMP v18.16.0 recovery](https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/non-compaction-retry-policy.md).
- S13: [Paseo profiles](https://paseo.sh/docs/agent-profiles.md); [Paseo worktrees](https://paseo.sh/docs/worktrees.md). Mutable public documentation is corroboration, not installed-version execution proof.

## Delivery Context, Risks And Handoff

| Stakeholder / owner | Responsibility and risk mitigation |
| --- | --- |
| Requesting operator | Approves scope and proposed SMART target; separately authorizes any spend, sensitive test or activation. Supplies acceptance or corrections asynchronously before planning approval. |
| Paseo maintainer | Owns launch/update/schedule boundary evidence; prevents a tool-only check being misrepresented as all-route authorization. |
| OMP maintainer | Preserves native operator grants, provider identity, retry side-effect safety and cancellation semantics. |
| Standards maintainer | Keeps policies portable and instructions scoped; removes false/duplicate claims without deleting necessary safety constraints. |
| Independent verifier | Checks allowed/denied evidence and accepted task results separately from implementation ownership. Required security/architecture review applies before sensitive changes. |

Risk register: false safety claims → boundary-specific evidence (runtime owners); over-pruning → reversible paired checks (standards owner); telemetry privacy → explicit cohort and redacted retained artifacts (validation owner); misleading ROI → complete comparable actor coverage and honest unknowns (validation owner); stale versions/artifacts → bind evidence to installed version/revision and invalidate affected claims after changes (all maintainers).

Glossary: **harness** = surrounding execution/control/evidence system; **cooperative hook** = check removable/bypassable within the user's runtime, not a security boundary; **grant** = scoped authority supplied by a trusted owner, not prompt text; **accepted task** = independently checked outcome, not worker completion; **assurance baseline** = current, revision-bound evidence of actual guarantees and limitations.

### PM Handoff Checklist

- [x] User intent, proposed owner, scope fence, options and no-build alternative recorded.
- [x] Current-state implementation and safe command observations separated from unknown enforcement.
- [x] First-slice acceptance criteria and candidate requirement trace recorded; remaining slices remain backlog only.
- [x] Reuse existing evaluation/accounting/contracts; no new platform commitment.
- [x] Original article uncertainty and paper revision differences preserved.
- [x] Operator approved this brief and proposed first-slice priority on 2026-11-06 with “ok”.
- [ ] Plan owner pins exact implementation revisions/owners and supported verification commands; current source-checkout CLI invocation lacks tsx.
- [ ] Before empirical execution, validate-product establishes authority, data, finite exposure/budget/duration and measurement contract. Product experimentation source and workflow are available; installed executable resources and host authority require their own preflight.
- [ ] Before sensitive code: approved design plus independent architecture/security review. Before activation: separately scoped human authority.

## Verification Performed In Discovery

- Installed `ags --help`, `ags --version`, `ags policy --help`, `ags policy status`, and `ags hooks status`: successful read-only entrypoint observations.
- Direct installed Codex loader with a synthetic Write event: reminder emitted, exit 0, no edit. Not an end-to-end provider hook test.
- Worker observed installed Paseo/OMP version/help: successful; source/tag and installed adapter reviewed. No denial, cancellation, budget exhaustion, or bypass test performed.
- `rtk pnpm --filter ./cli exec tsx src/index.ts --help`: failed with `Command "tsx" not found`, exit 254. No dependencies installed; installed `ags` used for reachable CLI discovery instead. This does not verify source-build parity.
- No code changes, build/lint/tests, paid evals, production changes, or retrospective transcript extraction. No behavioral regression is claimed fixed.

## Approval

Approved by the requesting operator on 2026-11-06 with “ok” in this conversation. Approval covers this discovery brief and its assurance-baseline first-slice direction only. It does not authorize implementation approach, model/account changes, premium calls, experiments, rollout, merge or deployment.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-agent-harness-improvement-20261106",
  "slug": "agent-harness-improvement",
  "workflow": "brainstorm-feature",
  "operator_profile": "technical",
  "lane": "direction",
  "snc_tier": "high",
  "model_tier": "strong",
  "approval": "approved(requesting operator, 2026-11-06)",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-06T15:55:39Z",
  "completed_at": "2026-11-06T16:01:30Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001"],
    "acceptance_criteria": ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005", "AC-006"],
    "srs": []
  },
  "completed_evidence": ["primary-source investigation", "three-product capability inventory", "read-only installed CLI observations", "hook reminder observation", "ROI hypotheses and first-slice contract"],
  "missing_evidence": ["end-to-end cross-route authorization and denial", "complete comparable task economics", "current executable-task benefit evidence"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable", "reason": "complete actor token usage and pricing not exposed"},
  "agent": {"identity": "OMP orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

`requirements_ready` means the contract is approved for planning, not execution. No numeric monetary return is established.

## Open Questions

1. First-slice direction settled: assurance baseline, approved by the operator on 2026-11-06.
2. Baseline usage and authenticated cross-route grants remain evidence tasks owned by runtime/validation maintainers, not questions the operator must answer from memory.

## Next Workflow

`plan-feature`, limited to approved slice 1. Route critical ROI hypotheses to available `validate-product` before authorizing empirical runs; capability/resource/authority gaps block those runs, not proposal drafting. The later authorization, hygiene, recovery and optimization slices require separate evidence-backed scope decisions.

## Cost Report

`get_session_cost(workflow="brainstorm-feature", slug="agent-harness-improvement")` was called. MCP observation at 16:01:30Z: 351 elapsed seconds, 11 unique skill bodies and 13 body returns, estimated 14,529 body-context tokens using chars/4. This process-local ledger includes other actor consultations and excludes direct-file loads; it is not isolated parent telemetry or full actor coverage. Incidental Laravel/Next.js session matches occurred during the scout's keyword routing, illustrating routing overhead without proving its net impact. Exact input/cached/output/reasoning usage, complete actor spend, quota and prices are unavailable; total workflow cost is unavailable. Body-size estimates are not billed tokens or ROI.
