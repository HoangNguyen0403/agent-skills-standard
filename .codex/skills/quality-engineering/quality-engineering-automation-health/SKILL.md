---
name: quality-engineering-automation-health
description: Measures whether an automation suite builds release confidence via feedback-loop length, suite reliability, release cadence, and production escape rate, and emits a release_confidence verdict. Use when judging suite value, ROI, or pre-release trust; not for writing or healing tests.
metadata:
  triggers:
    keywords:
      - automation health
      - release confidence
      - suite reliability
      - flaky rate
      - feedback loop
      - escape rate
      - automation roi
      - suite value
---
# Quality Engineering: Automation Health

## **Priority: P1 (HIGH)**

## Mission

Automation exists to reduce ambiguity at release time, not to catch every bug. Finding bugs is testing's job; building confidence is automation's. Judge a suite by whether the team can deploy on Friday afternoon without fear.

## Three Questions

A high-value suite answers all three with evidence:

1. **Core workflows intact**: the flows that create revenue and user value still run end to end.
2. **No serious regression**: the latest change did not break what was already stable.
3. **Fast feedback**: a developer learns what they broke in minutes, not hours.

## Four Metrics

| Metric | Key | Question it answers |
| --- | --- | --- |
| Feedback loop | `feedback_loop_minutes` | How long from push to a trusted green or red? |
| Suite reliability | `suite_reliability_pct` | When a run is red, does the team investigate or just re-run? |
| Release cadence | `release_cadence` | Did automation let the team ship more often without more production risk? |
| Production escape rate | `prod_escape_rate` | How many serious defects passed the whole pipeline and reached real users? |

Formulas and data sources per CI provider live in [Metrics Definitions](references/metrics-definitions.md).

## Verdict

`release_confidence: high | medium | low`

- `high`: all three questions answered yes with evidence; reliability at or above the team threshold; escape rate at or below baseline; feedback loop within target.
- `medium`: one question lacks evidence, or reliability or feedback loop misses target while escapes stay at baseline.
- `low`: any question answered no, a red run is not trusted, or escape rate rose after the last release.

Report with [Confidence Report Template](references/confidence-report-template.md); feed `release_confidence` into `test-loop`, `uat-signoff`, and `deploy-release` handoffs.

## Anti-Patterns

- **No ranking by bug count**: a suite that catches few bugs on CI usually means developers catch them locally first; that is success, not waste.
- **No deleting never-failing tests**: a test that never fails is a safety net, not dead weight. It is what lets engineers refactor, bump dependencies, and change config without silent breakage.
- **No coverage % as the goal**: coverage measures lines touched, not confidence earned.
- **No pass rate as health**: a 99% pass rate with untrusted reds is worse than 95% the team believes.

## Red Flags

"this test never fails, delete it" · "just re-run it, it's probably flaky" · "we found zero bugs so automation isn't paying off" · "coverage is 90%, we're safe". Each swaps a confidence question for a vanity number; re-frame with the Three Questions before acting.

## References

- [Metrics Definitions](references/metrics-definitions.md)
- [Confidence Report Template](references/confidence-report-template.md)
