# Synthetic Fixture Resources Reference

## Overview

This directory documents the synthetic test fixtures located at `docs/product/evidence-led-marketing/fixtures/`. All data, names, dates, participant keys, and identifiers are strictly synthetic and used solely for deterministic contract verification.

## 1. Primary Combined Fixture (`synthetic-input-combined.json`)

Exercises the full combined scenario required by PRD REQ-MKT-003 and SRS VER-007:
- **Campaign**: `standards-demo-01`
- **Acquisition Window**: `[2026-09-01T00:00:00Z, 2026-10-01T00:00:00Z)`
- **Cost Window**: `[2026-09-01T00:00:00Z, 2026-10-01T00:00:00Z)`
- **Participants**:
  - `p1` (external, granted): Starter + activation + repeat (mature).
  - `p2` (external, granted): Starter + activation + full-window no_return (mature).
  - `p3` (external, granted): Starter + activation (mature, unknown follow-up).
  - `p4` (external, granted): Starter + activation (immature as of 2026-10-25 or late activation).
  - `p5` (external, granted): Starter only (does not activate).
  - `p6` (external, withdrawn): Excluded from calculation.
  - `p7` (bot, granted): Excluded from calculation.
- **Reports**: Includes 1 identical duplicate report ID (collapsed).
- **Cost Mapping**:
  - Cash cost: $12.000000 (item `cost-cash-ad-01`)
  - Consumed capacity hours: 6.000000 (item `cost-hours-prep-01`)
- **Expected Ratios**:
  - `eligible_starters`: 5
  - `activated`: 4
  - `mature_activated`: 3
  - `immature_activated`: 1
  - `mature_confirmed_repeat`: 1
  - `mature_confirmed_no_return`: 1
  - `mature_unknown`: 1
  - `activation_rate`: 4 / 5 = `0.800000`
  - `repeat_rate`: 1 / 3 = `0.333333`
  - `cash_per_activation`: 12 / 4 = `3.000000`
  - `cash_per_repeat`: 12 / 1 = `12.000000`
  - `hours_per_repeat`: 6 / 1 = `6.000000`

## 2. Boundary and Edge Fixtures (`fixtures-edge/`)

- `maturity-boundary.json`: Evaluates Jan 1 12:00:00Z activation against Jan 15 11:59:59Z (immature) and Jan 15 12:00:00Z (mature).
- `repeat-boundaries.json`: Tests same UTC calendar day repeat exclusion, exact +14d inclusion, +1s exclusion, and coverage cutoff exclusion.
- `nonreturn-partition.json`: Confirms partition into repeat (1), no-return (1), unknown (1) $\to$ 0.333333.
- `contradictory-reports.json`: Asserts rejection of contradictory qualifying repeat and full-window no-return.
- `null-cohort.json`: Asserts `cohort_unavailable` with null counts.
- `empty-cohort.json`: Asserts valid count zero and `zero_starter_denominator`.
- `two-starters-one-activated.json`: Asserts 1 / 2 = 0.500000.
- `duplicate-report-collapse.json` & `conflicting-report-ids.json`: Demonstrates identical collapse vs conflicting rejection.
- `zero-repeats-positive-cash.json`: Asserts `zero_repeat_denominator`.
- `zero-cash-six-hours.json`: Asserts cash_per_repeat `0.000000`, hours_per_repeat `3.000000`, and `zero_cost` ROI precedence. Its `cost_mapping.source` binds the ledger-registered `SRC-002` locator (`fixtures/synthetic-investment.json`); the zero-cash scenario itself is the separately hashed `investment` input, so no id-only source binding is implied.
- `tainted-input.json`: Tests that private error strings or unknown property names are not echoed in diagnostics.
- Adversarial regressions (`scripts/skill-tests/marketing-measurement/report-marketing-adversarial.test.mjs`) build temporary authority snapshots to exercise invalid nested timestamps, nonexistent/historical revisions, projection leakage, sub-cent capacity precision, actual schema conformance, and standard/flattened installed layouts.
