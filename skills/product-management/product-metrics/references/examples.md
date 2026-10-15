# Retained Package Examples: Product Metrics & Value Review

## 1. Non-Actionability & Synthetic Disclaimer

> [!CRITICAL]
> All numbers, metrics, cohort descriptions, and findings below are **strictly fictional and synthetic**. They do NOT represent observed customer data, production analytics, or real human authorizations. These examples serve as structural specification models and replayable test fixtures; they grant zero authority to deploy software, execute budgets, alter traffic exposure, or retire features.

---

## 2. Fictional Authority Fixtures & Exact Byte Recipes

To maintain verifiable hash integrity under local validation, the synthetic ledger binds to the following local fixture files:

1. **Business Objective Authority (`docs/brd/brd-synthetic-metrics.md`)**:
   - Exact Content (UTF-8, LF line terminator):
     ```markdown
     # BRD-OBJ-001: Synthetic metrics objective
     ```
   - Computed SHA256: `d3f43c87cc28b81005765578235d93b40a51f9dd409f8d2b4560da996965c1c2`
   - Authority Domain: `business`, Declared IDs: `["BRD-OBJ-001"]`

2. **Release Authorization Charter (`docs/governance/release-auth.md`)**:
   - Exact Content (UTF-8, LF line terminator):
     ```markdown
     # Synthetic Release Risk-Acceptance Charter
     ```
   - SHA256: `20832a7693311c11791ffed051fc3c4b8b42d45fa2e39aa30215bf6f27fd6b05`
   - Authority domain: `authorization`; declared IDs: `[]`. This is not an investment approval.

3. **Synthetic Strategic Alignment (`docs/strategy/synthetic-metrics-strategy.md`)**:
   - Exact UTF-8 bytes: `# Corporate Strategic Alignment 2026` followed by one LF.
   - SHA256: `7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20`
   - Authority domain: `strategy`; declared IDs: `[]`. Fictional training content, not strategy approval.

4. **Fictional Investment Charter (`docs/governance/investment-charter.md`)**:
   - Exact UTF-8 content with LF after each displayed line and a final LF:
     ```markdown
     # Synthetic Metrics Investment Charter
     Fixture ID: synthetic-metrics-investment-v1
     Purpose: Historical teaching example only; no real investment was approved.
     Scope: Synthetic Test Cohort / Test-Region / 2026-10-01 through 2026-12-01 UTC.
     Decision: This fictional ledger records an illustrative investment only.
     Limitations: No customer analytics, actual budget, financial result, or host authorization is represented.
     ```
   - SHA256: `feab381da3cc09367f4ef9e0f45e7ad8ff43b92bc5f42e1e0b1ee3166e5ff19c`. Artifact only; not an authority binding.

5. **Fictional Investment Authorization Fixture (`docs/governance/investment-authorization.md`)**:
   - Exact UTF-8 content with LF after each displayed line and a final LF:
     ```markdown
     # Synthetic Metrics Investment Authorization Fixture
     Fixture ID: synthetic-metrics-auth-v1
     This retained local file is fictional test material. It does not name an approver or grant consent, spend, rollout, or production access.
     Purpose: Illustrate a separately typed authorization binding only.
     ```
   - SHA256: `c7a5f828b4424f986d0295dfa21f8cc035c0306e92e8643006f578ff6228c21b`. Authority domain `authorization`; not human authorization.

## 3. Complete Package-Shaped Synthetic Ledger

The complete ledger below demonstrates both **baseline evidence** (`MET-001`), an explicit **baseline exception** branch (`MET-002` bound to recorded helper `DEC-002`), and a **post-release value review** (`REV-001` with `recommendation: "inconclusive"` and `attribution.classification: "unknown"`).

```json
{
  "schema_version": 1,
  "slug": "synthetic-metrics",
  "product_id": "synthetic-product",
  "revision": "r1",
  "synthetic": true,
  "updated_at": "2026-11-18T10:00:00Z",
  "strategy_authority": "AUTH-003",
  "strategy_gap": null,
  "authorities": [
    {
      "id": "AUTH-001",
      "domain": "business",
      "locator": {
        "kind": "local",
        "path": "docs/brd/brd-synthetic-metrics.md",
        "sha256": "d3f43c87cc28b81005765578235d93b40a51f9dd409f8d2b4560da996965c1c2"
      },
      "revision": "sha256:d3f43c87cc28b81005765578235d93b40a51f9dd409f8d2b4560da996965c1c2",
      "owner": "fictional-author",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "declared_ids": ["BRD-OBJ-001"],
      "access": "available"
    },
    {
      "id": "AUTH-002",
      "domain": "authorization",
      "locator": {
        "kind": "local",
        "path": "docs/governance/release-auth.md",
        "sha256": "20832a7693311c11791ffed051fc3c4b8b42d45fa2e39aa30215bf6f27fd6b05"
      },
      "revision": "sha256:20832a7693311c11791ffed051fc3c4b8b42d45fa2e39aa30215bf6f27fd6b05",
      "owner": "fictional-authorizer",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "declared_ids": [],
      "access": "available"
    },
    {
      "id": "AUTH-003",
      "domain": "strategy",
      "locator": {
        "kind": "local",
        "path": "docs/strategy/synthetic-metrics-strategy.md",
        "sha256": "7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20"
      },
      "revision": "sha256:7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20",
      "owner": "fictional-strategy-owner",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "declared_ids": [],
      "access": "available"
    },
    {
      "id": "AUTH-004",
      "domain": "authorization",
      "locator": {
        "kind": "local",
        "path": "docs/governance/investment-authorization.md",
        "sha256": "c7a5f828b4424f986d0295dfa21f8cc035c0306e92e8643006f578ff6228c21b"
      },
      "revision": "sha256:c7a5f828b4424f986d0295dfa21f8cc035c0306e92e8643006f578ff6228c21b",
      "owner": "fictional-fixture-author",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "declared_ids": [],
      "access": "available"
    }
  ],
  "authority_history": [],
  "record_history": [],
  "records": [
    {
      "id": "SRC-001",
      "kind": "SRC",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Synthetic query definition",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["schema change"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:query-001", "snapshot_sha256": "96614a42457cd2b7062dcb5135c3b1e4439d4b43932d1ff43f1fe25d94faa651" },
        "origin": {
          "publisher": "synthetic-telemetry",
          "origin_id": "urn:synthetic:query-origin",
          "classification": "primary",
          "revision": "v1.0.0",
          "observed_at": null,
          "scope": {
            "segment": "Synthetic Test Cohort",
            "geography": "Test-Region",
            "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-10-12T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "none", "access": "available" },
        "license": { "identifier": "MIT", "usage": "reuse_permitted", "restrictions": [] },
        "status": "available",
        "limitations": ["Fictional telemetry specification"]
      }
    },
    {
      "id": "SRC-002",
      "kind": "SRC",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-09-01T00:00:00Z", "end": "2026-10-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Synthetic baseline dataset extract",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["baseline refresh"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:baseline-001", "snapshot_sha256": "e462d78b577ccabe240b91558ddeb28233d977e8d307cd982903d36cb9a3ad28" },
        "origin": {
          "publisher": "synthetic-telemetry",
          "origin_id": "urn:synthetic:baseline-origin",
          "classification": "primary",
          "revision": "v1.0.0",
          "observed_at": "2026-10-01T00:00:00Z",
          "scope": {
            "segment": "Synthetic Test Cohort",
            "geography": "Test-Region",
            "window": { "start": "2026-09-01T00:00:00Z", "end": "2026-10-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-10-12T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "none", "access": "available" },
        "license": { "identifier": "MIT", "usage": "reuse_permitted", "restrictions": [] },
        "status": "available",
        "limitations": ["Fictional baseline observation"]
      }
    },
    {
      "id": "SRC-003",
      "kind": "SRC",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Synthetic post-release observation extract",
        "reviewed_at": "2026-11-18T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["review concluded"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:post-release-001", "snapshot_sha256": "c0fda305fb9588be828c02aea7ca25ab82148538c5d313b9e807d89f34a998a4" },
        "origin": {
          "publisher": "synthetic-telemetry",
          "origin_id": "urn:synthetic:post-origin",
          "classification": "primary",
          "revision": "v1.0.0",
          "observed_at": "2026-11-16T08:00:00Z",
          "scope": {
            "segment": "Synthetic Test Cohort",
            "geography": "Test-Region",
            "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-11-17T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "none", "access": "available" },
        "license": { "identifier": "MIT", "usage": "reuse_permitted", "restrictions": [] },
        "status": "available",
        "limitations": ["Fictional post-release observation sample"]
      }
    },
    {
      "id": "SRC-004",
      "kind": "SRC",
      "revision": "r1",
      "owner": "fictional-finance",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Synthetic actual cost ledger extract",
        "reviewed_at": "2026-11-18T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["cost accounting update"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:cost-001", "snapshot_sha256": "6ebd02de3cc57ca5f0c7c06c7b6e83ef859e2f84675dd4a5fda1a0d9b2b8fb25" },
        "origin": {
          "publisher": "synthetic-finance",
          "origin_id": "urn:synthetic:cost-origin",
          "classification": "primary",
          "revision": "v1.0.0",
          "observed_at": "2026-11-16T08:00:00Z",
          "scope": {
            "segment": "Synthetic Test Cohort",
            "geography": "Test-Region",
            "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-11-17T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "none", "access": "available" },
        "license": { "identifier": "MIT", "usage": "reuse_permitted", "restrictions": [] },
        "status": "available",
        "limitations": ["Fictional cost extract"]
      }
    },
    {
      "id": "SRC-005",
      "kind": "SRC",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Fictional event and metric definition fixture; not an executed query",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["event schema change"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:express-events-001", "snapshot_sha256": "4584df57b49465172f10415921d6d3613263be8532522b2232e8f8648e0bd5e3" },
        "origin": {
          "publisher": "synthetic-event-specification",
          "origin_id": "urn:synthetic:express-events-origin",
          "classification": "primary",
          "revision": "v1.0.0",
          "observed_at": null,
          "scope": {
            "segment": "Synthetic Test Cohort",
            "geography": "Test-Region",
            "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-10-12T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "none", "access": "available" },
        "license": { "identifier": "synthetic-fixture", "usage": "citation_only", "restrictions": [] },
        "status": "available",
        "limitations": ["Fictional event/query definition only; no event stream or measurement exists"]
      }
    },
    {
      "id": "CLM-001",
      "kind": "CLM",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "SRC-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Synthetic claim inference",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["pilot review"]
      },
      "data": {
        "statement": "Synthetic checkout-flow friction is a hypothesis to investigate; no observed drop-off finding is retained.",
        "classification": "assumption",
        "sources": [{ "id": "SRC-001", "revision": "r1" }],
        "counterevidence": [],
        "rationale": "SRC-001 specifies checkout-duration query fields only. It is not an executed query or observation and does not support a drop-off finding.",
        "uncertainty": "No synthetic or real observed drop-off outcome is retained; customer friction remains unknown.",
        "status": "unresolved",
        "critical": true
      }
    },
    {
      "id": "OPP-001",
      "kind": "OPP",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Opportunity selected for trial",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["roadmap planning"]
      },
      "data": {
        "problem": "Synthetic users experience prolonged checkout latency",
        "customer_job": "Complete checkout quickly without validation errors",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "substitutes": ["Manual phone ordering", "Third-party cart"],
        "alternatives": ["One-step form", "Accordion form", "Status quo / defer"],
        "status": "selected",
        "rationale": "Selected as primary synthetic opportunity"
      }
    },
    {
      "id": "HYP-001",
      "kind": "HYP",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "OPP-001", "revision": "r1" },
        { "id": "CLM-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Hypothesis drafted",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["pilot results"]
      },
      "data": {
        "opportunity": { "id": "OPP-001", "revision": "r1" },
        "prediction": "Streamlined form reduces checkout duration by 40%",
        "mechanism": "Eliminating redundant billing address confirmation step",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "primary_metric": { "id": "MET-001", "revision": "r1" },
        "disconfirmation": "No statistically detectable duration improvement",
        "status": "proposed"
      }
    },
    {
      "id": "INV-001",
      "kind": "INV",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Proposal stage review",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["budget review"]
      },
      "data": {
        "alternatives": [
          { "name": "Do nothing", "rationale": "Preserve engineering budget" },
          { "name": "Third-party widget", "rationale": "Higher recurring license costs" }
        ],
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "financial_input": null,
        "financial_result": null,
        "nonmonetary": ["Improve user onboarding throughput"],
        "status": "proposal",
        "accounting_rationale": "Nonmonetary evaluation for synthetic pilot exploration"
      }
    },
    {
      "id": "DEC-001",
      "kind": "DEC",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "INV-001", "revision": "r1" },
        { "id": "HYP-001", "revision": "r1" },
        { "id": "CLM-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Investment proposal drafted",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["proposal evaluation"]
      },
      "data": {
        "purpose": "investment",
        "status": "recorded",
        "outcome": "authorize",
        "consumes": [
          { "id": "INV-001", "revision": "r1" },
          { "id": "HYP-001", "revision": "r1" }
        ],
        "critical_claims": [{ "id": "CLM-001", "revision": "r1" }],
        "authority_id": "AUTH-004",
        "authority_revision": "sha256:c7a5f828b4424f986d0295dfa21f8cc035c0306e92e8643006f578ff6228c21b",
        "strategy_binding": {
          "authority_id": "AUTH-003",
          "revision": "sha256:7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20"
        },
        "artifact_bindings": [
          {
            "path": "docs/governance/investment-charter.md",
            "sha256": "feab381da3cc09367f4ef9e0f45e7ad8ff43b92bc5f42e1e0b1ee3166e5ff19c"
          },
          {
            "path": "docs/governance/investment-authorization.md",
            "sha256": "c7a5f828b4424f986d0295dfa21f8cc035c0306e92e8643006f578ff6228c21b"
          },
          {
            "path": "docs/strategy/synthetic-metrics-strategy.md",
            "sha256": "7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20"
          }
        ],
        "decided_at": "2026-10-12T09:00:00Z",
        "rationale": "Fictional recorded investment authorization for this synthetic training fixture only",
        "uncertainties": ["Third-party payment gateway latency"],
        "revisit_triggers": ["Pilot comparison results"],
        "supersedes": null
      }
    },
    {
      "id": "MET-001",
      "kind": "MET",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "SRC-001", "revision": "r1" },
        { "id": "SRC-002", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Measurement contract instrumented and baseline established",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["monthly review"]
      },
      "data": {
        "definition": "Synthetic checkout duration from cart to receipt",
        "unit": "seconds",
        "denominator": "eligible completed checkouts by test cohort",
        "query": { "id": "SRC-001", "revision": "r1" },
        "query_revision": "v1.0.0",
        "baseline": {
          "value": "84.5",
          "source": { "id": "SRC-002", "revision": "r1" },
          "window": { "start": "2026-09-01T00:00:00Z", "end": "2026-10-01T00:00:00Z" }
        },
        "baseline_exception": null,
        "comparison_window": { "start": "2026-10-15T00:00:00Z", "end": "2026-11-15T00:00:00Z" },
        "eligibility": "Authenticated synthetic accounts in Test-Region",
        "target": "Duration <= 50.0 seconds",
        "guardrail": "Synthetic gateway error rate must not exceed 0.5%",
        "measurement_owner": "Fictional Measurement Owner",
        "review_trigger": "Comparison window completion",
        "status": "instrumented"
      }
    },
    {
      "id": "DEC-002",
      "kind": "DEC",
      "revision": "r1",
      "owner": "fictional-authorizer",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "MET-002", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Recorded release baseline risk-acceptance charter",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["release audit"]
      },
      "data": {
        "purpose": "release",
        "status": "recorded",
        "outcome": "risk_accept",
        "consumes": [
          { "id": "MET-002", "revision": "r1" }
        ],
        "critical_claims": [],
        "authority_id": "AUTH-002",
        "authority_revision": "sha256:20832a7693311c11791ffed051fc3c4b8b42d45fa2e39aa30215bf6f27fd6b05",
        "strategy_binding": null,
        "artifact_bindings": [
          {
            "path": "docs/governance/release-auth.md",
            "sha256": "20832a7693311c11791ffed051fc3c4b8b42d45fa2e39aa30215bf6f27fd6b05"
          }
        ],
        "decided_at": "2026-10-12T09:00:00Z",
        "rationale": "Fictional risk acceptance: accept baseline absence for novel synthetic metric MET-002",
        "uncertainties": ["Absence of historical comparables"],
        "revisit_triggers": ["Post-release review window"],
        "supersedes": null
      }
    },
    {
      "id": "MET-002",
      "kind": "MET",
      "revision": "r1",
      "owner": "fictional-analyst",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "SRC-005", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Novel synthetic metric with recorded baseline exception",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["monthly review"]
      },
      "data": {
        "definition": "Synthetic express checkout abandonment rate",
        "unit": "percentage",
        "denominator": "eligible express attempts with checkout_started where express option was selected before payment submission",
        "query": { "id": "SRC-005", "revision": "r1" },
        "query_revision": "v1.0.0",
        "baseline": null,
        "baseline_exception": { "id": "DEC-002", "revision": "r1" },
        "comparison_window": { "start": "2026-10-15T00:00:00Z", "end": "2026-11-15T00:00:00Z" },
        "eligibility": "Synthetic Test Cohort attempts where express option was selected before payment submission",
        "target": "Abandonment rate <= 8.0%",
        "guardrail": "gateway_error events per eligible express attempt with checkout_started <= 0.5%",
        "measurement_owner": "Fictional Measurement Owner",
        "review_trigger": "Comparison window completion",
        "status": "instrumented"
      }
    },
    {
      "id": "REV-001",
      "kind": "REV",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Test Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "HYP-001", "revision": "r1" },
        { "id": "MET-001", "revision": "r1" },
        { "id": "SRC-003", "revision": "r1" },
        { "id": "SRC-004", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Post-release review completed post comparison window",
        "reviewed_at": "2026-11-18T09:00:00Z",
        "expires_at": "2026-12-31T23:59:59Z",
        "review_triggers": ["annual business review"]
      },
      "data": {
        "decision": { "id": "DEC-001", "revision": "r1" },
        "hypotheses": [{ "id": "HYP-001", "revision": "r1" }],
        "metrics": [{ "id": "MET-001", "revision": "r1" }],
        "observations": [{ "id": "SRC-003", "revision": "r1" }],
        "actual_costs": [{ "id": "SRC-004", "revision": "r1" }],
        "attribution": {
          "classification": "unknown",
          "rationale": "Concurrent promotional ad blitz during comparison window precludes causal isolation",
          "confounders": ["Synthetic Q4 promotional discount campaign running concurrently"]
        },
        "recommendation": "inconclusive",
        "limitations": ["Evaluated only on synthetic cohort; unseasoned retention; causal link unproven"],
        "reviewed_at": "2026-11-18T09:00:00Z"
      }
    }
  ],
  "bridges": [
    {
      "record": { "id": "DEC-001", "revision": "r1" },
      "authority_id": "AUTH-001",
      "authority_revision": "sha256:d3f43c87cc28b81005765578235d93b40a51f9dd409f8d2b4560da996965c1c2",
      "ids": ["BRD-OBJ-001"]
    }
  ],
  "product_state": {
    "value": "unvalidated",
    "reason": "Synthetic metrics remain unvalidated; recorded DEC is a fictional teaching record, not product or host authorization.",
    "scope": {
      "segment": "Synthetic Test Cohort",
      "geography": "Test-Region",
      "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-12-01T00:00:00Z" }
    },
    "hypotheses": [{ "id": "HYP-001", "revision": "r1" }],
    "decision": null,
    "assessed_at": "2026-11-18T10:00:00Z",
    "history": []
  }
}
```

---

## 4. Paired Synthetic Outcome v1 Delivery Artifact


Demonstrates released delivery and inconclusive product value for the **same** `synthetic-metrics` initiative at ledger revision `r1`. Fictional document/deployment recipes follow; none is an actual release, customer deployment or evidence of safe operations.

```json
{
  "schema_version": 1,
  "run_id": "synthetic-metrics-release-r1",
  "slug": "synthetic-metrics",
  "workflow": "deploy-release",
  "feature_status": "released",
  "started_at": "2026-10-12T08:00:00Z",
  "completed_at": "2026-10-12T09:30:00Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001", "REQ-002"],
    "acceptance_criteria": ["AC-001", "AC-002"],
    "srs": ["SRS-001", "SRS-002"]
  },
  "completed_evidence": [],
  "missing_evidence": [
    "Fictional release/declaration artifact; no host deployment evidence exists",
    "Fictional smoke evidence; no runtime result exists"
  ],
  "decision_needed": ["Independent artifact review before treating this as replayable delivery evidence"],
  "recommended_next_workflow": null,
  "cost": {
    "source": "unavailable",
    "reason": "Fictional outcome fixture; no deployment or cost record exists"
  },
  "agent": {
    "identity": "fictional-synthetic-runner",
    "model": "fictional-agent/v1"
  }
}
```

The cited evidence paths are illustrative fixture recipes, not retained host artifacts. This Outcome row demonstrates field/trace separation only; it is not a replayable delivery proof. For an actual pairing, retain exact revision-bound delivery declarations, source bytes and smoke evidence before describing the Outcome as completed.

## 5. Retained External SRC Byte Recipes

Each one-line UTF-8 JSON value below is the exact synthetic source snapshot bytes (no trailing newline). Hash applies to those bytes, not this Markdown wrapper. `snapshot_sha256` in the ledger matches each recipe. These records are authored fictional teaching data, not observations or vendor exports.

| SRC | Exact bytes | SHA256 | Meaning |
| --- | --- | --- | --- |
| SRC-001 | `{"fixture":"metrics-query","revision":"v1.0.0","cohort":"Synthetic Test Cohort","definition":"checkout duration seconds","denominator":"eligible completed checkouts"}` | `96614a42457cd2b7062dcb5135c3b1e4439d4b43932d1ff43f1fe25d94faa651` | Query definition only; not an executed query or observation. |
| SRC-002 | `{"fixture":"metrics-baseline","revision":"v1.0.0","cohort":"Synthetic Test Cohort","value":"84.5","window":{"start":"2026-09-01T00:00:00Z","end":"2026-10-01T00:00:00Z"}}` | `e462d78b577ccabe240b91558ddeb28233d977e8d307cd982903d36cb9a3ad28` | Synthetic historical baseline extract. |
| SRC-003 | `{"fixture":"metrics-observation","revision":"v1.0.0","cohort":"Synthetic Test Cohort","value":"84.2","observed_at":"2026-11-16T08:00:00Z","window":{"start":"2026-10-15T00:00:00Z","end":"2026-11-15T00:00:00Z"}}` | `c0fda305fb9588be828c02aea7ca25ab82148538c5d313b9e807d89f34a998a4` | Synthetic post-window observation; no claim of causal attribution. |
| SRC-004 | `{"fixture":"metrics-cost","revision":"v1.0.0","cohort":"Synthetic Test Cohort","incremental_cost_usd":"1200.00","window":{"start":"2026-10-15T00:00:00Z","end":"2026-11-15T00:00:00Z"}}` | `6ebd02de3cc57ca5f0c7c06c7b6e83ef859e2f84675dd4a5fda1a0d9b2b8fb25` | Synthetic incremental cost; no cash ROI asserted. |
| SRC-005 | `{"fixture":"express-abandonment-event-definition","revision":"v1.0.0","cohort":"Synthetic Test Cohort","eligibility":"express option selected before payment submission","numerator":"eligible express attempts with checkout_abandoned before payment_succeeded","denominator":"eligible express attempts with checkout_started","unit":"percent = numerator / denominator * 100","guardrail":"eligible express attempts with gateway_error / eligible express attempts with checkout_started","limitations":["fictional event contract","not an executed query or observation"]}` | `4584df57b49465172f10415921d6d3613263be8532522b2232e8f8648e0bd5e3` | Defines event cohort, abandonment numerator/denominator and gateway-error guardrail; not executed or observed. |
Synthetic source origin/retrieval timestamps in `SRC-003` and `SRC-004` are after the comparison window, before the review, and bounded by the retained assessment instant. Query source bytes describe a definition; they do not themselves prove query execution.
