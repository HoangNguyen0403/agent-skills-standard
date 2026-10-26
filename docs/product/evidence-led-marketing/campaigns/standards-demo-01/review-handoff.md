# Campaign Review Handoff & Value Scorecard Protocol

## Metadata
- **Campaign ID**: `standards-demo-01`
- **Initiative Slug**: `evidence-led-marketing`
- **Shared Context Revision**: `ctx-rev-20261025-capture-ee18d7f5`
- **Capture Identity**: commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (dirty `true`), snapshot tree `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` — see `capture-manifest.json`
- **Acquisition Window**: 30 Calendar Days post-authorized launch
- **Follow-up Window**: 14 Calendar Days for cohort maturity (Total observation: 44 Days)
- **Baseline Status**: `unknown` (No historical quantitative adoption baseline exists; baseline is never assumed zero)
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
- Participants who activated between Day 0 and Day 16 have achieved $\ge 14$ days of observation $\to$ **Mature Activated**.
- Participants who activated between Day 17 and Day 30 have been observed for $< 14$ days $\to$ **Immature Activated**.
- Immature activations **MUST NOT** be counted in the repeat-rate denominator.
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

## 4. Day 44 Final Value Review Protocol (Full Cohort Maturity)

At Day 44 ($30 \text{ days} + 14 \text{ days}$), every participant who activated during the 30-day window has reached full 14-day maturity.

### Scorecard Execution Command:
```bash
node skills/marketing/marketing-measurement/scripts/report-marketing.mjs \
  <path-to-approved-observed-cohort.json> \
  --authority-root docs/product/evidence-led-marketing \
  --as-of <Day-44-UTC-Timestamp> \
  --format markdown
```

### Final Cohort Partition (Canonical SRS-002 & SRS-003):
A participant is mature if effective cutoff $\ge a + 14\text{ days}$ ($14 \times 24\text{h}$).
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
| **`scale`** (Advisory Only) | High confirmed repeat rate ($\ge 0.40$), low maintainer support drain ($< 5\text{ hrs/week}$), zero critical unresolved bugs. | Maintainer considers expanding distribution to new ecosystems. *Requires new owner authorization.* |
| **`iterate`** | Moderate interest but friction identified in CLI setup, agent configuration, or documentation clarity. | Refine onboarding tutorial, improve error messages in `ags sync`, or adjust default `.skillsrc` templates. |
| **`stop`** | Low developer activation ($< 5\%$ starter conversion), zero confirmed repeats, or persistent maintenance burden. | Halt further promotional distribution; maintain repository in passive community mode. |
| **`inconclusive`** | Missing cost mapping, unobserved cohort maturity, insufficient sample size, or contradictory evidence. | Maintain status quo; do not draw causal marketing conclusions or claim ROI. |

---

## 6. Reviewer Sign-Off Block

```markdown
### Final Milestone Sign-Off
- **Milestone**: [Day 30 Interim | Day 44 Final]
- **Scorecard Tool Revision**: [Git SHA / Executable Hash]
- **Final Recommendation**: [scale | iterate | stop | inconclusive]
- **Evidence Ledger Entry**: [Reference to evidence.json record]
- **Reviewer Signature**: _______________________ Date: YYYY-MM-DD
```
