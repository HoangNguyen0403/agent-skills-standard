# Product Evidence Examples
> Every date, organization, observation, retrieval, decision, and identifier below is synthetic. No real customer observation, consent, research, authorization, experiment, UAT, or release occurred. Treat the sample only as a proposed structural fixture; it cannot be used as product evidence or action approval.


## 1. Minimal Structural Intake

This example illustrates a newly initiated initiative before research or strategic alignment has been completed. It is synthetically marked and structurally valid.

```json
{
  "schema_version": 1,
  "slug": "synthetic-intake",
  "product_id": "synthetic-product",
  "revision": "r1",
  "synthetic": true,
  "updated_at": "2026-10-11T10:00:00Z",
  "strategy_authority": null,
  "strategy_gap": "Synthetic intake has no approved strategy",
  "authorities": [],
  "authority_history": [],
  "records": [],
  "record_history": [],
  "bridges": [],
  "product_state": {
    "value": "unvalidated",
    "reason": "No research or approval supplied",
    "scope": {
      "segment": "synthetic cohort",
      "geography": "test-only",
      "window": {
        "start": "2026-10-01T00:00:00Z",
        "end": "2026-11-01T00:00:00Z"
      }
    },
    "hypotheses": [],
    "decision": null,
    "assessed_at": "2026-10-11T10:00:00Z",
    "history": []
  }
}
```

## 2. Complete Nine-Kind Structural Example

Illustrates a comprehensive ledger containing all nine record kinds with explicit typing, scopes, provenance, and authority bridges.

```json
{
  "schema_version": 1,
  "slug": "synthetic-nine",
  "product_id": "synthetic-product",
  "revision": "r1",
  "synthetic": true,
  "updated_at": "2026-10-11T10:00:00Z",
  "strategy_authority": null,
  "strategy_gap": "Synthetic example has no strategy approval",
  "authorities": [
    {
      "id": "AUTH-001",
      "domain": "business",
      "locator": {
        "kind": "local",
        "path": "docs/brd/brd-synthetic-nine.md",
        "sha256": "8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf"
      },
      "revision": "sha256:8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": {
          "start": "2026-10-01T00:00:00Z",
          "end": "2026-11-01T00:00:00Z"
        }
      },
      "declared_ids": ["BRD-OBJ-001"],
      "access": "available"
    }
  ],
  "authority_history": [],
  "records": [
    {
      "id": "SRC-001",
      "kind": "SRC",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Fictional example only",
        "reviewed_at": "2026-10-11T09:00:00Z",
        "expires_at": "2026-11-01T00:00:00Z",
        "review_triggers": ["example revision changes"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:source-001", "snapshot_sha256": null },
        "origin": {
          "publisher": "synthetic publisher",
          "origin_id": "urn:synthetic:original-001",
          "classification": "primary",
          "revision": "fictional-r1",
          "observed_at": null,
          "scope": {
            "segment": "synthetic cohort",
            "geography": "test-only",
            "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-10-11T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "pointer_only", "access": "unavailable" },
        "license": { "identifier": "unknown", "usage": "citation_only", "restrictions": ["Not real research"] },
        "status": "unavailable",
        "limitations": ["No real observation occurred"]
      }
    },
    {
      "id": "CLM-001",
      "kind": "CLM",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "SRC-001", "revision": "r1" }],
      "freshness": {
        "status": "unknown",
        "rationale": "No observed evidence",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["authorized research supplied"]
      },
      "data": {
        "statement": "A synthetic problem might merit study",
        "classification": "assumption",
        "sources": [{ "id": "SRC-001", "revision": "r1" }],
        "counterevidence": [],
        "rationale": "Test-only assumption",
        "uncertainty": "No customer evidence",
        "status": "unresolved",
        "critical": true
      }
    },
    {
      "id": "OPP-001",
      "kind": "OPP",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "unknown",
        "rationale": "Proposal only",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["evidence changes"]
      },
      "data": {
        "problem": "Synthetic test problem",
        "customer_job": "Fictional task",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "substitutes": ["unknown"],
        "alternatives": ["defer", "study"],
        "status": "candidate",
        "rationale": "No selection is approved"
      }
    },
    {
      "id": "HYP-001",
      "kind": "HYP",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "OPP-001", "revision": "r1" },
        { "id": "CLM-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "unknown",
        "rationale": "Untested prediction",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["test results"]
      },
      "data": {
        "opportunity": { "id": "OPP-001", "revision": "r1" },
        "prediction": "A fictional intervention might reduce synthetic task time",
        "mechanism": "Illustrative fewer steps",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "primary_metric": { "id": "MET-001", "revision": "r1" },
        "disconfirmation": "No task-time improvement in eligible test",
        "status": "proposed"
      }
    },
    {
      "id": "EXP-001",
      "kind": "EXP",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "HYP-001", "revision": "r1" }],
      "freshness": {
        "status": "unknown",
        "rationale": "Not authorized or run",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["authorization decision"]
      },
      "data": {
        "hypothesis": { "id": "HYP-001", "revision": "r1" },
        "method": "Offline synthetic walkthrough proposal",
        "eligibility": "Synthetic cases only",
        "sample_plan": "Three fictional cases; no population inference",
        "primary_metric": { "id": "MET-001", "revision": "r1" },
        "guardrails": [{ "id": "MET-001", "revision": "r1" }],
        "rules": {
          "success": "Eligible synthetic case time improves",
          "failure": "No improvement",
          "inconclusive": "Missing or conflicting cases"
        },
        "bounds": {
          "starts_at": "2026-10-12T00:00:00Z",
          "ends_at": "2026-10-13T00:00:00Z",
          "budget_cap": null,
          "currency": null,
          "exposure_cap": 0,
          "stop_rules": ["Never contact real people"]
        },
        "authorization": null,
        "status": "proposed",
        "result": null
      }
    },
    {
      "id": "INV-001",
      "kind": "INV",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "unknown",
        "rationale": "No investment approval",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["finance review"]
      },
      "data": {
        "alternatives": [
          { "name": "defer", "rationale": "No evidence" },
          { "name": "study", "rationale": "Resolve uncertainty" }
        ],
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "financial_input": null,
        "financial_result": null,
        "nonmonetary": ["Illustrative learning"],
        "status": "proposal",
        "accounting_rationale": "No monetary benefit or cost claimed"
      }
    },
    {
      "id": "DEC-001",
      "kind": "DEC",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "INV-001", "revision": "r1" },
        { "id": "HYP-001", "revision": "r1" },
        { "id": "CLM-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "unknown",
        "rationale": "No approval",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["human review"]
      },
      "data": {
        "purpose": "investment",
        "status": "proposed",
        "outcome": "propose",
        "consumes": [
          { "id": "INV-001", "revision": "r1" },
          { "id": "HYP-001", "revision": "r1" }
        ],
        "critical_claims": [{ "id": "CLM-001", "revision": "r1" }],
        "authority_id": null,
        "authority_revision": null,
        "strategy_binding": null,
        "artifact_bindings": [],
        "decided_at": null,
        "rationale": "Proposal only",
        "uncertainties": ["No research or budget"],
        "revisit_triggers": ["authorized evidence supplied"],
        "supersedes": null
      }
    },
    {
      "id": "MET-001",
      "kind": "MET",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "unknown",
        "rationale": "Not instrumented",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["measurement design review"]
      },
      "data": {
        "definition": "Synthetic completed-task duration",
        "unit": "seconds",
        "denominator": "one eligible synthetic task",
        "query": null,
        "query_revision": null,
        "baseline": null,
        "baseline_exception": null,
        "comparison_window": {
          "start": "2026-10-12T00:00:00Z",
          "end": "2026-10-13T00:00:00Z"
        },
        "eligibility": "Synthetic cases only",
        "target": "Lower time than baseline if baseline exists",
        "guardrail": "No real-world exposure",
        "measurement_owner": "synthetic author",
        "review_trigger": "Before any real test",
        "status": "planned"
      }
    },
    {
      "id": "REV-001",
      "kind": "REV",
      "revision": "r1",
      "owner": "synthetic author",
      "scope": {
        "segment": "synthetic cohort",
        "geography": "test-only",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "HYP-001", "revision": "r1" },
        { "id": "MET-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "unknown",
        "rationale": "No outcomes",
        "reviewed_at": null,
        "expires_at": null,
        "review_triggers": ["eligible observation window"]
      },
      "data": {
        "decision": { "id": "DEC-001", "revision": "r1" },
        "hypotheses": [{ "id": "HYP-001", "revision": "r1" }],
        "metrics": [{ "id": "MET-001", "revision": "r1" }],
        "observations": [],
        "actual_costs": [],
        "attribution": {
          "classification": "unknown",
          "rationale": "No real release or data",
          "confounders": []
        },
        "recommendation": "inconclusive",
        "limitations": ["Synthetic design example, not a performed value review"],
        "reviewed_at": "2026-10-11T10:00:00Z"
      }
    }
  ],
  "record_history": [],
  "bridges": [
    {
      "record": { "id": "DEC-001", "revision": "r1" },
      "authority_id": "AUTH-001",
      "authority_revision": "sha256:8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf",
      "ids": ["BRD-OBJ-001"]
    }
  ],
  "product_state": {
    "value": "unvalidated",
    "reason": "Synthetic proposal only",
    "scope": {
      "segment": "synthetic cohort",
      "geography": "test-only",
      "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" }
    },
    "hypotheses": [{ "id": "HYP-001", "revision": "r1" }],
    "decision": { "id": "DEC-001", "revision": "r1" },
    "assessed_at": "2026-10-11T10:00:00Z",
    "history": []
  }
}
```
