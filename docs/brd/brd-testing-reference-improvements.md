# Brief: Testing Reference Improvements

slug: testing-reference-improvements
operator_profile: technical
lane: direction
snc_tier: medium
model_tier: standard
approval: approved(requesting operator, 2026-11-05)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=1 C=1 total=4 tier=medium. Cross-owner guidance extensions, not an authentication implementation or runtime change. Re-score downstream if scope reaches sensitive code.

## Contract

**Outcome:** Turn the supplied hocTest screenshots into verified, non-duplicative improvements to agent-skills-standard's testing guidance. First delivery slice: deterministic Playwright collection handling and parallel test prerequisites within existing QE owners.

**You said:** Investigate the references, learn what is good, and improve our testing skills and workflows.

**I assumed:** Intake and planning precede implementation; maintainers own approval and validation. No client suite, live model evaluation, spend, deployment, or runtime auth change is authorized by this brief.

**Constraints:** Preserve canonical skill ownership, token economy, POM conventions, seed prerequisites, scenario-owned data, real-vs-mocked proof boundaries, and existing requirement trace. Prefer compact rules plus demand-loaded references. Do not turn an article into an unqualified mandatory policy. Verify examples against the consumer's installed Playwright version.

**Non-goals:** New generic testing methodology or browser framework; prescribed test-pyramid percentages; blanket deletion of UI tests; a 300-test migration; universal performance targets; dashboards; automatic release waivers; paid model experiments; changing auth, CI or backend infrastructure during intake.

### Acceptance Criteria

These are proposed delivery criteria, not claims that implementation has occurred.

- **AC-001 / REQ-001 — Evidence classification:** Each supplied testing theme is classified as adopt, qualify, already covered, or unsupported, with source links and current canonical owner. Unverified social-post numbers are never promoted to measurements or targets.
- **AC-002 / REQ-002 — Collection readiness:** Guidance states that `locator.all()` immediately returns locators for current matches, not frozen element handles or a completed-list guarantee. A delayed-list example cannot silently pass with zero assertions. Prefer retrying list assertions when iteration is unnecessary. Enumeration requires contract-based completion and stable membership/order; expected count alone is insufficient for a continuously changing list.
- **AC-003 / REQ-003 — Parallel isolation:** Guidance distinguishes browser-context isolation, per-worker account allocation, and per-test mutable backend data. Address reset/cleanup after success, failure and retries, preserve diagnostic evidence, and namespace data/accounts across concurrent runs, projects and shards. `parallelIndex` is stable across worker replacement, not globally unique. A worker fixture is an optimization, not proof of test independence.
- **AC-004 / REQ-003 — Auth/setup boundaries:** Reuse `storageState` for suitable post-login scenarios; keep auth artifacts out of version control and untrusted output. Keep dedicated real-browser login/session verification. API setup may create prerequisites but cannot replace the behavior under test. Reconcile any worker setup with existing seed/POM ownership rather than introducing a second fixture convention.
- **AC-005 / REQ-004 — Behavioral verification:** Planning defines runnable delayed-list and concurrent-mutation examples, including a worker restart/reset scenario. Demonstrate observable completeness and non-interference, not merely source wording or helper wiring. Existing registry validation must pass for changed canonical artifacts; any host publication must prove applicable resource/ID parity and consumer discovery. Offline checks cannot establish improved live model behavior.

*ID normalization note:* Trace identifiers normalized from two-digit suffixes (01..05) to three-digit format (001..005) for BRD objective, requirements, and acceptance criteria for schema compliance; semantics and scope are unchanged.

## Why

- **Objective ID**: BRD-OBJ-001
- **Objective Statement**: Reduce avoidable false-green and data-conflict advice in generated Playwright tests without duplicating established quality rules.

**Users:** Agents consuming the skill registry; QE maintainers reviewing generated plans/tests; teams adopting Playwright guidance.

**AS-IS:** Existing contracts already require retrying locator assertions, scenario-owned data, early requirement review, distinct test faults and independent oracles. Reviewed owner references do not explicitly explain collection enumeration or worker identity/isolation mechanics. This is a bounded-review observation, not a repository-wide absence claim.

**TO-BE:** Agents can recognize the two concrete failure modes and select existing rules plus focused recipes. QA judgment and release authority remain separate from automation speed.

**SMART metric — proposed:** Within 14 calendar days of implementation approval, maintainer-reviewed local examples demonstrate complete delayed-list checks and isolated mutations with at least two workers, including replacement/reset behavior; all five acceptance criteria have linked evidence. Establish baseline behavior before edits. No latency or live model efficacy improvement is promised; those baselines are unknown.

**Sponsor / validation owner / handoff owner:** Requesting operator / repository maintainers / repository maintainer acting as BA lead, respectively (assumed defaults). Next accountable role: maintainer acting as product/implementation planner.

## Capability Inventory And Slices

| Capability | Existing owner | Direction |
| --- | --- | --- |
| Await collection completion | QE Playwright POM generation and selector stability | First slice: explicit enumeration semantics and examples |
| Isolate mutable test data | QE test-plan authoring and POM fixture reference | First slice: parallel account/data lifecycle recipe |
| Reuse authenticated setup | Existing seed/POM and common browser-governance rules | First slice: compatible optimization with narrow evidence claims |
| Select honest test layers | common-tdd and verify-work | Already covered; link, do not recreate |
| Challenge AI-generated tests | common-tdd and automation-health | Already covered; preserve independent oracle/fault checks |
| Review requirements early | QE lifecycle-and-roles | Already covered; no new process gate |
| Communicate severity versus priority | QE defect drafting / lifecycle | Separate follow-on candidate: impact vs scheduling, authorized decision owner |
| Measure process improvement | automation-health and existing eval machinery | Separate follow-on only with baseline and authorized empirical scope |

Only the first coherent browser-reliability slice is shaped for planning here. Follow-on candidates retain the user's broader learning intent without silently expanding this contract.

## Options And Recommendation

1. **Targeted extension of existing QE guidance — recommended.** Assumption: compact explicit recipes improve decisions where general isolation/retry rules are insufficient. First failure condition: owner references conflict with seed/POM generation. Worst case: confusing parallel conventions or extra prompt weight. Cost to abandon: discard bounded reference changes before publication; no runtime migration.
2. **Defer changes; link primary documentation only.** Assumption: external documentation is sufficient at generation time. First failure condition: agents continue treating collection enumeration or worker accounts as intrinsically safe. Worst case: known failure patterns persist. Cost to abandon: low; add focused guidance later. Honest fallback if no behavioral example demonstrates a real gap.

Reject a broad QA rewrite: current sources already cover most general lessons, and a rewrite adds duplicate ownership without evidence of incremental value.

## Evidence

All sources inspected during this intake; social screenshots are secondary evidence with unknown original Reddit/article provenance.

| Claim / lesson | Status | Disposition |
| --- | --- | --- |
| Supplied screenshots discuss collection timing, shift-left, AI coverage theatre, and UI data conflicts | confirmed(user-provided screenshots) | Source of hypotheses, not measured efficacy |
| `locator.all()` does not wait and dynamic lists may be flaky | confirmed(https://playwright.dev/docs/api/class-locator#locator-all) | Adopt; qualify count/stability and live-locator semantics |
| Retrying web-first assertions and independent tests are recommended | confirmed(https://playwright.dev/docs/best-practices#use-web-first-assertions) | Adopt, reuse existing owner |
| Shared auth suits non-conflicting tests; modifying shared server state needs separate accounts | confirmed(https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker) | Adopt with per-test data and secret-lifecycle caveats |
| `parallelIndex` survives restart; `workerIndex` changes | confirmed(https://playwright.dev/docs/test-parallel#worker-index-and-parallel-index) | Adopt; index alone is not a cross-run namespace |
| APIs can prepare state and inspect postconditions | confirmed(https://playwright.dev/docs/api-testing) | Adopt selectively; preserve UI-specific and integrated proof |
| Canonical registry flows through CLI into host-specific project resources | confirmed(../../ARCHITECTURE.md:5-65,89-126) | Extend canonical owners, do not hand-edit exports as a second source |
| Lazy locators/retrying assertions already have an owner | confirmed(../../skills/quality-engineering/quality-engineering-playwright-pom-generation/SKILL.md:26-62) | Extend, not replace |
| Existing fixture exposes page-scoped pages; seed owns auth/navigation | confirmed(../../skills/quality-engineering/quality-engineering-playwright-pom-generation/references/fixture-wiring.md:1-35) | Reconcile worker setup explicitly |
| Saved auth is not full login/session proof | confirmed(../../skills/common/common-web-visual-testing/SKILL.md:44-55) | Preserve |
| Shift-left, residual risk, named-human waivers already exist | confirmed(../../skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md:7-54) | Already covered |
| Independent oracles, minimal honest layers and anti-padding already exist | confirmed(../../skills/common/common-tdd/SKILL.md:25-85) | Already covered |
| Automation confidence is not coverage percentage or raw pass rate | confirmed(../../skills/quality-engineering/quality-engineering-automation-health/SKILL.md:20-62) | Already covered |
| Concrete collection/worker recipes are an incremental teaching gap | assumed | Qualified inference from inspected owners and bounded searches; recheck before editing |
| 300 tests take 7–8 hours; thousands run in 8 minutes; AI teams produce 10–20 PR/day | unknown | Anecdotes, not repository baselines or promised improvements |
| New advice improves live agent behavior or CI latency | unknown | Requires separately scoped empirical evidence |

No existing dedicated BRD/PRD or canonical product evidence ledger was found in the bounded current-worktree lookup for this initiative. Adjacent sync-reliability and evidence-led-marketing SRS/product artifacts remain separately owned; do not duplicate their records or IDs. Before planning, reuse any approved equivalent artifact discovered in another authorized revision rather than restarting intake.

## Standard Sections

**Delivery context:** Canonical candidates are the existing QE POM generation, selector stability and test-plan authoring skills/references. Workflows should link these owners only where needed, not repeat browser rules in every step. Exact file changes and consumer verification belong to plan-feature.

**Verification candidates:** Existing `rtk pnpm validate` checks registry structure; `rtk pnpm test:evals` checks offline evaluation machinery. Neither was executed during intake, nor proves browser behavior or live skill efficacy. Choose focused commands and installed-version-compatible browser examples during planning.

**Cost-benefit:** Expected reduction in misleading collection and isolation advice is an unvalidated value hypothesis. Costs include reference maintenance, reader context, and bounded browser example validation. No monetary estimate, quota budget or CI savings baseline is available.

| Stakeholder | Responsibility | Approval |
| --- | --- | --- |
| Requesting operator | Confirm direction and scope | Brief approval pending |
| QE skill maintainer | Own compatible guidance and examples | Plan/review required |
| Registry maintainer | Verify canonical publication and consumers if changed | Publication authority separate |
| Consumer project owner | Authorize environment/data and any live trial | Not requested in this intake |

| Risk | Mitigation | Owner |
| --- | --- | --- |
| Count check hides continuing list changes | Contract-derived completion, list identity/order checks where relevant | QE maintainer |
| Worker account hides sequential contamination or cross-job collision | Per-test mutable data/reset plus run/project/shard namespace | QE maintainer |
| Speed optimization removes login or backend evidence | Retain real-browser critical journeys and explicit mocked boundaries | QA reviewer |
| Generic-rule duplication increases token cost | Extend existing owner; keep detailed recipes demand-loaded | Registry maintainer |
| Social anecdotes become performance commitments | Record unknown baselines and forbid unmeasured savings claims | Handoff owner |

**Glossary:** Collection readiness = application-specific evidence that required list content is complete; worker isolation = separation between concurrent workers, not automatically between their tests; severity = defect impact; priority = scheduling/business decision; coverage theatre = tests or metrics that look reassuring without proving the owned behavior.

### PM Handoff Checklist

- [x] Supplied themes assessed against current owners and primary Playwright sources.
- [x] First delivery slice, scope fence, owner defaults and trace seed recorded.
- [x] Assumptions, unsupported numbers, negative evidence and no-change option retained.
- [x] No implementation, live model experiment, deployment or release approval inferred.
- [x] Operator approved this brief and proposed defaults via “ok” on 2026-11-05.
- [ ] Planner resolves fixture/seed lifecycle compatibility and installed Playwright version.
- [ ] Planner maps REQ-001–004 to AC-001–005 once and defines focused behavioral proof.
- [x] Execution approach selected before any multi-task implementation: requesting operator explicitly approved plan and subagent-driven execution on 2026-11-05.

## Approval

Approved by the requesting operator via “ok” on 2026-11-05. Approval covers this direction brief and its proposed owner/metric defaults. On 2026-11-05, the requesting operator subsequently explicitly approved the plan and selected subagent-driven execution; implementation and verification remain in progress and are not claimed complete.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-testing-reference-improvements-2026-11-05",
  "slug": "testing-reference-improvements",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "approval": "approved(requesting operator, 2026-11-05)",
  "started_at": "2026-11-05T07:29:12Z",
  "completed_at": "2026-11-05T07:33:01Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001", "REQ-002", "REQ-003", "REQ-004"],
    "acceptance_criteria": ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005"],
    "srs": []
  },
  "completed_evidence": ["supplied screenshot analysis", "bounded canonical-owner lookup", "primary Playwright documentation verification", "MCP consultation audit"],
  "missing_evidence": ["implementation behavioral proof (not part of intake)", "live model efficacy and consumer CI baselines (not authorized)"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable", "status": "partial"},
  "agent": {"identity": "omp coding assistant", "model": "openai-codex/gpt-6.1-sol"}
}
```

`requirements_ready` means the approved brief is ready for planning, not approved for implementation.

## Open Questions

The first slice and maintainer owner/validation defaults are approved. No intake questions remain. Follow-on severity/priority teaching and process experiments remain unapproved candidates. Live model efficacy remains an unvalidated hypothesis, not a prerequisite for planning.

## Next Workflow

`plan-feature`, after approval; reuse this slug and evidence rather than reopening settled direction. `validate-product` is available if the operator later selects a separately bounded empirical value test.

## Cost Report

Called `get_session_cost(workflow="brainstorm-feature", slug="testing-reference-improvements")`. MCP reported partial telemetry: host prompt/cached/output/reasoning tokens, pricing, other runtime cost and estimated total unavailable. MCP consultation counters share this session across lookup workers and are not proof of total actor cost, delivery or enforcement. No numeric cost or savings claim is made.
