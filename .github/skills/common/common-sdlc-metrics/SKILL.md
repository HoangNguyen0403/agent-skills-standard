---
name: common-sdlc-metrics
description: Define delivery metrics from authorized observations and labeled artifact/git proxies; use for DORA, SDLC outcomes, reporting, or control bands.
metadata:
  triggers:
    files:
      - "docs/ops/bands.yaml"
      - "artifacts/sdlc-metrics.md"
    keywords:
      - dora metrics
      - lead time
      - change failure rate
      - plan adherence
      - control band
      - delivery metrics
---

# SDLC Metrics Standard

## **Priority: P2 (MEDIUM)**

Measure handoffs, not keystrokes. A missing input is unavailable, never zero; a proxy is never a measurement.

## Use and verify

- Emit `artifacts/sdlc-metrics.md` at a workflow terminal state, alongside `artifacts/session-cost.md`.
- Direct delivery measures come only from the authorized local export `artifacts/metrics/delivery-observations.json`; never read it from the network or place it under `artifacts/runs/`.
- Load [the metrics schema](references/metrics-schema.md) for the report skeleton, input contract, and derivation details.
- Generate the report with `rtk pnpm metrics:report --json`; run `rtk pnpm test:metrics` for the metrics suite. Do not overwrite existing metrics/history artifacts.

## DORA

Measured rows require linked deployment/defect observations and complete relevant coverage.

- **Deployment frequency:** production deployments by `deployed_at`.
- **Lead time:** `first_change_at` to `deployed_at`.
- **Change failure rate:** deployments with a hotfix/rollback defect divided by eligible deployments. Without incident coverage, a deployment is not failure-free.
- **Time to restore:** `restored_at` minus `detected_at`; restoration beyond coverage or the report horizon is censored.
- Select deployment and incident populations by domain timestamps, never export `observed_at`. Use the half-open report period `[currentSince, currentUntil)`.
- Incomplete population coverage yields a partial count or unavailable rate, never a complete result.
- Without observations, keep measured DORA unavailable. Label deploy-tag frequency, commit-to-tag lag, and revert/fix-commit tag share as git proxies.

## Accepted-change measures

- Cohort accepted changes by acceptance time in `[currentSince, currentUntil)`. Bound review, wait, correction, and cost to linked submissions/attempts/revisions through acceptance; later revisions and post-acceptance work are separate activity.
- Complete totals require continuous declared kind+revision coverage across the linked lifecycle. Gaps, uncovered relevant events, and unresolved waits never imply zero or completion.
- Report human review effort per accepted change, completed and pending decision waits, correction rounds, first-pass acceptance, escaped defects/rollbacks, and cost per accepted change.
- Count escaped defect observations, including `remediation: none`, separately from affected, hotfix/rollback, and rollback deployment counts.
- Cost is per currency. Total cost requires complete lifecycle coverage and explicitly observed agent, human, and tooling components for every cohort member. Otherwise report observed component-level partials; never infer human cost from elapsed time.

## Evidence and control bands

- Every available value names its source and declares `measured` or `proxy`, sample size, coverage (`complete`, `partial`, `unknown`), and limitations. Git, document, and run-record derivations are proxies with unknown coverage.
- Report trends only against comparable previous-period coverage. Do not combine metrics into a productivity score or infer identity/effort from author names.
- Keep private reviewer identity and raw customer data out of exports. Source labels are attribution, not authenticated origin.
- Define bands in `docs/ops/bands.yaml` against a rolling baseline. Detect deterministically; route `log` → read-only `diagnose` → `propose`, within declared tools/routes and to a named owner.
- Use dismissals to tune bands; frequent breaches signal miscalibration, not urgency.
- New measured rows do not enter control bands until their source and baseline are separately reviewed.

## Anti-patterns

- Guessing unavailable values, promoting proxies, or treating missing coverage as zero.
- Using commit counts/lines of code as delivery outcomes or ranking individuals.
- Acting beyond a band's declared tools/routes or treating a frequent breach as urgent without recalibration.
- Measuring plan adherence without the committed `docs/srs/srs-task-list-[slug].md`.

## References

- [Metrics Report Schema and derivations](references/metrics-schema.md)
- [Control Bands Template](references/bands-template.yaml)

## Canonical terms

`artifacts/sdlc-metrics.md` · DORA · plan adherence · rolling baseline · `docs/ops/bands.yaml` · `report unavailable` · `artifacts/runs/<slug>/` · `artifacts/metrics/delivery-observations.json`
