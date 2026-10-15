# Evidence Mapping: Product Roadmap & Prioritization

## 1. Non-Actionability & Synthetic Disclaimer

> [!IMPORTANT]
> All schema snippets, identifiers, and records below are **explicitly synthetic and proposal-only illustrations**. They do NOT represent real customer observations, executive strategic mandates, or operational budget commitments. They cannot be executed autonomously and grant no permission to spend budget, deploy software, alter traffic, or retire production systems.

---

## 2. Mapping Roadmap Prioritization to Ledger Records

Roadmap decisions are anchored in the canonical evidence ledger at `docs/product/<slug>/evidence.json`. Prioritization choices map directly to four key record kinds:

### Opportunities (`OPP`)

Prioritizing a theme or customer problem creates or updates an `OPP` record.

```json
{
  "id": "OPP-001",
  "kind": "OPP",
  "revision": "r2",
  "owner": "synthetic-pm@example.com",
  "scope": {
    "segment": "Synthetic Enterprise Cohort",
    "geography": "Test-Region",
    "window": {
      "start": "2026-10-01T00:00:00Z",
      "end": "2027-01-01T00:00:00Z"
    }
  },
  "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
  "freshness": {
    "status": "current",
    "rationale": "Prioritization reviewed for synthetic roadmap cycle",
    "reviewed_at": "2026-10-15T09:00:00Z",
    "expires_at": "2027-01-01T00:00:00Z",
    "review_triggers": ["quarterly planning", "customer churn spike"]
  },
  "data": {
    "problem": "Manual role provisioning takes >48 hours, causing synthetic onboarding delays",
    "customer_job": "Automate role assignment directly via existing enterprise IdP",
    "claims": [{ "id": "CLM-001", "revision": "r1" }],
    "substitutes": ["Manual CSV uploads", "Custom internal IT scripts"],
    "alternatives": ["SCIM protocol integration", "Just-In-Time SAML provisioning", "Status quo / defer"],
    "status": "selected",
    "rationale": "Selected as top opportunity. Explicitly displaces Custom Export to Q1 2027."
  }
}
```

- **Admissible Statuses**: `candidate | selected | deferred | rejected`.
- **Alternatives Mandatory**: Must include explicit alternatives and the "status quo / defer" option.
- **Displaced Work Tracking**: Deferring an opportunity updates its status to `deferred` with an explicit trade-off rationale, while archiving the prior snapshot in `record_history`.

---

### Hypotheses (`HYP`)

Selected opportunities branch into falsifiable candidate solutions represented as `HYP` records.

```json
{
  "id": "HYP-001",
  "kind": "HYP",
  "revision": "r1",
  "owner": "synthetic-pm@example.com",
  "scope": {
    "segment": "Synthetic Enterprise Cohort",
    "geography": "Test-Region",
    "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
  },
  "depends_on": [
    { "id": "OPP-001", "revision": "r2" },
    { "id": "CLM-001", "revision": "r1" }
  ],
  "freshness": {
    "status": "current",
    "rationale": "Synthetic hypothesis drafted",
    "reviewed_at": "2026-10-15T09:00:00Z",
    "expires_at": "2027-01-01T00:00:00Z",
    "review_triggers": ["discovery test"]
  },
  "data": {
    "opportunity": { "id": "OPP-001", "revision": "r2" },
    "prediction": "SCIM integration reduces provisioning lead time to < 10 seconds",
    "mechanism": "Direct REST SCIM 2.0 API binding with IdP webhooks",
    "claims": [{ "id": "CLM-001", "revision": "r1" }],
    "primary_metric": null,
    "disconfirmation": "Enterprise users still require manual approval tickets",
    "status": "proposed"
  }
}
```

- **Closed Status Enum**: `proposed | testing | supported | refuted | inconclusive`.
- **Dependencies**: Parent `opportunity` and all supporting `claims` must be listed in `depends_on`.
- **Primary Metric**: Ref to a `MET` record, or `null` during early discovery.

---

### Investment Proposals (`INV`)

Before allocating substantial development capacity, an investment proposal is drafted.

```json
{
  "id": "INV-001",
  "kind": "INV",
  "revision": "r1",
  "owner": "synthetic-pm@example.com",
  "scope": {
    "segment": "Synthetic Enterprise Cohort",
    "geography": "Test-Region",
    "window": { "start": "2026-10-01T00:00:00Z", "end": "2027-01-01T00:00:00Z" }
  },
  "depends_on": [{ "id": "CLM-001", "revision": "r1" }],
  "freshness": {
    "status": "current",
    "rationale": "Investment reviewed by product committee",
    "reviewed_at": "2026-10-15T09:00:00Z",
    "expires_at": "2027-01-01T00:00:00Z",
    "review_triggers": ["portfolio review"]
  },
  "data": {
    "alternatives": [
      { "name": "Do nothing / defer", "rationale": "Ongoing support ticket burden" },
      { "name": "Custom CSV export", "rationale": "Lower strategic impact on enterprise pipeline" }
    ],
    "claims": [{ "id": "CLM-001", "revision": "r1" }],
    "financial_input": null,
    "financial_result": null,
    "nonmonetary": ["Unblock enterprise expansion pipeline and improve IdP security compliance"],
    "status": "proposal",
    "accounting_rationale": "Strategic capability proposal; displaced work accounted for in decision rationale"
  }
}
```

- **Typed Alternatives**: Array of objects `{name: string, rationale: string}` (including "do nothing / defer").
- **Financial Artifact Pairing**: `financial_input` and `financial_result` must be either BOTH non-null `{path, sha256}` objects or BOTH `null`.
- **Nonmonetary Rationale**: Array of strings when financial returns are not modeled.

---

### Recorded Allocation & Prioritization Decisions (`DEC`)

A recorded investment prioritization milestone is captured as a conforming `DEC` record.

```json
{
  "id": "DEC-003",
  "kind": "DEC",
  "revision": "r1",
  "owner": "synthetic-director@example.com",
  "scope": {
    "segment": "Synthetic Enterprise Cohort",
    "geography": "Test-Region",
    "window": {
      "start": "2026-10-01T00:00:00Z",
      "end": "2027-01-01T00:00:00Z"
    }
  },
  "depends_on": [
    { "id": "OPP-001", "revision": "r2" },
    { "id": "HYP-001", "revision": "r1" },
    { "id": "INV-001", "revision": "r1" },
    { "id": "CLM-001", "revision": "r1" }
  ],
  "freshness": {
    "status": "current",
    "rationale": "Q4 Roadmap commitment approved by product board",
    "reviewed_at": "2026-10-15T14:00:00Z",
    "expires_at": "2027-01-01T00:00:00Z",
    "review_triggers": ["sprint 4 milestone review", "enterprise contract churn"]
  },
  "data": {
    "purpose": "investment",
    "status": "recorded",
    "outcome": "authorize",
    "consumes": [
      { "id": "OPP-001", "revision": "r2" },
      { "id": "HYP-001", "revision": "r1" },
      { "id": "INV-001", "revision": "r1" }
    ],
    "critical_claims": [{ "id": "CLM-001", "revision": "r1" }],
    "authority_id": "AUTH-002",
    "authority_revision": "sha256:ac1fb770d01df3553f0b79ccc050b61633017dc8d86ac65785d5e09f9dc4dd88",
    "strategy_binding": {
      "authority_id": "AUTH-001",
      "revision": "sha256:7c5d010bab240b8b86bf8c3694a7ef19485f82dd6397f4c3c952a760b0835d20"
    },
    "artifact_bindings": [
      {
        "path": "docs/governance/investment-charter.md",
        "sha256": "ac1fb770d01df3553f0b79ccc050b61633017dc8d86ac65785d5e09f9dc4dd88"
      }
    ],
    "decided_at": "2026-10-15T14:00:00Z",
    "rationale": "Authorized SCIM integration development. Explicitly displaces Q4 Custom Export feature to Q1 2027.",
    "uncertainties": ["Third-party IdP webhook reliability under high load"],
    "revisit_triggers": ["Milestone 2 integration test failure"],
    "supersedes": null
  }
}
```

### Critical Conformance Rules for Recorded `DEC`

1. **Artifact Bindings Required**: Every recorded `DEC` must have at least one valid artifact binding (`artifact_bindings` non-empty). Empty array `[]` is rejected on recorded decisions.
2. **DAG Provenance**: All consumed records (`consumes`) and all critical claims (`critical_claims`) MUST be listed in `depends_on`.
3. **Distinct Authority Domains**:
   - `strategy_binding`: Must point to an Authority record with `domain == "strategy"` (`AUTH-001`).
   - `authority_id`: Must point to an Authority record with `domain == "authorization"` (`AUTH-002`).
   - *Prohibition*: Never reuse the same `AUTH` record pair for both strategy and authorization.
4. **Delivery Bridges**: Delivery bridges (`bridges`) link the recorded `DEC` to a business Authority record with `domain == "business"` (`AUTH-003`), where `ids` is a non-empty subset of that authority snapshot's `declared_ids` (`["BRD-OBJ-001"]`).
5. **Immutable History**: Recorded `DEC` rows are immutable. Superseding or revoking an earlier decision requires minting a new DEC ID and setting `supersedes: {id: old_id, revision: old_rev}`.
