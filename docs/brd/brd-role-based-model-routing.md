# Brief: Role-Based Model Routing With Measured Model Cards

slug: role-based-model-routing
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
approval: approved(requesting maintainer, 2026-11-16)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=2 C=2 total=6 tier=high (inference from repository and host-telemetry reads, not a scouted blast radius). Centrality is 2 because routing decides which provider account receives project data, which is a trust boundary. The capability hint authorizes no premium spend.

Relation to approved briefs: `docs/brd/brd-skill-system-effectiveness.md` owns the ROI pilot and evidence readiness; `docs/brd/brd-skill-model-collaboration.md` owns the content of skills and workflows. Neither is reopened. This brief owns how a delegated slice is matched to a model, and how a model earns or loses that match.

## Decision Card

- **Outcome:** Routing policy names roles, not models. Each role is bound to candidates through one host-owned table. A candidate earns a role through measured observations and an admission test, and loses it the same way. Replacing a model becomes a table change backed by evidence, not a policy rewrite.
- **Recommendation:** Option A, in five slices. Start with slice 1, which records per-dispatch observations (role, model, rounds, review verdicts, acceptance). Every later decision depends on data that is not recorded today.
- **Strongest objection:** Current evidence is observational. It cannot rank models causally, so early routing decisions still rest on judgment.
- **Reversal condition:** After slice 1 has adequate coverage (sample size `unknown`, measure first), if acceptance, total cost per accepted slice and eligibility would not change any routing choice, keep a static role table and stop before slice 3.
- **Scope:** Provider-neutral contracts in this repository: role vocabulary, observation contract, admission protocol and routing rule. Host bindings stay outside this brief.
- **Non-goals:** An automatic per-request router, a new telemetry service, editing live host configuration, and any savings claim.
- **Impact if wrong:** Recording overhead with no routing change. The cost to abandon is the docs, one script and the added observation fields.
- **Decisions:** Decisions 1 and 3 are settled on their recommended defaults. Decision 2 awaits its own host approval. See "Decisions".
- **Approval:** Granted 2026-11-16 for this brief and its slice order. It authorizes planning slice 1 only: no implementation, host configuration change, eval spend or release.

## You Said / I Assumed

**You said:** Gemini is no longer a good choice. The replacement might be DeepSeek or the personal delivery route, but more models need to be supported. Build a theory and a mechanism, not a fixed rule for one provider or model.

**I assumed:**

- The mechanism must work across hosts (Paseo, OMP, other harnesses). This repository holds the provider-neutral contract; host configuration holds the bindings.
- "Support more models" means a new model can be evaluated and admitted without editing policy text or skills.
- The interim choice of a replacement fast implementer is wanted now. It is a host change, so it is approved separately from this brief (Decision 2).
- Owner, approver and validation owner default to the requesting maintainer.
- Success example (agent-proposed): a new model is added to a role's candidate list, replays the admission set, and is promoted or rejected on recorded evidence, with no change to `.agents/workflows/` or `skills/`.
- Anti-goal (agent-proposed): a router that sends project data to a provider account that was never approved for it.

## Contract

**Outcome:** As in the Decision Card.

**Constraints:**

- Eligibility (project, account, data class) filters candidates before any cost or quality rule. A better or cheaper measurement never widens eligibility.
- Host authority keeps precedence, as in `routing-table.md#capability-and-effort-resolution`: explicit configured model, effort, mode and features are preserved, and fallback follows the authorized order. Measured cost only orders candidates the host has already authorized for a role, and only where no explicit setting applies.
- Reuse existing contracts: delivery observations (`scripts/metrics/types.ts`, read by `scripts/metrics/delivery.ts`), the dispatch receipt in `routing-table.md`, and task economics in `ARCHITECTURE.md` §3.3. Build no new service.
- Canonical skills and workflows name roles and capability hints only, with no model, provider, account or profile identifier.
- Cost is a vector: list-price money, subscription quota and wall time stay separate, and unknown stays `unknown`.
- Numeric thresholds (admission margins, sample sizes, window lengths) are `unknown`, proof `measure first`.

**Acceptance criteria:**

1. A role vocabulary with a definition, a capability floor and a default review requirement for each role. (assumed)
2. A per-dispatch observation contract that joins a dispatch to its role, requested capability, actual configuration, rounds, review verdicts and authorized acceptance, with declared coverage. See "Slice 1 Observation Contract". (assumed)
3. An admission protocol: a frozen set of past briefs with known accepted results, the measurements to collect, and promote, hold and demote outcomes. Thresholds stay `unknown` until measured. (assumed)
4. One routing rule, stated once in `common-task-complexity-routing` and applied in order: (1) host authority and explicit settings; (2) eligibility; (3) capability floor from SNC tier and risk floor; (4) pool health, quota and the authorized fallback order; (5) among what remains, the lowest expected total cost per accepted slice. (assumed)
5. A model can be replaced through a host table change plus an admission record, with no canonical text change. (assumed)

## The Cost Theory

This is a model for reasoning, not a measured result. Illustrative scalar form, for worker model $m$ supervised by orchestrator $o$:

$$C = \frac{W_m + V_o}{a_m}$$

- $W_m$: what the worker spends in one round.
- $V_o$: what the orchestrator and any reviewer spend on that round.
- $a_m$: the chance a round is accepted, for that class of task.

**Assumptions** the scalar form needs: per-round cost and acceptance chance stay stable across rounds; work is eventually accepted; and every actor is counted. Cancelled attempts and terminal failures break the first two. Reviewer cost is not separated in the current data. The required reporting form stays a vector, per `ARCHITECTURE.md` §3.3: money, quota and time separately, including failed and cancelled attempts.

**Hypotheses** to test in slices 1 and 3, not established by current evidence:

1. When supervision is expensive relative to worker cost, differences in acceptance matter more than differences in worker price. When supervision is cheap, worker price matters more unless acceptance differs sharply.
2. Because $V$ depends on the orchestrator, the best worker for a role may change when the orchestrator model changes. A fixed order of named profiles is then fragile.
3. Supervision may be a large provider-neutral lever. Current data shows similar average supervision across cheap workers under one orchestrator, but task mix was not matched.

## Options And Recommendation

All three options keep the same gates: host authority, then eligibility, then the risk floor. Each option is judged by the same proof: total cost per accepted slice and acceptance rate, both measured.

### Option A: Roles, observations, admission test, one routing rule (recommended)

- What: Replace named routes with roles bound by a host table; record per-dispatch observations; admit and demote candidates by a replay test.
- Load-bearing assumption: Measured acceptance and total cost differ enough between eligible candidates in a role to change a routing choice.
- Evidence limits: Acceptance per dispatch is not recorded. Current supervision figures come from a heuristic, observational allocation.
- Decisive trade-off: One observation record per dispatch, in exchange for model changes that need no policy rewrite.
- Proof: A candidate is admitted or rejected from a recorded replay, and total cost per accepted slice for the role is reported before and after the change.
- First failure condition: After adequate coverage, no routing choice changes.
- Worst plausible case: Observations are recorded but not used, and routing stays manual.
- Cost to abandon: The docs, one script and the added observation fields.

### Option B: Replace the current fast model in the existing named ladder

- What: Swap the model behind the first route and keep the fixed order of named profiles.
- Load-bearing assumption: Model changes are rare enough that a fixed ladder stays correct.
- Evidence limits: The ladder is already stale; the first route's profile names a provider and model pair that the provider rejects.
- Decisive trade-off: No new work now, against repeating this investigation at every model change.
- Proof: Total cost per accepted slice and acceptance rate after the swap are no worse than before. Today this cannot be measured, because acceptance is not recorded.
- First failure condition: The next model or pricing change needs another policy edit.
- Worst plausible case: Routing keeps favouring a model whose supervision or rework cost is hidden.
- Cost to abandon: Nothing; this is the current state plus one edit.

### Option C: An automatic per-dispatch router in the host

- What: A host plugin chooses the model for each dispatch from live observations, inside the same host-authority and eligibility gates.
- Load-bearing assumption: Observations are accurate enough to act on without a human.
- Evidence limits: No acceptance labels exist to calibrate or check it.
- Decisive trade-off: The least manual effort, against acting on thin data with no human review.
- Proof: Same as Option A, plus agreement with human routing decisions on a sample.
- First failure condition: A routing choice that a human reviewer rejects.
- Worst plausible case: Sustained routing to a weak candidate before anyone notices.
- Cost to abandon: A runtime component in the host.

**Recommendation:** Option A. Option C can be built later on A's observations. Option B is the interim host step offered in Decision 2, not the end state.

## Slice 1 Observation Contract

This defines semantics only. Field names and storage are builder decisions. Slice 1 extends the existing delivery-observation events instead of adding a new store.

- **Dispatch record:** one per delegated worker. It carries a dispatch identifier, the `change_id` it serves, role, requested capability hint, actual configuration (provider, model, effort, or `unknown`), the eligibility or authority reference, and the orchestrator's model.
- **Join:** submission, correction, review and acceptance events carry the dispatch identifier. An acceptance event names the dispatches whose output it accepts. Events without a dispatch identifier are excluded from per-dispatch metrics, and the export declares that coverage as incomplete.
- **Change-level acceptance:** accepting a change never marks every worker that contributed to it as accepted. When an acceptance names a change but no dispatch, each contributing dispatch's acceptance stays `unknown`.
- **Round:** one submission by the worker against the same brief. A correction starts the next round on the same dispatch. A new brief is a new dispatch.
- **Review verdict versus acceptance:** a reviewer's verdict (changes requested or approved) is a review event on the dispatch. Acceptance keeps its existing meaning: an `acceptance` event with an `authority_ref`. A reviewer verdict never counts as acceptance.
- **Cancelled and failed dispatches** stay in the cohort with their state. They are never dropped and never counted as accepted.
- **Unknowns:** missing configuration, verdict or acceptance stays `unknown`, and the metric reports itself `unavailable` with the reason, as `delivery.ts` already does.
- **Slice 1 output:** provisional per-role and per-model observations (rounds, verdicts, acceptance, supervision and worker cost) for one real window. No model card schema is needed yet.

## Evidence

Window: 2026-10-17 to 2026-11-16 UTC, end exclusive. Source: the maintainer's local OMP and Paseo telemetry. Every orchestrator turn, notification, dispatch and worker statistic is bounded to that window; workers dispatched earlier are excluded.

The evidence is maintainer-local and not reproducible by public readers. The script and its aggregate output are at `artifacts/role-based-model-routing/evidence/`, which git ignores. Slice 1 proposes to land the script as a supported command. Money figures are OMP list-price estimates, not invoices.

| Claim | Status | Source |
| --- | --- | --- |
| Window total $844.01 list price; orchestrator sessions $540.50 (64%), of which $261.98 (48%) could not be attributed to any worker | confirmed(dispatch-supervision.json `headline`, `orchestration`) | script output |
| 52 orchestrator sessions dispatched 351 workers; 23 of 374 `create_agent` calls (6%) failed | confirmed(dispatch-supervision.json `orchestration`) | script output |
| Same orchestrator model (GPT-6.1 Sol), implementation work, all dispatches: average orchestrator turns charged per dispatch were Gemini 3.8 Flash 18.7 (82 dispatches), DeepSeek V4.1 Flash 18.8 (37), GPT-6 Luna 22.4 (10) | confirmed(dispatch-supervision.json `cells`) | script output; descriptive, task mix not matched |
| Same cell, worker side: list cost per dispatch $1.03, $0.06, $0.31; edit error rate 6.6%, 1.4%, 17.4%; Luna averaged 202 worker turns | confirmed(dispatch-supervision.json `cells`) | script output |
| Same cell: errored notifications per dispatch 0.29, 0.03, 1.1. DeepSeek's first-dispatch subset (21 dispatches) had 0 | confirmed(dispatch-supervision.json `cells`) | script output |
| Same cell: supervision cost charged per dispatch $0.56, $0.66, $0.71 | confirmed(dispatch-supervision.json `cells`) | script output; heuristic allocation |
| The same worker model (Gemini) was charged 2.1 orchestrator turns per dispatch under Claude Sonnet 5.5 (40 dispatches) and 18.7 under Sol | confirmed(dispatch-supervision.json `cells`) | association only; orchestrator behavior, task mix and period differ |
| Orchestrators received 612 permission requests (about 2.8M characters) and spent 566 turns answering them | confirmed(dispatch-supervision.json `orchestration`) | script output |
| Current bash patterns would allow 157 of 200 sampled, previously prompted commands | confirmed(`harness-setup.mjs lint --current --fixtures` output, 2026-11-16) | maintainer-local output, not retained |
| The first route's profile names a model that its provider rejects | confirmed(`inspect_provider` output, 2026-11-16) | maintainer-local output, not retained |
| 7 of 351 dispatch briefs carried an SNC tier | confirmed(transcript scan, 2026-11-16) | maintainer-local output, not retained |
| Paseo `inspect_provider` accepts an OMP role alias (`omp/@lookup`) as the model | confirmed(`inspect_provider` output, 2026-11-16) | launching an agent this way was not tested |
| OMP supports custom roles with ordered candidates, per-role fallback chains, role presets and per-model compaction triggers | confirmed(omp://models.md "Role aliases and settings"; omp://settings.md) | docs |
| `ARCHITECTURE.md` §3.4 and `CONTRIBUTING.md` cite `docs/validation/context-aware-delegation-protocol.md`, which was added in #269 and deleted in #279 | confirmed(git log for that path) | git history |
| Delivery events identify changes and revisions, not dispatches, roles or models | confirmed(scripts/metrics/types.ts:96-132) | code read |
| No delivery observation export is present in this checkout at `24d9034d2` | confirmed(file search at that revision) | absence in this checkout only, not proof that no export exists elsewhere |
| Acceptance per dispatch | unknown | not recorded; follow-up counts are a noisy proxy |
| Results generalize beyond this repository's TypeScript and Markdown work | unknown | one project dominates the window |

Method limits: supervision is allocated by charging each orchestrator turn to the worker it last addressed or heard from. This describes where orchestrator attention went; it does not measure the supervision a worker needed. Roles (implementation versus review) are labelled by a regex over the brief. Cells with fewer than 5 dispatches are withheld.

## Slices

Only slice 1 is proposed for planning now. Slices 4 and 5 change host configuration outside this repository and need their own approval.

| # | Slice | Owns | Proof | Must not change |
| --- | --- | --- | --- | --- |
| 1 | Observations: the contract above; land the supervision script as a supported command; restore the deleted delegation protocol or remove its citations | `scripts/metrics/`, the dispatch receipt fields, `ARCHITECTURE.md` §3.3–3.4, `CONTRIBUTING.md` | Provisional per-role, per-model observations for one real window, with coverage declared | Existing metric semantics; unknown stays unknown |
| 2 | Role vocabulary and the routing rule in one place; other skills and workflows link to it | `common-task-complexity-routing`, `common-subagent-driven-development` §1 | Guardrail pressure cases pass before and after; no model or profile identifier in canonical text | SNC tiers, risk floor, premium rules, host-authority precedence |
| 3 | Admission protocol and model card schema (frozen replay set; promote, hold, demote) | A new reference under `common-task-complexity-routing`; reuse of the eval runner | One candidate replayed and a card produced from slice 1 observations | Eval runner contracts |
| 4 | Host binding (separate approval): a role table in the harness baseline, profiles named by role, role-resolved launch arguments | Host harness skill and policy text | A model swap is a table change; launch failures from malformed provider strings stop | Eligibility rules; premium approval |
| 5 | Supervision reduction (separate approval): permission allow-list refresh, notification size, orchestrator context limits | Host harness baseline | Permission-only orchestrator turns per dispatch fall in the next window | Deny and prompt rules for destructive commands |

## Decisions

1. **Scope (settled 2026-11-16, recommended default).** This initiative covers repository contracts (slices 1–3). Slices 4–5 go through the host harness dry-run with separate approval.
2. **Interim fast implementer (open; host decision, approved separately from this brief).** Recommended: run a harness dry-run that rebinds the fast implementer from Gemini to DeepSeek V4.1 Flash, then approve or reject that diff on its own. Evidence, under the same orchestrator: similar supervision charged per dispatch, the lowest worker cost and edit error rate, and 0.03 errored notifications per dispatch (0 in first dispatches). Alternatives: GPT-6 Luna (10 dispatches: more worker turns, edit errors and errored notifications), or wait for slice 3.
3. **Source of acceptance (settled 2026-11-16, recommended default).** The orchestrator records review verdicts and authorized acceptance per the slice 1 contract.

## Risk Register

| Risk | Owner | Mitigation |
| --- | --- | --- |
| Routing widens data exposure to an unapproved account | Maintainer | Host authority and eligibility gates come first; observations cannot change eligibility |
| Thin observations drive a confident but wrong ranking | Maintainer | Hold state until sample adequacy is measured; humans promote at first |
| Recording adds orchestrator overhead | Maintainer | Extend existing events; measure the overhead in slice 1 |
| Host-specific names leak into canonical skills | Maintainer | Slice 2 proof checks canonical text for identifiers |
| Results do not hold outside this repository | Maintainer | Observations are scoped by project and task class; no global ranking |

## Planner Check

- Consequential guesses: acceptance source (Decision 3), scope split (Decision 1) and interim host change (Decision 2) are exposed, not assumed.
- Delegated to the builder: field names, storage layout of the dispatch record, and the script's location in `scripts/metrics/`.
- Placeholders and contradictions: none found; every numeric target is `unknown`.
- Independent check: round 1 returned CHANGES REQUESTED with 8 findings. Round 2 confirmed 7 resolved; the remaining finding (acceptance could not be attributed to a dispatch) is fixed by the Join and Change-level acceptance rules in the Slice 1 Observation Contract. No other blocker or major finding was reported.

## Approval

approval: approved(requesting maintainer, 2026-11-16); scope: this brief and its slice order; reopen: affected slice only.
authority: planning of slice 1 only. No implementation, host configuration change, eval spend, release or activation. Decision 2 needs its own approval of a harness dry-run diff.

## Outcome Report

```json
{"schema_version": 1, "run_id": "unknown", "slug": "role-based-model-routing", "workflow": "brainstorm-feature", "feature_status": "requirements_ready", "started_at": "unknown", "completed_at": "unknown", "requirement_trace": {"brd_objectives": [], "requirements": [], "acceptance_criteria": [], "srs": []}, "completed_evidence": ["dispatch-supervision.json (maintainer-local, window-bounded)", "independent check rounds 1-2", "human sign-off 2026-11-16"], "missing_evidence": ["acceptance per dispatch"], "decision_needed": ["interim fast implementer (host, separate approval)"], "recommended_next_workflow": "plan-feature", "cost": {"source": "unavailable"}, "agent": {"identity": "omp orchestrator", "model": "anthropic/claude-opus-5-5"}}
```

## Next Workflow

`plan-feature` for slice 1.
