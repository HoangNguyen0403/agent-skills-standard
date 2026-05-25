# Software Requirements Specification (SRS): [Feature/System]

**Status**: Draft | **Owner**: [Name] | **Last Updated**: [YYYY-MM-DD]

## 1. Context And Trace Source

- BRD objective links: [BRD-OBJ-001]
- PRD links: [REQ-001], [REQ-002]
- AC links: [AC-001], [AC-002]
- Scope statement: [what this SRS covers]

## 2. Requirement Trace

| BRD Objective | PRD Req | AC | SRS | Verification |
| --- | --- | --- | --- | --- |
| BRD-OBJ-001 | REQ-001 | AC-001 | SRS-001 | [test/evidence] |

## 3. Requirement Cards

### SRS-001: [Title]

- **Statement**: The [system] shall [behavior] when [condition].
- **Priority**: Must/Should/Could/Won't
- **Status**: Draft/Review/Approved/Implemented/Tested
- **Source**: REQ-001, AC-001
- **Input / Trigger**: [input]
- **Processing Rule**: [rule]
- **Output**: [observable output]
- **Error / Fallback**: [failure behavior]
- **NFR Impact**: [NFR IDs or none]
- **Measurement Method**: [test/monitor/review]
- **Verification Lane**: [unit/integration/E2E/manual/security]

## 4. Functional Flows (FRS)

| Flow ID | Actor | Goal | Normal Course | Alternatives | Exceptions |
| --- | --- | --- | --- | --- | --- |
| FLOW-001 | [specific actor] | [one goal] | [steps] | [alternate success] | [failure path] |

## 5. Interface Requirements

- API contracts (request/response/error)
- Event contracts (producer/consumer/schema)
- Data contracts (entities, constraints, retention)
- External integration assumptions

## 6. Non-Functional Requirements

| NFR ID | Category | Requirement | Threshold | Measurement Method | Verification |
| --- | --- | --- | --- | --- | --- |
| NFR-001 | Performance | [requirement] | [e.g., P95 < 300ms] | [load test/monitor] | [test/report] |

## 7. Security And Privacy Requirements

- AuthN/AuthZ requirements
- Data classification and protection requirements
- Audit logging and operational controls

## 8. Constraints And Compatibility

- Migration constraints
- Backward compatibility rules
- Compliance constraints

## 9. Verification Matrix

| Requirement ID | Verification Lane | Evidence Artifact |
| --- | --- | --- |
| SRS-001 | [unit/integration/E2E/manual] | [test/report] |
