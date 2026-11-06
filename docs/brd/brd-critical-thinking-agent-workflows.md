# Brief: Critical Thinking in Agent-Assisted Work

slug: critical-thinking-agent-workflows
operator_profile: hybrid
lane: both
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-05)
repository_status: approved_brief_saved
activation_status: not_required

## Contract

**Outcome:** Improve agent-skills-standard's ability to preserve the operator's intent, expose consequential decisions, and distinguish actual verification from persuasive claims, without turning every task into an approval ceremony.

**You said:** Deeply investigate what the supplied critical-thinking practices should teach our knowledge, agent behavior, skills, and workflows.

**I assumed:** This intake authorizes research and a proposed brief, not implementation, policy activation, paid evaluation, deployment, or mandatory human training. Sponsor, validation owner, and handoff owner: requesting maintainer; these drafted defaults were confirmed by the operator's approval on 2026-11-05.

**Sizing:** SNC: S=2 N=1 C=2 total=5 tier=high. Shared decision, verification, and authority behavior spans canonical skills and workflows. This is prospective delivery risk, not a claim that writing this brief changes runtime trust controls. Bounded repository scouts confirmed the cross-component integration points. Capability hint is not premium authorization. Parent model: openai-codex/gpt-6.1-sol; native scouts: observed scout role, model/effort not exposed in delivered results; no host profile execution claimed.

**Constraints:** Reuse canonical guidance and existing evaluation infrastructure; keep token overhead proportional to risk. Preserve source provenance, existing human gates, and the distinction between technical verification, business acceptance, and release authority. Never infer human comprehension from an agent explanation or model agreement. Expose concise decisions, assumptions, evidence, and limitations, not private reasoning transcripts.

**Non-goals:** Implementing changes in this intake; creating another universal workflow; mandatory quizzes or weekly exercises; new telemetry, learning profiles, or personal competence scoring; blanket second-model calls; provider/model migrations; new host enforcement; claims of long-term cognitive harm or proven ROI.

### Capability inventory and slices

| Slice | Capabilities | Scope decision |
| --- | --- | --- |
| 1. Decision/evidence fidelity | Preserve supplied facts; disclose consequential assumptions; challenge unsupported premises; identify what checks prove and miss; resist contradictory completion claims | First and only delivery slice brainstormed here |
| 2. Human comprehension support | Explain local invariants; surface knowledge gaps; support operator-requested restatement or changed-constraint prediction | Discovery finding only; separate later intake |
| 3. Human skill retention | Support voluntary unaided practice and delayed transfer assessment | Discovery finding only; separate later intake |

### Proposed acceptance criteria for slice 1

- **AC-CT-01:** Inventory each selected practice as existing, partially covered, proposed, or deferred, with exact repository/source evidence. Search limitations remain explicit.
- **AC-CT-02:** Preserve supplied owner, metric, constraints, and scope in fact-versus-assumption write-back. An answer containing the right labels but changing a supplied fact fails the proposed behavioral rubric.
- **AC-CT-03:** For consequential completion claims, identify the approved criterion, actual check/output, independent oracle basis, and material limitation. A green check, hash, or second-model agreement alone cannot establish correctness or approval.
- **AC-CT-04:** Adversarial controls reject refusal-plus-violation, invented facts, implementation-copied expected values, and self-review represented as independent approval. Safe paraphrases and quotations of unsafe requests must not fail merely for vocabulary overlap.
- **AC-CT-05:** Paired prompts with identical evidence but opposite stakeholder preferences must yield evidence-consistent decisions. Correct premises should be accepted; unsupported or incorrect premises challenged. Contrarianism alone is not success.
- **AC-CT-06:** Proposed integration uses existing canonical rules/procedures and retains low-risk in-chat execution; it adds no universal document, question round, quiz, reviewer, or authority transfer. Generated mirrors are not authored independently.
- **AC-CT-07:** Delivery evidence distinguishes offline scorer/control checks, new live model trials, actual consumer behavior, and human outcomes. Report missing evidence as missing; do not present this brief's demonstrations as completed implementation verification.

These are proposed future behavior criteria. This intake delivers their evidence-backed definition, not their implementation or satisfaction by a changed consumer.

**Delivery status (2026-11-06):** the approved scope was implemented through the PRD and SRS, with the run record at `artifacts/runs/critical-thinking-agent-workflows/20261105-implement-feature.json` showing `implemented`. That is a repository state only, with known open checks. Final governed trace/outcome/membership audits pass and the whole-delivery review approved the source scope without a Blocker or Major, but formal host-verified provenance, a clean CLI typecheck (17 diagnostics, baseline unconfirmed), a warning-free run, the four NOT RUN skips, live benefit measurement, human acceptance, merge and release remain open. No objective-level KPI result, release or human outcome is claimed.

## Why

**Objective ID**: BRD-OBJ-CT-01 — **Business objective:** Reduce acceptance of plausible but unsupported agent conclusions while preserving useful delegation and proportionate review.

This is the brief's single objective declaration. The acceptance criteria below are declared here and refined, not renamed, in `docs/prd/prd-critical-thinking-agent-workflows.md`.

**Users:** Maintainers operating agents, developers reviewing generated changes, workflow authors, and consumers relying on completion/verification reports.

**AS-IS:** Shared guidance already requires explicit intent, assumptions, independent test oracles, actual-change review, revision-bound proof, and scoped human acceptance (E1–E5). At least one current live-eval definition can be satisfied lexically by a contradictory unsafe answer (E6–E7). Actual frequency of that behavior in consumers is unknown. No explicit human comprehension/retention outcome protocol was found in the bounded inspected surfaces; this is not a global absence claim.

**TO-BE:** Operators can distinguish supplied facts from invented assumptions, see why a consequential decision is supported, and recognize the limits of verification without reconstructing an entire session. Workflow compliance is assessed by behavior and evidence rather than the presence of reassuring words.

**SMART metric (proposed, not a measured benefit):** Within 30 days after separately approved implementation and evaluation authorization, the requesting maintainer will compare baseline and candidate on a frozen held-out set of at least 20 paired cases spanning fact preservation, authority, oracle independence, stakeholder pressure, and evidence limitations. Target: at least 50% relative reduction in unsafe acceptances when baseline errors are nonzero, zero unauthorized-action recommendations in the held-out authority cases, and no more than a 5-percentage-point decrease in safe-case acceptance. If baseline unsafe acceptance is zero, report a ceiling result rather than claim reduction. Record added tokens and human review time; proposed overhead guardrail is no more than 10% median added tokens on matched low-risk cases. Targets are draft decision thresholds, not statistically established effects or commitments.

**Baseline:** The demonstrated case-9 lexical blind spot is confirmed. Live consumer error rates, added-token baseline, review time, and long-term human learning effects are unknown. Establish baseline before candidate comparison; freeze prompts/rubric before viewing candidate outputs. Human comprehension improvement is not a success claim for slice 1.

**Validation owner and acceptance window:** Requesting maintainer, proposed. The maintainer reviews the frozen rubric before any trial and accepts/rejects the results within five working days of evidence delivery; asynchronous corrections remain attached to the same brief revision. No calendar commitment is approved here.

## Lessons and Proposed Direction

| Practice | Existing state | What to learn / recommended action | Priority |
| --- | --- | --- | --- |
| Define intent before delegation | Existing: outcome, constraints, non-goals, ACs; said-versus-assumed write-back | Preserve the actual facts and relationships, not just headings; challenge consequential unsupported assumptions without re-asking settled facts | P0, slice 1 |
| Ask what would falsify a conclusion | Existing: option failure conditions; test intent includes a plausible fault and independent oracle | Make disconfirming evidence and verification limits visible in the existing decision/verification receipt when material | P0, slice 1 |
| Do not confuse green tests with correctness | Existing: independent oracle and real consumer-smoke requirements | Reuse these rules; evaluate shared code/test mistakes and misleading completion claims instead of adding another testing manifesto | P0, slice 1 |
| Review actual changes and hidden decisions | Existing: actual patch/files, source provenance, reviewer independence | Direct attention to consequential defaults, ordering, scope interpretations, and conflicts; inspect source rather than trusting an agent summary | P0, slice 1 |
| Seek opposing evidence | Existing: honest options, failure conditions, no-build choices | Add counterfactual stakeholder-pressure controls; another model is a critic, not an authoritative oracle or automatic reviewer | P1, slice 1 |
| Preserve original sources across handoffs | Existing: source bundles, work-item/source revision, evidence links | Carry source references and uncertainty; do not promote predecessor summaries into confirmed evidence | P1, slice 1 |
| Keep human responsibility | Existing: technical PASS, human acceptance, and release are distinct | Preserve authority boundaries; require host controls where applicable, not stronger prose pretending to enforce them | Reuse, slice 1 |
| Explain what the operator ships | Partial: plain-language outputs are not human understanding proof | Offer local invariant explanation or operator-requested teach-back; never let the agent answer its own quiz and certify the human | Later slice 2 |
| Retain skills deliberately | No explicit outcome protocol found in bounded search | Optional unaided practice and delayed transfer; weekly/monthly cadence is advice, not empirically established dosing | Later slice 3 |
| Keep review volume manageable | Article warns of generation exceeding review capacity | Prefer comprehensible task boundaries; measure review burden before adding parallel output or more gates | Planning constraint, not new scheduler |

### Concrete behavior example

An agent changes a transaction default and reports passing tests. A useful handoff identifies the changed default, its approved basis, which test exercises it, whether expected values were independently derived, and any unexercised ordering or failure case. If the requirement is ambiguous, route that decision to its owner. Do not quietly select a requirement, call a sibling's agreement independent approval, or claim deployment consent from a green test.

### Suggested integration points, not an implementation plan

- `skills/common/common-decision-discipline/`: fact-preserving assumptions, consequential decisions, disconfirming evidence; avoid duplicating existing contract fields.
- `skills/common/common-tdd/`: reuse independent oracle and fault requirements, not a second testing convention.
- `skills/common/common-code-review/` and canonical `.agents/workflows/code-review.md`: review actual changes and preserve independence limitations.
- Canonical `.agents/workflows/verify-work.md`: reuse criterion-bound proof; make material coverage limits explicit in its existing report where needed.
- Existing `skills/**/evals/evals.json` and `scripts/evals/` controls: strengthen weak selected assertions with independently reviewed adversarial examples. Do not infer general semantic safety from fixed-format decision fields.
- Later, only if selected: comprehension support through operator-facing explanations/acceptance guidance; human practice through optional learning guidance, not default release gates.

## Options And Recommendation

| Option | Load-bearing assumption | First failure / worst plausible case | Cost to abandon | Decision |
| --- | --- | --- | --- | --- |
| Reuse controls and narrowly strengthen decision/evidence evaluation | Existing infrastructure can distinguish selected unsafe behavior when given appropriate controls and reviewed rubrics | If no real behavior improves, extra text becomes compliance theater and increases operator fatigue | Low: bounded canonical changes/evals can be reverted before publication | Recommended; smallest testable slice |
| Add a universal critical-thinking workflow and mandatory quizzes | More ceremonies reliably improve real comprehension | Routine work slows; users rubber-stamp another gate; generated answers masquerade as human understanding | Higher: new routing, duplication and user expectations | Reject for current scope |
| Defer changes and use existing rules plus optional human habits | Current controls are sufficient in practice | Known assertion blind spot persists; real consumer failures may remain invisible | Lowest immediate cost | Legitimate no-build fallback if baseline shows no material gap |

Buying a new tool is not a justified option: no procurement need or tool shortfall has been established. Shared prompt rules cannot enforce host permissions. No new enforcement architecture is authorized.

## Evidence

`confirmed(path)` means the inspected artifact supports the stated claim, not that the rule is always followed. External URLs confirm the source's reported results; study limitations govern interpretation.

| ID | Claim | Status |
| --- | --- | --- |
| E0 | The supplied Vietnamese screenshots recommend retained ownership, hypothesis/falsification, evidence inspection, intent clarity, review, and intentional practice | confirmed(user-supplied screenshots); source commentary, not empirical validation |
| E1 | Shared decision discipline already specifies said/assumed, evidence tags, failure conditions, scoped approval | confirmed(skills/common/common-decision-discipline/SKILL.md:38-76) |
| E2 | Test intent requires independently grounded oracle, plausible fault, owner and real/mocked boundaries | confirmed(skills/common/common-tdd/SKILL.md:34-49) |
| E3 | Author-controlled subagents cannot establish independent review; provenance and host controls must be checked | confirmed(skills/common/common-code-review/references/orchestration.md:67-71) |
| E4 | Technical verification requires fresh criterion-bound evidence and does not grant acceptance/deployment | confirmed(.agents/workflows/verify-work.md:9-16) |
| E5 | Human UAT records owner/revision/criteria; canonical workflows are authored separately from generated mirrors | confirmed(.agents/workflows/uat-signoff.md:12-26); confirmed(CONTRIBUTING.md:88-104) |
| E6 | Case 5 asserts labels without checking supplied values; case 9 asserts two approval phrases without excluding contradictory actions | confirmed(skills/common/common-decision-discipline/evals/evals.json:43-80) |
| E7 | An authored unsafe response containing both case-9 phrases satisfies both substring checks | confirmed(session Node demonstration); independent substring demonstration, NOT production scorer execution or live model failure |
| E8 | Adversarial oracle-copying and decision-shape controls already exist; their finite calibration is not general semantic safety | confirmed(scripts/evals/__fixtures__/test-assurance/oracle-copying.json:1-14); confirmed(scripts/evals/test-quality-controls.test.ts:54-187); confirmed(scripts/evals/diagnostic-prevention.test.ts:701-765), scout-inspected |
| E9 | Retained-run verification is documented as local/no paid workers, recomputes without result/manifest writes | confirmed(docs/EVALS.md:197-225); confirmed(scripts/evals/verify.ts:65-115) |
| E10 | No same-scope BRD/PRD/SRS/product ledger existed in the inspected current docs tree before this brief | confirmed(bounded scout inventories and searches); other refs/worktrees/history not inspected |
| E11 | No direct human teach-back or delayed retention evaluator was found in inspected common/workflow/eval surfaces | unknown(repository-wide absence); bounded search finding only |
| E12 | Original essay is attributed to Addy Osmani; direct X access blocked; accessible reproduction read | confirmed(https://x.com/addyosmani/status/2117512471930167377); confirmed(https://threadnavigator.com/thread/2117512471930167377/); exact original full-text fidelity not independently authenticated |
| E13 | Author distinguishes offloading from surrender and recommends expectation/diff/evidence/practice habits | confirmed(https://addyosmani.com/blog/cognitive-surrender/); practitioner commentary; secondary claims in this essay are not adopted as independently proven |
| E14 | Randomized study of 52 mostly junior developers learning Trio reported immediate quiz means 50% AI vs 67% manual, p=0.01; speed difference not significant | confirmed(https://www.anthropic.com/research/AI-assistance-coding-skills); confirmed(https://arxiv.org/abs/2601.20245); 17 percentage points, not 17% relative |
| E15 | Study's interaction-mode patterns are qualitative associations; small sample/immediate quiz does not establish long-term skill loss or quiz-gate efficacy | confirmed(https://www.anthropic.com/research/AI-assistance-coding-skills) |
| E16 | CHI survey reports 319 workers/936 examples and association between higher AI confidence and less critical-thinking effort | confirmed(https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/); self-report, not causal skill-loss proof |
| E17 | Anthropic internal study discusses supervision/skill-atrophy tension from 132 surveyed employees and 53 interviews | confirmed(https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic); privileged single-company setting, not general causal evidence |
| E18 | Official Claude guidance distinguishes prompt/skill advice from deterministic controls and recommends executable checks plus actual outputs | confirmed(https://code.claude.com/docs/en/best-practices); product guidance, not efficacy evidence |
| E19 | Proposed targeted changes improve real behavior and reduce review burden | assumed; requires baseline/candidate validation |

No canonical product ledger was found for this slug; no strategy/OPP/DEC/MET records or product IDs were invented. Proposed requirement IDs below are local trace seeds, not product evidence IDs.

## Standard And Deep Sections

### Stakeholders and ownership

- Requesting maintainer: proposed sponsor, handoff owner, validation owner, and brief approver.
- Workflow/skill maintainers: future canonical integration owners; not assigned implementation in this intake.
- Developers/operators: intended beneficiaries; any learning study participation remains voluntary and separately authorized.
- Independent evaluator/reviewer: must be separate from implementation ownership with verified provenance; current parent/scouts are discovery aids, not independent release approval.
- Next accountable role: maintainer acting as Product Manager in `plan-feature` after brief approval.

### Cost-benefit and delivery context

Expected value is risk reduction and clearer review, not more output volume. Costs include tokens, review time, rubric maintenance, model trials and participant effort. Amounts, budget availability and causal return are unknown. No spend approval is implied. Reuse current contracts and tools; reject duplicated default checklists. Current working tree only was inspected; search misses are not proof that other authorized revisions lack a capability.

### Risk register

| Risk | Mitigation | Proposed owner |
| --- | --- | --- |
| Lexical metrics reward reassuring phrases rather than behavior | Unsafe/safe control pairs, held-out rubric, independent semantic review | Evaluation maintainer |
| All agents inherit the same mistaken premise | Independently grounded oracle/source evidence; counterfactual and negative cases | Verification owner |
| Stronger prompts are mistaken for host enforcement | State enforcement limits; preserve independently verified human/host controls | Workflow maintainer |
| Added rigor creates fatigue or low-risk ceremony | Reuse receipts, trigger detail by consequence, measure overhead | Requesting maintainer |
| Agent-generated quiz certifies its own explanation | No human-outcome claim without unaided human evidence and separate rubric | Human validation owner |
| Study findings overgeneralized to long-term harm | Preserve population/task/time horizon and causal limitations | Brief/validation owner |

### Glossary

- **Independent oracle:** Expected behavior justified by approved requirements, external specification, or independently reviewed examples, not copied from implementation.
- **Cognitive offloading:** Delegate execution while retaining judgment and accountability.
- **Cognitive surrender:** Adopt an agent conclusion without meaningful evaluation; a conceptual risk label, not a diagnosis or measured project condition.
- **Intent debt:** Unexpressed goals, boundaries, or rationale; the existing contract addresses this without another debt registry.
- **Comprehension debt:** Gap between generated system changes and recoverable human understanding; not inferred from green tests or approval alone.
- **Teach-back:** A human explains an invariant or predicts changed-constraint behavior; the agent cannot supply the response on the human's behalf.

### PM handoff checklist

- [x] User intent separated from analyst assumptions; profile/lane/SNC recorded.
- [x] Existing controls and bounded gaps mapped; negative evidence and no-build option retained.
- [x] Scope limited to first slice; later learning slices explicitly deferred.
- [x] Candidate objective, behavior criteria, owners and measurement proposal drafted.
- [x] Authority, enforcement, evidence and cost limits explicit.
- [x] Maintainer approved the brief, owner defaults and proposed metric on 2026-11-05.
- [ ] Select measurement rubric, frozen baseline/candidate cases and evaluation authorization before trials.
- [ ] Produce PRD and bounded tasks; obtain required high-tier plan approval before implementation.

## Verification of This Investigation

- `rtk proxy node --version`: v26.0.0.
- `rtk pnpm evals:verify -- --run all-v2.6.0`: could not start; `tsx: command not found`, missing `node_modules`. This is an environment prerequisite failure, not an eval failure or successful retained-run verification. Dependencies not installed.
- Dependency-free Node command loaded the actual case-9 assertion definition and checked a deliberately unsafe answer with its two substring predicates: both true. This proves the narrow assertion blind spot, not a model's propensity to produce that answer or the production scorer's complete behavior.
- No live model evaluations, application tests, code changes, production actions or human learning experiments were performed. Existing guards were inspected as guidance, not audited as runtime enforcement.

## Approval

Approved by the requesting maintainer on 2026-11-05 through the reply “ok” to the presented brief. Approval covers this brief, its owner defaults and proposed measurement contract only. It does not authorize implementation, paid calls, evaluation exposure, a pilot, publication, merge, deployment, or human competence tracking. The next workflow may draft the plan; execution remains separately governed.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-critical-thinking-agent-workflows-20261104",
  "slug": "critical-thinking-agent-workflows",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "approval": "approved(requesting maintainer, 2026-11-05)",
  "time_precision": "date_only; wall-clock timestamps unavailable",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-CT-01"],
    "requirements": ["REQ-CT-01 fact and decision fidelity", "REQ-CT-02 evidence fidelity", "REQ-CT-03 adversarial behavioral assessment"],
    "acceptance_criteria": ["AC-CT-01", "AC-CT-02", "AC-CT-03", "AC-CT-04", "AC-CT-05", "AC-CT-06", "AC-CT-07"],
    "srs": []
  },
  "completed_evidence": ["source screenshots", "bounded repository safeguard/eval mapping", "primary-source research with limitations", "case-9 substring demonstration"],
  "missing_evidence": ["retained-run verification: missing local dependencies", "live consumer failure baseline", "candidate behavior/overhead results", "human comprehension/retention outcomes"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable", "note": "Host token totals/rates and complete actor accounting unavailable; MCP counters are not complete cost."},
  "agent": {"identity": "orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

`requirements_ready` means this approved discovery contract is ready for planning, not implemented or behaviorally verified.

## Open Questions

Brief, owner defaults and proposed metric approved on 2026-11-05. Consumer failure prevalence, rubric discrimination and added overhead remain validation unknowns. Long-term human comprehension/retention effects are outside slice 1.

## Next Workflow

Route to `plan-feature` with approval recorded on 2026-11-05. Carry this slug, profile, SNC, scope, evidence IDs, proposed criteria, authority limits and missing baseline unchanged. Use installed `validate-product` for a separately authorized bounded empirical value test if selected; no workflow installation gap was observed. Do not route directly into implementation or reopen settled source facts.

## Cost Report

Call `get_session_cost(workflow="brainstorm-feature")` at final handoff. MCP session activity may aggregate concurrent scout calls; host token usage, model prices, complete worker costs and numerical savings are unavailable. No monetary total or savings claim is made.
