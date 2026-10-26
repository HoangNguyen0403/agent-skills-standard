# Backend and System-Design ROI Improvement Plan

Date: 2026-10-26
Slug: backend-system-design-roi-improvement
Status: T1–T3 canonical guidance and T5 source bindings accepted/frozen 2026-10-26; T6 local generation, corrected four-host index coverage, guarded integration, preservation verification, no-model gates and actual consumer route-row smoke are complete. Independent T6 review APPROVED for repository distribution integration only. The final 54-entry manifest is independently confirmed at SHA-256 `7a4ff8030f6cda575803c0a53a90eddbe1495cbf240f124e34662191d1779c8d`. Index regeneration was a stage-only workaround; the current runtime writer lifecycle may preserve unowned stale indices and was not changed. No semantic efficacy, ROI, human acceptance, T7 or release claim.
Execution approach: Subagent-Driven, as requested; do not ask the approach again.
Accountable owner: repository maintainer (requesting operator).
Engineering/integration owner: dispatching lead. Validation owner: independent reviewer assigned by lead.
Profile: technical; lane: direction.
SNC for proposed delivery: S=2 N=1 C=2 total=5 tier=high (guidance affects security, money and correctness); this document does not authorize production changes.

## 1. Contract and business outcomes

As an AGS maintainer, I want bounded, independently verifiable improvements to backend/system-design skills so that agents prevent expensive engineering failures without loading unnecessary instructions.

- OBJ-ROI-01: improve safe decisions on payment ambiguity, tenant isolation and overload; no observed critical invariant violation in the accepted pilot scope.
- OBJ-ROI-02: demonstrate lower review/rework effort without reducing accepted-task rate. Proposed target: at least 20% lower median review/rework minutes than current AGS, evaluated at the first authorized pilot acceptance review. This is a hypothesis, not a promised saving.
- OBJ-ROI-03: keep incremental context and maintenance costs visible; prefer additions to existing references over new broad skills.
- Planning deliverable: a single copyable dispatch contract, owned tasks, dependencies, ACs, evidence requirements and explicit blocked/deferred work.
- Implementation deliverable: revised canonical guidance and discriminating evaluations, safe publication, and separately authorized outcome evidence. Documentation completion is not efficacy completion.

No production service, Terraform deployment, new evaluation platform, scorer API change, provider-policy change, automatic commit/push, premium call or release is authorized here.

## 2. Evidence and relationship to existing work

| Claim | Evidence status |
| --- | --- |
| Structural report gives 9.8/10 across 288 skills; rubric is saturated | confirmed: [benchmark-report](../../benchmark-report.md), generated 2026-09-23; not a behavior score |
| Historical transcript cases average 42% baseline versus 72% with skills | confirmed: [evals-report](../../evals-report.md), generated 2026-10-23; relevant category partitions dated 2026-07-14 |
| Current system-design semantic efficacy and real-world savings are not established by those figures | confirmed: report qualifications and [existing PRD](prd-system-design-professionalization.md) §8 |
| Production scenarios and changed-constraint variants already exist | confirmed: [held-out packet](../../benchmarks/evals/system-design-professionalization-heldout.json); fixture presence is not execution evidence |
| Specialized retrieval, AI-budget and durable-runtime guidance is incomplete | assessment from bounded canonical-source lookup; validate the exact missing mechanisms before editing |
| These improvements will reduce review effort | assumed; test OBJ-ROI-02, do not promote to realized ROI |

This plan is an incremental backlog, not a replacement for `prd-system-design-professionalization.md`. Preserve its REQ/AC IDs, G0/G1 approvals, and separate G2 evaluation/G3 acceptance/G4 release gates. New IDs below are namespaced to avoid collision. Do not revive completed work or overwrite another worker's changes.

The existing PRD both records Personal standard-profile authorization and retains an unresolved domain-classification entry. The lead must reconcile that contradiction from authoritative approval evidence before dispatch, not infer authorization from a public repository. The old 11-skill selection omits building-blocks and integration-patterns; it is not an adequate selection for this change.

## 3. Capability scope and requirements

All requirements below are proposed, owned by the indicated worker, accountable to the maintainer. P0/P1 are ordering priorities, not production incident classifications.

| Requirement | Objective | Capability / intended outcome | Priority / owner | Delivery disposition |
| --- | --- | --- | --- | --- |
| REQ-ROI-01 | 01–03 | Freeze a trustworthy baseline and map existing approved work | P0 / T0 | First prerequisite |
| REQ-ROI-02 | 01 | Reason about load balancing, overload, shutdown and failure capacity | P0 / T1 | Core pilot scope |
| REQ-ROI-03 | 01 | Preserve tenant authority through retrieval and derived copies | P0 / T2 | Core pilot scope |
| REQ-ROI-04 | 01 | Preserve external-effect invariants through retries, events and durable workflows | P0 / T3 | Core pilot scope |
| REQ-ROI-05 | 02–03 | Bound AI-gateway spending and semantic-cache reuse | P1 / T4 | Conditional expansion after core pilot |
| REQ-ROI-06 | 01–03 | Evaluate mechanisms independently of vocabulary matching | P0 / T5 | Core and expansion variants |
| REQ-ROI-07 | 03 | Publish canonical changes without evidence loss or duplicate rule ownership | P0 / T6 | After independent review |
| REQ-ROI-08 | 01–03 | Measure outcome uplift, review effort and full task cost | P0 / T7 | Separately authorized pilot |

### Disposition of all supplied reference topics

- Load-balancer article: T1 covers algorithm trade-offs, L4/L7, health, failover capacity, TLS, sessions, mesh retry ownership and DNS limitations. Anycast/BGP operational deep dive remains BACKLOG-ROI-01.
- High-concurrency HTTP and streaming: T1 covers admission, buffers, cancellation, reconnect and draining; no arbitrary 10k-connection performance claim.
- Tenant hybrid search: T2 covers authorization and data lifecycle; engine-specific BM25/vector relevance tuning remains BACKLOG-ROI-02.
- Event-sourced orders, durable onboarding and webhooks: T3 covers operation identity, outbox/inbox, replay, persistent state, compensation and ambiguous outcomes. No claim of a complete Temporal implementation.
- AI gateway: T4, conditional; PII/auth and tracing are cross-cutting invariants referenced by T1–T4, not duplicated skill packages.
- Queue autoscaling and distributed rate limiting: T1 covers downstream ceilings, queue age/drain, atomic budget ownership and explicit partition/overshoot trade-offs. KEDA/provider recipes remain BACKLOG-ROI-03.
- Chaos: T5 uses bounded synthetic adverse scenarios; deployable chaos tooling remains BACKLOG-ROI-04.
- FinOps: T7 measures task economics; production chargeback dashboards remain BACKLOG-ROI-05.
- Architecture teardowns: T5/T7 retain decisions, counterexamples and benchmark evidence; public publication remains BACKLOG-ROI-06.
- Ephemeral IaC provisioning remains BACKLOG-ROI-07; no existing operational package was established by the lookup.

Backlog entries are owned by the maintainer, not silently dropped or assigned to workers. Activation requires observed project demand or pilot failure evidence and a new bounded brief. No external ticket is asserted to exist.

## 4. Shared contracts and permission gates

### Canonical ownership

- Flow/tenant authority: `system-design-data-architecture`.
- Traffic, caches, gateways and limiter selection: `system-design-building-blocks`.
- Recovery, overload and operational budgets: `system-design-resilience-ops`.
- External effects and workflow orchestration: `system-design-integration-patterns`, referencing existing principles/idempotency contracts.
- Generic LLM security, observability, estimation and communication guidance are dependencies, not duplicate homes for new rules.
- Every advice change uses: constraint -> decision -> adverse timeline -> invariant -> verification -> cost/reversal trigger. Reject universal product recipes unsupported by constraints.
- Keep skill bodies concise and route advanced mechanics into references. Report before/after body tokens and expected loaded-reference footprint; no claimed savings from size alone.

### Authorization truth table

| Condition | Allowed | Not allowed |
| --- | --- | --- |
| Plan requested, implementation not approved | Deliver this plan and source-grounded checks | Implement T0–T7 |
| Plan approved and eligible account/profile resolved | T0, then authorized source/eval work and no-model checks | Paid model eval, cloud fault injection, deployment |
| Exact pilot packet approved | T7 within approved account/model/effort/scope/concurrency/budget/expiry | Automatic expansion or premium fallback |
| Pilot fails or evidence incomplete | Report failed/unknown scope, propose bounded repair | Claim efficacy, savings or readiness |
| Human accepts repository changes | Preserve evidence and prepare release request | Release without separate authorization |

Profile discovery must run before first implementation delegation. Apply the current host routing policy, copying selected profile settings exactly; skill examples do not override account eligibility. Resolve conflicting profile notes before use. Research/review uses eligible analysis profiles, not the implementation ladder. No premium profile is scheduled.

Workers must not spawn agents, edit outside ownership, run generators, modify policies or mutate historical evidence. They load applicable skills themselves. Each returns one correction-ready report; the lead applies the configured correction/fallback policy, not an invented retry loop.

## 5. Delegation tasks

All new files named below are proposed outputs. Existing source files must be re-read at dispatch. Task evidence lives under `.agent/sdd/backend-system-design-roi-improvement/` after implementation authorization; that directory is not created by this planning task. Use a preserved external/ignored evidence snapshot before any generator that can touch it.

### T0 — Freeze baseline and resolve overlap

Owner: one eligible analysis worker; no canonical source edits. Size S, confidence medium. Depends on: implementation approval and eligible account resolution.

Inputs: this plan, existing professionalization PRD, root reports, current canonical skills, existing held-out packet and skill selection.

Steps:
1. Map current source revision, uncommitted user changes and active task ownership. Do not assume the historical nine tasks are incomplete.
2. Record hashes of canonical inputs, reports and existing evaluation artifacts in `baseline-manifest.json`; retain retrievable original bytes for the current-AGS arm without reverting user changes.
3. Produce `overlap-map.md`: each T1–T4 mechanism is existing/correct, missing, contradictory or already owned. Existing/correct work is verified and reused, not rewritten.
4. Produce `dispatch-locks.json` with exact per-task paths and shared-file locks. Resolve overlap with active work before dispatch.

AC-ROI-00: Given the current checkout, when the baseline is frozen, then every selected current-AGS input can be retrieved with its recorded hash.
AC-ROI-01: Given existing professionalization work, when tasks are dispatched, then no source path has concurrent implementation owners.

Return baseline manifest, overlap decisions, exact source inventory and approval contradiction resolution evidence. Do not run models.

### T1 — Harden traffic and overload decisions

Owner: traffic/resilience worker. Size M, confidence high. Depends on T0. Can run with T2, T3 and the independent T5 rubric preparation.

Exclusive source ownership:
- `skills/system-design/system-design-building-blocks/SKILL.md`
- `skills/system-design/system-design-building-blocks/references/building-blocks.md`
- `skills/system-design/system-design-resilience-ops/SKILL.md`
- `skills/system-design/system-design-resilience-ops/references/reliability-operations.md`

Steps: qualify least-connections versus request cost/multiplexing; distinguish readiness/liveness and shared-dependency outages; cover passive/active detection, recovery and draining; derive residual capacity after failure; connect admission limits, deadlines, retry ownership, stream buffers and downstream pool ceilings. Include TLS trust boundaries and DNS cache limits without prescribing global infrastructure. Replace blanket gateway fail-through advice with explicit availability versus auth/quota correctness boundaries. Limiter guidance must name atomic authority and partition behavior rather than promising globally exact quotas unconditionally.

AC-ROI-02: Given a failed instance or zone, when remaining capacity cannot carry admitted demand, then guidance requires bounded degradation/admission rather than claiming HA from instance count.
AC-ROI-03: Given an optional shared-dependency outage, when readiness is evaluated, then guidance distinguishes serviceable degraded requests from fleet-wide ejection.
AC-ROI-04: Given a slow/disconnected streaming client, when buffering or draining reaches its bound, then guidance specifies a finite termination/recovery contract.

Return exact rule changes, worked synthetic adverse timelines, primary-source citations and candidate public evaluation prompts. Do not edit eval JSON or shared metadata.

### T2 — Harden tenant-safe retrieval and data lifecycle

Owner: data/tenant worker. Size M, confidence medium. Depends on T0; parallel with T1/T3.

Exclusive source ownership:
- `skills/system-design/system-design-data-architecture/SKILL.md`
- `skills/system-design/system-design-data-architecture/references/flow-contracts.md`
- New `skills/system-design/system-design-data-architecture/references/tenant-safe-retrieval.md`

Steps: extend the existing authority contract rather than fork it. Carry authenticated tenant scope through source queries, vector/lexical retrieval, reranking, caches, async jobs and deletion. Explain privileged DB-role/RLS bypass risk, pooled-context reset and authorization of derived results. Distinguish retrieval relevance from authorization. Reference generic security guidance; no application-specific RLS migration or new search engine.

AC-ROI-05: Given tenant-scoped source records, when a derived retrieval/cache/job path is designed, then its output remains constrained by authenticated tenant authority.
AC-ROI-06: Given revoked/deleted source data, when derived copies remain, then guidance specifies their authorization/invalidation lifecycle instead of asserting deletion is complete at the source alone.

Return a source-to-derived-copy boundary table, one cross-tenant counterexample and one deletion/revocation counterexample, citations and candidate public prompts. No changes to framework-specific auth code.

### T3 — Harden durable effects and reconciliation

Owner: integration/workflow worker. Size M, confidence high. Depends on T0; parallel with T1/T2.

Exclusive source ownership:
- `skills/system-design/system-design-integration-patterns/SKILL.md`
- `skills/system-design/system-design-integration-patterns/references/integration-patterns.md`
- New `skills/system-design/system-design-integration-patterns/references/durable-execution.md`

Read-only contract: `skills/system-design/system-design-principles/references/idempotency-contract.md`.

Steps: reuse operation-identity/outbox/inbox rules; distinguish event ID from business-operation ID; model unknown external outcomes, reconciliation, replay and compensation. Extend durable guidance with timers, activity cancellation/heartbeat, replay determinism, and running-workflow version compatibility. Replace fixed step-count or universal compensation rules only where they contradict constraint-driven selection. Distinguish broker delivery from external business effects.

AC-ROI-07: Given a provider timeout after possible commit, when recovery is designed, then the outcome remains unknown/queryable until reconciled rather than blindly repeating the effect.
AC-ROI-08: Given replay or crash recovery, when a business operation resumes, then the effect identity remains stable.
AC-ROI-09: Given an in-flight workflow version change, when code is upgraded, then guidance requires a compatible replay/migration strategy rather than assuming old executions restart safely.

Return adverse timelines for lost reply, duplicate event, crash/replay and version change; citations and public prompt candidates. Do not alter the canonical idempotency contract without an explicit lead-assigned follow-on lock.

### T4 — Bound AI-gateway economics and semantic reuse

Owner: gateway worker. Size M, confidence medium. Depends on accepted T1 and core-pilot decision; conditional expansion, not part of the first three-scenario pilot.

Exclusive source ownership during this later wave:
- `skills/system-design/system-design-building-blocks/SKILL.md` (ownership transfers from T1)
- New `skills/system-design/system-design-building-blocks/references/ai-gateway-contracts.md`

Read generic LLM security and estimation guidance. Define tenant/auth/model/prompt/tool-policy cache identity, freshness and unsuitable semantic-cache cases; define reserve/execute/settle/release budget transitions including concurrency, retries, cancellation and ambiguous provider billing. Fallback must preserve data/account eligibility, required capabilities and total budget. Do not build a provider SDK or change host billing policy.

AC-ROI-10: Given semantically similar prompts under different authority, when a cache is consulted, then similarity alone cannot authorize result reuse.
AC-ROI-11: Given concurrent requests and uncertain provider billing, when spend is admitted, then reservations and uncertainty prevent silently exceeding the declared budget policy.

Return state/decision tables and counterexamples. Activate only when core evidence or a named project demonstrates need; otherwise retain conditional status without claiming completion.

### T5 — Own evaluation contracts and challenge cases

Owner: evaluation worker, separate from content authors. Size M, confidence medium. Depends on T0 for independent rubric preparation; source binding waits for accepted T1–T3, and T4 if activated.

Exclusive ownership:
- `evals/evals.json` under each changed skill package from T1–T4.
- New `benchmarks/evals/backend-system-design-roi-skills.txt`.
- New `benchmarks/evals/backend-system-design-roi-heldout.json`.
- New `benchmarks/evals/backend-system-design-roi-pilot.md`.

Preserve existing professionalization fixtures and all historical runs unchanged. Reuse their concepts with provenance; previously visible examples are regression cases, not blind held-out evidence. New held-out variants must not be given to content authors before the candidate freezes.

Steps:
1. Select exactly changed skills plus justified governing dependencies; explicitly include building-blocks and integration-patterns. No blind reuse of the old selection.
2. Prepare core payment, tenant and overload cases, each with base/adverse/changed-constraint conditions and consumer-visible hard failures. Optional T4 cases are a separately priced expansion.
3. Keep lexical routing/assertion tests distinct from semantic grading and executable checks. Reject answer-anchor padding and synonym-only fixes.
4. Freeze prompts, rubric, run inputs, context-delivery modes and hashes before model execution. Compare no-AGS/current-AGS/improved-AGS under the same model, tools and resource limits; distinguish body-only from reference-inclusive context.
5. Define three independent repetitions per core case/arm (27 task attempts), randomized arm order and blinded grading. Record this as a diagnostic pilot, not a statistically conclusive deployment claim. Price reviewers/retries/integration separately before approval.
6. Specify executable verification against generated candidate behavior: duplicate-effect count after replay, cross-tenant result denial, and finite admission/buffer/drain behavior. A toy harness written by the grader is not proof the generated candidate works.

AC-ROI-12: Given an answer containing all expected vocabulary but an unsafe mechanism, when independently graded, then it fails the appropriate hard invariant.
AC-ROI-13: Given semantically correct alternate wording, when graded, then it is not rejected solely for absent phrases.
AC-ROI-14: Given historical fixtures and results, when new cases are prepared, then their original bytes and provenance remain unchanged.

Do not invent a scorer/schema extension. If current tooling cannot execute candidate artifacts with the required isolation, return a bounded technical-design gap to the lead before T7. Complete semantic/lexical lanes independently; runtime efficacy remains unverified until an approved executable lane exists.

### T6 — Integrate, validate and publish repository artifacts

Owner: one integration worker; independent review remains separate. Size M, confidence medium. Depends on accepted source tasks and T5. Repeat only affected checks if T4 later activates.

Exclusive ownership: changed-package metadata, generated mirrors/indexes, necessary existing changelog/documentation entries and integration receipts. Lead locks exact shared paths from the T0 inventory before dispatch; no blanket permission to edit unrelated docs. No version bump or release by default.

Steps: resolve cross-skill contradictions; verify reference routing and no duplicate ownership; record token deltas; run the no-model suite below once after worker edits settle; snapshot SDD evidence before generators and verify preservation afterward. Follow generator/evidence-preservation skills. Prefer isolated generation and allowlisted copy-back. Never hand-edit mirrors or overwrite root historical score reports with unrun claims.

AC-ROI-15: Given the integrated source set, when validation and publication complete, then every changed package is selected and every generated change is attributable to that source set.
AC-ROI-16: Given preserved evidence, when generators finish, then baseline and historical evidence hashes are unchanged.

Return exact command/exit/output receipts, changed files, preservation manifest, token deltas, independent review disposition and remaining failures. Pre-existing unrelated failures are reported separately, never silently repaired or relabeled PASS.

### T7 — Run authorized pilot and recommend adoption

Owner: lead coordinates eligible execution workers and independent graders; maintainer owns spend and acceptance. Size M, confidence low until executable-lane feasibility is resolved. Depends on T6, T5 lane readiness and exact paid-pilot authorization.

Outputs: new immutable run/evidence artifacts through existing tools and `pilot-results.md` in the SDD evidence workspace. Never mutate the baseline or old transcripts to improve scores.

Measure each arm's accepted-task count, invariant failures, human review/rework minutes, wall time, all actor/attempt usage and priced cost. Missing usage is unknown, not zero. If human reviewers are unavailable, label agent-review time separately and leave the human-effort hypothesis unvalidated.

AC-ROI-17: Given a failed, retried, cancelled or rejected attempt, when task cost is calculated, then its incurred cost remains included.
AC-ROI-18: Given missing execution/usage evidence, when reporting readiness or savings, then the unsupported result is explicitly withheld.
AC-ROI-19: Given comparable pilot arms, when recommending adoption, then critical failures, accepted-task rate, review effort and total cost are reported separately rather than collapsed into a structural score.

Adoption target: no observed critical invariant violations, no accepted-task-rate regression, and at least 20% lower median human review/rework minutes versus current AGS. Show sample counts/dispersion; do not imply a small pilot proves safety. Monetary acceptance also requires a maintainer-approved cost ceiling; no numerical spend ceiling is invented here. Failed targets trigger a bounded corrective brief, not automatic rollout or T4 activation.

## 6. Execution graph, reviews and estimates

| Wave | Work | Parallelism / gate |
| --- | --- | --- |
| 0 | Account/plan gates, T0 | Lead resolves permission; no source edits before baseline |
| 1 | T1, T2, T3; T5 independent rubric preparation | Four bounded owners; content authors cannot see sealed variants |
| 2 | Independent reviews; T5 source binding and case finalization | Reviewer must not be the implementer; correction stays within owned paths |
| 3 | T6 | Single shared-file/generator owner; integrated review before pilot |
| 4 | T7 | Separately authorized execution and human acceptance |
| 5 | T4 if activated, then affected T5/T6/T7 work | Explicit expansion, new input snapshot and budget approval |

Overall core scope: L, medium confidence; no delivery-date or monetary estimate promised. T4/backlog do not block completion of the approved core slice, but must remain visibly conditional/deferred. No standalone expert agents for every article topic.

RACI: maintainer A for scope/account/spend/acceptance/release; lead R for contracts, dispatch and integration; workers R for owned output; independent reviewer R for findings and AC review; human reviewer R for measured human-effort data. Backend/security expertise is consulted for T2/T3; frontend/mobile are not delivery owners in this backend-guidance scope.

## 7. Verification commands and evidence levels

These commands exist in the inspected package/docs. They are planned, not executed by this document. Workers skip mid-flight build/lint/tests/formatters; the integration owner runs the consolidated checks once edits settle.

- `rtk pnpm --filter ./cli validate:all`
- `rtk pnpm audit:skills`
- `rtk pnpm audit:keywords`
- `rtk pnpm check-alignment`
- `rtk pnpm evals:preflight -- --skills-file benchmarks/evals/backend-system-design-roi-skills.txt`
- `rtk pnpm test:evals`
- `rtk pnpm docs:capabilities:check` after authorized generation when relevant.
- `rtk pnpm evals:verify -- --run <physical-run-id>` only for an actual retained run.

`rtk pnpm generate-indices` and `rtk pnpm docs:capabilities` are writes reserved to T6 after preservation setup. Preflight/report tooling may also write artifacts. `evals:baseline` without `--plan` can execute model workers and is prohibited before the paid gate. Do not treat `docs:scan` as a general Markdown-link checker.

Manual semantic checks: T1 failure capacity/shared-dependency/stream cleanup; T2 cross-tenant and revocation paths; T3 ambiguous payment/replay/versioning; T4 conditional cache/spend boundaries. Independent grading and actual executable candidate checks remain separate from `test:evals`, which tests eval tooling rather than production competence.

## 8. Economics and decision record

Cost per accepted task = total incurred cohort cost / accepted tasks. If zero tasks are accepted, report undefined/no accepted output, never zero cost. Include parent, workers, reviewers, integration and failed attempts. Compare equivalent work and context-delivery modes.

Realized ROI = (measured labor savings + measured operating savings - improvement cost) / improvement cost. Improvement cost includes authoring, validation and maintenance. Labor pricing needs an explicit approved rate; absent rates permit time reporting only. Speculative incident avoidance stays a separately labeled risk hypothesis. Do not double-count review-time savings already included in task costs.

Decisions: extend existing owners; prioritize three failure classes; preserve old evidence; measure before expanding; defer operational product builds. Articles motivate cases but primary vendor/protocol documentation must support precise operational claims.

## 9. Copyable worker dispatch contract

Send the following with one selected task section and the shared contracts; never just send the original chat:

> Project: agent-skills-standard. Authorized workspace: the current approved worktree identified by the lead; do not switch repositories. Role: execute Tn only, with no delegation. Read AGENTS.md and load applicable project skills. Read this plan §§1–4, your complete Tn brief, and the T0 baseline/ownership records. Modify only your locked files; do not revert unrelated changes. Preserve existing approvals, IDs, fixtures and historical evidence. No models/cloud/production access, generators, commit/push or release unless your brief explicitly authorizes that operation. Do not run build/lint/tests/formatters mid-flight. Report material design/permission gaps to the lead while completing independent safe work. Return changed paths, AC-by-AC status, evidence or planned verification clearly labeled, primary sources, risks, and a correction-ready summary. An implementation claim without evidence is not DONE.

Review dispatch adds: read-only, independent of the implementer, inspect the exact changed revision, challenge the hard-failure cases and return blocking findings with file/line evidence. Do not award acceptance based on wording matches or supply human approval.

## 10. Handoff status and open gates

- Planning: complete; core implementation approval received for T0–T3, T5 and T6.
- Approach: Subagent-Driven selected by this request; no redundant approach question.
- G-ROI-0: core implementation scope approved; this does not authorize paid evaluation, release, deployment or commit/push.
- G-ROI-1: project/account eligibility and T0 baseline/ownership are resolved; accepted T1–T3 sources are frozen.
- G-ROI-2: NOT VERIFIED; exact T7 account/model/effort/concurrency/cases/actors/budget/expiry authorization and executable-lane feasibility remain outstanding.
- G-ROI-3: T1–T3 and T5 independent reviews approve; T6 scoped independent review APPROVES repository distribution integration only. Human acceptance and release remain separate gates.
- G-ROI-4: T4/backlog activation is not authorized and requires a separate decision.
- T5: revision 4 binding and independent acceptance review APPROVE; eight artifact hashes are frozen. Canonical eval files remain T5-owned and are excluded only from generated mirrors.
- T6: initial independent integration review returned CHANGES REQUESTED (F1 index coverage, F2 audit provenance). Corrections and affected-only verification are recorded in durable T6 evidence; corrected category indices bind all 13 skill IDs/138 trigger keywords, and the captured consumer index hash proves all four selected route rows. The staged re-generation is an integration workaround, not a runtime ownership fix; the original 9-row cause remains unproven. Independent review APPROVED for repository distribution integration only; final 54-entry manifest digest confirmation is recorded in the review notification. No semantic efficacy or release claim.
- T7: not authorized; no model run, semantic efficacy or realized savings claim.

Next workflow: separately secure human acceptance, exact T7 authorization and executable-lane readiness before any paid pilot decision. T4 activation and release remain unauthorized.

Changelog: 2026-10-27 — recorded T6 F1/F2 corrections and independent scoped APPROVE for repository distribution integration only; the final 54-entry manifest digest was confirmed. Initial failures remain preserved; semantic efficacy, ROI, paid pilot, human acceptance and release remain unverified.

