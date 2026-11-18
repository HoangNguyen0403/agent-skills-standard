# 0002: Report-only review disabled until calibrated evidence and owner grant

## Status

accepted — 2026-11-18

## Context

The long-term review goal is a human reading one Delivery Report instead of the whole diff for an explicitly granted change class. That outcome needs calibration evidence: seeded-defect recall, escaped defects, and human review effort per accepted change. No such independently checked evidence exists yet, and a declared report is not authenticated proof of review.

## Decision

Report-only review is ALWAYS DISABLED, even when metrics, owner thresholds, or a purported grant are supplied. Activation requires complete, independently checked calibration/outcome evidence, owner-approved thresholds, and an explicit human grant recorded under `docs/review-policy.md`. Missing data is `unavailable`, never zero. Until that grant, line-review remains the default for every change class, and hunk lists are minimum attention rather than a reading limit.

## Consequences

Humans keep reading full diffs and merge approval authority stays with the maintainer. Review effort stays high while calibration data is collected. Any future grant is a separate, owner-approved policy change rather than a workflow side effect.

## Source

[Agent review trust, DD-3](../prd/prd-agent-review-trust.md) and [review policy, Report-Only Eligibility](../review-policy.md).
