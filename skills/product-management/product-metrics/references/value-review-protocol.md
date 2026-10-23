# Post-Release Product Value Review Protocol

## 1. Purpose & Scope

The Product Value Review (`REV`) evaluates whether a released feature or initiative achieved its intended customer and business outcomes. It operates post-rollout to provide evidence-based accountability for investment decisions.

- **System of Record**: The value review is recorded as a `REV` record in `docs/product/<slug>/evidence.json`.
- **Separation from Delivery Status**: A release marked as `released` in engineering trackers or outcome reports indicates that deployment succeeded. It does not indicate that product value was realized.
- **Outcome v1 Delivery Status Invariant**: Engineering delivery traces use the actual closed `feature_status` enum:
  `not_started | requirements_ready | design_ready | partially_implemented | implemented | verified | released | blocked`
  (`draft` and `reviewed` are not delivery statuses). When a post-release value review concludes with `recommendation = "inconclusive"`, engineering delivery status remains `released`. Product discovery uncertainty does NOT unrelease delivery.

## 2. Linking Investment, Hypotheses, and Observations

Every `REV` record traces back to the foundations of the initiative:
1. **Historical Investment Decision (`decision`)**: Reference to the original recorded `DEC` that authorized development.
   - *Authority Boundary*: The historical investment `DEC` serves as **historical attribution only**. It does not grant current authority to expand, pivot, or retire the feature. Any subsequent action requires a new recorded decision.
2. **Hypotheses (`hypotheses`)**: Array of `HYP` references that defined the expected mechanism of value creation.
3. **Metrics (`metrics`)**: Array of `MET` references specifying the measurement contracts and targets evaluated. Recommending `scale` or asserting `causal_supported` requires metrics with `observed` status.
4. **Observations (`observations`)**: Array of `SRC` references containing empirical measurement data captured during the comparison window.
5. **Actual Costs (`actual_costs`)**: Array of `SRC` references containing realized incremental cost data.
6. **New Value Review Decision**: Executing any recommendation requires formulating a new `DEC` record (`purpose: "value_review"`), which must bind current valid strategic authority (`strategy_binding`), current authorization (`authority_id`), and readable artifact bindings.

## 3. Causal Attribution vs. Descriptive Correlation

A critical flaw in product evaluation is attributing general business movement to specific software releases without considering external factors.

### Closed Attribution Classifications

- `causal_supported`: Empirical evidence provides rigorous justification for attributing observed delta to the product change (e.g., randomized controlled trial, difference-in-differences analysis with parallel trends, or isolated cohort comparison).
- `descriptive`: Behavioral or revenue movement coincided with the release, but confounding variables cannot be ruled out.
- `unknown`: Data is incomplete, confounded, uncollected, or cohort is unseasoned; no causal link can be asserted.

### Confounders and Counterfactuals

The value review must document:
- **Counterfactual Baseline**: What would have happened in the absence of the release? (e.g., holdout cohort, historical seasonal trend, unaffected geography).
- **Confounding Variables**:
  - *Marketing & Sales Activity*: Concurrent promotions, discount campaigns, ad spend surges.
  - *Seasonality & Holidays*: Cyclic demand shifts (e.g., Q4 retail surge, end-of-year enterprise budget flushes).
  - *Macroeconomic Shifts*: Inflation, regulatory deadlines, competitor outages or price hikes.
  - *Concurrent Product Changes*: Simultaneous feature launches, pricing updates, or infrastructure migrations.
- **Rule**: If revenue increased following a release, but concurrent promotional spend increased by $500k, claiming the feature produced a 300% ROI is prohibited. The attribution must be marked `descriptive` or `unknown`, and the recommendation marked `inconclusive`.

## 4. Actual Incremental Cost Boundary

Computing net value or return requires measuring actual realized costs, not just initial development estimates:
- **Eligible Incremental Costs**:
  - Ongoing cloud infrastructure, compute, and database storage scaling.
  - Third-party API, vendor, or licensing fees incurred by feature usage.
  - Customer support ticket volume and specialized escalation overhead.
  - Maintenance, defect remediation, and operational toil.
- **Excluded Costs**: Unrelated sunk development costs, fixed enterprise overhead not affected by the feature.
- **Missing Cost Data**: If actual operational costs cannot be verified, the review must explicitly state this limitation and disallow definitive net ROI calculations.

## 5. Review Recommendations

The review concludes with one of four explicit recommendations via `REV.data.recommendation`:

| Recommendation | Criteria | Next Action |
| --- | --- | --- |
| `scale` | Primary metrics observed with `causal_supported` attribution; guardrails respected; actual benefits exceed incremental costs. | Propose strategic rollout expansion or general availability via human approval. |
| `iterate` | Causal direction positive, but targets missed due to identifiable friction; guardrails intact; incremental cost bounded. | Propose bounded optimization hypotheses (`HYP`) or UX refinements. |
| `stop` | Hypothesis refuted; negative net outcome; or guardrails breached (e.g., churn spike). | Propose phased deprecation or feature retirement to human operators. |
| `inconclusive` | Confounded observations; immature cohort; measurement pipeline failure; or unobserved counterfactual. | Extend observation window, redesign telemetry, or accept risk. Delivery stays `released`. |

- **Schema Invariant**: `REV` has NO `status` or `completed` field. Admissible states are managed strictly through `recommendation` and `attribution.classification`.

## 6. Human Authority Boundary

- **Advisory Role**: Recommendations in a `REV` record are strictly advisory inputs for human operators and executive sponsors.
- **No Autonomous Execution**: The value review protocol and validator never autonomously:
  - Increase traffic exposure or rollout percentages.
  - Decommission, disable, or retire production features.
  - Reallocate capital, budget, or engineering headcount.
- **New Decision Gate**: Executing any recommendation requires formulating a new `DEC` record (`purpose: "value_review"`, `status: "proposed"`), which must obtain human operator authorization through authorized governance channels.

## 7. Limitation Diagnosis

When outcomes miss their target or value is unavailable, distinguish a limitation inside the solution from a surrounding organizational constraint before recommending action:

- **Solution-internal**: investigate evidenced defects, capacity limits, or design constraints. Identify the observed behavior, affected cohort/window, and the evidence needed to test the suspected mechanism.
- **Organizational or enterprise**: investigate evidenced process, policy, skills, or adoption constraints. Identify the relevant context, the evidence supporting the suspected constraint, and the accountable owner for deciding or investigating it.
- **Do not infer cause from the KPI alone.** Record observations separately from causal hypotheses and uncertainty. If evidence does not distinguish the explanations, say so and recommend investigation rather than asserting a cause, prescribing a software change, or claiming value.
- A similar metric shortfall can imply different next steps; match the advisory recommendation to the supported explanation and its accountable decision/action owner. Do not promise that shipping will cause value or infer ROI from a proposed fix.
- Keep technical delivery, business acceptance, release authority, and realized value distinct. Negative or unavailable value does not downgrade `released` delivery. Recommendations do not authorize policy changes, rollout, or retirement.
