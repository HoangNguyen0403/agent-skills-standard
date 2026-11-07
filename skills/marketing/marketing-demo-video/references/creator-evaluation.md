# Offline Creator Evaluation Contract

Reusable precommitment evaluation contract for comparing baseline versus candidate creator video workflows. Proposal-only; does not authorize spend, live exposure, media uploads, or ledger mutations.

## 1. Scope, Ingress, & Reference Resolution

- **Ingress**: Consumed on demand by optional video editorial workflows prior to authorized comparisons. Entrypoints in parent skills are wired by the integration owner.
- **Reference Resolution**: `<skill-root>` designates the directory containing category directories or flattened packages:
  - Standard layout: `<skill-root>/marketing/marketing-measurement/SKILL.md`, `<skill-root>/product-management/product-experimentation/SKILL.md`, and package-local `creator-editorial.md`.
  - Flattened layout: `<skill-root>/marketing-marketing-measurement/SKILL.md`, `<skill-root>/product-management-product-experimentation/SKILL.md`, and package-local `creator-editorial.md`.
  - MCP direct lookup: `get_skill("marketing", "marketing-measurement")`, `get_skill("product-management", "product-experimentation")`.

## 2. Invariants & Accounting Rules

1. **Baseline Unknown**: Baseline creation, review, and rework time is unmeasured until collected; hypotheses and targets are not observed facts.
2. **Capacity vs Cash & Separate Raw Log Fields**: Time is recorded strictly as labor capacity hours (`labor_capacity_hours`, preserved to 4 decimals, e.g. `0.000100` hrs). Cash expenditures (`cash_spend_usd`) must be logged in separate dedicated fields. Labor hours must never be converted to monetary savings, margin, or financial ROI. Unknown cash savings must be reported as `unavailable`, never `0` or assumed zero without evidence.
3. **Full Attrition Accounting**: All planned pairs, dropouts, and consumed hands-on time (including rework and abandoned attempts) must be reported; selective post-hoc pair exclusion is prohibited.
4. **Finite Proposed Bounds**: Default proposed parameters are `budget_cap: null` and `exposure_cap: 0`. Any live execution requires explicit separate maintainer authorization.
5. **Explicit Frozen Revisions**: Source revisions (`source_revision`) and query revisions (`query_revision`) must be explicitly recorded, frozen, and held identical across both comparison arms.

## 3. Precommitment Protocol

Before observing candidate outputs, precommit to:
- **Comparable Briefs**: Minimum proposed benchmark of five ($N \ge 5$) paired briefs defining audience, problem, offer or explicit no-offer, format/language, target duration, and source evidence.
- **Controlled Environment**: Hold all model versions, runtime parameters, tools, frozen source revisions (`source_revision`), frozen query revisions (`query_revision`), and creator skill levels fixed across both arms EXCEPT the intended candidate skill guidance.
- **Mitigating Order Bias**: Counterbalance execution order across briefs (alternating baseline-first and candidate-first) to mitigate order and fatigue bias; log run order and report any observed carryover.
- **Quality Non-Regression Rule**: Candidate output quality must meet or exceed baseline across all evaluated dimensions without regressing. Before outputs are observed, precommit to explicit scoring anchors, an aggregation method across briefs, and an allowable regression threshold (operator-precommitted; zero regression allowed on fatal gates). An independent reviewer scores anonymized packages across factual accuracy (fatal gate), promise delivery, narrative coherence, rights/consent clearance (fatal gate), and accessibility. For draft script packages, evaluate caption readability and structure; reserve rendered WebVTT/font verification for when media rendering was requested.
- **Raw Accounting Breakdown**: Record separate raw fields per brief: hands-on creator drafting ($T_{\text{create}}$), reviewer inspection ($T_{\text{review}}$), and rework ($T_{\text{rework}}$) for labor capacity (`labor_capacity_hours`), alongside any cash outlays (`cash_spend_usd`). Total time $T_{\text{total}} = T_{\text{create}} + T_{\text{review}} + T_{\text{rework}}$.
- **Observation Window & Stop Rules**: 30-day proposed observation window from authorized start. Mandatory immediate stop on any critical factual hallucination, safety violation, or rights breach (which immediately stops the evaluation and disqualifies overall success). Operational stops (rework limits, review burden multipliers, spend limits) require operator precommitment before start; no arbitrary defaults are imposed.

## 4. Decision Metric & Classification

- **Decision Metric**: Median hands-on time reduction: $\Delta T_{\text{median}} = (\text{median}(T_{\text{baseline}}) - \text{median}(T_{\text{candidate}})) / \text{median}(T_{\text{baseline}})$. The 20% reduction target across $\ge 5$ accepted pairs within 30 days is a proposed customizable benchmark, not universal policy.
- **Classification Precedence**:
  1. **Mandatory Inconclusive (Highest Precedence)**: Required if baseline is unknown or unmeasured, sample size is insufficient, quality is unreviewed, confounded, or sacrificed (regressed), reviewer was unblinded, baseline denominator is zero, pairs were selectively discarded, or any critical factual, rights, or safety failure occurred. Prohibits claiming target success or financial return.
  2. **Supported**: Precommitted sample completed ($N \ge 5$), baseline verified, $\Delta T_{\text{median}} \ge \text{target}$, quality non-regressed under precommitted scoring anchors and aggregation, zero fatal gate failures. Proposes investment review; does not authorize automatic build or monetary claims.
  3. **Refuted**: Complete, valid, quality-nonregressed sample that fails to achieve the time reduction target ($\Delta T_{\text{median}} < \text{target}$). Routes to iteration or deferral; goalposts must not be moved post-hoc.

## 5. Precommitment Template Specification (Headers/Fields-Only)

```yaml
precommitment_contract:
  schema_version: 1
  evaluation_id: null       # Bound upon maintainer authorization
  status: "proposal_only"   # Requires host authorization before run
  authorized_by: null       # AUTH reference
  target_metric:
    name: "Median hands-on creation plus review/rework time"
    target_reduction_ratio: 0.200000  # Proposed customizable benchmark
    precision_hours: 6
    monetary_conversion_allowed: false
  sample_plan:
    min_paired_briefs: 5    # Proposed customizable minimum
    brief_ids: []           # Operator-supplied brief identifiers
    all_pairs_reported: true
  workflow_arms:
    baseline: { description: "", entrypoint: "" }
    candidate: { description: "", entrypoint: "" }
  controls:
    fixed_settings: ["model", "temperature", "toolchain"]
    frozen_revisions: { source_revision: null, query_revision: null }
    counterbalanced_order: true
    blinded_review: true
  quality_nonregression:
    scoring_anchors: []              # Precommitted quality anchors before observing output
    aggregation_method: null         # E.g. median_or_mean_across_briefs
    allowable_regression: 0.0        # Operator-precommitted threshold (0.0 on fatal gates)
    fatal_gates: ["factual_accuracy", "rights_clearance", "safety"]
  raw_log_fields:
    capacity: ["t_create_hours", "t_review_hours", "t_rework_hours", "labor_capacity_hours"]
    cash: ["cash_spend_usd"]
  bounds:
    starts_at: null
    ends_at: null            # Starts_at + precommitted window (e.g. 30d)
    budget_cap: null         # Null until authorized; default zero spend
    exposure_cap: 0          # Default offline
    operator_stop_rules: []  # Precommitted limits for rework, review, spend
    mandatory_safety_stop: "critical_factual_rights_or_safety_failure"
```

## 6. Walkthrough Disposition Summary

- **Positive (Supported)**: Precommitted briefs completed in counterbalanced order, verified baseline, efficiency target met, blinded quality non-regressed under precommitted anchors/aggregation, zero critical failures, full attrition reported. Disposition: `SUPPORTED`. Labor capacity reported; cash savings reported as `unavailable` unless verified accounting establishes known zero.
- **Negative (Refuted)**: Complete valid quality-nonregressed sample missing time target ($\Delta T_{\text{median}} < \text{target}$). Disposition: `REFUTED`. Threshold preserved.
- **Inconclusive**: Missing baseline, unmeasured baseline, insufficient pairs, confounded quality, review absent, sacrificed quality, discarded pairs, or critical failure. Disposition: `INCONCLUSIVE`. Target achievement and financial ROI claims forbidden.
