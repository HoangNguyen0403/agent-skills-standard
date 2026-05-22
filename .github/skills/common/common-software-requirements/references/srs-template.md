# Software Requirements Specification (SRS): [Feature/System]

**Status**: Draft | **Owner**: [Name] | **Last Updated**: [YYYY-MM-DD]

## 1. Context And Trace Source

- PRD links: [REQ-001], [REQ-002]
- Scope statement: [what this SRS covers]

## 2. Functional Requirements (FRS)

| SRS ID | Source Req ID | Trigger/Input | Processing Rule | Output | Error/Fallback |
| --- | --- | --- | --- | --- | --- |
| SRS-001 | REQ-001 | [input] | [rule] | [output] | [error/fallback] |

## 3. Interface Requirements

- API contracts (request/response/error)
- Event contracts (producer/consumer/schema)
- Data contracts (entities, constraints, retention)
- External integration assumptions

## 4. Non-Functional Requirements

| NFR ID | Category | Requirement | Threshold | Verification |
| --- | --- | --- | --- | --- |
| NFR-001 | Performance | [requirement] | [e.g., P95 < 300ms] | [test/monitor] |

## 5. Security And Privacy Requirements

- AuthN/AuthZ requirements
- Data classification and protection requirements
- Audit logging and operational controls

## 6. Constraints And Compatibility

- Migration constraints
- Backward compatibility rules
- Compliance constraints

## 7. Verification Matrix

| Requirement ID | Verification Lane | Evidence Artifact |
| --- | --- | --- |
| SRS-001 | [unit/integration/E2E/manual] | [test/report] |
