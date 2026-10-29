# Software Requirements Specification (SRS): [Feature/System]

**Status**: Draft | **Owner**: [Name] | **Delivery mode**: standard \| extended | **Last Updated**: [YYYY-MM-DD]

> Write an SRS only when technical decisions or contracts need an explicit design. Approved low-risk, nonsensitive `brief` work uses its ticket criteria instead. Sensitive changes always receive the applicable technical design and human gate; a label never removes that floor.

## 1. Decision Brief

- **Changes since approved revision**: [what changed, or "initial draft"]
- **Recommendation**: [technical decision]
- **Impact if wrong**: [consequence]
- **Evidence and limitations**: [confirmed(<source>); unverified or absent evidence]
- **Unresolved decision**: [decision] — owner: [owner] — affected slice: [slice]
- **Approval sought**: [exact approval and authority]
- **Independently ready slices**: [slices that can proceed without the unresolved decision]

## 2. Trace Source

- **PRD / ticket and revision**: [docs/prd/prd-[slug].md or approved ticket reference]
- **Source requirement IDs**: [REQ-001], [AC-001]
- **Scope statement**: [what this design covers]

## 3. Architecture And Contract Delta

- **Delta against existing baseline**: [changed components, contracts, or data; link ADR/API/schema instead of restating them]
- **Ownership and boundaries**: [module/data owners, migration needs]
- **Selected views** (extension: interaction/lifecycle/order ambiguity): [view and why it answers the question]

## 4. Technical Requirements

One card per technical requirement. Each card carries the only verification mapping for its requirement; do not add a second matrix.

### SRS-001: [Title]

- **Statement**: The [system] shall [behavior] when [condition].
- **Priority**: Must/Should/Could
- **Status**: Draft/Review/Approved/Implemented/Tested
- **Source**: REQ-001, AC-001
- **Behavior**: [trigger, input, validation, output]
- **Failure / fallback**: [error behavior or degradation]
- **NFR / security impact**: [numeric threshold, verifiable categorical invariant, or "none"]
- **Verification**: [unit/integration/E2E/security/migration] — [test or evidence artifact]

## 5. Extensions

Include an extension only when its trigger applies. Omitting an applicable extension is an owned blocker, never silent design loss.

| Trigger                                                                     | Required extension                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------------- |
| New or changed API, event, or storage contract                              | Interface and data contracts                         |
| Numeric performance, reliability, or scale commitments                      | NFR table with thresholds and measurement method     |
| Sensitive change (auth, secrets, payments, integrity, trust boundary)        | Security controls, human gate, failure analysis      |
| Migration or backward-compatibility impact                                  | Migration and rollback plan                          |
| Cross-team contract or irreversible architecture decision                   | ADR                                                  |

## 6. Blockers And References

- **Blockers**: blocked(<slice>, <owner>, <required input>) — blocks only the affected slice; no unowned TBD at handoff
- **Run record**: `artifacts/runs/[slug]/[run-id].json` (Outcome RunRecord v1; schema-valid is not an approval)
- **References**: [ADR, PRD, approved ticket, verification evidence]
