# Product Requirements Document (PRD): [Feature Name]

**Status**: Draft | **Owner**: [User] | **Last Updated**: [YYYY-MM-DD]

## 1. Purpose And Scope

- **Business Objective Ref**: [BRD-OBJ-001]
- **Problem Statement**: [What user/business pain is solved]
- **Assumptions**: [testable assumptions]
- **In Scope**: [Main outcomes]
- **Out of Scope**: [Explicit exclusions]

## 2. Goals And Guardrails

- **Primary Metric**: [metric + target + date]
- **Secondary Metrics**: [metrics]
- **Guardrails**: [what must not regress]

## 3. Personas, JTBD, And Use Cases

| Use Case ID | Persona         | Job / Goal | Scope Note |
| ----------- | --------------- | ---------- | ---------- |
| UC-001      | [specific role] | [goal]     | [boundary] |

## 4. Requirement Registry

| Req ID  | Requirement       | Persona | Priority | Owner   | Status              | BRD Objective Ref |
| ------- | ----------------- | ------- | -------- | ------- | ------------------- | ----------------- |
| REQ-001 | [What must exist] | [role]  | P0/P1/P2 | [owner] | Draft/Approved/Done | BRD-OBJ-001       |

## 5. User Stories And ACs

_Strict format: As a [persona/role], I want to [Action], so that [Benefit]._

| Story ID | Linked Req ID | User Story                 | INVEST Check  | Status |
| -------- | ------------- | -------------------------- | ------------- | ------ |
| US-001   | REQ-001       | [As a specific persona...] | [I/N/V/E/S/T] | Draft  |

| AC ID  | Linked Story ID | Scenario              | Given     | When     | Then                | Status |
| ------ | --------------- | --------------------- | --------- | -------- | ------------------- | ------ |
| AC-001 | US-001          | [happy/edge/negative] | [context] | [action] | [observable result] | Draft  |

## 6. Functional Behavior (FRS-lite)

- **Primary Flows**: [Step-by-step happy path]
- **Alternate/Error Flows**: [Validation error, permission denied, timeout, empty state]
- **Input/Output Boundaries**: [Key data in/out]

## 7. Non-Functional Product Constraints

- **Performance**: [e.g., P95 API < 300ms]
- **Security/Privacy**: [e.g., AuthZ required, PII handling]
- **Accessibility/Usability**: [e.g., WCAG target, keyboard support]
- **Platform Support**: [e.g., Web + Mobile]

## 8. Analytics And Telemetry

- **Events**: [event + properties]
- **Dashboards / Alerts**: [dashboard or alert threshold]

## 9. Risks And Decisions

| Risk/Decision | Type                                           | Owner   | Status   | Rationale |
| ------------- | ---------------------------------------------- | ------- | -------- | --------- |
| [item]        | Value/Usability/Feasibility/Viability/Decision | [owner] | [status] | [why]     |

## 10. Dependencies And Rollout

- **Dependencies**: [Teams/systems/vendors]
- **Release Strategy**: [Feature flag, phased rollout, market scope]
- **Ops / Support Readiness**: [SOPs, support, migration/backfill]
- **Success Metrics**: [Business + product KPIs]

## 11. Traceability Links

- **SRS/FRS Doc**: `docs/srs/srs-[slug].md` (when needed)
- **Implementation Plan**: `docs/prd/prd-plan-[slug].md`
- **Verification Evidence**: `docs/srs/srs-walkthrough.md`

## 12. Change Log

| Date         | Author | Change         |
| ------------ | ------ | -------------- |
| [YYYY-MM-DD] | [name] | [what changed] |

## 13. Open Questions

- [ ] [Question]
