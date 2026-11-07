# Brief: AI Workflow Effectiveness

slug: ai-workflow-effectiveness
operator_profile: hybrid
lane: both
snc_tier: medium
model_tier: standard
approval: approved(requesting operator, 2026-11-06)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=1 C=1 total=4 tier=medium. Assessment spans shared planning and delivery guidance; no runtime control, sensitive application code, or deployment changes are authorized. Re-score any downstream implementation separately.

## Contract

**You said:** Review the supplied posts, artifacts and references about effective AI-assisted work, compare them with our current situation, and identify improvements.

**I assumed:** “Our” means agent-skills-standard's current checkout and the active session orchestration policy. This does not establish how consistently people or agents follow those rules across projects. Requesting operator sponsors the direction; repository maintainers validate it.

**Outcome:** Preserve useful existing controls, identify evidence-backed incremental improvements, and prepare a bounded first delivery slice without importing another competing methodology.

**Constraints:** Canonical ownership, token economy, risk-sized discovery, host/account eligibility, independent review, and separate implementation/acceptance/release authority remain intact. Source claims, executable validation, historical reports and newly observed outcomes stay distinct. Social anecdotes are hypotheses, not efficacy measurements.

**Non-goals:** Implementing during intake; installing third-party skills; adding agent fleets, trackers, dashboards or telemetry stores; changing orchestration policy, permissions or premium approval; fixed interview lengths; automatic deployment; live paid experiments; duplicating testing-reference-improvements or the pending verification, evidence-fidelity and architecture-reader work owned by PRs #296, #297 and #298.

### Delivery acceptance criteria

Canonical active definitions for the approved AC-001…005 and REQ-001…003 now live in the [feature plan](../prd/prd-ai-workflow-effectiveness.md#requirements-and-acceptance-criteria). This is a definition relocation, not a scope, identity or approval change. The approved pre-relocation brief has SHA-256 `66878a3102ca0f7a920b1376583f292891d1e8fbdcb412f4717e099018078e22`; the PRD preserves those meanings and adds owners and verification lanes. Brief approval remains recorded here; the new PRD's plan approval is separately pending.

**Overlap disposition:** AC-001/002 are the incremental planning semantics. AC-003 is an existing packet-contract compatibility constraint, not new packet functionality. AC-004 should consume #296's verification approach where applicable rather than build another kit; only the slice-plan example and its consumer behavior are new evidence. AC-005 applies #297's evidence-fidelity contract rather than creating a second one. #298's reader and held-out evaluation remain separately owned and are not acceptance prerequisites for this planning clarification.

## Why

**Objective ID**: BRD-OBJ-001

Improve the ability to verify AI-assigned work incrementally without adding redundant process or authority ambiguity. Owner: repository maintainer, assumed.

**Users:** Maintainers planning agent work; workers consuming assignments; independent reviewers; human operators accepting results.

**AS-IS:** Requirements, architecture contracts, dependency-aware dispatch, bounded packets, independent reviews, recovery and authority boundaries are documented. Packet contract/dependency checks have executable implementations. The inspected plan slice contract does not explicitly require each feature slice to deliver a thin demonstrable cross-layer behavior. Reports and architecture references include evidence limitations; some referenced measurement artifacts are unavailable in this checkout. These observations do not prove organization-wide failure.

**TO-BE:** Operators can explain what each feature slice demonstrates, workers can act without rediscovering settled decisions, and reviewers can distinguish completed work from merely completed layers. Supporting evidence is attributable and limitations are visible.

**SMART metric — proposed default:** Within 14 calendar days of implementation approval, the maintainer reviews three representative plans: a feature with multiple layers, a shared prerequisite, and a mechanical refactor. Every feature slice has a demonstrable outcome; every exception has an owned verification result and dependency explanation; all five ACs have linked evidence. Capture the same examples before edits. This is a bounded acceptance target, not proof of organization-wide productivity or causal savings.

**Sponsor:** Requesting operator, assumed. **Validation owner / Handoff Owner (BA lead):** Repository maintainer, assumed. **Next accountable role:** Maintainer acting as product planner. Confirmation window: next operator review, no calendar delivery commitment.

## Reference Assessment

| Practice or claim from screenshots | Assessment | Application here |
| --- | --- | --- |
| Clarify intent before code | Adopt; already covered | Stop when decisions are actionable; do not copy a 40–80-question quota |
| Split work into end-to-end slices | Adopt; incremental clarification opportunity | Make the demonstration explicit, not just owner/artifact/layer |
| Planner, implementer, reviewer, merger | Qualify; responsibilities matter more than four agents | Preserve independent review and accountable integration; do not split tightly coupled work gratuitously |
| Run independent work in parallel | Adopt; already covered | Require disjoint ownership, real dependency readiness and verifiable outputs |
| Keep contexts focused and start fresh | Adopt conditionally; already covered | Fresh bounded assignments with durable evidence; do not discard useful approved context merely to reset |
| Maintain a system/dataflow map | Adopt; already covered | Keep owners, flows and contracts understandable; diagram optional when precise prose/tables suffice |
| Trace upstream data errors before fixing downstream logic | Adopt | Treat as a diagnosis principle, not a reason to assume every failure is upstream |
| One shared brain for all agents | Qualify | Shared canonical decisions and interfaces are useful; indiscriminate shared mutable memory creates contamination and ownership risks |
| SDLC/ADLC and a hybrid human-agent loop | Retain human decision/acceptance boundaries | “ADLC” is terminology, not evidence of a universal autonomous operating model |
| Anthropic/OpenAI run this exact 100-agent process | Unverified | No original supporting reference supplied or verified |
| Token spend is the only autonomous-agent problem | Reject | Correctness, security, permission, coordination, recovery and acceptance are separate risks |
| Serverless only suits small landing pages/personal projects | Unsupported generalization | Hosting depends on workload and constraints; no hosting decision is needed here |
| Tests pass, therefore deploy automatically | Reject | Verification does not grant release authority |

The original social URLs/video were not supplied. A public Matt Pocock repository corroborates several practices but does not establish the exact video, version, interview count, or historical workflow described in the screenshots. Public main-branch sources are mutable, not pinned implementation dependencies.

## Capability Inventory And Slice Order

| Capability | Current position | Direction |
| --- | --- | --- |
| Clarify intent | Documented intake and approval boundaries | Reuse; no new questionnaire |
| Model flows | Existing architecture/data ownership plus open #298 diagram improvements | Reuse existing owners; no renderer, diagram or reader-study work here |
| Slice behavior | Owner/artifact/verification mapping exists; vertical outcome not explicit in inspected contract | **First slice: demonstrable feature slices using existing task contracts** |
| Coordinate work | Documented placement/recovery plus executable packet checks | Reuse, do not add roles or schema by default |
| Verify outcomes | Existing TDD/smoke/review plus open #296 verification-kit work | Reuse; no new verification-kit framework |
| Locate trustworthy evidence | Open #296 owns retention/freshness; #297 owns claim/provenance fidelity | Reuse those contracts; unavailable historical paths are not a new evidence platform project |
| Measure effectiveness | Existing economics contracts; #298 owns its specific held-out evaluation | No new experiment here; task-wide productivity remains unmeasured |
| Preserve operator understanding | Open #298 owns paired architecture-reader evaluation | Track there; do not commission a duplicate reader study |

Only the demonstrable-slice planning clarification remains shaped for new work. Preserve related PR ownership; their pending state does not make those capabilities unowned.

## Options And Recommendation

1. **Targeted clarification in existing planning ownership — recommended.** Assumption: making the demo outcome explicit reduces layer-only task plans. First failure condition: existing canonical examples already resolve the ambiguity without new guidance. Worst case: over-decomposition and more prompt weight. Cost to abandon: discard bounded guidance changes before publication; no runtime migration. Reuse existing packet and review contracts.
2. **Defer changes and use current guidance with manual review.** Assumption: present rules suffice when operators enforce independently demonstrable outcomes. First failure condition: layer-only plans recur in reviewed examples. Worst case: avoidable integration feedback arrives late. Cost to abandon: low; revisit with concrete examples. Honest choice if the baseline shows no distinct problem.
3. **Replace the process or buy/install a multi-agent factory — not recommended.** Assumption: automation or a new methodology supplies missing capability. First failure condition: current ownership and authority contracts conflict with the replacement. Worst case: duplicate standards, greater coordination cost and unclear permissions. Cost to abandon: higher due to migration, configuration and retraining. No evidence currently justifies this scope.

## Evidence Ledger

| Claim | Status |
| --- | --- |
| Screenshots promote clarification, vertical work, role separation, context discipline, maps and hybrid oversight | confirmed(user-provided screenshots); secondary source, not efficacy evidence |
| Original Matt video and post-specific numerical claims | unknown |
| Matt's current to-tickets documentation explicitly describes tracer-bullet slices, blockers and demo outcomes; acknowledges over-decomposition | confirmed(https://github.com/mattpocock/skills/blob/main/docs/engineering/to-tickets.md) |
| Matt's current repository promotes shared language, feedback loops and architecture | confirmed(https://github.com/mattpocock/skills) |
| Long-running agents benefit in Anthropic's described experiment from incremental work, durable progress and end-to-end verification | confirmed(https://www.anthropic.com/research/effective-harnesses-for-long-running-agents); does not prove this repository's efficacy |
| Multi-agent use has coordination and token tradeoffs, with coding less parallelizable than independent research | confirmed(https://www.anthropic.com/research/multi-agent-research-system); published research-system observations, not our task-cost baseline |
| Canonical registry → CLI → project architecture and on-demand standards | confirmed(../../ARCHITECTURE.md:5-66) |
| Existing requirements and independently ready slice mapping; no explicit vertical feature-slice requirement in inspected section | confirmed(../../.agents/workflows/plan-feature.md:18-35) |
| Existing architecture/dataflow and contract design | confirmed(../../.agents/workflows/design-solution.md:14-24) |
| Placement is benefit-based; reviews independent; integration/recovery owned | confirmed(../../skills/common/common-subagent-driven-development/SKILL.md:32-85) |
| Executable packet checks validate populated contract fields; do not authenticate approval or sandbox | confirmed(../../skills/common/common-subagent-driven-development/scripts/task_brief.py:7-10,161-188) |
| Current aggregate transcript report says baseline 42%, with-skill 72%, but protocol unknown and release NOT READY | confirmed(../../evals-report.md:1-32); not executable delivery, savings or causal productivity proof |
| Complete task economics, including repairs and all actors, is already the contract | confirmed(../../ARCHITECTURE.md:157-182) |
| Exact reads of docs/validation/context-aware-delegation-protocol.md and artifacts/metrics/delivery-observations.json failed; bounded equivalent-name glob found no matches | confirmed(current-checkout lookup); availability limitation, not proof capability never existed |
| Related testing brief is approved and excludes broader methodology/efficacy work | confirmed(brd-testing-reference-improvements.md:8-24,53-66) |
| Related testing walkthrough reports technical verification but excludes human release, live efficacy and monetary savings | confirmed(../srs/srs-walkthrough-testing-reference-improvements.md:70-79); historical report, not a rerun here |
| Explicit demonstrable-slice guidance improves generated plans | assumed; validate with baseline examples before implementation |
| Current team adoption, escaped-defect rate, cost per accepted slice, human correction time, and throughput | unknown |

No dedicated product evidence ledger or equivalent BRD/PRD for this slug appeared in the bounded current-checkout discovery. Reuse any approved equivalent discovered later; do not mint duplicate product records. Missing historical evidence may be retained elsewhere under separate authority; no cross-account search or mutation was performed.

## In-Progress PR Overlap Check — 2026-11-06

The initial intake inspected the checkout but did not inspect open PRs before listing adjacent improvement candidates. The requesting operator corrected that evidence gap. This supplement preserves the approved outcome and criteria while identifying existing owners; it grants no additional scope or execution authority.

GitHub open-PR discovery returned three PRs. Head identities were independently captured via the GitHub API; all target develop at base `3dc1eae17f814cc12b954b88f29d329b8b1fbfb8`. Scope conclusions use actual selected canonical diffs and requirement documents, not titles alone.

| PR / inspected head | Existing owner and overlap | Disposition |
| --- | --- | --- |
| [#296 — project verification readiness](https://github.com/HoangNguyen0403/agent-skills-standard/pull/296), `e873757b3b691a507caa64209e490dd79b20fecd` | Adds `common-project-verification`, kit/journey contracts, evidence retention and dependency-scoped freshness; updates implementation-readiness/verify-work | Reuse for AC-004 and evidence handling. Do not create another kit, proof schema, freshness policy or maintenance workflow |
| [#297 — critical-thinking workflows](https://github.com/HoangNguyen0403/agent-skills-standard/pull/297), `183c51821c3c8cbf465c9581efa24c86578fbd78` | Extends decision discipline, evidence provenance and criterion/output/oracle/boundary receipts; updates review/verify-work | Reuse for AC-005 and evidence qualification. No duplicate fidelity rubric or evaluator framework |
| [#298 — system-design diagrams and N+1](https://github.com/HoangNguyen0403/agent-skills-standard/pull/298), `f7d81ceea3e41dc9d8f030a11388b61ae91d65cc` | Improves architecture presentation/offline viewing; [its PRD](https://github.com/HoangNguyen0403/agent-skills-standard/blob/f7d81ceea3e41dc9d8f030a11388b61ae91d65cc/docs/prd/prd-system-design-visualization-improvements.md) owns the visual reader-comprehension requirement and criterion 06, plus held-out N+1 reasoning/runtime criteria 07–09 | Keep diagram readability, human-reader studies and those held-out cases under #298; no parallel version here |

**Status limits:** All three are open, review required and GitHub reports merge state DIRTY at inspection; #298 is draft. None is treated as merged or accepted. #296 explicitly reports incomplete coverage and locally retained, unuploaded raw proof; #297 limits finite evaluations and host/runtime claims; #298 reports failed held-out acceptance (6/8 versus required 8/8) and unmeasured reader acceptance. These are PR-reported outcomes, not tests rerun or raw archives verified in this assessment.

### Residual coverage by criterion

| Criterion | Covered/reused owner | Remaining incremental work |
| --- | --- | --- |
| Reference: AC-001 | Existing plan-feature maps owners/artifacts/verification; none of the three PR inventories changes plan-feature | Explicit independently demonstrable feature-slice behavior and cross-layer demo example |
| Reference: AC-002 | Existing dependency/ownership contracts | Explicit verified exceptions for prerequisite, research and mechanical-refactor work |
| Reference: AC-003 | Existing common-subagent-driven-development packet and validators | Compatibility demonstration only; no new fields, packet schema or worker bootstrap |
| Reference: AC-004 | #296 real journey/verification contract; existing packet consumer | One bad-plan challenge plus a representative planning-to-consumer example; no competing verification machinery |
| Reference: AC-005 | #297 fidelity/receipt/limitation contract | Apply it to this slice's evidence; no generic evidence-policy implementation |

**Planning boundary:** Recheck these head identities before editing. `plan-feature` and a minimal demand-loaded example remain candidate ownership for the new semantics. Do not edit `verify-work`, `implementation-readiness`, decision-discipline, verification-kit owners, diagram tooling, reader studies, or trace-ID parsers merely to implement this brief. PRs #296 and #297 both change verify-work, and all three touch trace/outcome parsing or tests; resolve those shared changes through their existing integration owners, not this initiative. Reuse an installed/merged contract when available; an unmerged PR is not an installed dependency. If consuming #296/#297 is necessary but unavailable, identify the affected verification prerequisite without blocking independent planning or copying their code.

**Evidence sources:** confirmed([#296 canonical skill diff](https://github.com/HoangNguyen0403/agent-skills-standard/blob/e873757b3b691a507caa64209e490dd79b20fecd/skills/common/common-project-verification/SKILL.md)); confirmed([#296 maintenance contract](https://github.com/HoangNguyen0403/agent-skills-standard/blob/e873757b3b691a507caa64209e490dd79b20fecd/skills/common/common-project-verification/references/maintenance.md)); confirmed([#297 decision discipline](https://github.com/HoangNguyen0403/agent-skills-standard/blob/183c51821c3c8cbf465c9581efa24c86578fbd78/skills/common/common-decision-discipline/SKILL.md)); confirmed([#297 verify-work](https://github.com/HoangNguyen0403/agent-skills-standard/blob/183c51821c3c8cbf465c9581efa24c86578fbd78/.agents/workflows/verify-work.md)); confirmed([#298 PRD](https://github.com/HoangNguyen0403/agent-skills-standard/blob/f7d81ceea3e41dc9d8f030a11388b61ae91d65cc/docs/prd/prd-system-design-visualization-improvements.md)); confirmed(PR file inventories and GitHub API revision lookup). Coverage is source/scope inspection, not PR approval or runtime verification.

**Retrospective candidate (proposal only):** `IMP-ai-workflow-effectiveness-overlap-001`; root cause: workflow/evidence-scope judgment; owner: planning-workflow maintainer; mechanism: held-out intake case where an apparent local gap already has an open PR owner. Expected behavior: discover existing ownership and retain only residual scope before recommending new work. Verification reference: pending; adoption status: proposed; maintenance authorization and independent review: not granted. No registry, learning-log or policy promotion is performed.

## Standard Sections

**Delivery context:** Candidate canonical owner is plan-feature, linking existing subagent task-contract resources rather than restating their contents. Planning must inspect current templates and examples before deciding whether any additional owner file needs a change. Native exports are derived, not independently edited sources.

**Cost-benefit:** Hypothesis is earlier integration feedback and less rework. Baseline, effect size, monetary benefit and authorized live-evaluation budget are unknown. Costs include guidance maintenance, example validation and prompt weight. Do not report more agents, more tests or more documents as productivity.

| Stakeholder | Responsibility | Approval |
| --- | --- | --- |
| Requesting operator | Confirm problem, scope and proposed metric | Brief pending |
| Repository maintainer | Own requirements, examples and canonical guidance | Plan and implementation approach separate |
| Independent reviewer | Challenge slice behavior, exceptions and evidence | Cannot grant human acceptance |
| Consumer/host owner | Authorize account/data, live trials or runtime actions | Not requested by intake |

| Risk | Mitigation | Owner |
| --- | --- | --- |
| More rules instead of better behavior | Demonstrate a distinct baseline failure; extend one owner | Planner |
| Dogmatic vertical slicing creates fake demos or excessive tasks | Typed verified exceptions; group coupled work | Maintainer |
| Missing local receipts mistaken for nonexistent capability | Locate authorized retained evidence before replacing it | Evidence owner/maintainer |
| Transcript scores become claims of productivity | Separate protocol, task behavior, cost and acceptance evidence | Validation owner |
| Automation bypasses human authority | Retain separate acceptance/release records | Host owner |

**Glossary:** Vertical slice = thin observable behavior across the layers it requires. Horizontal slice = one layer awaiting others before the behavior works. Assignment packet = existing bounded worker contract. Consumer smoke = exercising a real producer-to-consumer path. Evidence availability = retrievability in an authorized location, not proof the underlying event never happened.

### PM Handoff Checklist

- [x] Supplied themes compared with current canonical owners and primary references.
- [x] Claims distinguish documented rules, source implementation, historical reports and unknown outcomes.
- [x] First slice bounded; adjacent candidates and testing ownership preserved.
- [x] Draft owner, SMART metric, constraints, non-goals, requirement/AC seed recorded.
- [x] Requesting operator approved this brief on 2026-11-06.
- [x] Checked open PRs #296/#297/#298; recorded exact heads, criterion overlap and non-duplication boundaries.
- [ ] Planner verifies existing examples, fixes exact scope and selects behavioral verification.
- [ ] Implementation approach and any separately gated activity authorized before execution.

## Approval

Approved by the requesting operator on 2026-11-06 via “ok” in response to the presented brief. Approval includes the recommended first-slice fence, default owner and SMART metric. It covers this brief only, not implementation placement, spending, live evaluation, publication, merge, deployment or policy changes.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-ai-workflow-effectiveness-20261106",
  "slug": "ai-workflow-effectiveness",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-06T15:51:54.530Z",
  "completed_at": "2026-11-06T15:54:37.011Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001", "REQ-002", "REQ-003"],
    "acceptance_criteria": ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005"],
    "srs": []
  },
  "completed_evidence": ["supplied screenshot analysis", "primary-source comparison", "canonical planning and packet-contract inspection", "eval report limitations inspected"],
  "missing_evidence": ["original social/video URLs", "team adoption and comparable accepted-task baseline", "two architecture-linked measurement artifacts unavailable in checkout"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable"},
  "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

Requirements are drafted; approval is not implied by requirements_ready. Timestamps identify intake telemetry boundaries, not measured implementation time.

## Open Questions

No technical question blocks this brief. Original social/video URLs would allow exact attribution; missing URLs do not prevent the supplied-material comparison. Team adoption and comparative cost/quality remain unmeasured. The requesting operator accepted the recommended first slice, default owner and metric on 2026-11-06.

## Next Workflow

plan-feature. Brief approval is recorded; implementation approach and separately gated activities remain unapproved. validate-product is discoverable if a later decision requires empirical efficacy or savings evidence; an actual live experiment still needs its own bounded contract and host authorization.

## Cost Report

Called get_session_cost(workflow="brainstorm-feature", slug="ai-workflow-effectiveness"). MCP returned partial telemetry; complete host token usage, prices and total actor cost were unavailable. No numeric cost or savings claim. MCP consultation records prove returned standards, not worker comprehension, runtime enforcement or delivered behavior.

**Verification performed for this intake:** Read-only source/report inspection, two bounded parallel scout lookups, primary web-source reads, exact missing-path reads and bounded filename discovery; self-review of contract, evidence classifications and authority boundaries. No tests, app smoke, live model benchmark or runtime mutation was performed or required for this draft-only assessment.
