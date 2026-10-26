# Campaign Review Handoff & Value Scorecard Protocol
> [!WARNING] HISTORICAL CAMPAIGN DRAFT — SUPERSEDED
> This document is an initial campaign draft retained for historical context.
> **Proposed Pilot Handoff Runbook**: See [`../../pilot-handoff.md`](../../pilot-handoff.md) for the proposed preparation runbook (currently `prepared_pending_T12_and_human_acceptance`).


## Metadata
- **Campaign ID**: `standards-demo-01`
- **Initiative Slug**: `evidence-led-marketing`
- **Shared Context Revision**: `ctx-rev-20261025-capture-ee18d7f5`
- **Capture Identity**: commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (dirty `true`), snapshot tree `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` — see `capture-manifest.json`
- **Acquisition Window**: Proposed 30 Calendar Days post-authorized launch (half-open $[T_{\text{start}}, T_{\text{end}})$ in UTC; dates proposed until frozen by owner)
- **Follow-up Window**: 14 Days ($14 \times 86400\text{ s}$) for cohort maturity post-activation (Total observation up to 44 Days)
- **Baseline Status**: `unknown` (No historical quantitative adoption baseline exists; baseline is never assumed zero)
- **Budget Status**: Proposed / Unapproved (cash costs and maintainer capacity hours are strictly separated; no pre-authorized funds or labor conversion)
- **Scorecard Tool Ref**: `skills/marketing/marketing-measurement/scripts/report-marketing.mjs`

---

## 1. Review Cadence & Timeline

To ensure disciplined, evidence-based evaluation, campaign outcomes are reviewed at fixed milestones:

```text
Launch (Day 0) ──► Day 7 (W1) ──► Day 14 (W2) ──► Day 21 (W3) ──► Day 28 (W4) ──► Day 30 (Close Acquisition) ──► Day 44 (Full Maturity)
                     │              │              │              │                    │                              │
                     ▼              ▼              ▼              ▼                    ▼                              ▼
                 Weekly Health Check & Issue Triage                         Day 30 Interim Review         Day 44 Final Value Review
                 (Track Maintainer Hours & Support Friction)                 (Immature Cohort Partition)   (All Activations Mature)
```

---

## 2. Weekly Health Check Template (Days 7, 14, 21, 28)

Conducted by the designated Response Owner during the 30-day acquisition window:

```markdown
### Weekly Campaign Health Check: Day [N]
- **Date**: YYYY-MM-DD
- **Reviewer**: [Name / Response Owner]
- **Maintainer Support Hours Logged**: [Hours] (Tracking capacity drain)
- **Triage Summary**:
  - Issues filed mentioning installation / sync: [Count]
  - Identified onboarding blockers: [Descriptions]
  - Community feedback themes (Show HN / Discussions): [Notes]
- **Operational Status**: [healthy | support_overloaded | critical_bug_blocked]
```

---

## 3. Day 30 Interim Review Protocol (Acquisition Close)

At Day 30, public distribution and active campaign promotion conclude. 

### Cohort Partitioning Rules (SRS-002, SRS-004):
- Exact cohort maturity is governed strictly by seconds in UTC: an activation $a$ is mature iff $\min(T_{\text{as\_of}}, T_{\text{coverage\_end}}) \ge a + 14 \times 86400\text{ s}$.
- Calendar-day boundaries (such as "Day 0 to Day 16") are informal illustrative heuristics only; whether an activation is mature depends on its exact timestamp $a$ and coverage cutoff.
- Immature activations ($\min(T_{\text{as\_of}}, T_{\text{coverage\_end}}) < a + 14 \times 86400\text{ s}$) **MUST NOT** be counted in the mature repeat-rate denominator.
- Because the full cohort has not matured, the Day 30 repeat-rate recommendation is typically `inconclusive`.
```markdown
### Day 30 Interim Review Record
- **Total Eligible Starters**: [Count]
- **Total Activations Observed**: [Count]
  - *Mature Activations ($\ge 14$ days)*: [Count]
  - *Immature Activations ($< 14$ days)*: [Count]
- **Interim Mature Repeat Rate**: [R / Mature Activated] (or `unavailable: immature_cohort`)
- **Interim Recommendation**: `inconclusive` (Awaiting Day 44 full maturity)
```

---

## 4. Day 44 Final Value Review Protocol (Cohort Maturity)

At Day 44 ($30 \text{ days} + 14 \text{ days}$ post-launch), participants who activated during the 30-day window achieve full 14-day maturity *provided* observation coverage extends through their full 14-day window ($\min(T_{\text{as\_of}}, T_{\text{coverage\_end}}) \ge a + 14 \times 86400\text{ s}$). If coverage ends prematurely, activations remain immature.

### Scorecard Execution Command:

> [!CAUTION]
> **UNSAFE FOR ACTUAL DATA**: Never run scorecard commands for real participant cohorts against public repository directories (`docs/product/evidence-led-marketing`). Real participant data and consent logs must reside strictly in an approved private storage location outside git (`--authority-root <absolute-path-to-private-root>`). See authoritative runbook in [`../../pilot-handoff.md`](../../pilot-handoff.md).

For offline synthetic fixture verification only (retained for pipeline smoke tests):
```bash
node skills/marketing/marketing-measurement/scripts/report-marketing.mjs \
  docs/product/evidence-led-marketing/fixtures/synthetic-input-combined.json \
  --authority-root docs/product/evidence-led-marketing \
  --as-of 2026-10-15T00:00:00Z \
  --format markdown
```

### Final Cohort Partition (Canonical SRS-002 & SRS-003):
A participant is mature if effective cutoff $\min(T_{\text{as\_of}}, T_{\text{coverage\_end}}) \ge a + 14 \times 86400\text{ s}$ ($14 \times 24\text{h}$). Note: Day 44 is not automatically fully mature if coverage ends prematurely ($T_{\text{coverage\_end}}$ short).
Among mature activations, participants are partitioned into three mutually exclusive subsets based on activity during their 14-day observation window:
1. `mature_confirmed_repeat`: Demonstrated qualifying repeat command/sync execution *within* the 14-day window ($a < \text{repeat} \le a + 14\text{ days}$) on a different UTC calendar date from activation $a$.
2. `mature_confirmed_no_return`: Consented explicit confirmation of discontinuation or verified zero qualifying activity throughout the entire 14-day window ($a$ through $a + 14\text{ days}$).
3. `mature_unknown`: Unobserved, ambiguous, or unconfirmed activity during the 14-day window.

$$\text{Confirmed-Observed Repeat Rate} = \frac{\text{mature\_confirmed\_repeat}}{\text{mature\_activated}}$$
*(Unknowns remain in the denominator; no optimistic imputation).*

---

## 5. Pre-Declared Decision Rules (PRD Section 6)

The review must select strictly from four pre-declared recommendations based on empirical evidence:

| Recommendation | Formal Decision Criteria | Actionable Outcome |
|---|---|---|
| **`scale`** (Advisory Only) | Verified high repeat adoption, manageable support capacity drain, and absence of critical blockers. | Maintainer considers expanding distribution to new ecosystems. *Advisory only; requires explicit new campaign owner authorization.* |
| **`iterate`** | Demonstrable developer interest but identified friction in CLI setup, agent configuration, or documentation clarity. | Refine onboarding tutorial, improve error messages in `ags sync`, or adjust default `.skillsrc` templates. |
| **`stop`** | Low developer activation, zero confirmed repeats, or persistent maintenance burden exceeding capacity. | Halt further promotional distribution; maintain repository in passive community mode. |
| **`inconclusive`** | Missing cost mapping, unobserved cohort maturity, insufficient sample size, or contradictory evidence. | Maintain status quo; do not draw causal marketing conclusions or claim ROI. |

---

## 6. Reviewer Sign-Off Block (Draft Template)

*Note: Sign-off template only. No pre-authorized approvals, simulated reviews, or synthetic signatures.*

```markdown
### Milestone Review Sign-Off Template
- **Milestone**: [Day 30 Interim | Day 44 Final]
- **Scorecard Tool Revision**: [Git SHA / Executable Hash]
- **Final Recommendation**: [scale (advisory) | iterate | stop | inconclusive]
- **Evidence Ledger Entry**: [Reference to approved private evidence ledger record]
- **Authorized Campaign Owner**: [Name] Date: YYYY-MM-DD
- **Approval Decision**: [Pending Owner Review]
```
