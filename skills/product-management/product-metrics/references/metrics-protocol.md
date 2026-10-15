# Product Metrics Protocol

## 1. Principles: Outcome vs. Output

Product management must measure the realization of customer value and business impact, not the volume or velocity of engineering output.

- **Output**: Lines of code, user stories completed, PRs merged, sprints finished, features released to production. Output reflects activity and delivery capability, not value creation.
- **Outcome**: Measurable changes in user behavior, problem resolution, task efficiency, operational cost, or business health resulting from the product capability.
- **Delivery Independence**: A feature that is 100% complete, verified by test suites, and deployed to production may still yield zero or negative customer outcome. Verification of delivery must remain strictly separate from verification of product value.

## 2. Measurement Contract Specification (`MET`)

Before any feature rollout or experiment execution, a formal measurement contract must be defined and recorded as a `MET` record in the product evidence ledger.

### Contract Parameters

1. **Definition**: Unambiguous description of the observable phenomenon being quantified. Must specify exactly what is counted or timed.
2. **Unit**: Formal physical or business unit (e.g., `milliseconds`, `percentage_points`, `count_per_session`, `USD_cents`).
3. **Denominator**: The exact normalizing population or event count (e.g., "total completed onboarding flows initiated by newly registered organizations", NOT "total signups"). Vague or absent denominators produce vanity metrics that obscure true rates.
4. **Eligible Cohort**: Rigorous filtering criteria defining who or what qualifies for measurement (e.g., "B2B accounts on the Professional tier active within the EU region during the trial period").
5. **Comparison Window**: Explicit UTC time boundary (`start` and `end` timestamps) defining when the intervention is evaluated.
6. **Query & Query Revision**:
   - `query`: A reference to the exact source (`SRC`) defining the data extraction script, SQL query, or event schema.
   - `query_revision`: Must match the exact origin revision of the referenced `SRC`. If the query script is modified, the metric must be updated to a new revision.
7. **Target**: Predeclared quantitative threshold or direction of desired movement.
8. **Guardrails**: One or more counter-metrics designated to detect unintended side effects (e.g., error rate, p99 latency, support ticket volume, cancellation rate).
9. **Measurement Owner**: The human role or individual accountable for instrumenting, verifying, and reporting the metric.
10. **Review Trigger**: An explicit calendar date, event milestone, or threshold breach that triggers a mandatory review of the metric's performance.

### Closed Lifecycle Statuses

The normative contract strictly bounds `MET.data.status` to four admissible values:
- `planned`: Metric contract defined; instrumentation or query not yet deployed.
- `instrumented`: Query and telemetry verified in production; baseline or test events verified. Requires non-null `query` and matching `query_revision`.
- `observed`: Measurement data collected across the comparison window and analyzed. Requires non-null `query` and matching `query_revision`.
- `unavailable`: Data collection failed, pipeline corrupted, data pipeline lacks required telemetry, or cohort data is immature. Must be explicitly reported with reasons in `limitations` or source rationale; never estimated.
- **Rule**: `immature` is NOT a valid status enum. An immature observation window must be classified as `unavailable` with an explicit maturity limitation.

## 3. Baseline Evidence and Scoped Baseline Exceptions

Before committing to a release gate, the system requires verified baseline evidence or an explicit scoped baseline exception.

### Baseline Evidence Requirements

- **Value**: Formally recorded decimal string representing historical performance under the status quo.
- **Source**: Reference to an accessible `SRC` record holding the historical data extract and retrieval metadata.
- **Window**: The historical measurement window must precede the intervention. Strictly:
  $$\text{baseline.window.end} \le \text{comparison\_window.start}$$
  Overlapping or future baseline windows are invalid.

### Baseline Exception Protocol

When historical baseline data is legitimately impossible to capture (e.g., entirely novel product category, greenfield feature, regulatory changes altering past comparables):
- **Exclusive XOR Choice**: The ledger enforces `baseline XOR baseline_exception`. A metric cannot declare both.
- **Current Non-Retired Exception Decision**: A `baseline_exception` must reference an exact, current, non-retired recorded `DEC` record:
  - `purpose`: `"release"`
  - `outcome`: `"risk_accept"`
  - Scope: Must match the exact scope and revision of the consuming `MET`.
  - Consumes: Must consume the exact current `MET` and list it in `depends_on`.
  - Authority & Bindings: Must bind current valid authorization authority (`AUTH`) and readable artifact bindings.
- **Helper Exclusion**: Helper release DECs referenced exclusively as a MET `baseline_exception` are excluded from normal release decision selection to prevent candidate ambiguity.
- **Graph Traversal & Termination**: In the validator's `exception` role, traversal visits the exception DEC and its supporting evidence without requiring a baseline on that referenced MET. The descriptive cycle (`MET -> baseline_exception DEC -> MET`) terminates safely at the visited `(pair, role)` worklist entry without cutting query, guardrail, or other source edges.
- **Boundary of Exception**:
  - Documents explicit, conscious acceptance of risk by the human decision authority.
  - Does **NOT** waive the requirement to define the metric query, denominator, or eligible cohort.
  - Does **NOT** waive guardrail monitoring or stop rules.
  - Does **NOT** fabricate customer consent or executive mandate.
  - Does **NOT** allow moving target thresholds after release.

## 4. Guardrail Metrics & Safe Escalation Boundary

A metric improvement that degrades system health or customer experience is a net negative.

- **Precommitment**: Guardrail metrics and acceptable deviation thresholds must be established *prior* to rollout.
- **Breach Escalation vs. Autonomous Action**:
  - A guardrail breach (e.g., error rate $> 0.5\%$, latency degradation $> 200\text{ms}$, cancellation spike) invalidates positive primary metric gains.
  - If a pre-authorized, host-authenticated runtime stop control was explicitly configured and authorized within bounds, automated containment executes under those declared rules.
  - In the absence of an authenticated runtime stop control, the agent/observer must immediately escalate the finding to the authorized incident/operator route (`incident-hotfix`) as an urgent human containment recommendation.
  - **Critical Invariant**: MET, REV, and validator output do NOT grant autonomous release, halt, rollback, retirement, budget, or exposure authority. The skill cannot execute production traffic manipulation without human/operator execution authority.
- **Prohibition on Cherry-Picking**: Teams may not ignore guardrail breaches by citing positive primary metric movement (e.g., "conversion rose 3% even though churn doubled").

## 5. Leading vs. Lagging Maturity

- **Leading Metrics**: Immediate behavioral signals (e.g., daily feature engagement, step completion rate). Useful for early feedback, but insufficient to establish durable economic value.
- **Lagging Metrics**: Definitive outcome signals (e.g., 90-day retention, annual contract expansion, customer support cost reduction).
- **Immature Cohort Rule**: If a lagging metric requires a 90-day observation window, an evaluation conducted at day 14 must record `MET.data.status = "unavailable"` with reason `"Immature observation window (14 of 90 days elapsed)"`, and any associated post-release value review must set `recommendation = "inconclusive"` and `attribution.classification = "unknown"` or `"descriptive"`. Premature extrapolation of short-term curves into long-term outcomes is strictly prohibited.
