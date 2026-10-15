# Retained Package Examples: Product Roadmap & Portfolio Trade-offs

## 1. Non-Actionability & Synthetic Disclaimer

> [!CRITICAL]
> All numbers, opportunities, claims, and decisions below are **strictly fictional and synthetic**. They do NOT represent observed customer demand, executive mandates, or operational budget commitments. These examples serve as structural specification models and replayable test fixtures; they grant zero authority to deploy software, execute budgets, alter traffic exposure, or retire features.

---

## 2. Fictional Authority Fixtures & Exact Byte Recipes

To maintain verifiable hash integrity under local validation, the synthetic ledger binds to the following local fixture files:

1. **Corporate Strategy Authority (`docs/strategy/corporate-strategy.md`)**:
   - Exact Content (UTF-8, LF line terminator):
     ```markdown
     # Corporate Strategic Alignment 2026
     ```
   - Computed SHA256: `7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20`
   - Authority Domain: `strategy`, Declared IDs: `[]`

2. **Investment Authorization Charter (`docs/governance/investment-charter.md`)**:
   - Exact Content (UTF-8, LF line terminator):
     ```markdown
     # Investment Authorization Charter Q4
     ```
   - Computed SHA256: `ac1fb770d01df3553f0b79ccc050b61633017dc8d86ac65785d5e09f9dc4dd88`
   - Authority Domain: `authorization`, Declared IDs: `[]`

3. **Business Objective Authority (`docs/brd/brd-synthetic-roadmap.md`)**:
   - Exact Content (UTF-8, LF line terminator):
     ```markdown
     # BRD-OBJ-001: Automated role provisioning
     ```
   - Computed SHA256: `efac8f8ad836c6859a1493162d4f66ba6ad0320a5801380649aa7077818390d6`
   - Authority Domain: `business`, Declared IDs: `["BRD-OBJ-001"]`


## Synthetic SRC-001 Byte Fixture

Exact one-line UTF-8 source bytes (no trailing newline):

```text
{"fixture":"roadmap-interview","revision":"v1.0.0","cohort":"Synthetic Enterprise Cohort","finding":"role provisioning workflow is unclear","sample_size":3,"limitations":["fictional training data","not market representative"]}
```

SHA256: `7733a80099d983ff67f0e62a9a536526f4f1193abbf60560ed268fdde32faf79`. The external SRC locator binds these bytes. They are a fictional training fixture, not actual interviews or representative demand.
---

## 3. Complete Package-Shaped Synthetic Ledger

The complete ledger below demonstrates **strategic alignment** (`strategy_authority` pointing to `AUTH-001`), **prioritization and displaced work** (`OPP-001` selected, `OPP-002` deferred), a **prioritization proposal decision** (`DEC-001`), and a **delivery bridge** (`bridges` to `AUTH-003`).

```json
{
  "schema_version": 1,
  "slug": "synthetic-roadmap",
  "product_id": "synthetic-product",
  "revision": "r1",
  "synthetic": true,
  "updated_at": "2026-10-12T10:00:00Z",
  "strategy_authority": "AUTH-001",
  "strategy_gap": null,
  "authorities": [
    {
      "id": "AUTH-001",
      "domain": "strategy",
      "locator": {
        "kind": "local",
        "path": "docs/strategy/corporate-strategy.md",
        "sha256": "7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20"
      },
      "revision": "sha256:7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20",
      "owner": "fictional-strategy-lead",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "declared_ids": [],
      "access": "available"
    },
    {
      "id": "AUTH-002",
      "domain": "authorization",
      "locator": {
        "kind": "local",
        "path": "docs/governance/investment-charter.md",
        "sha256": "ac1fb770d01df3553f0b79ccc050b61633017dc8d86ac65785d5e09f9dc4dd88"
      },
      "revision": "sha256:ac1fb770d01df3553f0b79ccc050b61633017dc8d86ac65785d5e09f9dc4dd88",
      "owner": "fictional-finance-director",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "declared_ids": [],
      "access": "available"
    },
    {
      "id": "AUTH-003",
      "domain": "business",
      "locator": {
        "kind": "local",
        "path": "docs/brd/brd-synthetic-roadmap.md",
        "sha256": "efac8f8ad836c6859a1493162d4f66ba6ad0320a5801380649aa7077818390d6"
      },
      "revision": "sha256:efac8f8ad836c6859a1493162d4f66ba6ad0320a5801380649aa7077818390d6",
      "owner": "fictional-author",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "declared_ids": ["BRD-OBJ-001"],
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
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [],
      "freshness": {
        "status": "current",
        "rationale": "Synthetic enterprise survey feedback",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["quarterly feedback review"]
      },
      "data": {
        "locator": { "kind": "external", "uri": "urn:synthetic:crm-001", "snapshot_sha256": "7733a80099d983ff67f0e62a9a536526f4f1193abbf60560ed268fdde32faf79" },
        "origin": {
          "publisher": "synthetic-crm",
          "origin_id": "urn:synthetic:feedback-origin",
          "classification": "primary",
          "revision": "v1.0.0",
          "observed_at": "2026-10-05T00:00:00Z",
          "scope": {
            "segment": "Synthetic Enterprise Cohort",
            "geography": "Test-Region",
            "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
          }
        },
        "retrieved_at": "2026-10-12T09:00:00Z",
        "privacy": { "classification": "public", "redaction": "none", "access": "available" },
        "license": { "identifier": "MIT", "usage": "reuse_permitted", "restrictions": [] },
        "status": "available",
        "limitations": ["Fictional customer feedback dataset"]
      }
    },
    {
      "id": "CLM-001",
      "kind": "CLM",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "SRC-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Claim verified from feedback analysis",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["feedback update"]
      },
      "data": {
        "statement": "In the explicitly fictional three-interview training sample, participants described role-provisioning workflow uncertainty; this does not establish representative enterprise demand.",
        "classification": "inference",
        "sources": [{ "id": "SRC-001", "revision": "r1" }],
        "counterevidence": [],
        "rationale": "Fictional coding illustration only; the small synthetic sample is not market evidence.",
        "uncertainty": "No real interviews, representativeness, or independent validation exist.",
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
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Prioritized in Q4 roadmap",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["quarterly planning"]
      },
      "data": {
        "problem": "Manual role provisioning takes >48 hours",
        "customer_job": "Automate role assignment via standard SCIM protocol",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "substitutes": ["Manual CSV upload", "Custom internal IT scripts"],
        "alternatives": ["SCIM integration", "JIT SAML provisioning", "Status quo / defer"],
        "status": "selected",
        "rationale": "Selected as top opportunity. Explicitly displaces Custom Export to Q1 2027."
      }
    },
    {
      "id": "OPP-002",
      "kind": "OPP",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Displaced by SCIM priority commitment",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["quarterly planning"]
      },
      "data": {
        "problem": "Custom CSV export configuration is inflexible",
        "customer_job": "Export custom filtered user data on automated schedules",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "substitutes": ["Manual API queries"],
        "alternatives": ["Custom export builder", "Standard reports", "Status quo / defer"],
        "status": "deferred",
        "rationale": "Deferred to Q1 2027 to free engineering capacity for SCIM integration."
      }
    },
    {
      "id": "HYP-001",
      "kind": "HYP",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "OPP-001", "revision": "r1" },
        { "id": "CLM-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Hypothesis drafted",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["prototype discovery"]
      },
      "data": {
        "opportunity": { "id": "OPP-001", "revision": "r1" },
        "prediction": "SCIM integration reduces provisioning lead time to < 10 seconds",
        "mechanism": "Direct REST SCIM 2.0 API binding",
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "primary_metric": null,
        "disconfirmation": "Enterprise users still require manual approval tickets",
        "status": "proposed"
      }
    },
    {
      "id": "INV-001",
      "kind": "INV",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
      "freshness": {
        "status": "current",
        "rationale": "Investment proposal reviewed",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["portfolio review"]
      },
      "data": {
        "alternatives": [
          { "name": "Do nothing / defer", "rationale": "Ongoing support ticket burden" },
          { "name": "Custom export instead", "rationale": "Lower strategic impact" }
        ],
        "claims": [{ "id": "CLM-001", "revision": "r1" }],
        "financial_input": null,
        "financial_result": null,
        "nonmonetary": ["Unblock enterprise expansion pipeline and improve IdP security"],
        "status": "proposal",
        "accounting_rationale": "Strategic capability proposal; displaced work accounted for"
      }
    },
    {
      "id": "DEC-001",
      "kind": "DEC",
      "revision": "r1",
      "owner": "fictional-pm",
      "scope": {
        "segment": "Synthetic Enterprise Cohort",
        "geography": "Test-Region",
        "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
      },
      "depends_on": [
        { "id": "OPP-001", "revision": "r1" },
        { "id": "HYP-001", "revision": "r1" },
        { "id": "INV-001", "revision": "r1" },
        { "id": "CLM-001", "revision": "r1" }
      ],
      "freshness": {
        "status": "current",
        "rationale": "Roadmap prioritization proposal",
        "reviewed_at": "2026-10-12T09:00:00Z",
        "expires_at": "2027-01-01T00:00:00Z",
        "review_triggers": ["quarterly planning"]
      },
      "data": {
        "purpose": "investment",
        "status": "proposed",
        "outcome": "propose",
        "consumes": [
          { "id": "OPP-001", "revision": "r1" },
          { "id": "HYP-001", "revision": "r1" },
          { "id": "INV-001", "revision": "r1" }
        ],
        "critical_claims": [{ "id": "CLM-001", "revision": "r1" }],
        "authority_id": null,
        "authority_revision": null,
        "strategy_binding": null,
        "artifact_bindings": [],
        "decided_at": null,
        "rationale": "Prioritization proposal for SCIM integration. Explicitly displaces Custom Export to Q1 2027.",
        "uncertainties": ["IdP webhook reliability under high load"],
        "revisit_triggers": ["SCIM prototype evaluation"],
        "supersedes": null
      }
    }
  ],
  "bridges": [
    {
      "record": { "id": "DEC-001", "revision": "r1" },
      "authority_id": "AUTH-003",
      "authority_revision": "sha256:efac8f8ad836c6859a1493162d4f66ba6ad0320a5801380649aa7077818390d6",
      "ids": ["BRD-OBJ-001"]
    }
  ],
  "product_state": {
    "value": "unvalidated",
    "reason": "Synthetic roadmap prioritization proposal",
    "scope": {
      "segment": "Synthetic Enterprise Cohort",
      "geography": "Test-Region",
      "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
    },
    "hypotheses": [{ "id": "HYP-001", "revision": "r1" }],
    "decision": { "id": "DEC-001", "revision": "r1" },
    "assessed_at": "2026-10-12T09:00:00Z",
    "history": []
  }
}
```

---

## 4. Multi-Initiative Read-Only Portfolio Projection

Demonstrating how multi-initiative roadmaps aggregate information without creating duplicate or mutable master ledgers. The document below is a human-readable projection referencing canonical ledgers at exact revisions:

```markdown
# Portfolio Overview: Q4 Enterprise Initiatives (Read-Only Projection)

| Initiative Slug | Canonical Ledger | Revision | Status Kind | Record Pair | Status | Displaced Work | Strategy Context (not action authority) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `synthetic-roadmap` | `docs/product/synthetic-roadmap/evidence.json` | `r1` | opportunity | `OPP-001@r1` | `selected` | Custom Export deferred to Q1 2027 | `AUTH-001@sha256:7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20` (synthetic strategy context) |
| `synthetic-metrics` | `docs/product/synthetic-metrics/evidence.json` | `r1` | REV recommendation | `REV-001@r1` | `inconclusive` | None recorded | `AUTH-003@sha256:7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20` (fictional strategy fixture; not action authority) |

- **Single System of Record**: All changes to priorities, claims, or hypotheses must be edited in their respective initiative ledgers.
- **No Dual Ledgers**: This portfolio projection contains no independently editable JSON records and performs no cross-ledger resolution.
```
