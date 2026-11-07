# Brief: Model-Portable UI Quality

slug: model-portable-ui-quality
operator_profile: hybrid
lane: both
snc_tier: medium
model_tier: standard
delivery_mode: standard
approval: approved(requesting-maintainer, 2026-11-06)
repository_status: approved-brief
activation_status: not_required

SNC: S=2 N=1 C=1 total=4 tier=medium. Shared design, verification and evaluation owners may be affected; this modifies existing capabilities rather than replacing the registry core. Implementation sizing must be revisited once exact changes are selected.

## Contract

**Outcome:** Establish what the existing skills actually contribute to generated UI quality, then recommend the smallest evidence-backed improvements that reduce generic, inappropriate or unusable UI across an explicitly tested model set.

**You said:** Check what we have, identify improvements and leverage points, and learn from the supplied references without copying their repositories.

**I assumed:** The target is agent-skills-standard's guidance and evaluation system, not an application redesign. “No matter which model” means provider-neutral instructions and honest per-model results, not guaranteed identical output from arbitrary models. The initial supported surface is web UI; mobile-native expansion needs separate intake.

**Constraints:** Preserve product identity, functionality, essential content, accessibility and human creative authority. Reuse canonical skills and demand-loaded references; avoid a competing generic UI owner or permanently loading a large style catalogue. No external code, datasets, assets or skill prose are to be imported. External sources inform independently written principles only. Evaluation execution, model spend, installations, publication and rollout require their own applicable authority.

**Non-goals:** Clone Linear, Apple Notes or reference products; enforce minimalism as the only style; universally ban fonts, colors, cards or gradients; automatically remove all helper text; add a component/animation library; build a design editor, model router or universal aesthetic detector; promise quality for untested models.

### Scope slices

1. **Current slice — assess and establish the quality contract:** capability inventory, evidence boundaries, rubric, baseline protocol and prioritized leverage points. This brief covers this slice; no benchmark or implementation has been executed.
2. **Later slice — strengthen canonical guidance:** only changes supported by the first slice's findings, planned separately.
3. **Later slice — operationalize rendered evaluation:** reuse existing provenance/reporting where suitable; design any new execution boundary separately. Do not turn the current text-answer runner into a claimed browser benchmark.

### Acceptance criteria for the first slice

- **AC-001 / REQ-001:** Inventory relevant design, accessibility, state-coverage, browser-verification and evaluation owners with exact paths; distinguish instruction coverage from observed execution and distinguish unassessed from absent capability.
- **AC-002 / REQ-002:** Define an anchored quality rubric covering task clarity, information hierarchy, typography/readability, spacing/density, product/brand fit, content fidelity, responsive behavior and interaction states. Separate objective defects, context concerns and human taste; novelty is not inherently quality.
- **AC-003 / REQ-003:** Specify a reproducible baseline-versus-candidate experiment: six fixed briefs (new landing page, dense dashboard, form/recovery, content-rich mobile page, existing-screen polish and brand-preserving restyle), at least three separately pinned eligible models from at least two providers, two independent runs per brief/model/arm. Retain runnable artifacts, actual loaded guidance, model/provider/settings, source revisions, viewport/state captures, failures and repair attempts. Proposed minimum: 36 generated artifacts for each arm, 72 total; execution is not authorized by this brief.
- **AC-004 / REQ-003:** Require observed desktop and mobile rendering, keyboard/task completion, content-fidelity and applicable accessibility checks. Unrenderable output counts as failure, not an excluded sample. Browser/tool failures are reported separately and remain unresolved, not passes. Objective accessibility/functional failures cannot be offset by aesthetic scores.
- **AC-005 / REQ-003:** Require blinded, order-randomized paired review using the same product brief, assets, tools and generation/repair allowance in both arms; two independent reviewers, with disagreements adjudicated by the validation owner. Report each model separately, ties, failures and sample uncertainty. Text assertion pass rates cannot substitute for rendered quality or usability evidence.
- **AC-006 / REQ-004:** Rank recommendations by observed failure, affected canonical owner, expected benefit, cost to abandon and proof needed; map each external reference principle to an existing owner or an evidenced gap. Accept “no guidance change” if current guidance meets the agreed quality target. Do not import reference implementations.

The experiment size and thresholds are proposed defaults for planning, not proof of statistical power or a promise of universal efficacy. Its protocol must be fixed before any paid execution.

## Why

**BRD-OBJ-001:** Help maintainers and consuming developers distinguish useful UI guidance from attractive wording, and choose improvements based on observed product-fit and usability rather than screenshot fashion.

**SMART metric — proposed default:** Within 30 calendar days after separately authorized evaluation starts, publish the defined baseline comparison and a prioritized recommendation. A candidate is worth adopting only if it wins at least 8 of the 12 paired outputs for every tested model, with ties not counted as wins; introduces no new critical accessibility or primary-task blocker relative to baseline; and does not increase the median human repair rounds per model. Record absolute defects in both arms: baseline defects still require resolution before a screen is called acceptable. The win threshold is an operational decision rule, not statistical significance. If no candidate meets it, report no demonstrated improvement and retain the existing guidance.

**Baseline:** Generated-screen quality, win rates and repair burden are unknown. Existing transcript scores are not substitutes.

**Users:** Developers and designers using installed skills through different coding agents; maintainers evaluating changes; end users completing tasks on generated interfaces.

**AS-IS:** Canonical guidance already describes deliberate product-specific direction, preservation tiers, contextual style choices and comparative browser verification. Inspected UI evals assess response wording and scope discipline. Actual cross-model rendered quality remains unestablished by the inspected evidence.

**TO-BE:** Maintainers can trace a visible failure to its cause: guidance not selected, missing product context, guidance not followed, inadequate model/tool capability, or an inadequate rule. Changes address the demonstrated cause rather than adding more prompt text by default.

**Sponsor/decision-maker — assumed:** Requesting repository maintainer.
**Validation owner / handoff owner — assumed:** Maintainer responsible for design skills and evaluation acceptance.
**Next accountable planning role — assumed:** Repository product/technical planning owner. These are role defaults, not invented named appointments.

## Capability Inventory And Leverage

| Capability | Current owner / evidence | Recommended leverage, subject to measurement |
| --- | --- | --- |
| Ground direction | `skills/common/common-ui-design/SKILL.md:25-60` | Reuse audience/task, character, typography, color, density and reduced-motion direction; test new-screen output, not only refinement answers. |
| Preserve identity | `skills/common/common-ui-design/references/human-direction.md:14-67` | Reuse keep/change/avoid, polish/restyle/rethink and observation-impact-smallest-change-preserve critique. |
| Bound inspiration | Same reference, sections 2 and 6 | Keep selective inspiration and no-import boundaries; no need to recreate an existing borrowing protocol. |
| Protect accessibility | `skills/common/common-accessibility/SKILL.md` | Keep semantic labels, contrast and keyboard requirements; never let “less text” remove necessary instructions or recovery. |
| Verify states | `skills/common/common-web-visual-testing/SKILL.md` and `references/scenarios.md` | Observe populated, empty, error, loading, focus and overlay states, responsive sizes and neighboring-element effects. |
| Bind visual context | `skills/common/common-stitch-design/SKILL.md` | Assess reuse of existing DESIGN.md/appearance ownership before proposing another mandatory design artifact. |
| Measure compliance | `skills/common/common-ui-design/evals/evals.json` | Keep semantic scope risks distinct from image/task results; replace wording-only evidence claims, not behavior with keywords. |
| Retain provenance | `scripts/evals/execute.ts`, `docs/EVALS.md`, run manifests | Reuse provenance concepts. Current Codex text-answer execution is not demonstrated as a provider-neutral rendered-output runner. |

### Proposed rubric anchors

For each visual/context dimension, score 0 = task-blocking or clear brief mismatch, 1 = usable with concrete friction, 2 = coherent and suitable for the supplied task/brand. Every score cites an observed region/state and rationale. Do not collapse dimensions into a single unvalidated “slop score.”

- **Clarity/hierarchy:** Primary task and action can be found without competing decorative emphasis.
- **Typography/readability:** Text hierarchy, wrapping, contrast and line length support the actual content.
- **Spacing/density:** Grouping and density match the workflow; generous whitespace is not universally better.
- **Product fit:** Choices suit the brand, audience, platform and content; coherent restraint and deliberate expressiveness can both pass.
- **Content:** No invented claims, lost labels, unexplained icons or removed recovery guidance; decorative filler can be removed when meaning is preserved.
- **Responsive/states:** Long text, mobile layout, focus, empty/error/loading and reduced-motion behavior remain usable.

Hard-gate task/keyboard/critical accessibility failures separately. Use human paired preference for taste, with disagreements visible. Browser checks establish observed behavior; expert review is not a substitute for end-user usability research.

## Options And Recommendation

1. **Recommended: evaluate existing owners, then make targeted changes.** Assumption: quality failures can be located and measured. First failure: comparable outputs cannot be produced under the allowed tool/budget boundary. Worst case: evaluation reveals model/tool limits and no useful skill delta. Cost to abandon: retain the inventory/protocol and leave guidance unchanged. Lowest-risk route because it avoids duplicating already-present capabilities.
2. **Substitute: a short “do less” prompt only.** Cheap to abandon and useful as a later comparison arm if desired. First failure: apparent simplicity removes needed information or makes diverse products converge on the same look. Does not independently satisfy the evidence contract; not selected as the solution.
3. **Defer changes / do nothing.** Valid if owners decline evaluation resources or the baseline meets the target. First failure: known quality problems remain without diagnosis. No new implementation cost, but no demonstrated improvement. Buying/installing an external suite is not selected: integration/import work is outside the user's no-copy direction and adds an unmeasured dependency.

## Evidence

| Claim | Status |
| --- | --- |
| Product-grounded direction, neutral/system-font validity, no arbitrary style bans and human approval already exist. | confirmed(`skills/common/common-ui-design/SKILL.md:25-78`) |
| Preservation tiers, structured critique and selective inspiration already exist, including UI UX Pro Max and Hallmark attributions. | confirmed(`skills/common/common-ui-design/references/human-direction.md:14-75`) |
| The inspected UI eval has three lexical/regex refinement cases, not rendered-screen scoring. | confirmed(`skills/common/common-ui-design/evals/evals.json:3-98`) |
| Reported UI-design 0% baseline / 100% with-skill concerns transcript assertions, not executable UI quality. | confirmed(`evals-report.md:4,150`) |
| The inspected runner pins model/effort, invokes Codex and instructs answer-only/no-tools behavior. | confirmed(`scripts/evals/execute.ts:31-74,146-174`) |
| Browser verification guidance and scenario coverage are present. | confirmed(`skills/common/common-web-visual-testing/SKILL.md:23-65`, `references/scenarios.md:7-75`) |
| Same-task rendered improvement across different models/providers is established. | unknown; inspected evidence does not establish it |
| Better task grounding plus observation will reduce generic/inappropriate UI. | assumed; value hypothesis requires empirical validation |
| A matching UI product evidence ledger or approved brief was found. | unknown; scoped doc searches found no matching UI/design brief; unrelated testing briefs and a synthetic marketing ledger are not UI authority |

No canonical UI product ledger IDs were established, so no strategy, OPP, DEC or MET IDs are invented or copied from another feature.

### External reference findings

Representative README inspection only; these are documented approaches, not independently verified efficacy claims. No installers, scripts or reference implementations were run.

| Reference | Principle worth evaluating | Boundary |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable) | Separate critique, technical audit and bounded refinement; distinguish source-pattern checks from rendered checks. | No detector/rule import; deterministic style-pattern flags cannot decide human taste. |
| [Google DESIGN.md](https://github.com/google-labs-code/design.md) | Persistent visual context combining precise tokens and rationale. | Assess existing local ownership before adopting a format; token conformance does not prove good UX. |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Contextual product/domain recommendations and pre-delivery checks. | Already informs local guidance; do not copy catalogue data or universalize example style restrictions. |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Explicit art direction and real-browser responsive inspection. | Do not import fixed screen-height/layout rules, bundled assets or generated palette choices as universal product rules. |
| Supplied “do less” screenshot | Remove decoration and redundant copy when task meaning survives. | Inspiration only, not benchmark evidence; keep essential helper text, labels, safety disclosures and error recovery. |

Other supplied repositories—Awesome DESIGN.md, Open Design, React Bits, emilkowalski/skills, Hallmark, GSAP Skills, Scroll World and Canvas UI—remain unassessed in this bounded external review. Hallmark attribution is confirmed locally; its external claims were not revalidated. Component, motion, 3D and WebGL references are optional implementation resources, not evidence that adding effects improves quality.

## Delivery Context, Stakeholders And Risks

| Stakeholder | Role / impact | Decision |
| --- | --- | --- |
| Requesting maintainer | Owns scope, value target and acceptance | Approve/correct this brief |
| Design-skill maintainers | Preserve canonical guidance and token economy | Review proposed owner-local changes later |
| Evaluation maintainers | Own reproducibility and evidence distinctions | Review protocol and runner feasibility later |
| Designers / consuming developers | Review task fit and repair burden | Validate rubric and blind outputs |
| End users | Experience usability and accessibility consequences | No exposure authorized; later usability validation is separate |

**Cost-benefit:** Expected value is less arbitrary UI and less rework, not yet quantified. Costs are generation runs, browser execution, independent judging and maintenance of fixtures. Monetary cost is unknown until eligible providers, quotas and run allowances are resolved. Do not claim savings or ROI from token density or transcript scores.

| Risk | Mitigation | Owner |
| --- | --- | --- |
| Anti-slop rules become another homogeneous aesthetic | Use divergent brand/task briefs; accept intentional neutral or expressive styles | Design validation owner |
| Prompt growth reduces selection/compliance | Test installed selection/loading separately; demand-load references | Design-skill maintainer |
| Model/judge variation creates false wins | Pin settings, repeat, blind order, retain ties/disagreements and per-model results | Evaluation owner |
| Guidance looks effective only after unequal repairs | Equalize tools, assets and repair allowance; count all attempts/failures | Evaluation owner |
| Skill approval is mistaken for model spend or publication consent | Separate empirical protocol, budget and activation authority | Requesting maintainer |

**Glossary:** AI-slop = generic or inappropriate output with observable task/brand/usability problems, not a prohibited visual style. Portable = understandable outside a specific model/vendor syntax. Rendered evidence = observations of a running generated artifact, not an answer claiming it was checked. Polish = local refinement preserving structure and behavior.

## Assumptions And Open Questions

- Owner, web-first fence, 30-day metric and minimum evaluation matrix were approved by the requesting maintainer's “ok” on 2026-11-06. Execution authority remains separate.
- Model eligibility, exact versions, runtime access and run budget are unknown. Evaluation owner resolves these before execution; do not route around account restrictions. No model inference runs are authorized now.
- The rubric needs calibration on example outputs and a frozen evaluation protocol. Planning can proceed; quality improvement remains an unvalidated hypothesis until empirical results exist.
- No generated product was inspected in a browser during intake, so this brief does not diagnose an actual application's visual defects.

## PM Handoff Checklist

- [x] Outcome, constraints, non-goals and candidate acceptance criteria recorded.
- [x] BRD-OBJ-001 maps to REQ-001–004 and AC-001–006; these are trace seeds, not product strategy IDs. No SRS is claimed.
- [x] Existing owners and bounded evidence identified; reference principles separated from efficacy.
- [x] Owner, SMART metric and scope fence drafted for one approval round.
- [x] Maintainer approved brief and defaults in this conversation on 2026-11-06.
- [ ] Next planning owner freezes candidate requirements and identifies empirical validation prerequisites.
- [ ] Validation owner confirms reviewers, calibration, eligible model set, execution allowance and separate authorization.

Remote acceptance window: maintainer reviews the draft at the next approval response; silence is not acceptance. No deadline or client commitment is inferred.

## Approval

Approved by the requesting maintainer's “ok” on 2026-11-06. Approval applies to this brief and its proposed defaults only; it does not authorize implementation, paid evaluation, installations, exposure, publication or rollout. Multi-task implementation still needs an explicitly settled execution approach and applicable plan approval.

## Outcome Report

```yaml
schema_version: 1
run_id: brainstorm-model-portable-ui-quality-2026-11-06
slug: model-portable-ui-quality
workflow: brainstorm-feature
feature_status: requirements_ready
started_at: 2026-11-06T16:01:16.159Z
completed_at: 2026-11-06
approval: approved(requesting-maintainer, 2026-11-06)
requirement_trace:
  brd_objectives: [BRD-OBJ-001]
  requirements: [REQ-001, REQ-002, REQ-003, REQ-004]
  acceptance_criteria: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006]
  srs: []
completed_evidence:
  - bounded canonical guidance and evaluation inspection
  - representative external README review without imports
  - provisional quality rubric and comparison protocol
missing_evidence:
  - rendered baseline and candidate UI artifacts
  - controlled per-model quality and repair results
  - calibrated independent review
  - approved execution budget and model eligibility
decision_needed: []
recommended_next_workflow: plan-feature
validation_route: validate-product before empirical efficacy claims; workflow discovered as installed
cost:
  source: unavailable
agent:
  identity: omp trusted coding assistant
  model: openai-codex/gpt-6.1-sol
```

`requirements_ready` means this approved contract is ready for planning, not that acceptance criteria have been implemented or model quality proven.

## Next Workflow

After brief approval: `plan-feature` for the first slice only. Use installed `validate-product` to precommit the bounded experiment before empirical execution; then revisit guidance/runner implementation slices only on the resulting evidence and their own approvals.

## Cost Report

Called `get_session_cost(workflow="brainstorm-feature")`. MCP reported partial telemetry; aggregate host token usage, pricing, quota consumption and total money were unavailable. No numerical total or savings is claimed. Direct filesystem skill reads and native scouting are not fully represented by the MCP consultation count.
