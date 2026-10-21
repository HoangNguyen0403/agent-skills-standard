# Product Investment Financial Contract

## Priority: P0 (CRITICAL)

This document specifies the exact accounting rules, numeric representation, arithmetic formulas, edge-case precedence, error envelopes, and validation contracts implemented by the deterministic investment calculator (`evaluate-investment.mjs`) and defined in `investment.schema.json` (t01-v2).

---

## 1. Scope and Accounting Boundary

1. **Finance-Owned Incremental Boundary**:
   - All evaluation items must reflect incremental cash flows directly attributable to the investment decision relative to the specified counterfactual (do-nothing/defer).
   - Genuinely sunk costs and non-incremental historical overhead allocations are strictly excluded.
   - Finance determines and documents within `accounting_boundary` the specific inclusions and exclusions, including whether step-fixed cash costs or incremental shared contracts are included. The calculator cannot infer cost completeness, causality, or omitted costs.
2. **Qualitative vs Quantitative Validity**:
   - Qualitative investment analysis is fully valid. When monetary returns cannot be verified or substantiated, do NOT fabricate numerical benefits or ROI estimates.
   - Nonmonetary outcomes are recorded in `nonmonetary: string[]`.
3. **Cash vs Capacity**:
   - Capacity hours (`side: "capacity"`, `basis: "capacity_hours"`) are informational operational metrics.
   - Saved engineering or support hours do NOT enter monetary benefits ($B$) or costs ($C$) and never directly increase net monetary value or ROI unless a separate, finance-reviewed `cash_saving` mechanism with verifiable avoided cash outflow is documented.
4. **Independent Scenarios**:
   - Supported scenario identifiers: exactly `"base"`, `"downside"`, and `"upside"`.
   - The `"base"` scenario is mandatory.
   - Each scenario is evaluated independently. No scenario averaging, Monte Carlo blending, or probability weighting is permitted.
   - An invalid scenario rejects the entire analysis (`results: []`); invalid downside assumptions are never silently dropped.

---

## 2. Input Validation and Closed Schema

1. **Strict Object Closure**:
   - Every object level rejects undeclared properties:
     - Root: `schema_version`, `analysis_id`, `currency`, `money_scale`, `price_basis`, `price_date`, `horizon`, `cohort`, `counterfactual`, `accounting_boundary`, `discount`, `scenarios`.
     - `horizon`: `start_date`, `period`, `periods`.
     - `discount`: `rate`, `convention`, `price_basis`.
     - `scenario`: `id`, `label`, `assumptions`, `items`, `nonmonetary`.
     - `item`: `id`, `side`, `category`, `mechanism_id`, `period`, `amount`, `currency`, `basis`, `netted_cost_categories`, `rationale`, `evidence_ids`.
   - Any unknown property yields `INVALID_FIELD` at its RFC6901 path, `record_id: null`, and rejects the analysis. Path tokens escape `~` as `~0` and `/` as `~1`; messages remain fixed and do not interpolate input keys or values.
2. **Calendar Dates**:
   - `price_date` and `horizon.start_date` must be valid Gregorian calendar dates (`YYYY-MM-DD`). Impossible calendar dates (e.g., `2026-02-30`, `2026-13-01`) yield `INVALID_FIELD`.
3. **String and Array Invariants**:
   - `cohort`, `counterfactual`, `accounting_boundary`, scenario `label`, assumptions, and item `rationale` must be non-empty strings after trimming whitespace.
   - `nonmonetary` must be an array of non-empty strings.
   - `evidence_ids` must be unique strings matching `^(?:CLM|SRC)-[0-9]{3,}$`.
   - `netted_cost_categories` must be an array of allowed categories. For non-contribution-margin items, it must be `[]`. Repeated category names in a contribution-margin array do not create additional cash flows; each category is treated as membership. An explicitly listed cost in any netted category is rejected.
4. **Decimal Grammar & Representation**:
   - Monetary amounts are non-negative decimal strings matching `^(0|[1-9][0-9]*)(\.[0-9]+)?$`.
   - No negative signs, positive signs, scientific exponential notation (`1e5`), thousands separators, or non-finite tokens (`NaN`, `Infinity`).
   - Reverse flows or refunds must be modeled as positive entries on the opposing side with explicit rationale.
   - Draft-07 constrains monetary `amount` precision through the root `money_scale` branches while leaving capacity on its separate four-fractional-digit rule; the calculator additionally enforces individual and aggregate minor-unit magnitude.
   - Amounts are converted to integer minor units using `BigInt`:
     $$\text{minor\_units} = \text{intPart} \times 10^{\text{money\_scale}} + \text{paddedFrac}$$
   - Maximum individual and aggregate minor-unit magnitude is bounded by $\le 9007199254740991$ ($2^{53} - 1$, `Number.MAX_SAFE_INTEGER`).
5. **Input File Safety**:
   - File input is limited to 1 MiB and read without following symlinks or blocking on special files. The CLI verifies path components and file identity before and after the bounded read, uses nonblocking/no-follow open flags where supported, and emits only the fixed `IO_ERROR` or `LIMIT_EXCEEDED` contract on failure.

---

## 3. Monetary Totals, Ratios, Payback, and NPV

1. **Totals & Net Value**:
   - Total monetary benefit $B = \sum \text{benefit minor units}$.
   - Total monetary cost $C = \sum \text{cost minor units}$.
   - If any monetary item has `amount: null`, or if a monetary side has no declared items, that side is `unavailable` (`unknown_benefit` or `unknown_cost`).
   - Net value $\text{Net} = B - C$. If either side is unavailable, net value is `{ status: "unavailable", value: null, reason: "unknown_cash_flow" }`.
2. **Ratios (ROI, ROI%, B/C)**:
   - Evaluated using exact `BigInt` rational division with half-away-from-zero rounding directly to 6 decimal places at presentation:
     $$\text{ROI} = \frac{B - C}{C}, \quad \text{ROI\%} = 100 \times \frac{B - C}{C}, \quad B/C = \frac{B}{C}$$
   - Reason Precedence:
     1. Cost unavailable $\implies$ `{ status: "unavailable", value: null, reason: "unknown_cost" }`
     2. Known zero cost ($C = 0$) $\implies$ `{ status: "undefined", value: null, reason: "zero_cost" }`
     3. Benefit unavailable $\implies$ `{ status: "unavailable", value: null, reason: "unknown_benefit" }`
     4. Both known and $C > 0 \implies$ `{ status: "available", value: "...", reason: null }`
3. **Payback Period**:
   - Undiscounted cumulative period-end net cash flows: $\text{cum}_t = \sum_{k=0}^t (B_k - C_k)$.
   - All cash flows must be known; incomplete cash $\implies$ `{ status: "unavailable", period: null, reason: "unknown_cash_flow", terminal_balance: null }`.
   - Never negative $\implies$ `not_applicable` with reason `"no_investment_outflow"`.
   - Initial negative outflow $\implies$ earliest period $t$ where $\text{cum}_t \ge 0$ AND $\text{cum}_k \ge 0$ for all $k \in [t, N]$. Temporary crossing followed by deficit is not durable.
   - If no permanent break-even $\implies$ `not_reached` with reason `"no_payback_within_horizon"`.
   - Output object retains exactly: `{ status, period, reason, terminal_balance }`. Paired timing metadata remains in `input.horizon`.
4. **Net Present Value (NPV)**:
   - Evaluated only when `discount` is provided and all period cash flows are known.
   - Missing discount $\implies$ `missing_discount`. Incomplete cash $\implies$ `unknown_cash_flow`.
   - $B+C$ minor units bounded to $\le 1000000000000$ ($10^{12}$). Larger analyses yield `NUMERIC_RANGE` (exit 1).
   - Monthly factor $d_t = (1 + r_{\text{annual}})^{-t / 12}$; annual factor $d_t = (1 + r_{\text{annual}})^{-t}$.
   - The annual effective rate is a decimal string from 0 through 1 inclusive, with at most 8 fractional digits. Negative rates, rates above 100%, exponent notation, and excess precision are invalid.
   - Period-end cumulative balances determine durable payback; they are not period cash-flow inputs to NPV. NPV discounts each actual period net cash flow at the declared rate. Do not treat cumulative balance as a cash-flow series.
   - Whole-year periods use exact rational discounting and accumulation; monthly periods use Neumaier compensated summation in ascending period order within the bounded numeric domain. Final minor units round half away from zero in both paths.

---

## 4. Duplicate and Double-Counting Safeguards

1. **`DOUBLE_COUNTED_BENEFIT`**: Duplicate benefit mechanism in the same period within a scenario.
2. **`DOUBLE_COUNTED_COST`**:
   - Duplicate cost mechanism and category in the same period within a scenario.
   - Explicit cost item whose category matches a `netted_cost_categories` entry on a `contribution_margin` benefit item.
3. **`INVALID_FIELD`**: Duplicate capacity mechanism in the same period within a scenario (`side: "capacity"`).
4. **`DUPLICATE_ITEM`**: Repeated item `id` within a scenario.

---

## 5. Error Envelope and Exit Precedence

- Envelope format:
  ```json
  {
    "schema_version": 1,
    "tool": "investment-calculator",
    "analysis_id": "...",
    "currency": "...",
    "money_scale": 2,
    "results": [],
    "issues": [
      {
        "code": "INVALID_FIELD",
        "severity": "error",
        "path": "/price_date",
        "record_id": null,
        "message": "price_date must be a valid Gregorian calendar date (YYYY-MM-DD)"
      }
    ]
  }
  ```
- Issues are deduplicated and sorted by ASCII `path`, then `code`, then `record_id`.
- Exit Precedence:
  - **4**: `INTERNAL_ERROR` (unhandled execution failure).
  - **2**: Invocation and structural envelope failures: `INVALID_ARGUMENT`, `INVALID_JSON`, `UNSUPPORTED_VERSION`, `IO_ERROR`, `LIMIT_EXCEEDED`.
  - **1**: Financial and schema semantic validation failures: `INVALID_FIELD`, `INVALID_AMOUNT`, `INCOMPATIBLE_UNITS`, `DUPLICATE_ITEM`, `DOUBLE_COUNTED_BENEFIT`, `DOUBLE_COUNTED_COST`, `NUMERIC_RANGE`.
  - **0**: Coherent analysis executed successfully.
- CLI Flags: Only `--help` alone exits 0 with usage text. All other flags (including `-h`) are rejected with exit 2 (`INVALID_ARGUMENT`).
