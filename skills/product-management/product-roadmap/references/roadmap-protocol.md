# Product Roadmap Protocol

## 1. Outcome-Based Roadmapping vs. Output Calendars

A product roadmap is a strategic statement of intent, prioritized opportunities, and learning milestones designed to achieve business and customer outcomes. It is not an unchangeable feature release schedule.

- **Output Feature Calendars (Anti-Pattern)**: Gantt charts committing specific feature deliverables to fixed calendar dates quarters in advance. They assume certainty where none exists, incentivize shipping features over solving problems, and make honest learning difficult.
- **Outcome Roadmaps**: Structured around prioritized customer problems (`OPP`), strategic objectives (`strategy_authority`), and falsifiable hypotheses (`HYP`). Features are treated as candidate interventions that may be altered, replaced, or dropped based on validation evidence.

## 2. Capacity Constraints & Displaced Work

Engineering, product, and design capacity is strictly bounded. Prioritization is a zero-sum exercise.

### The Displacement Rule

Whenever a new initiative is introduced or an existing initiative is accelerated to higher priority, the roadmap decision must explicitly record:
1. **Displaced Work**: Exactly which initiatives, features, or maintenance tasks are being deferred, de-scoped, or abandoned to free up capacity.
2. **Impact on Strategic Commitments**: Which business objectives or customer cohorts are affected by the delay of the displaced work.
3. **Rationale**: Why the new opportunity provides superior expected value, risk reduction, or strategic necessity compared to the displaced initiatives.

### Capacity-Hours vs. Realized Cash

- **Zero-Sum Capacity**: High priority does not create capacity. Assuming a team can "squeeze in" a new high-priority project without displacing existing commitments produces hidden burnout, technical debt, and compromised verification.
- **Capacity Is Not Cash**: Saved engineering or user capacity hours are informational efficiency metrics. They do NOT constitute monetary cash savings or realized financial return unless a separate finance-reviewed cash mechanism documents actual avoided cash expenditures, without double counting.

## 3. Dependency Mapping & Sequencing

Sequencing must respect technical, architectural, regulatory, and cognitive prerequisites.

- **Prerequisite Validation**: Never sequence full-scale implementation of a downstream solution dependent on an unvalidated upstream premise.
- **Dependency Classification**:
  - *Data & Infrastructure Dependencies*: Underlying schemas, telemetry pipelines, APIs, or authentication mechanisms.
  - *Regulatory & Compliance Gates*: Privacy assessments, security audits, compliance clearances.
  - *Learning Dependencies*: Insights from initial user research or prototype experiments required to inform subsequent architecture.
- **Critical Path Hygiene**: If Initiative B depends on Initiative A, Initiative B must not be scheduled for full build concurrently with Initiative A's discovery phase.

## 4. Prioritization Heuristics and Boundaries

Teams often employ directional scoring frameworks to evaluate candidate opportunities:

| Framework | Core Factors | Legitimate Utility | Abuse / Anti-Pattern |
| --- | --- | --- | --- |
| **RICE** | Reach, Impact, Confidence, Effort | Relative comparison among similar candidate features. | Equating a high RICE score to monetary ROI or financial NPV. |
| **WSJF** | Cost of Delay, Job Size | Queue sequencing to minimize cost of delay. | Treating subjective estimates as actuarial risk measurements. |
| **Kano** | Must-be, Performance, Attractive | Categorizing user expectation levels. | Using "Attractive" label to bypass basic operational stability. |

### Fundamental Boundaries

1. **Scores Are Not ROI**: A RICE score of 1,200 is a unitless ordinal index. It provides zero information regarding net monetary value, payback period, or accounting return. Financial ROI requires formal modeling via financial contracts.
2. **Deadlines Are Not Demand**: An executive mandate, trade show date, or partner request is a calendar constraint. It does not validate customer willingness to adopt, pay for, or retain a product.

## 5. Learning Milestones Over Feature Timelines

Roadmap progression must be gated by empirical learning milestones rather than calendar deliverables:

1. **Problem Validation Milestone**: Customer problem verified via direct observation (`CLM` confirmed, `OPP` candidate selected).
2. **Viability & Feasibility Milestone**: Business model viability, technical feasibility, and legal compliance verified (`INV` proposal reviewed).
3. **Hypothesis Validation Milestone**: Bounded experiment completed with empirical evidence supporting primary hypothesis (`EXP` completed, `HYP` supported, learning `DEC` recorded).
4. **Implementation & Delivery Gate**: Software built, verified against acceptance criteria, and deployed (`feature_status: "released"`).
5. **Value Realization Milestone**: Post-release product value review evaluating realized outcomes against baseline evidence (`REV` concluded with human recommendation `scale | iterate | stop | inconclusive`).
