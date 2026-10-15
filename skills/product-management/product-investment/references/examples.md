# Product Investment Examples and Reference Oracles

## Priority: P1 (HIGH)

This document provides concrete JSON examples and calculated reference outputs for the deterministic investment calculator (`evaluate-investment.mjs`), validating contract adherence across baseline, edge, and adversarial scenarios.

---

## 1. Baseline Case: Positive Return (AC-005)

### Input (`baseline-positive.json`)
```json
{
  "schema_version": 1,
  "analysis_id": "analytics-export-v1",
  "currency": "USD",
  "money_scale": 2,
  "price_basis": "nominal",
  "price_date": "2026-10-01",
  "horizon": {
    "start_date": "2026-10-01",
    "period": "year",
    "periods": 1
  },
  "cohort": "enterprise-self-serve",
  "counterfactual": "maintain-manual-csv-export",
  "accounting_boundary": "incremental engineering and server costs vs export fee revenue",
  "discount": {
    "rate": "0.10000000",
    "convention": "effective_annual",
    "price_basis": "nominal"
  },
  "scenarios": [
    {
      "id": "base",
      "label": "Base scenario",
      "assumptions": ["30 accounts purchase automated export at $5,000/yr"],
      "items": [
        {
          "id": "dev-cost",
          "side": "cost",
          "category": "development",
          "mechanism_id": "core-export-engine",
          "period": 0,
          "amount": "100000.00",
          "currency": "USD",
          "basis": "cash_cost",
          "netted_cost_categories": [],
          "rationale": "2 engineers for 4 months",
          "evidence_ids": ["CLM-001"]
        },
        {
          "id": "export-revenue",
          "side": "benefit",
          "category": "expansion",
          "mechanism_id": "export-fee",
          "period": 1,
          "amount": "150000.00",
          "currency": "USD",
          "basis": "gross_revenue",
          "netted_cost_categories": [],
          "rationale": "Year 1 export add-on revenue",
          "evidence_ids": ["CLM-002"]
        }
      ],
      "nonmonetary": []
    }
  ]
}
```

### Reference Output
```json
{
  "schema_version": 1,
  "tool": "investment-calculator",
  "analysis_id": "analytics-export-v1",
  "currency": "USD",
  "money_scale": 2,
  "results": [
    {
      "scenario_id": "base",
      "benefit": { "status": "available", "value": "150000.00", "reason": null },
      "cost": { "status": "available", "value": "100000.00", "reason": null },
      "net_value": { "status": "available", "value": "50000.00", "reason": null },
      "roi": { "status": "available", "value": "0.500000", "reason": null },
      "roi_percent": { "status": "available", "value": "50.000000", "reason": null },
      "benefit_cost": { "status": "available", "value": "1.500000", "reason": null },
      "payback": {
        "status": "reached",
        "period": 1,
        "reason": null,
        "terminal_balance": "50000.00"
      },
      "npv": { "status": "available", "value": "36363.64", "reason": null },
      "capacity": [],
      "nonmonetary": []
    }
  ],
  "issues": []
}
```
*Note on NPV*: Period 0 has net $-100,000.00$. Period 1 has net $+150,000.00$ discounted by $1 / 1.10 = 136,363.636...$. Sum is $+36,363.636... \implies \$36,363.64$.

---

## 2. Zero-Cost Edge Case (Undefined Ratios)

When cost $C = 0$ (e.g., zero incremental cost feature), division by zero is prohibited. Ratios are explicitly `undefined` with reason `"zero_cost"`.

### Result
```json
{
  "benefit": { "status": "available", "value": "50000.00", "reason": null },
  "cost": { "status": "available", "value": "0.00", "reason": null },
  "net_value": { "status": "available", "value": "50000.00", "reason": null },
  "roi": { "status": "undefined", "value": null, "reason": "zero_cost" },
  "roi_percent": { "status": "undefined", "value": null, "reason": "zero_cost" },
  "benefit_cost": { "status": "undefined", "value": null, "reason": "zero_cost" },
  "payback": {
    "status": "not_applicable",
    "period": null,
    "reason": "no_investment_outflow",
    "terminal_balance": "50000.00"
  }
}
```

---

## 3. Temporary vs Durable Payback Crossing

Consider cash flows:
- Period 0: Cost $100.00$ (cum: $-100.00$)
- Period 1: Benefit $150.00$ (cum: $+50.00$)
- Period 2: Cost $80.00$ (cum: $-30.00$)
- Period 3: Benefit $100.00$ (cum: $+70.00$)

In Period 1, cumulative cash flow reaches $+50.00$, but dips to $-30.00$ in Period 2. Period 1 is NOT a durable payback.
Durable payback is reached at Period 3 (where cum remains $\ge 0$ through horizon end).
- Status: `"reached"`
- Period: `3`
- Terminal balance: `"70.00"`

If Period 3 had no benefit and cumulative remained negative:
- Status: `"not_reached"`
- Period: `null`
- Reason: `"no_payback_within_horizon"`

---

## 4. Capacity & Nonmonetary Tracking

Capacity items are captured in `capacity: [{ id, hours, period }]` and do not inflate financial benefit totals $B$ or net monetary value:

```json
{
  "id": "support-automation",
  "side": "capacity",
  "category": "capacity",
  "mechanism_id": "faq-bot",
  "period": 1,
  "amount": "120.5000",
  "currency": null,
  "basis": "capacity_hours",
  "netted_cost_categories": [],
  "rationale": "Automated ticket resolution saving tier 1 hours",
  "evidence_ids": ["SRC-001"]
}
```

Output includes:
```json
"capacity": [
  { "id": "support-automation", "hours": "120.5000", "period": 1 }
]
```

---

## 5. Rejected Vectors

1. **`DOUBLE_COUNTED_BENEFIT`**: Two benefit items in the same period declaring the same `mechanism_id`.
2. **`DOUBLE_COUNTED_COST`**: An explicit cost item whose category matches one of the `netted_cost_categories` on a `contribution_margin` benefit item.
3. **`INCOMPATIBLE_UNITS`**: An item declaring currency `EUR` when the analysis declares `USD`, or capacity item declaring non-null currency.
4. **`INVALID_AMOUNT`**: Negative numbers (`-100.00`), scientific notation (`1e4`), or excessive fractional digits beyond `money_scale`.
