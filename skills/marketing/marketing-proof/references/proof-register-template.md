# Proof Register Template

Use this template to track and audit marketing claims against technical proof.

```markdown
# Marketing Proof Register

## Metadata
- **Initiative Slug**: [kebab-case]
- **Shared Context Revision**: [commit-hash / ledger revision]
- **Audit Date**: YYYY-MM-DD
- **Proof Auditor**: [Name / Evidence Owner]
- **Audit Status**: [provisional | approved_for_campaign]

## Claim Index

### CLM-[XXX]: [Brief Claim Title]
- **Proposed Marketing Copy**: "[Exact wording proposed for landing page / campaign asset]"
- **Status**: [verified | qualified | rejected | unsubstantiated_proposal]
- **Claim Scope**: [Environment, platform, ecosystem, or workload boundaries where claim holds]
- **Primary Source Ref**: [Exact SRC reference, revision, and sha256 locator or null if unsubstantiated]
- **Verification Evidence**:
  - *Artifact / Command*: [Path to test command, benchmark script, or reproduction artifact]
  - *Observed Metric / Result*: [Measured value or output from evidence source; do not invent]
  - *Execution Date*: YYYY-MM-DD
- **Contradictions & Exceptions (AC-01)**:
  - *Observation*: [Documented contradictory run, negative result, or boundary edge case; none if uncontroverted]
  - *Resolution*: [Scope boundary or qualification applied to claim copy]
- **NOT READY / Caveat Status (AC-19)**:
  - *Readiness Report*: [Report locator or readiness gate result; note if any component states not_ready]
  - *Permitted Copy*: [Qualified claim phrasing preserving source limitations]
- **Approved Copy Guidance**:
  - *Permitted*: "[Explicitly qualified approved phrasing]"
  - *Prohibited*: "[Universal / exaggerated superlatives prohibited for this claim]"

---

### CLM-[YYY]: [Brief Claim Title]
...
```
